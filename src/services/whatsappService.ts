/**
 * whatsappService.ts — WhatsApp invoice sharing with PDF attachment.
 *
 * Strategy (in order of preference):
 *   1. Generate real invoice PDF → Web Share API (navigator.share) with
 *      the PDF File object (supported on Android, iOS, modern desktop).
 *   2. If Web Share unsupported → Download PDF first, then open WhatsApp
 *      (wa.me) with a short text message so the user can attach the PDF
 *      manually.
 *   3. If even wa.me is not viable → alert the user with clear instructions.
 *
 * Never claims "PDF sent via WhatsApp" when only a text message was opened.
 */

import { normalizeWaNumber } from "../components/InvoiceRenderer";
import {
  generateInvoicePdfBlob,
  downloadBlob,
  openInvoiceForPrint,
} from "./pdfService";
import type { Invoice, CompanySettings } from "../types";

let logoImg: string | null = null;

export function setInvoiceLogo(src: string | null) {
  logoImg = src;
}

export interface WaResult {
  method: "web-share" | "download-then-wa" | "wa-text-only" | "failed";
  message: string;
}

/** Build the short WhatsApp text message (PDF referenced separately). */
function buildWaText(inv: Invoice, settings: CompanySettings): string {
  const lines = [
    `*${settings.companyName}*`,
    `*TAX INVOICE ${inv.invoiceNo}* (${inv.date})`,
    `Bill To: ${inv.customerName}`,
    inv.customerPhone ? `Phone: ${inv.customerPhone}` : "",
    "",
    `*Grand Total: ₹${inv.grandTotal.toFixed(2)}*`,
    `Payment Status: ${inv.paymentStatus}`,
    `Payment Method: ${inv.paymentMode}`,
    "",
    "Please find the invoice PDF attached. If you don't see the attachment,",
    "tap 'Download Invoice PDF' from the app, then share it here.",
    "",
    `Thank you for your business!`,
    `— ${settings.companyName}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Share the invoice PDF via WhatsApp.
 *
 * Returns a WaResult describing what actually happened.
 */
export async function shareInvoiceViaWhatsApp(
  inv: Invoice,
  settings: CompanySettings,
): Promise<WaResult> {
  const wa = normalizeWaNumber(inv.customerPhone);
  if (!wa.waNumber) {
    return {
      method: "failed",
      message: "No valid WhatsApp number on this invoice.",
    };
  }

  // --- Strategy 1: Web Share API with real PDF file ---
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try {
      const pdfBlob = await generateInvoicePdfBlob(inv, settings);
      if (pdfBlob) {
        const pdfFile = new File([pdfBlob], `${inv.invoiceNo}.pdf`, {
          type: "application/pdf",
        });

        const shareData: {
          title: string;
          text: string;
          files: File[];
        } = {
          title: `Invoice ${inv.invoiceNo}`,
          text: buildWaText(inv, settings),
          files: [pdfFile],
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return {
            method: "web-share",
            message: `Invoice PDF shared via WhatsApp to ${wa.display}.`,
          };
        }

        // canShare returned false — fall through to download-then-wa
      }
    } catch (err) {
      // Web Share failed — fall through to download-then-wa
      console.warn("[whatsappService] Web Share failed:", err);
    }
  }

  // --- Strategy 2: Download PDF first, then open WhatsApp (text only) ---
  try {
    const pdfBlob = await generateInvoicePdfBlob(inv, settings);
    if (pdfBlob) {
      downloadBlob(pdfBlob, `${inv.invoiceNo}.pdf`);
    } else {
      // Libraries unavailable — open invoice for print-to-PDF instead
      openInvoiceForPrint(inv, settings);
    }
  } catch (err) {
    console.warn("[whatsappService] PDF download failed:", err);
    openInvoiceForPrint(inv, settings);
  }

  const msg = encodeURIComponent(buildWaText(inv, settings));
  window.open(`https://wa.me/${wa.waNumber}?text=${msg}`, "_blank", "noopener,noreferrer");

  return {
    method: "download-then-wa",
    message: `Invoice PDF downloaded. WhatsApp opened for ${wa.display}. Please attach the downloaded PDF and send.`,
  };
}

/**
 * Legacy text-only WhatsApp share (kept for compatibility where PDF share
 * is not possible). Returns the wa.me URL instead of opening it.
 */
export function buildWaTextOnlyUrl(inv: Invoice, settings: CompanySettings): string | null {
  const wa = normalizeWaNumber(inv.customerPhone);
  if (!wa.waNumber) return null;

  const msg = encodeURIComponent(buildWaText(inv, settings));
  return `https://wa.me/${wa.waNumber}?text=${msg}`;
}