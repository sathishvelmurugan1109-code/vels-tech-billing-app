import React, { useState } from "react";
import { X, RotateCcw, AlertCircle, Check, ArrowRight } from "lucide-react";
import { formatCurrency, roundMoney } from "../services/money";
import { calculateSalesReturn } from "../services/purchaseService";
import type { Invoice, SalesReturn, CompanySettings } from "../types";

export interface SalesReturnModalProps {
  invoices: Invoice[];
  settings: CompanySettings;
  initialInvoice?: Invoice | null;
  onConfirmReturn: (salesReturn: Omit<SalesReturn, "id">) => void;
  onClose: () => void;
}

export function SalesReturnModal({
  invoices,
  settings,
  initialInvoice,
  onConfirmReturn,
  onClose,
}: SalesReturnModalProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoice?.id || "");
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("Defective Product");
  const [settlementMode, setSettlementMode] = useState<"Credit" | "Refund">("Credit");
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [error, setError] = useState("");

  const activeInvoices = invoices.filter((i) => i.status !== "Cancelled");
  const invoice = invoices.find((i) => i.id === selectedInvoiceId);

  const handleQtyChange = (productId: string, qty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(maxQty, qty));
    setReturnQtys((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  // Build calculation lines for products that have returned quantity > 0
  const returnLines = invoice
    ? invoice.items
        .filter((it) => (returnQtys[it.productId] || 0) > 0)
        .map((it) => ({
          productId: it.productId,
          name: it.name,
          hsn: it.hsn,
          price: it.price,
          qty: returnQtys[it.productId] || 0,
          discount: it.discount,
          discountType: it.discountType,
          gst: it.gst,
          priceInclusive: it.priceInclusive,
          unit: it.unit,
        }))
    : [];

  const calc = calculateSalesReturn(
    returnLines,
    settings.state,
    invoice?.customerState || settings.state,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) {
      setError("Please select an invoice to return items from.");
      return;
    }
    if (returnLines.length === 0) {
      setError("Please specify a return quantity greater than 0 for at least one product.");
      return;
    }

    const returnTotal = calc.total;
    const finalRefund =
      settlementMode === "Refund"
        ? typeof refundAmount === "number"
          ? refundAmount
          : parseFloat(String(refundAmount)) || returnTotal
        : 0;

    const finalCredit = settlementMode === "Credit" ? returnTotal : 0;

    const returnNo = `SR-${String(Date.now()).slice(-6)}`;

    onConfirmReturn({
      returnNo,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerState: invoice.customerState,
      date: new Date().toISOString().slice(0, 10),
      items: returnLines.map((l) => ({
        productId: l.productId,
        name: l.name,
        hsn: l.hsn,
        price: l.price,
        qty: l.qty,
        discount: l.discount || 0,
        gst: l.gst,
        unit: l.unit,
      })),
      taxableAmount: calc.taxableAmount,
      cgst: calc.cgst,
      sgst: calc.sgst,
      igst: calc.igst,
      gstTotal: calc.gstTotal,
      total: returnTotal,
      refundAmount: finalRefund,
      creditAmount: finalCredit,
      reason,
      notes: `${settlementMode}: ${formatCurrency(settlementMode === "Refund" ? finalRefund : finalCredit)}`,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-[620px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700 grid place-items-center font-bold">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">Process Sales Return</div>
              <div className="text-[11px] text-zinc-500">
                Restores inventory, reverses taxes, and adjusts customer balance
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">
              SELECT ORIGINAL INVOICE *
            </label>
            <select
              required
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                setReturnQtys({});
              }}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium focus:outline-none"
            >
              <option value="">Select an invoice to return items from</option>
              {activeInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNo} — {inv.customerName} ({inv.date}) — {formatCurrency(inv.grandTotal)}
                </option>
              ))}
            </select>
          </div>

          {invoice && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Select Items To Return
              </div>
              <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                {invoice.items.map((it) => {
                  const qty = returnQtys[it.productId] || 0;
                  return (
                    <div
                      key={it.productId}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-zinc-900 truncate">
                          {it.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Billed: {it.qty} {it.unit || "pcs"} @ {formatCurrency(it.price)} (GST {it.gst}%)
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500">Return Qty:</span>
                        <input
                          type="number"
                          min="0"
                          max={it.qty}
                          value={qty}
                          onChange={(e) =>
                            handleQtyChange(
                              it.productId,
                              parseInt(e.target.value) || 0,
                              it.qty,
                            )
                          }
                          className="w-16 h-8 text-center rounded-lg border border-zinc-300 font-bold mono text-[13px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Return Calculation */}
              {returnLines.length > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-[12px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Taxable Goods Value:</span>
                    <span className="mono font-semibold">{formatCurrency(calc.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Reversed GST ({calc.igst > 0 ? "IGST" : "CGST+SGST"}):</span>
                    <span className="mono font-semibold">{formatCurrency(calc.gstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[14px] font-extrabold text-zinc-900 pt-1 border-t border-zinc-200">
                    <span>Total Return Credit:</span>
                    <span className="mono">{formatCurrency(calc.total)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">
                    RETURN REASON
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white"
                  >
                    <option value="Defective Product">Defective / Damaged</option>
                    <option value="Wrong Item Delivered">Wrong Item</option>
                    <option value="Customer Mind Change">Customer Changed Mind</option>
                    <option value="Billing Mistake">Billing Quantity Correction</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">
                    SETTLEMENT METHOD
                  </label>
                  <select
                    value={settlementMode}
                    onChange={(e) => setSettlementMode(e.target.value as any)}
                    className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-semibold"
                  >
                    <option value="Credit">Credit Note (Reduces Customer Due)</option>
                    <option value="Refund">Cash / UPI Refund Payout</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              disabled={!invoice || returnLines.length === 0}
              className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-[13px] transition shadow-sm"
            >
              Confirm Sales Return ({formatCurrency(calc.total)})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-[13px] font-medium text-zinc-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
