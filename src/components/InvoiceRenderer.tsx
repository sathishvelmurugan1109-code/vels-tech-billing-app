import React from "react";
import { formatCurrency, roundMoney } from "../services/money";
import { generateQrDataUrl, buildUpiUri } from "../services/qrService";
import type { Invoice, CompanySettings } from "../types";
import { Phone, Mail, Calendar, Check, AlertCircle } from "lucide-react";

export interface InvoiceRendererProps {
  invoice: Invoice;
  settings: CompanySettings;
  invoiceLogo: string;
  isPrintArea?: boolean;
}

export function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeWaNumber(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  const core = digits.replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  return {
    digits10: core.length === 10 ? core : "",
    waNumber: core.length === 10 ? `91${core}` : "",
    display: core.length === 10 ? `+91 ${core.slice(0, 5)} ${core.slice(5)}` : String(raw || "").trim(),
  };
}

export function buildWhatsAppText(inv: Invoice, settings: CompanySettings): string {
  const lines = inv.items.map(
    (it, i) =>
      `${i + 1}. ${it.name} (HSN ${it.hsn}) - ${it.qty} x ${formatCurrency(it.price)}, Disc ${it.discount || 0}%, GST ${it.gst}%`,
  );

  return [
    `*${settings.companyName}*`,
    settings.address,
    `GSTIN: ${settings.gstin}`,
    ``,
    `*TAX INVOICE ${inv.invoiceNo}* (${inv.date})`,
    `Bill To: ${inv.customerName}`,
    inv.customerPhone ? `Phone: ${inv.customerPhone}` : "",
    inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : "",
    inv.customerAddress ? `Address: ${inv.customerAddress}, ${inv.customerState}` : "",
    ``,
    ...lines,
    ``,
    `Taxable Amount: ${formatCurrency(inv.taxableAmount)}`,
    inv.cgst > 0
      ? `CGST: ${formatCurrency(inv.cgst)} | SGST: ${formatCurrency(inv.sgst)}`
      : `IGST: ${formatCurrency(inv.igst)}`,
    inv.roundOff !== 0 ? `Round Off: ${inv.roundOff > 0 ? "+" : ""}${formatCurrency(inv.roundOff)}` : "",
    `*Grand Total: ${formatCurrency(inv.grandTotal)}*`,
    `Paid (${inv.paymentMode}): ${formatCurrency(inv.paidAmount)}`,
    `Balance: ${formatCurrency(inv.grandTotal - inv.paidAmount)}`,
    inv.grandTotal - inv.paidAmount > 0 && settings.upiId ? `Pay via UPI: ${settings.upiId}` : "",
    ``,
    `Thank you for your business!`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildCustomerWaMessage(
  customerName: string,
  invoiceNo: string,
  invoiceDate: string,
  grandTotal: number,
  payStatus: string,
  payMode: string,
  settings: CompanySettings,
): string {
  return [
    `Hello ${customerName},`,
    ``,
    `Greetings from ${settings.companyName}.`,
    ``,
    `Your invoice ${invoiceNo} has been generated.`,
    ``,
    `*Invoice Amount: ${formatCurrency(grandTotal)}*`,
    `Payment Status: ${payStatus}`,
    `Payment Method: ${payMode}`,
    `Invoice Date: ${invoiceDate}`,
    ``,
    `Thank you for your business!`,
    ``,
    `Regards,`,
    `${settings.companyName}`,
  ].join("\n");
}

/**
 * Builds a standalone, beautiful HTML document suitable for download or native PDF printing.
 */
export function buildInvoiceHtmlDoc(inv: Invoice, settings: CompanySettings, invoiceLogo: string): string {
  const balance = Math.max(0, inv.grandTotal - inv.paidAmount);
  const upiQrDataUrl =
    settings.upiQr ||
    (settings.upiId
      ? generateQrDataUrl(
          buildUpiUri({
            upiId: settings.upiId,
            upiName: settings.upiName || settings.companyName,
            amount: balance > 0 ? balance : inv.grandTotal,
            note: `Inv ${inv.invoiceNo}`,
          }),
          140,
        )
      : "");

  const rows = inv.items
    .map((it, idx) => {
      const gross = it.price * it.qty;
      const disc = (gross * (it.discount || 0)) / 100;
      const taxable = gross - disc;
      const gstAmt = (taxable * it.gst) / 100;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${idx + 1}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
          <strong>${escapeHtml(it.name)}</strong>
          ${it.hsn ? `<div style="font-size:10px;color:#64748b;">HSN: ${escapeHtml(it.hsn)}</div>` : ""}
        </td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${it.qty} ${escapeHtml(it.unit || "pcs")}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(it.price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${it.discount || 0}%</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(taxable)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${it.gst}%</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatCurrency(taxable + gstAmt)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${escapeHtml(inv.invoiceNo)} - ${escapeHtml(settings.companyName)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
    .avoid-break { page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #0f172a; color: #fff; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
  </style>
</head>
<body>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:16px;">
    <div style="display:flex; gap:12px; align-items:center;">
      ${invoiceLogo ? `<img src="${invoiceLogo}" alt="Logo" style="height:54px; width:54px; object-fit:contain; border-radius:8px;"/>` : ""}
      <div>
        <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.02em;">${escapeHtml(settings.companyName)}</h1>
        <div style="color:#475569; font-size:11px; margin-top:2px; max-width:380px;">${escapeHtml(settings.address)}</div>
        <div style="font-size:11px; color:#334155; margin-top:4px;">
          <strong>GSTIN:</strong> ${escapeHtml(settings.gstin)} | <strong>Phone:</strong> ${escapeHtml(settings.phone)}
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.15em;">TAX INVOICE</div>
      <div style="font-size:18px; font-weight:800; font-family:monospace; margin-top:2px;">${escapeHtml(inv.invoiceNo)}</div>
      <div style="color:#475569; font-size:11px; margin-top:2px;">Date: ${escapeHtml(inv.date)}</div>
      <div style="margin-top:4px; display:inline-block; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700; background:#f1f5f9; border:1px solid #cbd5e1;">
        ${escapeHtml(inv.paymentStatus)} • ${escapeHtml(inv.paymentMode)}
      </div>
    </div>
  </div>

  <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:16px; margin-top:16px;" class="avoid-break">
    <div class="box">
      <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Billed To:</div>
      <div style="font-size:14px; font-weight:700; margin-top:4px;">${escapeHtml(inv.customerName)}</div>
      ${inv.customerAddress ? `<div style="color:#475569; font-size:11px; margin-top:2px;">${escapeHtml(inv.customerAddress)}</div>` : ""}
      <div style="font-size:11px; color:#334155; margin-top:4px;">
        ${inv.customerState ? `<span>State: ${escapeHtml(inv.customerState)}</span> ` : ""}
        ${inv.customerPhone ? `| <span>Phone: ${escapeHtml(inv.customerPhone)}</span> ` : ""}
        ${inv.customerGstin ? `| <span>GSTIN: ${escapeHtml(inv.customerGstin)}</span>` : ""}
      </div>
    </div>

    ${
      settings.upiId || upiQrDataUrl
        ? `<div class="box" style="display:flex; gap:12px; align-items:center;">
        ${upiQrDataUrl ? `<img src="${upiQrDataUrl}" alt="UPI QR" style="width:70px; height:70px;"/>` : ""}
        <div style="font-size:11px; line-height:1.4;">
          <strong>Scan & Pay via UPI</strong><br/>
          UPI ID: <span style="font-family:monospace;">${escapeHtml(settings.upiId)}</span><br/>
          Payable: <strong>${formatCurrency(balance > 0 ? balance : inv.grandTotal)}</strong>
        </div>
      </div>`
        : `<div></div>`
    }
  </div>

  <table class="avoid-break">
    <thead>
      <tr>
        <th style="width:30px; text-align:center;">#</th>
        <th style="text-align:left;">Item & Description</th>
        <th style="width:60px; text-align:center;">Qty</th>
        <th style="width:80px; text-align:right;">Rate</th>
        <th style="width:50px; text-align:right;">Disc</th>
        <th style="width:90px; text-align:right;">Taxable</th>
        <th style="width:50px; text-align:right;">GST</th>
        <th style="width:90px; text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:16px; margin-top:16px;" class="avoid-break">
    <div>
      <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Terms & Conditions:</div>
      <div style="font-size:10px; color:#475569; margin-top:4px; white-space:pre-wrap; border:1px solid #e2e8f0; padding:8px; border-radius:6px; background:#f8fafc;">
        ${escapeHtml(inv.terms || settings.invoiceTerms)}
      </div>
      ${
        inv.notes
          ? `<div style="font-size:10px; font-weight:700; color:#64748b; margin-top:8px; text-transform:uppercase;">Notes:</div>
             <div style="font-size:11px; color:#0f172a; margin-top:2px; border:1px solid #fde68a; padding:6px; border-radius:6px; background:#fef3c7;">
               ${escapeHtml(inv.notes)}
             </div>`
          : ""
      }
    </div>

    <div class="box" style="padding:10px 14px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
        <span style="color:#64748b;">Subtotal:</span>
        <span style="font-family:monospace;">${formatCurrency(inv.subtotal)}</span>
      </div>
      ${
        inv.discountTotal > 0
          ? `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px; color:#b45309;">
              <span>Discount:</span>
              <span style="font-family:monospace;">- ${formatCurrency(inv.discountTotal)}</span>
            </div>`
          : ""
      }
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
        <span style="color:#64748b;">Taxable Amount:</span>
        <span style="font-family:monospace;">${formatCurrency(inv.taxableAmount)}</span>
      </div>
      ${
        inv.cgst > 0
          ? `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
              <span style="color:#64748b;">CGST:</span>
              <span style="font-family:monospace;">${formatCurrency(inv.cgst)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
              <span style="color:#64748b;">SGST:</span>
              <span style="font-family:monospace;">${formatCurrency(inv.sgst)}</span>
            </div>`
          : `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
              <span style="color:#64748b;">IGST:</span>
              <span style="font-family:monospace;">${formatCurrency(inv.igst)}</span>
            </div>`
      }
      ${
        inv.roundOff !== 0
          ? `<div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">
              <span style="color:#64748b;">Round Off:</span>
              <span style="font-family:monospace;">${inv.roundOff > 0 ? "+" : ""}${formatCurrency(inv.roundOff)}</span>
            </div>`
          : ""
      }
      <div style="border-top:1px solid #cbd5e1; margin-top:6px; padding-top:6px; display:flex; justify-content:space-between; font-size:15px; font-weight:800;">
        <span>Grand Total:</span>
        <span style="font-family:monospace;">${formatCurrency(inv.grandTotal)}</span>
      </div>
      <div style="border-top:1px dashed #cbd5e1; margin-top:6px; padding-top:6px; font-size:11px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#64748b;">Paid Amount:</span>
          <span style="font-family:monospace; font-weight:600;">${formatCurrency(inv.paidAmount)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700; color:${balance > 0 ? "#dc2626" : "#15803d"};">
          <span>Balance Due:</span>
          <span style="font-family:monospace;">${formatCurrency(balance)}</span>
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top:32px; display:flex; justify-content:space-between; align-items:flex-end;" class="avoid-break">
    <div style="font-size:10px; color:#64748b;">
      ${escapeHtml(settings.footerMessage || "Thank you for your business! Computer generated invoice.")}
    </div>
    <div style="text-align:center;">
      <div style="height:36px; border-bottom:1px solid #94a3b8; width:160px; margin-bottom:4px;"></div>
      <div style="font-size:11px; font-weight:700;">For ${escapeHtml(settings.companyName)}</div>
      <div style="font-size:10px; color:#64748b;">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;
}

export function InvoiceRenderer({ invoice, settings, invoiceLogo, isPrintArea = false }: InvoiceRendererProps) {
  const balance = Math.max(0, invoice.grandTotal - invoice.paidAmount);

  // Dynamic UPI QR code generation if UPI is configured
  const upiUrl = settings.upiId
    ? buildUpiUri({
        upiId: settings.upiId,
        upiName: settings.upiName || settings.companyName,
        amount: balance > 0 ? balance : invoice.grandTotal,
        note: `Inv ${invoice.invoiceNo}`,
      })
    : "";

  const upiQrDataUrl = settings.upiQr || (upiUrl ? generateQrDataUrl(upiUrl, 140) : "");

  return (
    <div
      id={isPrintArea ? "print-area" : undefined}
      className="max-w-[900px] mx-auto bg-white md:rounded-[20px] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.15)] border border-zinc-200 overflow-hidden text-zinc-900"
    >
      <div className="p-6 md:p-10">
        {/* Header Section */}
        <div className="avoid-break flex flex-col md:flex-row items-start justify-between gap-6 pb-6 border-b border-zinc-200">
          <div className="flex gap-4 items-start">
            {invoiceLogo ? (
              <img
                src={invoiceLogo}
                alt="Company logo"
                className="h-14 w-14 rounded-xl shadow-sm object-contain border border-zinc-100 bg-white"
              />
            ) : null}
            <div>
              <div className="font-extrabold tracking-tight text-[22px] leading-tight">
                {settings.companyName}
              </div>
              <div className="mt-1 text-[12px] text-zinc-600 leading-snug max-w-[420px]">
                {settings.address}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] mono">
                {settings.gstin && (
                  <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200 font-semibold">
                    GSTIN: {settings.gstin}
                  </span>
                )}
                {settings.phone && (
                  <span className="flex items-center gap-1 text-zinc-600">
                    <Phone className="h-3 w-3" /> {settings.phone}
                  </span>
                )}
                {settings.email && (
                  <span className="flex items-center gap-1 text-zinc-600">
                    <Mail className="h-3 w-3" /> {settings.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-left md:text-right w-full md:w-auto">
            <div className="text-[11px] tracking-[0.18em] font-bold text-zinc-400">TAX INVOICE</div>
            <div className="mt-1 mono font-extrabold text-[20px] text-zinc-900">
              {invoice.invoiceNo}
            </div>
            <div className="mt-1 text-[12px] text-zinc-600 flex items-center md:justify-end gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" /> {invoice.date}
            </div>
            <div className="mt-2.5 flex items-center md:justify-end gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-semibold ${
                  invoice.status === "Cancelled"
                    ? "bg-zinc-100 text-zinc-600 border-zinc-300"
                    : invoice.paymentStatus === "Paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invoice.paymentStatus === "Pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {invoice.status === "Cancelled" ? "Cancelled" : invoice.paymentStatus}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 border text-zinc-700 font-medium">
                {invoice.paymentMode}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & UPI Payment Details */}
        <div className="avoid-break mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
            <div className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
              Bill To
            </div>
            <div className="mt-2 font-bold text-[15px]">{invoice.customerName}</div>
            {invoice.customerAddress && (
              <div className="mt-1 text-[12px] text-zinc-600 leading-snug">
                {invoice.customerAddress}
              </div>
            )}
            <div className="mt-2.5 flex flex-wrap gap-2 text-[11px]">
              {invoice.customerState && (
                <span className="px-2 py-0.5 rounded bg-white border mono text-zinc-700">
                  {invoice.customerState}
                </span>
              )}
              {invoice.customerGstin && (
                <span className="px-2 py-0.5 rounded bg-white border mono font-medium">
                  GSTIN: {invoice.customerGstin}
                </span>
              )}
              {invoice.customerPhone && (
                <span className="px-2 py-0.5 rounded bg-white border flex items-center gap-1 text-zinc-700">
                  <Phone className="h-3 w-3" /> {invoice.customerPhone}
                </span>
              )}
            </div>
          </div>

          {settings.upiId || upiQrDataUrl ? (
            <div className="rounded-xl border border-zinc-200 p-4 flex gap-4 items-center bg-zinc-50/50">
              {upiQrDataUrl ? (
                <div className="p-1.5 bg-white border border-zinc-200 rounded-xl shrink-0 shadow-sm">
                  <img src={upiQrDataUrl} alt="UPI Payment QR" className="h-20 w-20 object-contain" />
                </div>
              ) : null}
              <div className="text-[12px] leading-snug text-zinc-600">
                <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Scan & Pay via UPI
                </div>
                <div className="mt-1 mono text-[11px]">UPI: {settings.upiId}</div>
                <div className="mt-1 font-semibold text-zinc-900">
                  Amount: {formatCurrency(balance > 0 ? balance : invoice.grandTotal)}
                </div>
                {settings.paymentInstructions && (
                  <div className="mt-1 text-[11px] text-zinc-500 italic">
                    {settings.paymentInstructions}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-4 flex items-center justify-center text-zinc-400 text-[12px]">
              No payment instructions configured
            </div>
          )}
        </div>

        {/* Products Table */}
        <div className="avoid-break mt-6 rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-zinc-900 text-white text-[11px] tracking-wide">
                <tr>
                  <th className="text-center font-semibold px-3 py-3 w-10">#</th>
                  <th className="text-left font-semibold px-4 py-3">Product / Description</th>
                  <th className="text-center font-semibold px-3 py-3">Qty</th>
                  <th className="text-right font-semibold px-3 py-3">Rate</th>
                  <th className="text-right font-semibold px-3 py-3">Disc</th>
                  <th className="text-right font-semibold px-3 py-3">Taxable</th>
                  <th className="text-center font-semibold px-3 py-3">GST%</th>
                  <th className="text-right font-semibold px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoice.items.map((it, idx) => {
                  const line = it.price * it.qty;
                  const disc = (line * (it.discount || 0)) / 100;
                  const taxable = line - disc;
                  const gstAmt = (taxable * it.gst) / 100;
                  return (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="px-3 py-3 text-center text-zinc-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900">{it.name}</div>
                        <div className="text-[11px] text-zinc-500 mono">
                          {it.hsn ? `HSN ${it.hsn}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-medium">
                        {it.qty} {it.unit || "pcs"}
                      </td>
                      <td className="px-3 py-3 text-right mono">{formatCurrency(it.price)}</td>
                      <td className="px-3 py-3 text-right mono">
                        {it.discount ? `${it.discount}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right mono">{formatCurrency(taxable)}</td>
                      <td className="px-3 py-3 text-center mono">{it.gst}%</td>
                      <td className="px-4 py-3 text-right font-bold mono">
                        {formatCurrency(taxable + gstAmt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary & Terms */}
        <div className="avoid-break mt-6 grid md:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
                Terms & Conditions
              </div>
              <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-600 whitespace-pre-wrap bg-zinc-50 border border-zinc-200 rounded-xl p-3.5">
                {invoice.terms || settings.invoiceTerms}
              </div>
            </div>

            {invoice.notes && (
              <div>
                <div className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">
                  Invoice Notes
                </div>
                <div className="mt-1.5 text-[12px] bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-amber-900">
                  {invoice.notes}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 h-fit">
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-medium mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Discount Total</span>
                  <span className="font-medium mono">- {formatCurrency(invoice.discountTotal)}</span>
                </div>
              )}
              <div className="h-px bg-zinc-200 my-1" />
              <div className="flex justify-between">
                <span className="text-zinc-500">Taxable Amount</span>
                <span className="font-semibold mono">{formatCurrency(invoice.taxableAmount)}</span>
              </div>
              {invoice.cgst > 0 ? (
                <>
                  <div className="flex justify-between text-zinc-600 text-[11px]">
                    <span>CGST</span>
                    <span className="mono">{formatCurrency(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-[11px]">
                    <span>SGST</span>
                    <span className="mono">{formatCurrency(invoice.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-zinc-600 text-[11px]">
                  <span>IGST</span>
                  <span className="mono">{formatCurrency(invoice.igst)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-[11px] text-zinc-500">
                  <span>Round Off</span>
                  <span className="mono">
                    {invoice.roundOff > 0 ? "+" : ""}
                    {formatCurrency(invoice.roundOff)}
                  </span>
                </div>
              )}
              <div className="h-px bg-zinc-300 my-1" />
              <div className="flex justify-between text-[17px] font-extrabold text-zinc-900">
                <span>Grand Total</span>
                <span className="mono">{formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-zinc-200 flex justify-between text-[12px]">
                <span className="text-zinc-500">Paid Amount</span>
                <span className="mono font-semibold text-emerald-700">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-[12px] font-bold">
                <span className="text-zinc-700">Balance Due</span>
                <span className={`mono ${balance > 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-200 flex justify-between items-end">
              <div className="text-[10px] text-zinc-400">Customer Signature</div>
              <div className="text-center">
                <div className="h-8 w-32 border-b border-zinc-300 mb-1" />
                <div className="text-[11px] font-semibold">For {settings.companyName}</div>
                <div className="text-[10px] text-zinc-400">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[11px] text-zinc-400 border-t border-zinc-100 pt-4">
          {settings.footerMessage ||
            `This is a computer generated invoice. Thank you for shopping at ${settings.companyName}.`}
        </div>
      </div>
    </div>
  );
}
