import React, { useState, useMemo } from "react";
import { Search, Plus, Edit3, Trash2, Truck, Receipt, CreditCard, Phone } from "lucide-react";
import { formatCurrency, addMoney } from "../services/money";
import { summarizeSuppliers } from "../services/supplierService";
import type { Supplier, Purchase, Payment } from "../types";

export interface SuppliersPageProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  payments: Payment[];
  onAddSupplier: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
  onNewPurchaseForSupplier: (supplier: Supplier) => void;
}

export function SuppliersPage({
  suppliers,
  purchases,
  payments,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onNewPurchaseForSupplier,
}: SuppliersPageProps) {
  const [search, setSearch] = useState("");

  const summaries = useMemo(() => {
    return summarizeSuppliers(suppliers, purchases, payments);
  }, [suppliers, purchases, payments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries;
    const q = search.trim().toLowerCase();
    return summaries.filter(
      ({ supplier: s }) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        s.state.toLowerCase().includes(q) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)),
    );
  }, [summaries, search]);

  const totalOwed = useMemo(() => {
    return summaries.reduce((s, row) => addMoney(s, row.outstanding), 0);
  }, [summaries]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-[22px] p-4 md:p-5 shadow-sm">
        <div>
          <div className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Supplier Payables
          </div>
          <div className="text-[22px] md:text-[26px] font-extrabold text-rose-700 mono mt-0.5">
            {formatCurrency(totalOwed)}
          </div>
          <div className="text-[11px] text-zinc-500">
            Outstanding balance owed to {suppliers.length} vendors
          </div>
        </div>

        <button
          onClick={onAddSupplier}
          className="h-11 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers by name, phone, GSTIN..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Suppliers Table */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Supplier / Vendor</th>
                <th className="px-4 py-3.5 text-left">Contact & State</th>
                <th className="px-4 py-3.5 text-right">Total Purchases</th>
                <th className="px-4 py-3.5 text-right">Total Paid</th>
                <th className="px-4 py-3.5 text-right">Balance Owed</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map(({ supplier: s, totalPurchases, totalPaid, outstanding, purchaseCount }) => (
                <tr key={s.id} className="hover:bg-zinc-50/50 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-zinc-900">{s.name}</div>
                    <div className="text-[11px] text-zinc-400 mono">
                      {s.gstin ? `GSTIN: ${s.gstin}` : "Unregistered"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-zinc-800">{s.phone || "—"}</div>
                    <div className="text-[11px] text-zinc-500">{s.state}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold mono text-zinc-900">
                    {formatCurrency(totalPurchases)}
                    <div className="text-[10px] text-zinc-400 font-normal">
                      {purchaseCount} inward orders
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold mono text-emerald-700">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div
                      className={`font-extrabold mono text-[14px] ${
                        outstanding > 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(outstanding)}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {outstanding > 0 ? "Due to pay" : "Settled"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        title="New Inward Purchase"
                        onClick={() => onNewPurchaseForSupplier(s)}
                        className="h-8 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold text-[12px] flex items-center gap-1 transition"
                      >
                        <Receipt className="h-3.5 w-3.5" /> + Inward
                      </button>
                      <button
                        title="Edit Supplier"
                        onClick={() => onEditSupplier(s)}
                        className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 grid place-items-center transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Delete Supplier"
                        onClick={() => onDeleteSupplier(s)}
                        className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-zinc-400 grid place-items-center transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.map(({ supplier: s, totalPurchases, outstanding }) => (
            <div key={s.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold text-[15px] text-zinc-900">{s.name}</div>
                  <div className="text-[12px] text-zinc-600">{s.phone}</div>
                  <div className="text-[11px] text-zinc-400">{s.state}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400 uppercase">Balance Owed</div>
                  <div
                    className={`font-extrabold mono text-[16px] ${
                      outstanding > 0 ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {formatCurrency(outstanding)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onNewPurchaseForSupplier(s)}
                  className="flex-1 min-h-[44px] rounded-xl bg-violet-600 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5"
                >
                  <Receipt className="h-4 w-4" /> Inward Purchase
                </button>
                <button
                  onClick={() => onEditSupplier(s)}
                  className="h-11 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-[12px] flex items-center justify-center gap-1"
                >
                  <Edit3 className="h-4 w-4" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No suppliers found. Click "Add Supplier" to register your first supplier.
          </div>
        )}
      </div>
    </div>
  );
}
