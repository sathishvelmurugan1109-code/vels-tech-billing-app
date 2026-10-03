import React, { useState, useEffect } from "react";
import { X, CreditCard, Check, AlertCircle, Banknote, Smartphone, Calendar } from "lucide-react";
import { formatCurrency, roundMoney } from "../services/money";
import type { Customer, Invoice, Payment, PaymentMode } from "../types";

export interface ReceivePaymentModalProps {
  customers: Customer[];
  invoices: Invoice[];
  initialCustomer?: Customer | null;
  initialInvoice?: Invoice | null;
  onSavePayment: (payment: Omit<Payment, "id">) => void;
  onClose: () => void;
}

export function ReceivePaymentModal({
  customers,
  invoices,
  initialCustomer,
  initialInvoice,
  onSavePayment,
  onClose,
}: ReceivePaymentModalProps) {
  const [partyType, setPartyType] = useState<"customer" | "supplier">("customer");
  const [customerId, setCustomerId] = useState<string>(
    initialCustomer?.id || initialInvoice?.customerId || "",
  );
  const [invoiceId, setInvoiceId] = useState<string>(initialInvoice?.id || "");
  const [amount, setAmount] = useState<number | "">(
    initialInvoice ? roundMoney(initialInvoice.grandTotal - initialInvoice.paidAmount) : "",
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Unpaid invoices for this customer
  const customerUnpaidInvoices = invoices.filter(
    (inv) =>
      inv.customerId === customerId &&
      inv.status !== "Cancelled" &&
      inv.grandTotal - inv.paidAmount > 0,
  );

  const selectedInvoice = invoices.find((inv) => inv.id === invoiceId);
  const invoicePending = selectedInvoice
    ? roundMoney(selectedInvoice.grandTotal - selectedInvoice.paidAmount)
    : 0;

  // When invoice selection changes, autofill remaining amount
  useEffect(() => {
    if (selectedInvoice) {
      setAmount(invoicePending);
    }
  }, [invoiceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    const safeAmt = typeof amount === "number" ? amount : parseFloat(String(amount)) || 0;
    if (safeAmt <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    const receiptNo = `REC-${String(Date.now()).slice(-6)}`;

    onSavePayment({
      receiptNo,
      date,
      partyType: "customer",
      partyId: customerId,
      partyName: selectedCustomer?.name || "Customer",
      partyPhone: selectedCustomer?.phone,
      invoiceId: invoiceId || undefined,
      invoiceNo: selectedInvoice?.invoiceNo || undefined,
      amount: safeAmt,
      paymentMode,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-[520px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">Receive Payment</div>
              <div className="text-[11px] text-zinc-500">Record cash, UPI, card or cheque receipt</div>
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
            <label className="text-[11px] font-bold text-zinc-600 uppercase">SELECT CUSTOMER *</label>
            <select
              required
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInvoiceId("");
              }}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || c.state})
                </option>
              ))}
            </select>
          </div>

          {customerId && customerUnpaidInvoices.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                LINK TO UNPAID INVOICE (OPTIONAL)
              </label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white focus:outline-none"
              >
                <option value="">General Payment / Ledger Advance</option>
                {customerUnpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNo} — Pending: {formatCurrency(inv.grandTotal - inv.paidAmount)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[15px] font-bold mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">PAYMENT DATE</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase mb-1.5 block">
              PAYMENT METHOD
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { m: "UPI" as PaymentMode, label: "UPI", icon: Smartphone },
                { m: "Cash" as PaymentMode, label: "Cash", icon: Banknote },
                { m: "Card" as PaymentMode, label: "Card", icon: CreditCard },
                { m: "Credit" as PaymentMode, label: "Cheque / Bank", icon: Calendar },
              ].map(({ m, label, icon: Icon }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMode(m)}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                    paymentMode === m
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">
              REFERENCE / UTR / TXN ID
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR 4291823901, Cheque #0192"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-600 uppercase">NOTES</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via GPay"
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13px] transition shadow-sm"
            >
              Record Payment Receipt
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
