import React, { useState } from "react";
import {
  X,
  Phone,
  MessageCircle,
  Receipt,
  CreditCard,
  Printer,
  Download,
  Calendar,
  Share2,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, addMoney, subtractMoney } from "../services/money";
import { normalizeWaNumber } from "./InvoiceRenderer";
import type { Customer, Invoice, Payment, SalesReturn, CompanySettings } from "../types";

export interface CustomerLedgerModalProps {
  customer: Customer;
  invoices: Invoice[];
  payments: Payment[];
  salesReturns: SalesReturn[];
  settings: CompanySettings;
  onNewInvoice: (customer: Customer) => void;
  onReceivePayment: (customer: Customer) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onClose: () => void;
}

export type LedgerRow = {
  id: string;
  date: string;
  type: "Opening Balance" | "Invoice" | "Payment" | "Sales Return";
  reference: string;
  debit: number; // Invoice amount (customer owes more)
  credit: number; // Payment or return (customer pays / owes less)
  balance: number; // Running balance
  rawInvoice?: Invoice;
};

export function CustomerLedgerModal({
  customer,
  invoices,
  payments,
  salesReturns,
  settings,
  onNewInvoice,
  onReceivePayment,
  onViewInvoice,
  onClose,
}: CustomerLedgerModalProps) {
  const [dateFilter, setDateFilter] = useState<"all" | "this-month" | "this-year">("all");

  const customerInvoices = invoices.filter((inv) => inv.customerId === customer.id);
  const customerPayments = payments.filter(
    (p) => p.partyType === "customer" && p.partyId === customer.id,
  );
  const customerReturns = salesReturns.filter((r) => r.customerId === customer.id);

  // Compute ledger entries
  const entries: Array<Omit<LedgerRow, "balance">> = [];

  const opening = customer.openingBalance || 0;
  if (opening > 0) {
    entries.push({
      id: `open-${customer.id}`,
      date: "2026-01-01",
      type: "Opening Balance",
      reference: "Opening Balance",
      debit: opening,
      credit: 0,
    });
  }

  // Active Invoices
  customerInvoices
    .filter((inv) => inv.status !== "Cancelled")
    .forEach((inv) => {
      entries.push({
        id: inv.id,
        date: inv.date,
        type: "Invoice",
        reference: inv.invoiceNo,
        debit: inv.grandTotal,
        credit: 0,
        rawInvoice: inv,
      });

      // If paid on invoice creation
      if (inv.paidAmount > 0) {
        entries.push({
          id: `${inv.id}-paid`,
          date: inv.date,
          type: "Payment",
          reference: `Receipt (${inv.paymentMode}) - ${inv.invoiceNo}`,
          debit: 0,
          credit: inv.paidAmount,
        });
      }
    });

  // Direct recorded payments
  customerPayments.forEach((p) => {
    entries.push({
      id: p.id,
      date: p.date,
      type: "Payment",
      reference: p.receiptNo || "Payment Receipt",
      debit: 0,
      credit: p.amount,
    });
  });

  // Returns
  customerReturns.forEach((r) => {
    entries.push({
      id: r.id,
      date: r.date,
      type: "Sales Return",
      reference: `Return: ${r.returnNo} (${r.invoiceNo})`,
      debit: 0,
      credit: r.creditAmount || r.total,
    });
  });

  entries.sort((a, b) => a.date.localeCompare(b.date));

  // Running balance
  let running = 0;
  const ledgerRows: LedgerRow[] = entries.map((e) => {
    running = addMoney(running, e.debit);
    running = subtractMoney(running, e.credit);
    return {
      ...e,
      balance: Math.max(0, running),
    };
  });

  const totalBilled = customerInvoices
    .filter((i) => i.status !== "Cancelled")
    .reduce((s, i) => addMoney(s, i.grandTotal), 0);

  const totalPaid = ledgerRows
    .filter((r) => r.type === "Payment")
    .reduce((s, r) => addMoney(s, r.credit), 0);

  const currentOutstanding =
    ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].balance : opening;

  const phoneInfo = normalizeWaNumber(customer.phone);

  const handleWhatsAppStatement = () => {
    if (!phoneInfo.waNumber) {
      alert("No valid phone number for WhatsApp.");
      return;
    }
    const message = [
      `*Account Statement — ${settings.companyName}*`,
      `Customer: ${customer.name}`,
      `Date: ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `Total Purchases: ${formatCurrency(totalBilled)}`,
      `Total Paid: ${formatCurrency(totalPaid)}`,
      `*Current Outstanding Balance: ${formatCurrency(currentOutstanding)}*`,
      ``,
      settings.upiId ? `Pay via UPI: ${settings.upiId}` : "",
      `Thank you for your business!`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(`https://wa.me/${phoneInfo.waNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handlePrintStatement = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Customer Statement - ${customer.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #0f172a; color: white; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-top: 12px; }
  </style>
</head>
<body>
  <h2>${settings.companyName}</h2>
  <div>${settings.address} | Phone: ${settings.phone}</div>
  <hr style="margin: 12px 0; border: none; border-top: 1px solid #cbd5e1;"/>
  <h3>Customer Account Statement</h3>
  <div class="box">
    <strong>Customer:</strong> ${customer.name}<br/>
    Phone: ${customer.phone} | State: ${customer.state}<br/>
    ${customer.gstin ? `GSTIN: ${customer.gstin}<br/>` : ""}
    ${customer.address ? `Address: ${customer.address}` : ""}
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Reference</th>
        <th style="text-align:right;">Debit (₹)</th>
        <th style="text-align:right;">Credit (₹)</th>
        <th style="text-align:right;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${ledgerRows
        .map(
          (r) => `<tr>
        <td>${r.date}</td>
        <td>${r.type}</td>
        <td>${r.reference}</td>
        <td style="text-align:right;">${r.debit > 0 ? formatCurrency(r.debit) : "—"}</td>
        <td style="text-align:right;">${r.credit > 0 ? formatCurrency(r.credit) : "—"}</td>
        <td style="text-align:right; font-weight:600;">${formatCurrency(r.balance)}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <div class="box" style="margin-top: 20px; text-align: right;">
    <div>Total Invoiced: <strong>${formatCurrency(totalBilled)}</strong></div>
    <div>Total Paid: <strong>${formatCurrency(totalPaid)}</strong></div>
    <div style="font-size: 15px; margin-top: 4px;">Closing Outstanding Balance: <strong>${formatCurrency(currentOutstanding)}</strong></div>
  </div>
</body>
</html>`;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-3 md:p-6 overflow-y-auto">
      <div className="w-full max-w-[840px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-[19px] text-zinc-900">{customer.name}</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                {customer.state}
              </span>
            </div>
            <div className="text-[12px] text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>{customer.phone}</span>
              {customer.gstin && <span>• GSTIN: {customer.gstin}</span>}
              {customer.address && <span>• {customer.address}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNewInvoice(customer)}
              className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Receipt className="h-3.5 w-3.5" /> New Bill
            </button>
            <button
              onClick={() => onReceivePayment(customer)}
              className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <CreditCard className="h-3.5 w-3.5" /> Receive Payment
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 grid place-items-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-zinc-100 bg-white">
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="text-[11px] font-bold text-zinc-400 uppercase">Total Billed</div>
            <div className="mt-1 text-[17px] font-extrabold mono text-zinc-900">
              {formatCurrency(totalBilled)}
            </div>
            <div className="text-[11px] text-zinc-500">{customerInvoices.length} invoices</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
            <div className="text-[11px] font-bold text-emerald-600 uppercase">Total Received</div>
            <div className="mt-1 text-[17px] font-extrabold mono text-emerald-800">
              {formatCurrency(totalPaid)}
            </div>
            <div className="text-[11px] text-emerald-600">Payments cleared</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 col-span-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-rose-600 uppercase">
                Current Outstanding
              </div>
              <div className="flex gap-2">
                {customer.phone && (
                  <button
                    onClick={handleWhatsAppStatement}
                    className="h-7 px-2.5 rounded-lg bg-[#25D366] text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </button>
                )}
                <button
                  onClick={handlePrintStatement}
                  className="h-7 px-2.5 rounded-lg bg-zinc-900 text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Printer className="h-3 w-3" /> Statement
                </button>
              </div>
            </div>
            <div className="mt-1 text-[22px] font-extrabold mono text-rose-700">
              {formatCurrency(currentOutstanding)}
            </div>
            <div className="text-[11px] text-rose-600">
              {currentOutstanding === 0 ? "All dues settled" : "Due balance to be collected"}
            </div>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-[14px] text-zinc-900">Customer Statement & Ledger</div>
            <div className="text-[11px] text-zinc-500">{ledgerRows.length} transactions</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-right">Debit (+)</th>
                    <th className="px-4 py-3 text-right">Credit (-)</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ledgerRows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/60">
                      <td className="px-4 py-3 text-zinc-600 mono">{row.date}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.type === "Invoice"
                              ? "bg-indigo-50 text-indigo-700"
                              : row.type === "Payment"
                              ? "bg-emerald-50 text-emerald-700"
                              : row.type === "Sales Return"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {row.rawInvoice ? (
                          <button
                            onClick={() => {
                              onViewInvoice(row.rawInvoice!);
                              onClose();
                            }}
                            className="text-indigo-600 hover:underline flex items-center gap-1 mono font-semibold"
                          >
                            {row.reference} <ArrowUpRight className="h-3 w-3" />
                          </button>
                        ) : (
                          row.reference
                        )}
                      </td>
                      <td className="px-4 py-3 text-right mono font-semibold text-zinc-900">
                        {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right mono font-semibold text-emerald-700">
                        {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right mono font-bold text-zinc-900">
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                  {ledgerRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-400">
                        No transactions recorded for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
