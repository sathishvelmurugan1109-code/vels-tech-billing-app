import React, { useState, useEffect, useRef } from "react";
import { Camera, X, Search, Plus, AlertCircle, CheckCircle, Barcode } from "lucide-react";
import type { Product } from "../types";

export interface BarcodeScannerModalProps {
  products: Product[];
  onProductFound: (product: Product) => void;
  onOpenAddProductWithName?: (searchQuery: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({
  products,
  onProductFound,
  onOpenAddProductWithName,
  onClose,
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [successProduct, setSuccessProduct] = useState<Product | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus manual input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lookupCode = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    if (!trimmed) return;

    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === trimmed) ||
        (p.sku && p.sku.toLowerCase() === trimmed) ||
        (p.hsn && p.hsn.toLowerCase() === trimmed) ||
        p.id.toLowerCase() === trimmed ||
        p.name.toLowerCase() === trimmed,
    );

    if (found) {
      setSuccessProduct(found);
      setNotFoundQuery(null);
      setTimeout(() => {
        onProductFound(found);
        onClose();
      }, 500);
    } else {
      setNotFoundQuery(code.trim());
      setSuccessProduct(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupCode(manualCode);
  };

  // Camera Barcode Scanning with BarcodeDetector API if available
  const startCamera = async () => {
    setCameraError("");
    setNotFoundQuery(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      // Check if BarcodeDetector API exists
      const BarcodeDetector = (window as any).BarcodeDetector;
      if (BarcodeDetector) {
        const detector = new BarcodeDetector({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code", "upc_a", "upc_e"],
        });

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code) {
                clearInterval(scanInterval);
                stopCamera();
                lookupCode(code);
              }
            }
          } catch {
            // detection frame skip
          }
        }, 300);
      }
    } catch (err: any) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser settings."
          : "Camera not available or unsupported on this device.",
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-[480px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-[16px] text-zinc-900">Barcode & SKU Scanner</div>
              <div className="text-[11px] text-zinc-500">Scan camera or enter barcode / SKU</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Camera Viewfinder */}
          {cameraActive ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-zinc-800">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-dashed border-emerald-400 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-semibold text-emerald-300 bg-black/60 px-2 py-0.5 rounded-full">
                  Align Barcode Inside Box
                </span>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 h-8 px-3 rounded-lg bg-black/70 text-white text-[11px] font-medium"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <button
              onClick={startCamera}
              className="w-full h-28 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-semibold flex flex-col items-center justify-center gap-2 transition"
            >
              <Camera className="h-6 w-6" />
              <span className="text-[13px]">Open Camera Scanner</span>
              <span className="text-[11px] font-normal text-indigo-500">
                Works on phone and tablet cameras
              </span>
            </button>
          )}

          {cameraError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[12px] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Manual / Barcode Gun Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Barcode / SKU Gun Input
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Scan or type barcode (e.g. 890123...)"
                  className="w-full h-11 pl-4 pr-3 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-800 transition"
              >
                Lookup
              </button>
            </div>
            <div className="text-[11px] text-zinc-400">
              Hardware USB barcode scanners can type directly into this field.
            </div>
          </form>

          {/* Product Found Feedback */}
          {successProduct && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold">{successProduct.name}</span>
              </div>
              <span className="font-bold">Added to invoice</span>
            </div>
          )}

          {/* Product Not Found State */}
          {notFoundQuery && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-[13px] space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span>Product not found for: "{notFoundQuery}"</span>
              </div>
              <p className="text-[12px] text-red-700">
                No product with this barcode, SKU, or HSN was found in your inventory.
              </p>
              {onOpenAddProductWithName && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAddProductWithName(notFoundQuery);
                  }}
                  className="w-full h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-[12px] flex items-center justify-center gap-2 transition"
                >
                  <Plus className="h-4 w-4" /> Add Product "{notFoundQuery}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
