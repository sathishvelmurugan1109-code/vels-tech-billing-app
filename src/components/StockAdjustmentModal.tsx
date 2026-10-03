import React, { useState } from "react";
import { X, SlidersHorizontal, ArrowDownToLine, ArrowUpFromLine, AlertCircle } from "lucide-react";
import type { Product, StockMovement, StockMovementType } from "../types";

export interface StockAdjustmentModalProps {
  products: Product[];
  initialProduct?: Product | null;
  defaultType?: StockMovementType;
  onSaveMovement: (movement: Omit<StockMovement, "id">) => void;
  onClose: () => void;
}

export function StockAdjustmentModal({
  products,
  initialProduct,
  defaultType = "Adjustment",
  onSaveMovement,
  onClose,
}: StockAdjustmentModalProps) {
  const [productId, setProductId] = useState<string>(initialProduct?.id || "");
  const [type, setType] = useState<StockMovementType>(defaultType);
  const [quantity, setQuantity] = useState<number | "">("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !selectedProduct) {
      setError("Please select a product");
      return;
    }
    const qty = typeof quantity === "number" ? quantity : parseFloat(String(quantity)) || 0;
    if (qty <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }

    // Determine sign: Stock In, Adjustment In is positive; Damage, Expired, Stock Out is negative
    const isDeduction = type === "Damage" || type === "Expired" || type === "Stock Out";
    const signedDelta = isDeduction ? -qty : qty;
    const previousStock = selectedProduct.stock;
    const newStock = Math.max(0, previousProductStock(previousStock, signedDelta));

    onSaveMovement({
      date: new Date().toISOString().slice(0, 10),
      productId,
      productName: selectedProduct.name,
      type,
      quantity: signedDelta,
      reference: reference.trim() || `${type} Entry`,
      previousStock,
      newStock,
      notes: notes.trim() || undefined,
    });
  };

  const previousProductStock = (current: number, delta: number) => {
    return current + delta;
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-[500px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center font-bold">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">Stock Adjustment & Inward</div>
              <div className="text-[11px] text-zinc-500">Record stock addition, damage or recount</div>
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
            <label className="text-[11px] font-bold text-zinc-600 uppercase">SELECT PRODUCT *</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium focus:outline-none"
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-[12px] flex justify-between items-center">
              <span className="text-zinc-500">Current In-Stock:</span>
              <span className="font-bold mono text-[14px]">
                {selectedProduct.stock} {selectedProduct.unit}
              </span>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">MOVEMENT TYPE</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StockMovementType)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-semibold"
            >
              <option value="Stock In">Stock In / Direct Restock (+ Add)</option>
              <option value="Adjustment">Stock Adjustment / Recount (+/-)</option>
              <option value="Damage">Damage / Broken (- Deduct)</option>
              <option value="Expired">Expired Goods (- Deduct)</option>
              <option value="Stock Out">Internal Consumption (- Deduct)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">QUANTITY *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={quantity}
              onChange={(e) =>
                setQuantity(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
              }
              placeholder="e.g. 5"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[15px] font-bold mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">
              REFERENCE / INWARD SLIP
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Batch #409, PO-102"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">NOTES / REASON</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Warehouse count difference corrected"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] transition"
            >
              Update Stock Ledger
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
