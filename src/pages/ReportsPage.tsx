import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  Receipt,
  Package,
  Users,
  Truck,
  CreditCard,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { formatCurrency, roundMoney, addMoney } from "../services/money";
import {
  gstReport,
  productReport,
  paymentReport,
  profitReport,
  stockReport,
  customerReport,
  invoiceReport,
  summarizeSalesInRange,
} from "../services/reportService";
import { resolveRange, RangePreset, todayISO } from "../services/dateService";
import { summarizeSuppliers } from "../services/supplierService";
import { sumExpenses, summarizeExpensesByCategory } from "../services/expenseService";
import type {
  Product,
  Customer,
  Supplier,
  Invoice,
  Purchase,
  Payment,
  StockMovement,
  SalesReturn,
  Expense,
  CompanySettings,
} from "../types";

export interface ReportsPageProps {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  payments: Payment[];
  stockMovements: StockMovement[];
  salesReturns: SalesReturn[];
  expenses: Expense[];
  settings: CompanySettings;
}

export type ReportType =
  | "sales"
  | "gst"
  | "payments"
  | "profit"
  | "stock"
  | "stock-movements"
  | "customers"
  | "suppliers"
  | "purchases"
  | "expenses"
  | "returns"
  | "invoices";

export function ReportsPage({
  invoices,
  products,
  customers,
  suppliers,
  purchases,
  payments,
  stockMovements,
  salesReturns,
  expenses,
  settings,
}: ReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [rangePreset, setRangePreset] = useState<RangePreset>("month");
  const [customStart, setCustomStart] = useState(todayISO().slice(0, 8) + "01");
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [search, setSearch] = useState("");

  const activeRange = useMemo(() => {
    if (rangePreset === "custom") {
      return { from: customStart, to: customEnd };
    }
    return resolveRange(rangePreset, { referenceISO: todayISO() });
  }, [rangePreset, customStart, customEnd]);

  // Invoices filtered by active range
  const rangeInvoices = useMemo(() => {
    return invoices.filter((i) => i.date >= activeRange.from && i.date <= activeRange.to);
  }, [invoices, activeRange]);

  // Sales Summary
  const salesSummary = useMemo(() => {
    return summarizeSalesInRange(invoices, activeRange, {
      businessState: settings.state,
    });
  }, [invoices, activeRange, settings.state]);

  // GST Report
  const gstData = useMemo(() => {
    return gstReport(rangeInvoices, { businessState: settings.state });
  }, [rangeInvoices, settings.state]);

  // Payment Report
  const paymentsData = useMemo(() => {
    return paymentReport(rangeInvoices, { businessState: settings.state });
  }, [rangeInvoices, settings.state]);

  // Product Report
  const productsData = useMemo(() => {
    return productReport(rangeInvoices, products, { businessState: settings.state });
  }, [rangeInvoices, products, settings.state]);

  // Profit Report
  const profitData = useMemo(() => {
    return profitReport(rangeInvoices, products, { businessState: settings.state });
  }, [rangeInvoices, products, settings.state]);

  // Stock Report
  const stockData = useMemo(() => {
    return stockReport(products, invoices, { businessState: settings.state });
  }, [products, invoices, settings.state]);

  // Customer Report
  const customersData = useMemo(() => {
    return customerReport(customers, invoices, payments, { businessState: settings.state });
  }, [customers, invoices, payments, settings.state]);

  // Supplier Summaries
  const suppliersData = useMemo(() => {
    return summarizeSuppliers(suppliers, purchases, payments);
  }, [suppliers, purchases, payments]);

  // Purchases in range
  const rangePurchases = useMemo(() => {
    return purchases.filter((p) => p.date >= activeRange.from && p.date <= activeRange.to);
  }, [purchases, activeRange]);

  // Expenses in range
  const rangeExpenses = useMemo(() => {
    return expenses.filter((e) => e.date >= activeRange.from && e.date <= activeRange.to);
  }, [expenses, activeRange]);

  // Sales returns in range
  const rangeReturns = useMemo(() => {
    return salesReturns.filter((r) => r.date >= activeRange.from && r.date <= activeRange.to);
  }, [salesReturns, activeRange]);

  // Export current report as CSV
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `${selectedReport}-report-${todayISO()}.csv`;

    if (selectedReport === "sales" || selectedReport === "invoices") {
      headers = ["Invoice No", "Date", "Customer", "Subtotal", "Discount", "Taxable", "GST", "Total", "Status"];
      rows = rangeInvoices.map((i) => [
        i.invoiceNo,
        i.date,
        `"${i.customerName}"`,
        i.subtotal.toFixed(2),
        i.discountTotal.toFixed(2),
        i.taxableAmount.toFixed(2),
        i.gstTotal.toFixed(2),
        i.grandTotal.toFixed(2),
        i.paymentStatus,
      ]);
    } else if (selectedReport === "gst") {
      headers = ["GST Rate", "Taxable Base", "CGST", "SGST", "IGST", "Total GST"];
      rows = gstData.rates.map((r) => [
        `${r.rate}%`,
        r.taxable.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
        r.igst.toFixed(2),
        r.gstTotal.toFixed(2),
      ]);
    } else if (selectedReport === "stock") {
      headers = ["Product Name", "HSN", "Stock", "Unit", "Selling Price", "Cost Price", "Stock Value"];
      rows = products.map((p) => [
        `"${p.name}"`,
        p.hsn,
        String(p.stock),
        p.unit,
        p.price.toFixed(2),
        (p.purchasePrice || p.cost || 0).toFixed(2),
        (p.stock * p.price).toFixed(2),
      ]);
    } else if (selectedReport === "customers") {
      headers = ["Customer Name", "Phone", "State", "GSTIN", "Total Purchases", "Outstanding Balance"];
      rows = customersData.rows.map((c) => [
        `"${c.name}"`,
        c.phone,
        c.state,
        c.gstin || "—",
        c.totalPurchases.toFixed(2),
        c.outstanding.toFixed(2),
      ]);
    } else {
      headers = ["Reference", "Date", "Party / Description", "Amount", "Mode / Notes"];
      rows = rangeInvoices.map((i) => [
        i.invoiceNo,
        i.date,
        `"${i.customerName}"`,
        i.grandTotal.toFixed(2),
        i.paymentMode,
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportTabs = [
    { id: "sales", label: "Sales Report", icon: TrendingUp },
    { id: "gst", label: "GST Summary (GSTR-1)", icon: Receipt },
    { id: "profit", label: "Profit & Loss", icon: DollarSign },
    { id: "payments", label: "Payment Report", icon: CreditCard },
    { id: "stock", label: "Stock Inventory", icon: Package },
    { id: "customers", label: "Customer Ledger", icon: Users },
    { id: "purchases", label: "Inward Purchases", icon: Truck },
    { id: "expenses", label: "Operating Expenses", icon: DollarSign },
    { id: "returns", label: "Sales Returns", icon: RotateCcw },
    { id: "invoices", label: "Invoice Register", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Top Filter & Report Selection Bar */}
      <div className="bg-white border border-zinc-200 rounded-[22px] p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-bold text-indigo-600 uppercase tracking-wider">
              Business Intelligence & Tax Reports
            </div>
            <h2 className="text-[20px] font-extrabold text-zinc-900 mt-0.5">
              Financial Statements & Audit Reports
            </h2>
          </div>

          {/* Export & Print */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[12px] flex items-center gap-2 shadow-sm transition"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="h-10 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-semibold text-[12px] flex items-center gap-2 transition"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Date Filter:
          </span>
          <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            {(
              [
                { k: "today", label: "Today" },
                { k: "yesterday", label: "Yesterday" },
                { k: "week", label: "This Week" },
                { k: "month", label: "This Month" },
                { k: "prevMonth", label: "Last Month" },
                { k: "year", label: "This Year" },
                { k: "custom", label: "Custom Range" },
              ] as const
            ).map((item) => (
              <button
                key={item.k}
                onClick={() => setRangePreset(item.k)}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition ${
                  rangePreset === item.k
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {rangePreset === "custom" && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 px-2 rounded-xl border border-zinc-200 text-[12px] bg-white"
              />
              <span className="text-[12px] text-zinc-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 px-2 rounded-xl border border-zinc-200 text-[12px] bg-white"
              />
            </div>
          )}
        </div>

        {/* Report Tab Selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {reportTabs.map((tab) => {
            const active = selectedReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedReport(tab.id as ReportType)}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 shrink-0 transition ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content Panels */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden p-5">
        {/* 1. SALES REPORT */}
        {selectedReport === "sales" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Gross Sales</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {formatCurrency(salesSummary.grossTotal)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Discount Given</div>
                <div className="text-[18px] font-bold mono text-amber-700 mt-0.5">
                  {formatCurrency(salesSummary.discountTotal)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Taxable Base</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {formatCurrency(salesSummary.taxableAmount)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-700 uppercase">Net Billed</div>
                <div className="text-[18px] font-extrabold mono text-emerald-800 mt-0.5">
                  {formatCurrency(salesSummary.grandTotal)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Invoice No</th>
                    <th className="px-3 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-3 py-3 text-right">Taxable</th>
                    <th className="px-3 py-3 text-right">GST Total</th>
                    <th className="px-4 py-3 text-right">Grand Total</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rangeInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5 font-bold mono">{inv.invoiceNo}</td>
                      <td className="px-3 py-2.5 text-zinc-600 mono">{inv.date}</td>
                      <td className="px-4 py-2.5 font-medium">{inv.customerName}</td>
                      <td className="px-3 py-2.5 text-right mono">{formatCurrency(inv.taxableAmount)}</td>
                      <td className="px-3 py-2.5 text-right mono">{formatCurrency(inv.gstTotal)}</td>
                      <td className="px-4 py-2.5 text-right font-bold mono text-zinc-900">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100">
                          {inv.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rangeInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        No invoices in selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. GST REPORT */}
        {selectedReport === "gst" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Taxable Value</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {formatCurrency(gstData.totals.taxable)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">CGST Collected</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {formatCurrency(gstData.totals.cgst)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">SGST Collected</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {formatCurrency(gstData.totals.sgst)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <div className="text-[11px] font-bold text-indigo-700 uppercase">Total GST</div>
                <div className="text-[18px] font-extrabold mono text-indigo-900 mt-0.5">
                  {formatCurrency(gstData.totals.gstTotal)}
                </div>
              </div>
            </div>

            <div className="font-bold text-[14px] text-zinc-900">GST Slab-wise Breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">GST Rate</th>
                    <th className="px-4 py-3 text-right">Taxable Turnover</th>
                    <th className="px-4 py-3 text-right">CGST</th>
                    <th className="px-4 py-3 text-right">SGST</th>
                    <th className="px-4 py-3 text-right">IGST</th>
                    <th className="px-4 py-3 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {gstData.rates.map((r) => (
                    <tr key={r.rate} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 font-bold text-zinc-900 mono">{r.rate}% Slab</td>
                      <td className="px-4 py-3 text-right mono">{formatCurrency(r.taxable)}</td>
                      <td className="px-4 py-3 text-right mono">{formatCurrency(r.cgst)}</td>
                      <td className="px-4 py-3 text-right mono">{formatCurrency(r.sgst)}</td>
                      <td className="px-4 py-3 text-right mono">{formatCurrency(r.igst)}</td>
                      <td className="px-4 py-3 text-right font-bold mono text-zinc-900">
                        {formatCurrency(r.gstTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. PROFIT & LOSS */}
        {selectedReport === "profit" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-500 uppercase">Taxable Sales Revenue</div>
                <div className="text-[20px] font-bold mono text-zinc-900 mt-1">
                  {formatCurrency(profitData.revenue)}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Net of GST</div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-500 uppercase">Cost of Goods Sold (COGS)</div>
                <div className="text-[20px] font-bold mono text-zinc-900 mt-1">
                  {profitData.hasCostData ? formatCurrency(profitData.cost) : "Not Tracked"}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Based on purchase prices</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-700 uppercase">Estimated Gross Profit</div>
                <div className="text-[20px] font-extrabold mono text-emerald-800 mt-1">
                  {profitData.hasCostData ? formatCurrency(profitData.grossProfit) : formatCurrency(profitData.revenue)}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">
                  Margin: {profitData.marginPct}%
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-[12px]">
                <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-3 py-3 text-center">Qty Sold</th>
                    <th className="px-3 py-3 text-right">Revenue</th>
                    <th className="px-3 py-3 text-right">Cost</th>
                    <th className="px-4 py-3 text-right">Gross Profit</th>
                    <th className="px-3 py-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {profitData.rows.map((row) => (
                    <tr key={row.productId} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5 font-semibold text-zinc-900">{row.name}</td>
                      <td className="px-3 py-2.5 text-center mono font-medium">{row.quantitySold}</td>
                      <td className="px-3 py-2.5 text-right mono">{formatCurrency(row.revenue)}</td>
                      <td className="px-3 py-2.5 text-right mono">{formatCurrency(row.cost)}</td>
                      <td className="px-4 py-2.5 text-right font-bold mono text-emerald-700">
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="px-3 py-2.5 text-right mono text-zinc-600">{row.marginPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. STOCK REPORT */}
        {selectedReport === "stock" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Total Items</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {stockData.totalProducts} Items
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Total Units</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {stockData.totalUnits} Units
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Valuation (Selling)</div>
                <div className="text-[18px] font-bold mono text-emerald-700 mt-0.5">
                  {formatCurrency(stockData.stockValueSelling)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase">Valuation (Cost)</div>
                <div className="text-[18px] font-bold mono text-zinc-900 mt-0.5">
                  {formatCurrency(stockData.stockValueCost)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Product Name</th>
                    <th className="px-3 py-3 text-left">HSN</th>
                    <th className="px-3 py-3 text-right">In Stock</th>
                    <th className="px-3 py-3 text-right">Selling Price</th>
                    <th className="px-4 py-3 text-right">Asset Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2.5 font-semibold text-zinc-900">{p.name}</td>
                      <td className="px-3 py-2.5 text-zinc-500 mono">{p.hsn}</td>
                      <td className="px-3 py-2.5 text-right font-bold mono">
                        {p.stock} {p.unit}
                      </td>
                      <td className="px-3 py-2.5 text-right mono">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-2.5 text-right font-bold mono text-zinc-900">
                        {formatCurrency(p.stock * p.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. CUSTOMER LEDGER REPORT */}
        {selectedReport === "customers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Customer Name</th>
                  <th className="px-3 py-3 text-left">Phone</th>
                  <th className="px-3 py-3 text-left">State</th>
                  <th className="px-4 py-3 text-right">Total Invoiced</th>
                  <th className="px-4 py-3 text-right">Total Paid</th>
                  <th className="px-4 py-3 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customersData.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-2.5 font-semibold text-zinc-900">{row.name}</td>
                    <td className="px-3 py-2.5 text-zinc-600 mono">{row.phone}</td>
                    <td className="px-3 py-2.5 text-zinc-500">{row.state}</td>
                    <td className="px-4 py-2.5 text-right mono font-semibold">
                      {formatCurrency(row.totalPurchases)}
                    </td>
                    <td className="px-4 py-2.5 text-right mono font-semibold text-emerald-700">
                      {formatCurrency(row.totalPaid)}
                    </td>
                    <td className="px-4 py-2.5 text-right mono font-bold text-amber-700">
                      {formatCurrency(row.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. OTHER REPORT PANELS */}
        {(selectedReport === "invoices" ||
          selectedReport === "payments" ||
          selectedReport === "purchases" ||
          selectedReport === "expenses" ||
          selectedReport === "returns") && (
          <div className="overflow-x-auto">
            <div className="text-[13px] text-zinc-500 pb-2">
              Viewing filtered dataset for {selectedReport.toUpperCase()} ({activeRange.start} to {activeRange.end}).
            </div>
            <table className="w-full text-[12px]">
              <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Identifier / Ref</th>
                  <th className="px-3 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Description / Party</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {selectedReport === "invoices" &&
                  rangeInvoices.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-2.5 font-bold mono">{i.invoiceNo}</td>
                      <td className="px-3 py-2.5 mono text-zinc-500">{i.date}</td>
                      <td className="px-4 py-2.5">{i.customerName}</td>
                      <td className="px-4 py-2.5 text-right mono font-bold">{formatCurrency(i.grandTotal)}</td>
                    </tr>
                  ))}

                {selectedReport === "purchases" &&
                  rangePurchases.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-bold mono">{p.purchaseNo}</td>
                      <td className="px-3 py-2.5 mono text-zinc-500">{p.date}</td>
                      <td className="px-4 py-2.5">{p.supplierName}</td>
                      <td className="px-4 py-2.5 text-right mono font-bold">{formatCurrency(p.grandTotal)}</td>
                    </tr>
                  ))}

                {selectedReport === "expenses" &&
                  rangeExpenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 font-bold">{e.category}</td>
                      <td className="px-3 py-2.5 mono text-zinc-500">{e.date}</td>
                      <td className="px-4 py-2.5">{e.description}</td>
                      <td className="px-4 py-2.5 text-right mono font-bold">{formatCurrency(e.amount)}</td>
                    </tr>
                  ))}

                {selectedReport === "returns" &&
                  rangeReturns.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 font-bold mono">{r.returnNo}</td>
                      <td className="px-3 py-2.5 mono text-zinc-500">{r.date}</td>
                      <td className="px-4 py-2.5">{r.customerName} ({r.reason})</td>
                      <td className="px-4 py-2.5 text-right mono font-bold text-rose-700">
                        {formatCurrency(r.total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
