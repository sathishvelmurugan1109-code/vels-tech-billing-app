import React, { useState } from "react";
import { X, DollarSign, AlertCircle } from "lucide-react";
import { EXPENSE_CATEGORIES } from "../services/expenseService";
import type { Expense, ExpenseCategory, PaymentMode } from "../types";

export interface ExpenseModalProps {
  expense: Expense | null;
  onSaveExpense: (expense: Omit<Expense, "id"> & { id?: string }) => void;
  onClose: () => void;
}

export function ExpenseModal({ expense, onSaveExpense, onClose }: ExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || "Rent");
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState<number | "">(expense?.amount !== undefined ? expense.amount : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>(expense?.paymentMethod || "UPI");
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState(expense?.reference || "");
  const [notes, setNotes] = useState(expense?.notes || "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please enter a description for this expense");
      return;
    }
    const safeAmt = typeof amount === "number" ? amount : parseFloat(String(amount)) || 0;
    if (safeAmt <= 0) {
      setError("Expense amount must be greater than zero");
      return;
    }

    onSaveExpense({
      id: expense?.id,
      category,
      description: description.trim(),
      amount: safeAmt,
      paymentMethod,
      date,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-[500px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-700 grid place-items-center font-bold">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">
                {expense ? "Edit Expense" : "Record Expense"}
              </div>
              <div className="text-[11px] text-zinc-500">
                Operating expenses (rent, electricity, salaries)
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
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">CATEGORY *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">DESCRIPTION *</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Shop electricity bill for Sept"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">AMOUNT (₹) *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[15px] font-bold mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">DATE</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">PAYMENT METHOD</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMode)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium"
              >
                <option value="UPI">UPI / GPay</option>
                <option value="Cash">Cash</option>
                <option value="Card">Bank / Card</option>
                <option value="Credit">Credit / Pending</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                REFERENCE (OPTIONAL)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. EB Bill No 40192"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">NOTES</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] transition"
            >
              {expense ? "Save Changes" : "Record Expense"}
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
