import React, { useState, useMemo } from "react";
import { Search, Plus, Truck, Calendar, Eye, Trash2, ArrowUpRight } from "lucide-react";
import { formatCurrency, addMoney } from "../services/money";
import type { Purchase } from "../types";

export interface PurchasesPageProps {
  purchases: Purchase[];
  onNewPurchase: () => void;
  onDeletePurchase?: (purchase: Purchase) => void;
}

export function PurchasesPage({ purchases, onNewPurchase, onDeletePurchase }: PurchasesPageProps) {
  const [search, setSearch] = useState("");

  const filteredPurchases = useMemo(() => {
    return (purchases || [])
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          p.purchaseNo.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          (p.supplierInvoiceNo && p.supplierInvoiceNo.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [purchases, search]);

  const totalPurchaseValue = useMemo(() => {
    return purchases.reduce((s, p) => addMoney(s, p.grandTotal), 0);
  }, [purchases]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-[22px] p-4 md:p-5 shadow-sm">
        <div>
          <div className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Inward Purchases
          </div>
          <div className="text-[22px] md:text-[26px] font-extrabold text-zinc-900 mono mt-0.5">
            {formatCurrency(totalPurchaseValue)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {purchases.length} supplier inward orders recorded
          </div>
        </div>

        <button
          onClick={onNewPurchase}
          className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="h-4 w-4" /> New Inward Purchase
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by purchase number, supplier name or vendor bill..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Purchases Table */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Purchase No</th>
                <th className="px-4 py-3.5 text-left">Supplier / Vendor</th>
                <th className="px-4 py-3.5 text-left">Date</th>
                <th className="px-4 py-3.5 text-center">Items</th>
                <th className="px-4 py-3.5 text-right">Grand Total</th>
                <th className="px-4 py-3.5 text-right">Paid Amount</th>
                <th className="px-4 py-3.5 text-left">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPurchases.map((p) => {
                const bal = Math.max(0, p.grandTotal - p.paidAmount);

                return (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-zinc-900 mono">{p.purchaseNo}</div>
                      {p.supplierInvoiceNo && (
                        <div className="text-[11px] text-zinc-400 mono">
                          Bill: {p.supplierInvoiceNo}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-zinc-900">{p.supplierName}</td>
                    <td className="px-4 py-3.5 text-zinc-600 mono">{p.date}</td>
                    <td className="px-4 py-3.5 text-center font-medium text-zinc-600">
                      {p.items.length} items
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold mono text-zinc-900">
                      {formatCurrency(p.grandTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold mono text-emerald-700">
                      {formatCurrency(p.paidAmount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : p.paymentStatus === "Pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filteredPurchases.map((p) => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold text-[14px] mono text-zinc-900">{p.purchaseNo}</div>
                  <div className="font-semibold text-[13px] text-zinc-800">{p.supplierName}</div>
                  <div className="text-[11px] text-zinc-500">
                    {p.date} • {p.items.length} items
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold mono text-[16px] text-zinc-900">
                    {formatCurrency(p.grandTotal)}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.paymentStatus === "Paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {p.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPurchases.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No purchases found. Click "New Inward Purchase" to record supplier goods.
          </div>
        )}
      </div>
    </div>
  );
}
