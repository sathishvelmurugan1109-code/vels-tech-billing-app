import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Users,
  CreditCard,
  Receipt,
  Smartphone,
  Phone,
  FileText,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, addMoney, sumMoney } from "../services/money";
import { normalizeWaNumber } from "../components/InvoiceRenderer";
import type { Customer, Invoice, Payment, SalesReturn } from "../types";

export interface CustomersPageProps {
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  salesReturns: SalesReturn[];
  onAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onViewLedger: (customer: Customer) => void;
  onNewInvoiceForCustomer: (customer: Customer) => void;
  onReceivePaymentForCustomer: (customer: Customer) => void;
}

export function CustomersPage({
  customers,
  invoices,
  payments,
  salesReturns,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onViewLedger,
  onNewInvoiceForCustomer,
  onReceivePaymentForCustomer,
}: CustomersPageProps) {
  const [search, setSearch] = useState("");

  // Customer summaries
  const customerStats = useMemo(() => {
    return customers.map((c) => {
      const cInvoices = invoices.filter(
        (inv) => inv.customerId === c.id && inv.status !== "Cancelled",
      );
      const cPayments = payments.filter(
        (p) => p.partyType === "customer" && p.partyId === c.id,
      );

      const totalBilled = cInvoices.reduce((s, inv) => addMoney(s, inv.grandTotal), 0);
      const invoicePaid = cInvoices.reduce((s, inv) => addMoney(s, inv.paidAmount), 0);
      const directPaid = sumMoney(cPayments.map((p) => p.amount));
      const totalPaid = addMoney(invoicePaid, directPaid);

      // Ledger outstanding
      const opening = c.openingBalance || 0;
      const outstanding = Math.max(0, addMoney(opening, totalBilled) - totalPaid);

      const lastInvoice = cInvoices.length > 0 ? cInvoices[cInvoices.length - 1] : null;

      return {
        customer: c,
        totalBilled,
        totalPaid,
        outstanding,
        invoiceCount: cInvoices.length,
        lastInvoiceDate: lastInvoice?.date || "—",
      };
    });
  }, [customers, invoices, payments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customerStats;
    const q = search.trim().toLowerCase();
    return customerStats.filter(
      ({ customer: c }) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.state.toLowerCase().includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)),
    );
  }, [customerStats, search]);

  const totalOutstandingAll = useMemo(() => {
    return customerStats.reduce((s, row) => addMoney(s, row.outstanding), 0);
  }, [customerStats]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-[22px] p-4 md:p-5 shadow-sm">
        <div>
          <div className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Customer Receivables
          </div>
          <div className="text-[22px] md:text-[26px] font-extrabold text-amber-700 mono mt-0.5">
            {formatCurrency(totalOutstandingAll)}
          </div>
          <div className="text-[11px] text-zinc-500">
            Across {customers.length} registered customers
          </div>
        </div>

        <button
          onClick={onAddCustomer}
          className="h-11 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers by name, phone number, GSTIN or state..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Customer List */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Customer</th>
                <th className="px-4 py-3.5 text-left">Contact & State</th>
                <th className="px-4 py-3.5 text-right">Total Purchases</th>
                <th className="px-4 py-3.5 text-right">Total Paid</th>
                <th className="px-4 py-3.5 text-right">Outstanding Due</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map(({ customer: c, totalBilled, totalPaid, outstanding, invoiceCount }) => {
                const phoneInfo = normalizeWaNumber(c.phone);

                return (
                  <tr key={c.id} className="hover:bg-zinc-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-zinc-900">{c.name}</div>
                      <div className="text-[11px] text-zinc-400 mono">
                        {c.gstin ? `GSTIN: ${c.gstin}` : "Consumer / Unregistered"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-zinc-800">{c.phone || "—"}</div>
                      <div className="text-[11px] text-zinc-500">{c.state}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold mono text-zinc-900">
                      {formatCurrency(totalBilled)}
                      <div className="text-[10px] text-zinc-400 font-normal">
                        {invoiceCount} invoices
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold mono text-emerald-700">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div
                        className={`font-extrabold mono text-[14px] ${
                          outstanding > 0 ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(outstanding)}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {outstanding > 0 ? "Due to collect" : "Settled"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          title="View Ledger Statement"
                          onClick={() => onViewLedger(c)}
                          className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[12px] font-semibold flex items-center gap-1 transition"
                        >
                          <FileText className="h-3.5 w-3.5" /> Ledger
                        </button>
                        <button
                          title="New Invoice"
                          onClick={() => onNewInvoiceForCustomer(c)}
                          className="h-8 w-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 grid place-items-center transition"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Receive Payment"
                          onClick={() => onReceivePaymentForCustomer(c)}
                          className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 grid place-items-center transition"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </button>
                        {phoneInfo.waNumber && (
                          <button
                            title="WhatsApp Chat"
                            onClick={() =>
                              window.open(`https://wa.me/${phoneInfo.waNumber}`, "_blank")
                            }
                            className="h-8 w-8 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-white grid place-items-center transition"
                          >
                            <Smartphone className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Edit Customer"
                          onClick={() => onEditCustomer(c)}
                          className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 grid place-items-center transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete Customer"
                          onClick={() => onDeleteCustomer(c)}
                          className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-zinc-400 grid place-items-center transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.map(({ customer: c, totalBilled, totalPaid, outstanding }) => {
            const phoneInfo = normalizeWaNumber(c.phone);

            return (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-extrabold text-[15px] text-zinc-900">{c.name}</div>
                    <div className="text-[12px] text-zinc-600">{c.phone}</div>
                    <div className="text-[11px] text-zinc-400">{c.state}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-400 uppercase">Outstanding</div>
                    <div
                      className={`font-extrabold mono text-[16px] ${
                        outstanding > 0 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(outstanding)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onViewLedger(c)}
                    className="flex-1 min-h-[44px] rounded-xl bg-zinc-900 text-white font-semibold text-[12px] flex items-center justify-center gap-1.5"
                  >
                    <FileText className="h-4 w-4" /> View Ledger
                  </button>
                  <button
                    onClick={() => onReceivePaymentForCustomer(c)}
                    className="h-11 px-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-[12px] flex items-center gap-1"
                  >
                    <CreditCard className="h-4 w-4" /> Pay
                  </button>
                  {phoneInfo.waNumber && (
                    <button
                      onClick={() => window.open(`https://wa.me/${phoneInfo.waNumber}`, "_blank")}
                      className="h-11 w-11 rounded-xl bg-[#25D366] text-white grid place-items-center shrink-0"
                    >
                      <Smartphone className="h-4 w-4" />
                    </button>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="h-11 w-11 rounded-xl bg-zinc-100 text-zinc-700 grid place-items-center shrink-0"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No customers found. Click "Add Customer" to add your first buyer.
          </div>
        )}
      </div>
    </div>
  );
}
