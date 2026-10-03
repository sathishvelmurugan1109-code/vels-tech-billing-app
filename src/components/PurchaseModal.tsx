import React, { useState } from "react";
import { X, Truck, Plus, Trash2, AlertCircle } from "lucide-react";
import { formatCurrency, roundMoney } from "../services/money";
import { calculatePurchaseTotals } from "../services/purchaseService";
import type { Product, Supplier, Purchase, PurchaseItem, CompanySettings, PaymentMode } from "../types";

export interface PurchaseModalProps {
  suppliers: Supplier[];
  products: Product[];
  settings: CompanySettings;
  onSavePurchase: (purchase: Omit<Purchase, "id">) => void;
  onClose: () => void;
}

export function PurchaseModal({
  suppliers,
  products,
  settings,
  onSavePurchase,
  onClose,
}: PurchaseModalProps) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const purchaseTotals = calculatePurchaseTotals(
    items.map((it) => ({
      productId: it.productId,
      name: it.name,
      hsn: it.hsn,
      purchasePrice: it.purchasePrice,
      qty: it.qty,
      discount: it.discount,
      gst: it.gst,
      priceInclusive: it.priceInclusive,
    })),
    settings.state,
    selectedSupplier?.state || settings.state,
  );

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        hsn: prod.hsn,
        purchasePrice: prod.purchasePrice || prod.cost || prod.price * 0.7,
        qty: 1,
        discount: 0,
        gst: prod.gst,
        unit: prod.unit,
      },
    ]);
  };

  const handleUpdateItem = (index: number, patch: Partial<PurchaseItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !selectedSupplier) {
      setError("Please select a supplier");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one product to the purchase");
      return;
    }

    const safePaid =
      typeof paidAmount === "number"
        ? paidAmount
        : paidAmount !== ""
        ? parseFloat(String(paidAmount)) || 0
        : 0;

    const purchaseNo = `PO-${String(Date.now()).slice(-6)}`;
    const grandTotal = purchaseTotals.grandTotal;

    const paymentStatus =
      safePaid >= grandTotal ? "Paid" : safePaid > 0 ? "Partial" : "Pending";

    onSavePurchase({
      purchaseNo,
      supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
      supplierId,
      supplierName: selectedSupplier.name,
      supplierGstin: selectedSupplier.gstin,
      supplierState: selectedSupplier.state,
      date,
      items,
      subtotal: purchaseTotals.subtotal,
      discountTotal: purchaseTotals.discountTotal,
      taxableAmount: purchaseTotals.taxableAmount,
      cgst: purchaseTotals.cgst,
      sgst: purchaseTotals.sgst,
      igst: purchaseTotals.igst,
      gstTotal: purchaseTotals.gstTotal,
      grandTotal,
      paidAmount: safePaid,
      paymentMode,
      paymentStatus,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-3 md:p-6 overflow-y-auto">
      <div className="w-full max-w-[760px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-4">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 grid place-items-center font-bold">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">Purchase Inward Entry</div>
              <div className="text-[11px] text-zinc-500">
                Inward goods from supplier and automatically update stock
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">SUPPLIER *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white focus:outline-none"
              >
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                SUPPLIER BILL / INVOICE NO
              </label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="e.g. INV-9042"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">PURCHASE DATE</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white"
              />
            </div>
          </div>

          {/* Add Products */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Purchase Items
              </span>
              <div className="w-64">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddItem(e.target.value);
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-200 text-[12px] bg-zinc-50 font-medium"
                >
                  <option value="">+ Add Product to Inward...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (In-Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 grid grid-cols-12 gap-2 items-center text-[12px] hover:bg-zinc-50/50"
                >
                  <div className="col-span-4 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate">{it.name}</div>
                    <div className="text-[11px] text-zinc-400 mono">GST {it.gst}%</div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-zinc-400 block">QTY</label>
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) =>
                        handleUpdateItem(idx, { qty: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-full h-8 px-2 rounded-lg border border-zinc-200 text-center mono font-bold"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-zinc-400 block">PURCHASE RATE</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={it.purchasePrice}
                      onChange={(e) =>
                        handleUpdateItem(idx, {
                          purchasePrice: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="w-full h-8 px-2 rounded-lg border border-zinc-200 text-right mono font-semibold"
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <label className="text-[10px] text-zinc-400 block">TOTAL</label>
                    <div className="font-bold mono text-zinc-900 leading-8">
                      {formatCurrency(it.purchasePrice * it.qty)}
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-8 w-8 grid place-items-center rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-[12px]">
                  No products added yet. Use dropdown above to add products.
                </div>
              )}
            </div>
          </div>

          {/* Totals & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-zinc-100">
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Payment Info
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 uppercase">
                      PAID AMOUNT (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={paidAmount}
                      onChange={(e) =>
                        setPaidAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[14px] font-bold mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-zinc-600 uppercase">
                      PAYMENT MODE
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as any)}
                      className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Bank / Card</option>
                      <option value="Credit">Credit (Unpaid)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase">NOTES</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Transport, delivery, or LR number..."
                    className="mt-1 w-full h-10 px-3.5 rounded-xl border border-zinc-200 text-[13px]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-[12px] space-y-2 h-fit">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal:</span>
                <span className="mono font-medium">{formatCurrency(purchaseTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Purchase GST ({purchaseTotals.igst > 0 ? "IGST" : "CGST+SGST"}):</span>
                <span className="mono font-medium">{formatCurrency(purchaseTotals.gstTotal)}</span>
              </div>
              <div className="flex justify-between text-[16px] font-extrabold text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Grand Total:</span>
                <span className="mono">{formatCurrency(purchaseTotals.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-[12px] font-semibold text-rose-600 pt-1">
                <span>Balance Due to Supplier:</span>
                <span className="mono">
                  {formatCurrency(
                    Math.max(
                      0,
                      purchaseTotals.grandTotal -
                        (typeof paidAmount === "number" ? paidAmount : 0),
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[13px] transition shadow-sm"
            >
              Confirm Purchase & Inward Stock ({formatCurrency(purchaseTotals.grandTotal)})
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
