/**
 * pdfService.ts — Client-side invoice PDF generation.
 *
 * Uses html2canvas + jspdf (loaded via CDN in index.html) to render the
 * invoice HTML to a real PDF document. Falls back to opening the invoice
 * HTML in a new window for browser print-to-PDF when the libraries are
 * not available.
 */

import { buildInvoiceHtmlDoc } from "../components/InvoiceRenderer";
import type { Invoice, CompanySettings } from "../types";

let logoImg: string | null = null;

export function setInvoiceLogo(src: string | null) {
  logoImg = src;
}

/** Check if jspdf + html2canvas are available (loaded via CDN/global). */
function getLibs(): { jsPDF: any; html2canvas: any } | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const jsPDF = w?.jspdf?.jsPDF || w?.jspdf?.default || w?.jsPDF;
  const html2canvas = w?.html2canvas;
  if (!jsPDF || !html2canvas) return null;
  return { jsPDF, html2canvas };
}

function libsAvailable(): boolean {
  return getLibs() !== null;
}

/**
 * Generate a PDF Blob from an invoice using html2canvas + jspdf.
 * Returns null if the libraries are not available.
 */
export async function generateInvoicePdfBlob(
  inv: Invoice,
  settings: CompanySettings,
): Promise<Blob | null> {
  const libs = getLibs();
  if (!libs) return null;
  const { jsPDF, html2canvas } = libs;

  const html = buildInvoiceHtmlDoc(inv, settings, logoImg || "");

  // Render the invoice HTML to a canvas
  const tempContainer = document.createElement("div");
  tempContainer.style.position = "fixed";
  tempContainer.style.top = "0";
  tempContainer.style.left = "0";
  tempContainer.style.width = "210mm"; // A4 width
  tempContainer.style.background = "#ffffff";
  tempContainer.style.padding = "0";
  tempContainer.innerHTML = html;
  document.body.appendChild(tempContainer);

  try {
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      logging: false,
      letterRendering: true,
      width: tempContainer.offsetWidth || 794,
      height: tempContainer.offsetHeight || 1123,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output("blob");
    return pdfBlob;
  } finally {
    document.body.removeChild(tempContainer);
  }
}

/**
 * Fallback: Open invoice HTML in a new window so the user can print/save as PDF.
 */
export function openInvoiceForPrint(inv: Invoice, settings: CompanySettings): void {
  const html = buildInvoiceHtmlDoc(inv, settings, logoImg || "");
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch {} }, 250);
}

/** Download a Blob as a file. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}