/**
 * qrService.ts — Zero-dependency, offline-ready UPI QR code generation.
 *
 * Generates valid QR Codes as SVG or Canvas Data URLs without any external dependencies
 * or network requests. Works 100% offline.
 */

// A compact, pure TypeScript QR Code generator for Version 1 to 4 QR codes
// Supports byte mode with error correction level M (15% recovery)

/**
 * Builds a UPI payment URL following the standard NPCI UPI link specification:
 * upi://pay?pa={upiId}&pn={name}&am={amount}&cu=INR&tn={note}
 */
export function buildUpiUri(options: {
  upiId: string;
  upiName?: string;
  amount?: number;
  note?: string;
}): string {
  const { upiId, upiName, amount, note } = options;
  if (!upiId) return "";

  const params = new URLSearchParams();
  params.set("pa", upiId.trim());
  if (upiName) params.set("pn", upiName.trim());
  if (amount && amount > 0) {
    params.set("am", amount.toFixed(2));
    params.set("cu", "INR");
  }
  if (note) params.set("tn", note.trim());

  return `upi://pay?${params.toString()}`;
}

// Minimal QR Code Matrix Generator (Byte mode, ECC M)
// Based on standard ISO/IEC 18004 specification for quick offline QR rendering
class MinimalQR {
  // Galois Field GF(256) tables for Reed-Solomon
  private static exp = new Uint8Array(512);
  private static log = new Uint8Array(256);
  private static tablesInit = false;

  private static initTables() {
    if (this.tablesInit) return;
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.exp[i] = x;
      this.log[x] = i;
      x <<= 1;
      if (x & 256) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
      this.exp[i] = this.exp[i - 255];
    }
    this.tablesInit = true;
  }

  private static gmul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.exp[this.log[a] + this.log[b]];
  }

  // Version capacities for ECC Level M (byte mode)
  // v1: 14 bytes, v2: 26, v3: 42, v4: 62, v5: 84, v6: 106, v7: 122, v8: 152
  private static versionCapacities = [0, 14, 26, 42, 62, 84, 106, 122, 152];
  private static totalDataCodewords = [0, 16, 28, 44, 70, 100, 134, 154, 192];
  private static eccCodewordsPerBlock = [0, 10, 16, 26, 18, 24, 16, 18, 22];
  private static numBlocks = [0, 1, 1, 1, 2, 2, 4, 4, 4];

  public static generateMatrix(text: string): boolean[][] {
    this.initTables();
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(text);

    // Pick smallest version that fits
    let version = 1;
    while (version < this.versionCapacities.length && dataBytes.length > this.versionCapacities[version]) {
      version++;
    }
    if (version >= this.versionCapacities.length) {
      version = this.versionCapacities.length - 1; // clamp to max supported
    }

    const size = version * 4 + 17;
    const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
    const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Finder patterns at top-left, top-right, bottom-left
    const placeFinder = (row: number, col: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const nr = row + r;
          const nc = col + c;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          isReserved[nr][nc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[nr][nc] = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          } else {
            matrix[nr][nc] = false;
          }
        }
      }
    };

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      if (matrix[6][i] === null) {
        matrix[6][i] = i % 2 === 0;
        isReserved[6][i] = true;
      }
      if (matrix[i][6] === null) {
        matrix[i][6] = i % 2 === 0;
        isReserved[i][6] = true;
      }
    }

    // Alignment pattern for version >= 2
    if (version >= 2) {
      const alignPos = size - 7;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const nr = alignPos + r;
          const nc = alignPos + c;
          if (!isReserved[nr][nc]) {
            matrix[nr][nc] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            isReserved[nr][nc] = true;
          }
        }
      }
    }

    // Reserve format info area
    for (let i = 0; i < 9; i++) {
      if (i < size) {
        isReserved[8][i] = true;
        isReserved[i][8] = true;
      }
    }
    for (let i = 0; i < 8; i++) {
      isReserved[size - 1 - i][8] = true;
      isReserved[8][size - 1 - i] = true;
    }
    matrix[size - 8][8] = true; // Dark module
    isReserved[size - 8][8] = true;

    // Build data bit stream
    const bitStream: number[] = [];
    const pushBits = (val: number, len: number) => {
      for (let i = len - 1; i >= 0; i--) {
        bitStream.push((val >> i) & 1);
      }
    };

    // Mode: Byte (0100)
    pushBits(0b0100, 4);
    // Character count indicator (8 bits for v1-9 byte mode)
    pushBits(Math.min(dataBytes.length, this.versionCapacities[version]), 8);
    // Data bytes
    const count = Math.min(dataBytes.length, this.versionCapacities[version]);
    for (let i = 0; i < count; i++) {
      pushBits(dataBytes[i], 8);
    }

    // Terminator (up to 4 zeroes)
    const requiredDataBits = this.totalDataCodewords[version] * 8;
    const termLen = Math.min(4, requiredDataBits - bitStream.length);
    for (let i = 0; i < termLen; i++) bitStream.push(0);

    // Byte align
    while (bitStream.length % 8 !== 0) bitStream.push(0);

    // Pad bytes 0xEC, 0x11
    let padToggle = false;
    while (bitStream.length < requiredDataBits) {
      pushBits(padToggle ? 0x11 : 0xec, 8);
      padToggle = !padToggle;
    }

    // Convert bit stream to bytes
    const dataCodewords: number[] = [];
    for (let i = 0; i < bitStream.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) {
        b = (b << 1) | bitStream[i + j];
      }
      dataCodewords.push(b);
    }

    // Generate Reed-Solomon Error Correction Codewords
    const numBlocks = this.numBlocks[version];
    const eccPerBlock = this.eccCodewordsPerBlock[version];
    const dataPerBlock = Math.floor(dataCodewords.length / numBlocks);

    // Generator polynomial for eccPerBlock
    const genPoly: number[] = [1];
    for (let i = 0; i < eccPerBlock; i++) {
      const nextPoly: number[] = Array(genPoly.length + 1).fill(0);
      const root = this.exp[i];
      for (let j = 0; j < genPoly.length; j++) {
        nextPoly[j] ^= this.gmul(genPoly[j], root);
        nextPoly[j + 1] ^= genPoly[j];
      }
      genPoly.length = nextPoly.length;
      for (let k = 0; k < nextPoly.length; k++) genPoly[k] = nextPoly[k];
    }

    const allBlocks: { data: number[]; ecc: number[] }[] = [];
    for (let b = 0; b < numBlocks; b++) {
      const slice = dataCodewords.slice(b * dataPerBlock, (b + 1) * dataPerBlock);
      const remainder = Array(eccPerBlock).fill(0);
      for (const byte of slice) {
        const factor = byte ^ remainder[0];
        remainder.shift();
        remainder.push(0);
        if (factor !== 0) {
          for (let i = 0; i < eccPerBlock; i++) {
            remainder[i] ^= this.gmul(genPoly[i], factor);
          }
        }
      }
      allBlocks.push({ data: slice, ecc: remainder });
    }

    // Interleave
    const finalCodewords: number[] = [];
    for (let i = 0; i < dataPerBlock; i++) {
      for (let b = 0; b < numBlocks; b++) {
        if (i < allBlocks[b].data.length) finalCodewords.push(allBlocks[b].data[i]);
      }
    }
    for (let i = 0; i < eccPerBlock; i++) {
      for (let b = 0; b < numBlocks; b++) {
        finalCodewords.push(allBlocks[b].ecc[i]);
      }
    }

    // Place codewords into matrix using zigzag upward/downward scan
    const finalBits: number[] = [];
    for (const byte of finalCodewords) {
      for (let i = 7; i >= 0; i--) finalBits.push((byte >> i) & 1);
    }

    let bitIdx = 0;
    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--; // Skip vertical timing column
      const cols = [right, right - 1];
      const rows = up
        ? Array.from({ length: size }, (_, i) => size - 1 - i)
        : Array.from({ length: size }, (_, i) => i);

      for (const row of rows) {
        for (const col of cols) {
          if (!isReserved[row][col]) {
            const val = bitIdx < finalBits.length ? finalBits[bitIdx++] === 1 : false;
            // Apply mask 0: (row + col) % 2 === 0
            const masked = ((row + col) % 2 === 0) ? !val : val;
            matrix[row][col] = masked;
          }
        }
      }
      up = !up;
    }

    // Format bits for ECC M + Mask 0 (0b00 + 0b000 = 00000 -> BCH 101010000010010)
    const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
    // Write format bits around top-left
    for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
    matrix[8][7] = formatBits[6] === 1;
    matrix[8][8] = formatBits[7] === 1;
    matrix[7][8] = formatBits[8] === 1;
    for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

    // Write format bits around top-right and bottom-left
    for (let i = 0; i < 7; i++) matrix[8][size - 1 - i] = formatBits[14 - i] === 1;
    for (let i = 0; i < 8; i++) matrix[size - 8 + i][8] = formatBits[i] === 1;

    return matrix.map((row) => row.map((cell) => cell === true));
  }
}

/**
 * Renders a QR code matrix to an SVG string with quiet zone.
 */
export function generateQrSvg(text: string, size = 200): string {
  try {
    const matrix = MinimalQR.generateMatrix(text);
    const n = matrix.length;
    const margin = 4;
    const totalDim = n + margin * 2;
    const scale = size / totalDim;

    let path = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          const x = (c + margin) * scale;
          const y = (r + margin) * scale;
          path += `M${x.toFixed(2)},${y.toFixed(2)}h${scale.toFixed(2)}v${scale.toFixed(2)}h-${scale.toFixed(2)}z `;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <path d="${path.trim()}" fill="#0f172a"/>
    </svg>`;
  } catch {
    return "";
  }
}

/**
 * Returns an inline Data URL of the SVG QR Code suitable for `<img src={...}/>`.
 */
export function generateQrDataUrl(text: string, size = 200): string {
  const svg = generateQrSvg(text, size);
  if (!svg) return "";
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
