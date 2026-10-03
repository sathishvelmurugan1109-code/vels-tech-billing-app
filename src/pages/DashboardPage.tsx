import React, { useState, useMemo } from "react";
import {
  IndianRupee,
  Receipt,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Package,
  Users,
  Calendar,
  ArrowUpRight,
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  Truck,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { formatCurrency, roundMoney, addMoney } from "../services/money";
import {
  dashboardStats,
  productReport,
  paymentReport,
  gstReport,
  profitReport,
  summarizeSalesInRange,
} from "../services/reportService";
import { resolveRange, RangePreset, todayISO } from "../services/dateService";
import { stockSummary } from "../services/stockService";
import { summarizeExpensesByCategory, sumExpenses } from "../services/expenseService";
import type { Product, Customer, Supplier, Invoice, Payment, Expense, CompanySettings } from "../types";

export interface DashboardPageProps {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  payments: Payment[];
  expenses: Expense[];
  settings: CompanySettings;
  onNavigateToBilling: () => void;
  onNavigateToInvoices: () => void;
  onNavigateToProducts: () => void;
  onNavigateToCustomers: () => void;
  onNavigateToPayments: () => void;
  onViewInvoice: (inv: Invoice) => void;
  onOpenQuickActions: () => void;
}

const CHART_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6"];

export function DashboardPage({
  invoices,
  products,
  customers,
  suppliers,
  payments,
  expenses,
  settings,
  onNavigateToBilling,
  onNavigateToInvoices,
  onNavigateToProducts,
  onNavigateToCustomers,
  onNavigateToPayments,
  onViewInvoice,
  onOpenQuickActions,
}: DashboardPageProps) {
  const [rangePreset, setRangePreset] = useState<RangePreset>("month");
  const [customStart, setCustomStart] = useState(todayISO().slice(0, 8) + "01");
  const [customEnd, setCustomEnd] = useState(todayISO());

  const activeRange = useMemo(() => {
    if (rangePreset === "custom") {
      return { from: customStart, to: customEnd };
    }
    return resolveRange(rangePreset, { referenceISO: todayISO() });
  }, [rangePreset, customStart, customEnd]);

  // Comprehensive calculations from actual data
  const stats = useMemo(() => {
    return dashboardStats(invoices, products, customers, {
      businessState: settings.state,
      payments: payments.map((p) => ({ customerId: p.partyId, amount: p.amount })),
    });
  }, [invoices, products, customers, settings.state, payments]);

  const stockInfo = useMemo(() => {
    return stockSummary(products);
  }, [products]);

  // Range filtered sales summary
  const periodSales = useMemo(() => {
    return summarizeSalesInRange(invoices, activeRange, {
      businessState: settings.state,
    });
  }, [invoices, activeRange, settings.state]);

  // Out of stock
  const outOfStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= 0).length;
  }, [products]);

  // GST Collected (filtered range)
  const gstData = useMemo(() => {
    return gstReport(
      invoices.filter((i) => i.date >= activeRange.from && i.date <= activeRange.to),
      { businessState: settings.state },
    );
  }, [invoices, activeRange, settings.state]);

  // Top products
  const topProductsList = useMemo(() => {
    const rep = productReport(invoices, products, { businessState: settings.state });
    return rep.rows.slice(0, 5);
  }, [invoices, products, settings.state]);

  // Top customers
  const topCustomersList = useMemo(() => {
    const byCust = new Map<string, { customerName: string; totalSpent: number; count: number }>();
    invoices
      .filter((i) => i.status !== "Cancelled")
      .forEach((inv) => {
        const existing = byCust.get(inv.customerId) || {
          customerName: inv.customerName,
          totalSpent: 0,
          count: 0,
        };
        byCust.set(inv.customerId, {
          customerName: inv.customerName,
          totalSpent: addMoney(existing.totalSpent, inv.grandTotal),
          count: existing.count + 1,
        });
      });

    return Array.from(byCust.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [invoices]);

  // Range Expenses
  const rangeExpenses = useMemo(() => {
    const filtered = expenses.filter(
      (e) => e.date >= activeRange.from && e.date <= activeRange.to,
    );
    return sumExpenses(filtered);
  }, [expenses, activeRange]);

  // Profit in range
  const profitData = useMemo(() => {
    const filteredInvoices = invoices.filter(
      (i) => i.date >= activeRange.from && i.date <= activeRange.to,
    );
    return profitReport(filteredInvoices, products, { businessState: settings.state });
  }, [invoices, products, activeRange, settings.state]);

  // Chart 1: Sales Trend (last 7 days or chronological days in range)
  const salesTrendData = useMemo(() => {
    const dayMap = new Map<string, number>();
    const now = new Date();
    // default 7 days back
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      dayMap.set(iso, 0);
    }

    invoices
      .filter((i) => i.status !== "Cancelled" && dayMap.has(i.date))
      .forEach((i) => {
        dayMap.set(i.date, addMoney(dayMap.get(i.date) || 0, i.grandTotal));
      });

    return Array.from(dayMap.entries()).map(([date, sales]) => ({
      date: date.slice(5), // MM-DD
      sales,
    }));
  }, [invoices]);

  // Chart 2: Payment Methods Breakdown
  const paymentMethodsData = useMemo(() => {
    const rep = paymentReport(
      invoices.filter((i) => i.status !== "Cancelled"),
      { businessState: settings.state },
    );
    return rep.byMode.map((m) => ({
      name: m.mode,
      value: m.totalValue,
      count: m.count,
    }));
  }, [invoices, settings.state]);

  // Chart 3: Top Products Bar Chart
  const topProductsChart = useMemo(() => {
    return topProductsList.map((p) => ({
      name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
      revenue: p.revenue,
      quantity: p.quantitySold,
    }));
  }, [topProductsList]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-[24px] p-4 md:p-5 shadow-sm">
        <div>
          <div className="text-[12px] font-bold text-indigo-600 uppercase tracking-wider">
            Business Dashboard • Live Metrics
          </div>
          <h2 className="text-[20px] md:text-[22px] font-extrabold text-zinc-900 leading-tight mt-0.5">
            Overview & Performance
          </h2>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            {(
              [
                { k: "today", label: "Today" },
                { k: "yesterday", label: "Yesterday" },
                { k: "week", label: "Week" },
                { k: "month", label: "Month" },
                { k: "prevMonth", label: "Last Mo" },
                { k: "year", label: "Year" },
                { k: "custom", label: "Custom" },
              ] as const
            ).map((item) => (
              <button
                key={item.k}
                onClick={() => setRangePreset(item.k)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
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
            <div className="flex items-center gap-2">
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

          <button
            onClick={onOpenQuickActions}
            className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-sm"
          >
            ⚡ Quick Actions
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        {/* Today's Sales */}
        <div className="rounded-[22px] bg-white border border-zinc-200 p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center">
              <IndianRupee className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Today
            </span>
          </div>
          <div className="mt-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Today's Sales
          </div>
          <div className="mt-0.5 text-[20px] md:text-[24px] font-extrabold text-zinc-900 tracking-tight">
            {formatCurrency(stats.todayRevenue)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {stats.todayInvoiceCount} invoice(s) today
          </div>
        </div>

        {/* Selected Period Sales */}
        <div className="rounded-[22px] bg-white border border-zinc-200 p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white grid place-items-center">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 capitalize">
              {rangePreset.replace("-", " ")}
            </span>
          </div>
          <div className="mt-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Period Sales
          </div>
          <div className="mt-0.5 text-[20px] md:text-[24px] font-extrabold text-zinc-900 tracking-tight">
            {formatCurrency(periodSales.grandTotal)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {periodSales.activeCount} invoices • Tax: {formatCurrency(periodSales.gstTotal)}
          </div>
        </div>

        {/* Total Outstanding / Receivables */}
        <div
          onClick={onNavigateToInvoices}
          className="rounded-[22px] bg-white border border-zinc-200 p-4 md:p-5 shadow-sm hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              Receivables
            </span>
          </div>
          <div className="mt-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Outstanding
          </div>
          <div className="mt-0.5 text-[20px] md:text-[24px] font-extrabold text-amber-700 tracking-tight">
            {formatCurrency(stats.outstandingAmount)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {stats.pendingInvoicesCount} pending • {stats.partialInvoicesCount} partial
          </div>
        </div>

        {/* Low Stock & Out of Stock */}
        <div
          onClick={onNavigateToProducts}
          className="rounded-[22px] bg-white border border-zinc-200 p-4 md:p-5 shadow-sm hover:border-red-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 grid place-items-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
              {stats.lowStockProducts + outOfStockCount} Alerts
            </span>
          </div>
          <div className="mt-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Stock Warning
          </div>
          <div className="mt-0.5 text-[20px] md:text-[24px] font-extrabold text-red-600 tracking-tight">
            {stats.lowStockProducts} Low / {outOfStockCount} Out
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {stockInfo.totalProducts} total products catalogued
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Profit, GST, Stock Value & Customers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Gross Profit ({rangePreset.replace("-", " ")})
          </div>
          <div className="mt-1 text-[18px] font-bold text-zinc-900">
            {profitData.hasCostData ? formatCurrency(profitData.grossProfit) : "Cost untracked"}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {profitData.hasCostData
              ? `Margin: ${profitData.marginPct}%`
              : "Set purchase prices to track profit"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            GST Collected ({rangePreset.replace("-", " ")})
          </div>
          <div className="mt-1 text-[18px] font-bold text-zinc-900">
            {formatCurrency(gstData.totals?.gstTotal || 0)}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            CGST: {formatCurrency(gstData.totals?.cgst || 0)} | SGST: {formatCurrency(gstData.totals?.sgst || 0)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Inventory Stock Value
          </div>
          <div className="mt-1 text-[18px] font-bold text-zinc-900">
            {formatCurrency(stockInfo.stockValueSelling)}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {stockInfo.totalUnits} total units in stock
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Customer Base
          </div>
          <div className="mt-1 text-[18px] font-bold text-zinc-900">
            {customers.length} Customers
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {suppliers.length} Active Suppliers
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales Trend Line Chart */}
        <div className="rounded-[24px] bg-white border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-extrabold text-[15px] text-zinc-900">Recent Sales Trend</div>
              <div className="text-[11px] text-zinc-400">Daily revenue over the last 7 days</div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
              7-Day Trend
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(val), "Sales"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#4f46e5" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products Bar Chart */}
        <div className="rounded-[24px] bg-white border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-extrabold text-[15px] text-zinc-900">Top Selling Products</div>
              <div className="text-[11px] text-zinc-400">By total billed revenue</div>
            </div>
            <button
              onClick={onNavigateToProducts}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Inventory →
            </button>
          </div>
          <div className="h-64 w-full">
            {topProductsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#475569"
                    fontSize={11}
                    width={110}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), "Revenue"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-zinc-400 text-[13px]">
                No product sales recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods & Top Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Payment Methods Pie */}
        <div className="rounded-[24px] bg-white border border-zinc-200 p-5 shadow-sm">
          <div className="font-extrabold text-[15px] text-zinc-900 mb-1">Payment Modes</div>
          <div className="text-[11px] text-zinc-400 mb-3">Volume split across Cash, UPI & Cards</div>
          <div className="h-56 w-full">
            {paymentMethodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {paymentMethodsData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(val), "Total"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-zinc-400 text-[13px]">
                No payments recorded.
              </div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="rounded-[24px] bg-white border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-extrabold text-[15px] text-zinc-900">Top Customers</div>
              <div className="text-[11px] text-zinc-400">By total billing amount</div>
            </div>
            <button
              onClick={onNavigateToCustomers}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              All →
            </button>
          </div>
          <div className="space-y-2.5">
            {topCustomersList.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 border border-zinc-100"
              >
                <div>
                  <div className="font-bold text-[13px] text-zinc-900">{c.customerName}</div>
                  <div className="text-[11px] text-zinc-400">{c.count} bills generated</div>
                </div>
                <div className="text-right mono font-extrabold text-[13px] text-zinc-900">
                  {formatCurrency(c.totalSpent)}
                </div>
              </div>
            ))}
            {topCustomersList.length === 0 && (
              <div className="py-10 text-center text-zinc-400 text-[12px]">
                No customer transactions yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-[24px] bg-white border border-zinc-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-extrabold text-[15px] text-zinc-900">Recent Invoices</div>
              <div className="text-[11px] text-zinc-400">Latest billing activity</div>
            </div>
            <button
              onClick={onNavigateToInvoices}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {invoices
              .slice(-5)
              .reverse()
              .map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => onViewInvoice(inv)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 border border-zinc-100 cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-[12.5px] text-zinc-900 mono group-hover:text-indigo-600 transition">
                      {inv.invoiceNo}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate max-w-[130px]">
                      {inv.customerName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[13px] mono text-zinc-900">
                      {formatCurrency(inv.grandTotal)}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        inv.status === "Cancelled"
                          ? "bg-zinc-100 text-zinc-600"
                          : inv.paymentStatus === "Paid"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {inv.status === "Cancelled" ? "Cancelled" : inv.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            {invoices.length === 0 && (
              <div className="py-10 text-center text-zinc-400 text-[12px]">
                No invoices created yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
