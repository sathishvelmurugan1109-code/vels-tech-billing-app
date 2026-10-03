import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Eye,
  Printer,
  Copy,
  Trash2,
  Edit3,
  RotateCcw,
  Smartphone,
  Calendar,
  Filter,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";
import { formatCurrency } from "../services/money";
import { normalizeWaNumber, buildCustomerWaMessage } from "../components/InvoiceRenderer";
import type { Invoice, CompanySettings } from "../types";

export interface InvoicesPageProps {
  invoices: Invoice[];
  settings: CompanySettings;
  onNewInvoice: () => void;
  onViewInvoice: (inv: Invoice) => void;
  onEditInvoice: (inv: Invoice) => void;
  onDuplicateInvoice: (inv: Invoice) => void;
  onCancelInvoice: (inv: Invoice) => void;
  onSalesReturn: (inv: Invoice) => void;
}

export function InvoicesPage({
  invoices,
  settings,
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  onDuplicateInvoice,
  onCancelInvoice,
  onSalesReturn,
}: InvoicesPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (statusFilter !== "all") {
          if (statusFilter === "Cancelled" && inv.status !== "Cancelled") return false;
          if (statusFilter !== "Cancelled" && (inv.status === "Cancelled" || inv.paymentStatus !== statusFilter))
            return false;
        }
        if (dateFilter && inv.date !== dateFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          const match =
            inv.invoiceNo.toLowerCase().includes(q) ||
            inv.customerName.toLowerCase().includes(q) ||
            inv.customerPhone.includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
  }, [invoices, search, statusFilter, dateFilter]);

  const handleWhatsAppQuick = (inv: Invoice) => {
    const wa = normalizeWaNumber(inv.customerPhone);
    if (!wa.waNumber) {
      alert("No valid phone number for customer.");
      return;
    }
    const msg = buildCustomerWaMessage(
      inv.customerName,
      inv.invoiceNo,
      inv.date,
      inv.grandTotal,
      inv.paymentStatus,
      inv.paymentMode,
      settings,
    );
    window.open(`https://wa.me/${wa.waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number, customer name, phone..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px] text-zinc-700 focus:outline-none"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="px-2.5 h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[11px] font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px] font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={onNewInvoice}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Plus className="h-4 w-4" /> New Bill
          </button>
        </div>
      </div>

      {/* Invoices List / Table */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Invoice</th>
                <th className="px-4 py-3.5 text-left">Customer</th>
                <th className="px-4 py-3.5 text-left">Date</th>
                <th className="px-4 py-3.5 text-right">Amount</th>
                <th className="px-4 py-3.5 text-left">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-50/50 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-zinc-900 mono">{inv.invoiceNo}</div>
                    <div className="text-[11px] text-zinc-400">
                      {inv.items.length} items • {inv.igst > 0 ? "IGST" : "CGST+SGST"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-zinc-900">{inv.customerName}</div>
                    <div className="text-[11px] text-zinc-500">
                      {inv.customerPhone} ({inv.customerState})
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-600 mono">{inv.date}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="font-extrabold mono text-[14px] text-zinc-900">
                      {formatCurrency(inv.grandTotal)}
                    </div>
                    {inv.paidAmount > 0 && inv.paidAmount < inv.grandTotal && (
                      <div className="text-[11px] text-emerald-700">
                        {formatCurrency(inv.paidAmount)} paid
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          inv.status === "Cancelled"
                            ? "bg-zinc-100 text-zinc-500"
                            : inv.paymentStatus === "Paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.paymentStatus === "Pending"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {inv.status === "Cancelled" ? "Cancelled" : inv.paymentStatus}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 border text-zinc-600">
                        {inv.paymentMode}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="View / Print"
                        onClick={() => onViewInvoice(inv)}
                        className="h-8 w-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white grid place-items-center transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Send WhatsApp"
                        onClick={() => handleWhatsAppQuick(inv)}
                        className="h-8 w-8 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white grid place-items-center transition"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                      </button>
                      {inv.status !== "Cancelled" && (
                        <button
                          title="Sales Return"
                          onClick={() => onSalesReturn(inv)}
                          className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 grid place-items-center transition"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {inv.status !== "Cancelled" && (
                        <button
                          title="Edit Invoice"
                          onClick={() => onEditInvoice(inv)}
                          className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 grid place-items-center text-zinc-600 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        title="Duplicate Bill"
                        onClick={() => onDuplicateInvoice(inv)}
                        className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 grid place-items-center text-zinc-600 transition"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {inv.status !== "Cancelled" && (
                        <button
                          title="Cancel Invoice"
                          onClick={() => onCancelInvoice(inv)}
                          className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 grid place-items-center text-zinc-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filteredInvoices.map((inv) => (
            <div key={inv.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold text-[14px] mono text-zinc-900">
                    {inv.invoiceNo}
                  </div>
                  <div className="font-semibold text-[13px] text-zinc-800">
                    {inv.customerName}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {inv.date} • {inv.customerPhone}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold mono text-[16px] text-zinc-900">
                    {formatCurrency(inv.grandTotal)}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === "Cancelled"
                        ? "bg-zinc-100 text-zinc-500"
                        : inv.paymentStatus === "Paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : inv.paymentStatus === "Pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {inv.status === "Cancelled" ? "Cancelled" : inv.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Action buttons on mobile with 44px min touch target */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onViewInvoice(inv)}
                  className="flex-1 min-h-[44px] rounded-xl bg-zinc-900 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5"
                >
                  <Eye className="h-4 w-4" /> View / Print
                </button>
                <button
                  onClick={() => handleWhatsAppQuick(inv)}
                  className="h-11 w-11 rounded-xl bg-[#25D366] text-white grid place-items-center shrink-0"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
                {inv.status !== "Cancelled" && (
                  <button
                    onClick={() => onSalesReturn(inv)}
                    className="h-11 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[12px] flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="h-4 w-4" /> Return
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredInvoices.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No invoices found. Click "New Bill" to generate your first invoice.
          </div>
        )}
      </div>
    </div>
  );
}
