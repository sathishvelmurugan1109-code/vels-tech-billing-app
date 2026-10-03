import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  Filter,
  CheckCircle,
  FileText,
} from "lucide-react";
import { formatCurrency, addMoney } from "../services/money";
import type { Payment, PaymentMode } from "../types";

export interface PaymentsPageProps {
  payments: Payment[];
  onReceivePayment: () => void;
}

export function PaymentsPage({ payments, onReceivePayment }: PaymentsPageProps) {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const filteredPayments = useMemo(() => {
    return (payments || [])
      .filter((p) => {
        if (modeFilter !== "all" && p.paymentMode !== modeFilter) return false;
        if (dateFilter && p.date !== dateFilter) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          p.receiptNo.toLowerCase().includes(q) ||
          p.partyName.toLowerCase().includes(q) ||
          (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q)) ||
          (p.reference && p.reference.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, search, modeFilter, dateFilter]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((s, p) => addMoney(s, p.amount), 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-[22px] p-4 md:p-5 shadow-sm">
        <div>
          <div className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Payments Received
          </div>
          <div className="text-[22px] md:text-[26px] font-extrabold text-emerald-700 mono mt-0.5">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {filteredPayments.length} payment receipts recorded
          </div>
        </div>

        <button
          onClick={onReceivePayment}
          className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="h-4 w-4" /> Receive Payment
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment receipt no, customer, invoice no, reference..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px] font-medium"
          >
            <option value="all">All Modes</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Credit">Bank / Cheque</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="h-11 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[12px] font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Receipt No</th>
                <th className="px-4 py-3.5 text-left">Customer / Party</th>
                <th className="px-4 py-3.5 text-left">Date</th>
                <th className="px-4 py-3.5 text-left">Linked Invoice</th>
                <th className="px-4 py-3.5 text-left">Mode</th>
                <th className="px-4 py-3.5 text-left">Reference / Notes</th>
                <th className="px-5 py-3.5 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50/50 transition">
                  <td className="px-5 py-3.5 font-bold mono text-zinc-900">{p.receiptNo}</td>
                  <td className="px-4 py-3.5 font-semibold text-zinc-900">{p.partyName}</td>
                  <td className="px-4 py-3.5 text-zinc-600 mono">{p.date}</td>
                  <td className="px-4 py-3.5 text-zinc-700 mono">
                    {p.invoiceNo ? (
                      <span className="text-indigo-600 font-semibold">{p.invoiceNo}</span>
                    ) : (
                      <span className="text-zinc-400">General / Advance</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 border text-zinc-800">
                      {p.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-500 text-[12px]">
                    {p.reference && <div className="mono font-medium text-zinc-700">{p.reference}</div>}
                    {p.notes && <div>{p.notes}</div>}
                    {!p.reference && !p.notes && "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-extrabold mono text-[15px] text-emerald-700">
                    {formatCurrency(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filteredPayments.map((p) => (
            <div key={p.id} className="p-4 space-y-1.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold mono text-[13px] text-zinc-900">{p.receiptNo}</div>
                  <div className="font-bold text-[14px] text-zinc-800">{p.partyName}</div>
                  <div className="text-[11px] text-zinc-500">
                    {p.date} • {p.paymentMode} {p.invoiceNo ? `• ${p.invoiceNo}` : ""}
                  </div>
                </div>
                <div className="text-right font-extrabold mono text-[16px] text-emerald-700">
                  {formatCurrency(p.amount)}
                </div>
              </div>
              {p.reference && (
                <div className="text-[11px] text-zinc-500 mono bg-zinc-50 p-2 rounded-lg">
                  Ref: {p.reference}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredPayments.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No payment receipts recorded. Click "Receive Payment" to record customer payments.
          </div>
        )}
      </div>
    </div>
  );
}
