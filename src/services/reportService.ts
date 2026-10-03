/**
 * reportService.ts — centralized sales / dashboard / GST / profit math.
 *
 * EVERY headline number (dashboard, sales report, GST report, product,
 * customer, payment, profit, stock and invoice reports) is derived here
 * through the SAME money + invoice engines — never from ad-hoc sums
 * scattered across screens. That is what makes reconciliation hold:
 *
 *   SUM(invoice grand totals) = dashboard sales = sales report
 *   SUM(invoice GST)          = GST report
 *   customer credits − payments = customer outstanding
 */

import { addMoney, roundMoney, subtractMoney, sumMoney, toNumber } from "./money";
import { calculateInvoice, StoredInvoiceLike } from "./invoiceService";
import {
  CustomerInvoiceLike,
  CustomerPaymentLike,
  customerOutstanding,
  totalOutstanding,
} from "./customerService";
import { inRange, DateRange, RangePreset, resolveRange, todayISO } from "./dateService";
import { LOW_STOCK_THRESHOLD, StockLike, stockSummary, stockValue } from "./stockService";
import { lineProfit, margin } from "./profitService";

/* ------------------------------------------------------------------ *
 * INVOICE SET MEMBERSHIP
 * ------------------------------------------------------------------ */

/** Cancelled invoices never count as active sales (PHASE 14). */
export function isCancelledInvoice(inv: { status?: unknown } | null | undefined): boolean {
  return String(inv?.status ?? "").toLowerCase() === "cancelled";
}

/** Active = anything that is NOT cancelled (includes Draft/Saved/Paid…). */
export function isActiveInvoice(inv: { status?: unknown } | null | undefined): boolean {
  return !isCancelledInvoice(inv);
}

/* ------------------------------------------------------------------ *
 * FILTERING (PHASE 23) — every filtered total derives from filtered rows
 * ------------------------------------------------------------------ */

export type InvoiceFilter = {
  search?: string;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  range?: DateRange | null;
};

/** Case-insensitive match against invoice no / customer / phone / id. */
function matchesSearch(inv: Record<string, unknown>, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    String(inv.invoiceNo ?? ""),
    String(inv.customerName ?? ""),
    String(inv.customerPhone ?? ""),
    String(inv.id ?? ""),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Filter invoices by search text, customer, status, payment status and
 * date range. Totals computed AFTER this filter automatically reconcile
 * with what the user sees.
 */
export function filterInvoices<T extends object>(invoices: T[], filter: InvoiceFilter = {}): T[] {
  return (invoices || []).filter((inv) => {
    const rec = inv as Record<string, unknown>;
    if (filter.customerId && String(rec.customerId ?? "") !== String(filter.customerId)) return false;
    if (filter.status && String(rec.status ?? "") !== filter.status) return false;
    if (filter.paymentStatus && String(rec.paymentStatus ?? "") !== filter.paymentStatus) return false;
    if (filter.range && !inRange(rec.date, filter.range)) return false;
    if (filter.search && !matchesSearch(rec, filter.search)) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ *
 * PAGINATION (PHASE 24)
 * ------------------------------------------------------------------ */

export type PageSlice<T> = {
  pageItems: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

/** Slice rows for display. Page totals are computed from `pageItems`. */
export function paginate<T>(rows: T[], page: number, pageSize: number): PageSlice<T> {
  const safeSize = Math.max(1, Math.trunc(pageSize) || 10);
  const totalItems = (rows || []).length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const safePage = Math.min(totalPages, Math.max(1, Math.trunc(page) || 1));
  const start = (safePage - 1) * safeSize;
  return {
    pageItems: (rows || []).slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems,
    totalPages,
  };
}

/* ------------------------------------------------------------------ *
 * THE SINGLE SOURCE OF TRUTH (PHASES 14/15/16/28)
 *
 * Every report below starts from the SAME per-invoice calculation
 * (`calculateInvoice`) and aggregates through the SAME money engine.
 * No screen is allowed to write its own sales/dashboard formula.
 * ------------------------------------------------------------------ */

type AnyInvoice = StoredInvoiceLike;

/** Read any extra field (invoiceNo, date, customerName…) without casts. */
function field(invoice: AnyInvoice, key: string): unknown {
  return (invoice as unknown as Record<string, unknown>)[key];
}

export type InvoiceRow<T extends AnyInvoice> = {
  invoice: T;
  /** Authoritative per-invoice result (see invoiceService.calculateInvoice). */
  calc: ReturnType<typeof calculateInvoice>;
  cancelled: boolean;
};

/**
 * Reference-keyed memo (PHASE 29). The app updates invoices immutably, so a
 * new object identity always means "recalculate"; an untouched invoice is
 * never recomputed. Keyed on the invoice object AND the business state, so a
 * settings change can never return a stale tax split.
 */
const calcMemo = new WeakMap<object, { stateKey: string; calc: ReturnType<typeof calculateInvoice> }>();

export function memoizedInvoiceCalculation(
  invoice: AnyInvoice,
  businessState?: unknown,
): ReturnType<typeof calculateInvoice> {
  const stateKey = businessState === undefined ? "" : String(businessState);
  const hit = calcMemo.get(invoice as object);
  if (hit && hit.stateKey === stateKey) return hit.calc;
  const calc = calculateInvoice(invoice, { businessState });
  calcMemo.set(invoice as object, { stateKey, calc });
  return calc;
}

/**
 * Turn a raw invoice array into calc rows. `businessState` is the company's
 * own state (settings.state) — required to decide CGST+SGST vs IGST for
 * legacy records that did not persist it.
 */
export function calculateInvoiceRows<T extends AnyInvoice>(
  invoices: T[],
  options: { businessState?: unknown } = {},
): InvoiceRow<T>[] {
  return (invoices || [])
    .filter(Boolean)
    .map((invoice) => ({
      invoice,
      calc: memoizedInvoiceCalculation(invoice, options.businessState),
      cancelled: isCancelledInvoice(invoice as unknown as { status?: unknown }),
    }));
}

/** Grand totals of the ACTIVE (non-cancelled) rows only. */
export function activeGrandTotal<T extends AnyInvoice>(rows: InvoiceRow<T>[]): number {
  return sumMoney((rows || []).filter((r) => !r.cancelled).map((r) => r.calc.grandTotal));
}

/* ------------------------------------------------------------------ *
 * SALES SUMMARY (PHASE 14)
 * ------------------------------------------------------------------ */

export type SalesReturnLike = {
  /** Total value returned to the customer (incl. GST). */
  amount?: unknown;
  taxableAmount?: unknown;
  gst?: unknown;
  refund?: unknown;
};

export type SalesSummary = {
  /** Active (non-cancelled) invoice count. */
  invoiceCount: number;
  cancelledCount: number;
  /** Gross value of goods before discount (Σ unitPrice × qty). */
  grossSales: number;
  /** Σ discount across active invoices. */
  discountTotal: number;
  /** Revenue EXCLUDING GST (Σ taxable amount) — the real business income. */
  netSales: number;
  /** Σ taxable amount (GST-report naming). */
  taxableSales: number;
  /** Σ GST collected — a liability, never revenue. */
  gstTotal: number;
  /** Customer-facing invoice value (Σ grand total, incl. GST and round-off). */
  totalSales: number;
  /** Σ round-off adjustments. */
  roundOff: number;
  /** Σ amount actually received. */
  paidAmount: number;
  /** Σ unpaid balance (a.k.a. credit / pending). */
  pendingAmount: number;
  /** Σ grand total of invoices paid on Credit terms. */
  creditAmount: number;
  /** Σ grand total of cancelled invoices (excluded from every figure above). */
  cancelledAmount: number;
  /** Σ value of sales returns (reverses revenue). */
  returnAmount: number;
  /** Σ refunds paid back on returns. */
  refundAmount: number;
  /** Total units billed. */
  totalQuantity: number;
  /** Total line items billed. */
  itemCount: number;
  /** Average invoice value (totalSales / invoiceCount). */
  averageInvoiceValue: number;
};

export type SalesSummaryOptions = {
  businessState?: unknown;
  /** Sales returns that reverse revenue (see returnService). */
  returns?: SalesReturnLike[];
};

/**
 * ONE authoritative sales summary. The dashboard sales total, the sales
 * report total and the invoice report total are all this function.
 */
export function summarizeSales<T extends AnyInvoice>(
  invoices: T[],
  options: SalesSummaryOptions = {},
): SalesSummary {
  const rows = calculateInvoiceRows(invoices, options);
  const active = rows.filter((r) => !r.cancelled);
  const cancelled = rows.filter((r) => r.cancelled);

  const returns = options.returns || [];
  const returnAmount = sumMoney(returns.map((r) => toNumber(r?.amount ?? r?.taxableAmount)));
  const refundAmount = sumMoney(returns.map((r) => toNumber(r?.refund)));
  const totalSales = sumMoney(active.map((r) => r.calc.grandTotal));
  const invoiceCount = active.length;

  return {
    invoiceCount,
    cancelledCount: cancelled.length,
    grossSales: sumMoney(active.map((r) => r.calc.subtotal)),
    discountTotal: sumMoney(active.map((r) => r.calc.discountTotal)),
    netSales: sumMoney(active.map((r) => r.calc.taxableAmount)),
    taxableSales: sumMoney(active.map((r) => r.calc.taxableAmount)),
    gstTotal: sumMoney(active.map((r) => r.calc.gstTotal)),
    totalSales,
    roundOff: sumMoney(active.map((r) => r.calc.roundOff)),
    paidAmount: sumMoney(active.map((r) => r.calc.paidAmount)),
    pendingAmount: sumMoney(active.map((r) => r.calc.balance)),
    creditAmount: sumMoney(
      active
        .filter((r) => String(field(r.invoice, "paymentMode") ?? "") === "Credit")
        .map((r) => r.calc.grandTotal),
    ),
    cancelledAmount: sumMoney(cancelled.map((r) => r.calc.grandTotal)),
    returnAmount,
    refundAmount,
    totalQuantity: active.reduce((s, r) => s + toNumber(r.calc.totalQuantity), 0),
    itemCount: active.reduce((s, r) => s + r.calc.itemCount, 0),
    averageInvoiceValue: invoiceCount === 0 ? 0 : roundMoney(totalSales / invoiceCount),
  };
}

/** Sales summary for a date range (PHASE 20 — local calendar dates only). */
export function summarizeSalesInRange<T extends AnyInvoice>(
  invoices: T[],
  range: DateRange,
  options: SalesSummaryOptions = {},
): SalesSummary {
  return summarizeSales(filterInvoices(invoices, { range }), options);
}

export type NamedPeriodSummary = {
  label: RangePreset;
  from: string;
  to: string;
  summary: SalesSummary;
};

/**
 * Today / yesterday / week / month / previous month / year (+ custom).
 * Every range is resolved through dateService (local-time safe).
 */
export function summarizeSalesPeriods<T extends AnyInvoice>(
  invoices: T[],
  presets: RangePreset[] = ["today", "yesterday", "week", "month", "prevMonth", "year"],
  options: { businessState?: unknown; referenceISO?: string } = {},
): NamedPeriodSummary[] {
  return presets.map((preset) => {
    const range = resolveRange(preset, { referenceISO: options.referenceISO });
    return {
      label: preset,
      from: range.from,
      to: range.to,
      summary: summarizeSalesInRange(invoices, range, options),
    };
  });
}

/* ------------------------------------------------------------------ *
 * PAYMENT REPORT (PHASE 16)
 * ------------------------------------------------------------------ */

export type PaymentGroupRow = {
  label: string;
  invoiceCount: number;
  totalSales: number;
  paidAmount: number;
  balance: number;
};

export type PaymentReport = {
  byMode: PaymentGroupRow[];
  byStatus: PaymentGroupRow[];
  paidAmount: number;
  pendingAmount: number;
  partialAmount: number;
  /** Paid ÷ total, as a percentage. */
  collectionRate: number;
};

/** Payments grouped by mode and by status — always derived from invoices. */
export function paymentReport<T extends AnyInvoice>(
  invoices: T[],
  options: SalesSummaryOptions = {},
): PaymentReport {
  const rows = calculateInvoiceRows(invoices, options).filter((r) => !r.cancelled);
  const group = (keyOf: (row: InvoiceRow<T>) => string): PaymentGroupRow[] => {
    const map = new Map<string, InvoiceRow<T>[]>();
    rows.forEach((row) => {
      const key = keyOf(row);
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    });
    return [...map.entries()]
      .map(([label, list]) => ({
        label,
        invoiceCount: list.length,
        totalSales: sumMoney(list.map((r) => r.calc.grandTotal)),
        paidAmount: sumMoney(list.map((r) => r.calc.paidAmount)),
        balance: sumMoney(list.map((r) => r.calc.balance)),
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  };
  const total = sumMoney(rows.map((r) => r.calc.grandTotal));
  const paidAmount = sumMoney(rows.map((r) => r.calc.paidAmount));
  return {
    byMode: group((r) => String(field(r.invoice, "paymentMode") ?? "Other") || "Other"),
    byStatus: group((r) => String(field(r.invoice, "paymentStatus") ?? r.calc.paymentStatus)),
    paidAmount,
    pendingAmount: sumMoney(rows.map((r) => r.calc.balance)),
    partialAmount: sumMoney(
      rows.filter((r) => r.calc.paymentStatus === "Partial").map((r) => r.calc.balance),
    ),
    collectionRate: total === 0 ? 0 : roundMoney((paidAmount / total) * 100),
  };
}

/* ------------------------------------------------------------------ *
 * GST REPORT (PHASE 17) — grouped, always read from the invoice engine
 * ------------------------------------------------------------------ */

export type GstReportRow = {
  /** Grouping key (GST rate badge, HSN code, date or invoice number). */
  key: string;
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  invoiceValue: number;
  totalQuantity: number;
  invoiceCount: number;
};

export type GstReport = {
  taxableSales: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  invoiceValue: number;
  byRate: GstReportRow[];
  byHsn: GstReportRow[];
  byDate: GstReportRow[];
  byInvoice: GstReportRow[];
  totals: {
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    gstTotal: number;
    invoiceValue: number;
  };
  rates: Array<GstReportRow & { rate: number; taxable: number }>;
};

type GstLineLike = {
  gstRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  lineTotal: number;
  qty: number;
};

function emptyGstRow(key: string, gstRate = 0): GstReportRow {
  return {
    key,
    gstRate,
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    gstTotal: 0,
    invoiceValue: 0,
    totalQuantity: 0,
    invoiceCount: 0,
  };
}

function accumulateGstRow(row: GstReportRow, line: GstLineLike): void {
  row.taxableAmount = addMoney(row.taxableAmount, line.taxableAmount);
  row.cgst = addMoney(row.cgst, line.cgst);
  row.sgst = addMoney(row.sgst, line.sgst);
  row.igst = addMoney(row.igst, line.igst);
  row.gstTotal = addMoney(row.gstTotal, line.gstTotal);
  row.invoiceValue = addMoney(row.invoiceValue, line.lineTotal);
  row.totalQuantity += toNumber(line.qty);
}

/**
 * GST report grouped by rate / HSN / date / invoice.
 * GST is READ from the stored per-line engine result — never recomputed
 * inside the report, which is what makes the group totals add up to the
 * invoice GST total.
 */
export function gstReport<T extends AnyInvoice>(
  invoices: T[],
  options: SalesSummaryOptions = {},
): GstReport {
  const rows = calculateInvoiceRows(invoices, options).filter((r) => !r.cancelled);

  const byRate = new Map<string, GstReportRow>();
  const byHsn = new Map<string, GstReportRow>();
  const byDate = new Map<string, GstReportRow>();
  const byInvoice = new Map<string, GstReportRow>();
  const rateInvoiceCounts = new Map<string, Set<string>>();
  const hsnInvoiceCounts = new Map<string, Set<string>>();
  const dateInvoiceCounts = new Map<string, Set<string>>();
  const invoiceInvoiceCounts = new Map<string, Set<string>>();

  rows.forEach(({ invoice, calc }) => {
    const invKey = String(field(invoice, "invoiceNo") ?? field(invoice, "id") ?? "");
    const dateKey = String(field(invoice, "date") ?? "").slice(0, 10);
    const dateRow = byDate.get(dateKey) || emptyGstRow(dateKey);
    const invRow = byInvoice.get(invKey) || emptyGstRow(invKey);

    const addInvoiceCount = (group: Map<string, Set<string>>, key: string) => {
      const set = group.get(key) || new Set<string>();
      set.add(invKey);
      group.set(key, set);
    };

    calc.lines.forEach((line) => {
      const rateKey = String(line.gstRate);
      const hsnKey = line.hsn || "—";
      const rateRow = byRate.get(rateKey) || emptyGstRow(rateKey, line.gstRate);
      const hsnRow = byHsn.get(hsnKey) || emptyGstRow(hsnKey, line.gstRate);
      const aggregate: GstLineLike = {
        gstRate: line.gstRate,
        taxableAmount: line.taxableAmount,
        cgst: line.cgst,
        sgst: line.sgst,
        igst: line.igst,
        gstTotal: line.gstAmount,
        lineTotal: line.lineTotal,
        qty: line.qty,
      };
      accumulateGstRow(rateRow, aggregate);
      accumulateGstRow(hsnRow, aggregate);
      accumulateGstRow(dateRow, aggregate);
      accumulateGstRow(invRow, aggregate);
      byRate.set(rateKey, rateRow);
      byHsn.set(hsnKey, hsnRow);
      addInvoiceCount(rateInvoiceCounts, rateKey);
      addInvoiceCount(hsnInvoiceCounts, hsnKey);
      addInvoiceCount(dateInvoiceCounts, dateKey);
      addInvoiceCount(invoiceInvoiceCounts, invKey);
    });

    byDate.set(dateKey, dateRow);
    byInvoice.set(invKey, invRow);
  });

  const finalizeCounts = (map: Map<string, GstReportRow>, counts: Map<string, Set<string>>) => {
    map.forEach((row, key) => {
      row.invoiceCount = (counts.get(key)?.size ?? 0);
    });
  };
  finalizeCounts(byRate, rateInvoiceCounts);
  finalizeCounts(byHsn, hsnInvoiceCounts);
  finalizeCounts(byDate, dateInvoiceCounts);
  finalizeCounts(byInvoice, invoiceInvoiceCounts);

  const sorted = (list: GstReportRow[]) => list.sort((a, b) => a.key.localeCompare(b.key));

  const taxableSales = sumMoney(rows.map((r) => r.calc.taxableAmount));
  const cgst = sumMoney(rows.map((r) => r.calc.cgst));
  const sgst = sumMoney(rows.map((r) => r.calc.sgst));
  const igst = sumMoney(rows.map((r) => r.calc.igst));
  const gstTotal = sumMoney(rows.map((r) => r.calc.gstTotal));
  const invoiceValue = sumMoney(rows.map((r) => r.calc.grandTotal));
  const rateRows = sorted([...byRate.values()]).sort((a, b) => a.gstRate - b.gstRate);

  const rates = rateRows.map((r) => ({
    ...r,
    rate: r.gstRate,
    taxable: r.taxableAmount,
  }));

  const totals = {
    taxable: taxableSales,
    cgst,
    sgst,
    igst,
    gstTotal,
    invoiceValue,
  };

  return {
    taxableSales,
    cgst,
    sgst,
    igst,
    gstTotal,
    invoiceValue,
    byRate: rateRows,
    byHsn: sorted([...byHsn.values()]),
    byDate: sorted([...byDate.values()]),
    byInvoice: sorted([...byInvoice.values()]),
    totals,
    rates,
  };
}

/* ------------------------------------------------------------------ *
 * PRODUCT REPORT (PHASES 13/16)
 * ------------------------------------------------------------------ */

export type ProductCostLike = { id?: unknown; cost?: unknown };

export type ProductReportRow = {
  productId: string;
  name: string;
  hsn: string;
  unit: string;
  gstRate: number;
  quantitySold: number;
  grossSales: number;
  discount: number;
  taxableAmount: number;
  gstTotal: number;
  /** GST-free revenue. */
  revenue: number;
  costAmount: number;
  grossProfit: number;
  profitMargin: number;
  hasCostData: boolean;
  invoiceCount: number;
};

export type ProductReport = {
  rows: ProductReportRow[];
  quantitySold: number;
  grossSales: number;
  discount: number;
  taxTotal: number;
  revenue: number;
  costAmount: number;
  grossProfit: number;
  profitMargin: number;
  /** False when no product carries a cost price (profit is not meaningful). */
  hasCostData: boolean;
};

/** Map of productId -> cost price from the product master. */
function costMap(products: ProductCostLike[] = []): Map<string, number> {
  const map = new Map<string, number>();
  (products || []).forEach((p) => {
    if (p?.id !== undefined && p?.cost !== undefined && p?.cost !== null && p?.cost !== "") {
      map.set(String(p.id), toNumber(p.cost));
    }
  });
  return map;
}

/** Aggregate every invoice line into a per-product report (+profit). */
export function productReport<T extends AnyInvoice>(
  invoices: T[],
  optionsOrProducts?: (SalesSummaryOptions & { products?: ProductCostLike[] }) | ProductCostLike[],
  extraOptions: SalesSummaryOptions = {},
): ProductReport {
  let options: SalesSummaryOptions & { products?: ProductCostLike[] };
  if (Array.isArray(optionsOrProducts)) {
    options = { ...extraOptions, products: optionsOrProducts };
  } else {
    options = optionsOrProducts || {};
  }
  const rows = calculateInvoiceRows(invoices, options).filter((r) => !r.cancelled);
  const costs = costMap(options.products);

  const map = new Map<string, ProductReportRow & { _invoices: Set<string> }>();
  rows.forEach(({ invoice, calc }) => {
    const invKey = String(field(invoice, "invoiceNo") ?? field(invoice, "id") ?? "");
    calc.lines.forEach((line) => {
      const key = line.productId || line.name || "—";
      let row = map.get(key);
      if (!row) {
        row = {
          productId: line.productId,
          name: line.name,
          hsn: line.hsn,
          unit: line.unit,
          gstRate: line.gstRate,
          quantitySold: 0,
          grossSales: 0,
          discount: 0,
          taxableAmount: 0,
          gstTotal: 0,
          revenue: 0,
          costAmount: 0,
          grossProfit: 0,
          profitMargin: 0,
          hasCostData: costs.has(line.productId),
          invoiceCount: 0,
          _invoices: new Set<string>(),
        };
        map.set(key, row);
      }
      row.quantitySold += toNumber(line.qty);
      row.grossSales = addMoney(row.grossSales, line.gross);
      row.discount = addMoney(row.discount, line.discount);
      row.taxableAmount = addMoney(row.taxableAmount, line.taxableAmount);
      row.gstTotal = addMoney(row.gstTotal, line.gstAmount);
      // Profit is computed on the GST-FREE revenue, never the tax-inclusive total.
      const profit = lineProfit({
        taxableAmount: line.taxableAmount,
        qty: line.qty,
        cost: costs.has(line.productId) ? costs.get(line.productId) : undefined,
      });
      row.revenue = addMoney(row.revenue, profit.revenue);
      row.costAmount = addMoney(row.costAmount, profit.cost);
      row.grossProfit = addMoney(row.grossProfit, profit.hasCost ? profit.grossProfit : 0);
      row._invoices.add(invKey);
    });
  });

  const list: ProductReportRow[] = [...map.values()]
    .map((row) => {
      const { _invoices, ...rest } = row;
      return { ...rest, invoiceCount: _invoices.size, profitMargin: margin(row.grossProfit, row.revenue) };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const revenue = sumMoney(list.map((r) => r.revenue));
  const grossProfit = sumMoney(list.map((r) => r.grossProfit));
  return {
    rows: list,
    quantitySold: list.reduce((s, r) => s + r.quantitySold, 0),
    grossSales: sumMoney(list.map((r) => r.grossSales)),
    discount: sumMoney(list.map((r) => r.discount)),
    taxTotal: sumMoney(list.map((r) => r.gstTotal)),
    revenue,
    costAmount: sumMoney(list.map((r) => r.costAmount)),
    grossProfit,
    profitMargin: margin(grossProfit, revenue),
    hasCostData: list.some((r) => r.hasCostData),
  };
}

/* ------------------------------------------------------------------ *
 * CUSTOMER REPORT (PHASES 8/16)
 * ------------------------------------------------------------------ */

export type CustomerLike = { id?: unknown; name?: unknown; phone?: unknown; state?: unknown };

export type CustomerReportRow = {
  customerId: string;
  name: string;
  phone: string;
  state: string;
  invoiceCount: number;
  totalSales: number;
  paidAmount: number;
  balance: number;
  /** Transaction-based outstanding (invoice balances − standalone receipts). */
  outstanding: number;
  lastInvoiceDate: string;
};

export type CustomerReport = {
  rows: CustomerReportRow[];
  totalCustomers: number;
  activeCustomers: number;
  totalSales: number;
  paidAmount: number;
  balance: number;
  outstanding: number;
  /** Σ outstanding across every customer. */
  totalOutstanding: number;
};

export type PaymentLike = { customerId?: unknown; amount?: unknown };

/**
 * Per-customer report. Outstanding comes from `customerService` (transaction
 * based) so the Customer screen, the dashboard and this report cannot drift.
 */
export function customerReport<T extends AnyInvoice>(
  invoices: T[],
  customers: CustomerLike[] = [],
  options: SalesSummaryOptions & { payments?: PaymentLike[] } = {},
): CustomerReport {
  const rows = calculateInvoiceRows(invoices, options).filter((r) => !r.cancelled);
  const payments = (options.payments || []) as CustomerPaymentLike[];
  const allInvoices = invoices as unknown as CustomerInvoiceLike[];

  const list: CustomerReportRow[] = (customers || [])
    .map((c) => {
      const id = String(c?.id ?? "");
      const mine = rows.filter((r) => String(field(r.invoice, "customerId") ?? "") === id);
      const lastDate =
        mine
          .map((r) => String(field(r.invoice, "date") ?? "").slice(0, 10))
          .filter(Boolean)
          .sort()
          .pop() || "";
      const paidAmount = sumMoney(mine.map((r) => r.calc.paidAmount));
      return {
        customerId: id,
        name: String(c?.name ?? ""),
        phone: String(c?.phone ?? ""),
        state: String(c?.state ?? ""),
        invoiceCount: mine.length,
        totalSales: sumMoney(mine.map((r) => r.calc.grandTotal)),
        paidAmount,
        balance: sumMoney(mine.map((r) => r.calc.balance)),
        outstanding: customerOutstanding(id, allInvoices, payments),
        lastInvoiceDate: lastDate,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);

  return {
    rows: list,
    totalCustomers: (customers || []).length,
    activeCustomers: list.filter((r) => r.invoiceCount > 0).length,
    totalSales: sumMoney(list.map((r) => r.totalSales)),
    paidAmount: sumMoney(list.map((r) => r.paidAmount)),
    balance: sumMoney(list.map((r) => r.balance)),
    outstanding: sumMoney(list.map((r) => r.outstanding)),
    totalOutstanding: totalOutstanding(allInvoices, payments),
  };
}

/* ------------------------------------------------------------------ *
 * STOCK REPORT (PHASES 11/12/16)
 * ------------------------------------------------------------------ */

export type StockLikeProduct = {
  id?: unknown;
  name?: unknown;
  stock?: unknown;
  unit?: unknown;
  price?: unknown;
  cost?: unknown;
  minStock?: unknown;
};

export type StockReport = {
  summary: ReturnType<typeof stockSummary<StockLike>>;
  lowStockRows: Array<{ id: string; name: string; stock: number; unit: string; minStock: number }>;
  movementRows: Array<{ productId: string; soldQuantity: number; invoiceCount: number }>;
  /** Current stock × cost price (never mixed with the selling price). */
  valueAtCost: number;
  /** Current stock × selling price. */
  valueAtSelling: number;
};

export function stockReport<T extends AnyInvoice>(
  products: StockLikeProduct[] = [],
  invoices: T[],
  options: SalesSummaryOptions & { lowStockThreshold?: number } = {},
): StockReport {
  const productsTyped = (products || []) as unknown as StockLike[];
  const threshold = toNumber(options.lowStockThreshold, LOW_STOCK_THRESHOLD) || LOW_STOCK_THRESHOLD;
  const summary = stockSummary(productsTyped, threshold);

  const details = (products || []).map((p) => ({
    id: String(p?.id ?? ""),
    name: String(p?.name ?? ""),
    stock: toNumber(p?.stock),
    unit: String(p?.unit ?? "pcs"),
    minStock: p?.minStock === undefined ? threshold : toNumber(p.minStock),
  }));

  const sold = new Map<string, number>();
  const seen = new Map<string, Set<string>>();
  calculateInvoiceRows(invoices, options)
    .filter((r) => !r.cancelled)
    .forEach(({ invoice, calc }) => {
      const invKey = String(field(invoice, "invoiceNo") ?? field(invoice, "id") ?? "");
      calc.lines.forEach((line) => {
        sold.set(line.productId, toNumber(sold.get(line.productId)) + toNumber(line.qty));
        const set = seen.get(line.productId) || new Set<string>();
        set.add(invKey);
        seen.set(line.productId, set);
      });
    });

  return {
    summary,
    lowStockRows: details.filter((d) => d.stock <= d.minStock),
    movementRows: [...sold.entries()].map(([productId, soldQuantity]) => ({
      productId,
      soldQuantity,
      invoiceCount: seen.get(productId)?.size ?? 0,
    })),
    valueAtCost: stockValue(productsTyped, "cost"),
    valueAtSelling: stockValue(productsTyped, "selling"),
  };
}

/* ------------------------------------------------------------------ *
 * INVOICE REPORT (PHASE 16)
 * ------------------------------------------------------------------ */

export type InvoiceReportRow = {
  id: string;
  invoiceNo: string;
  date: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  paymentMode: string;
  itemCount: number;
  totalQuantity: number;
  taxableAmount: number;
  gstTotal: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
};

export type InvoiceReport = {
  rows: InvoiceReportRow[];
  summary: SalesSummary;
};

export function invoiceReport<T extends AnyInvoice>(
  invoices: T[],
  options: SalesSummaryOptions = {},
): InvoiceReport {
  const all = calculateInvoiceRows(invoices, options);
  return {
    rows: all.map(({ invoice, calc, cancelled }) => ({
      id: String(field(invoice, "id") ?? ""),
      invoiceNo: String(field(invoice, "invoiceNo") ?? ""),
      date: String(field(invoice, "date") ?? "").slice(0, 10),
      customerName: String(field(invoice, "customerName") ?? ""),
      status: cancelled ? "Cancelled" : String(field(invoice, "status") ?? "Saved"),
      paymentStatus: calc.paymentStatus,
      paymentMode: String(field(invoice, "paymentMode") ?? ""),
      itemCount: calc.itemCount,
      totalQuantity: calc.totalQuantity,
      taxableAmount: calc.taxableAmount,
      gstTotal: calc.gstTotal,
      grandTotal: calc.grandTotal,
      paidAmount: calc.paidAmount,
      balance: calc.balance,
    })),
    summary: summarizeSales(invoices, options),
  };
}

/* ------------------------------------------------------------------ *
 * PROFIT REPORT (PHASE 13)
 * ------------------------------------------------------------------ */

export type ProfitReport = {
  revenue: number;
  costAmount: number;
  grossProfit: number;
  profitMargin: number;
  hasCostData: boolean;
  byInvoice: Array<{
    invoiceNo: string;
    date: string;
    revenue: number;
    costAmount: number;
    grossProfit: number;
    profitMargin: number;
  }>;
};

export function profitReport<T extends AnyInvoice>(
  invoices: T[],
  optionsOrProducts?: (SalesSummaryOptions & { products?: ProductCostLike[] }) | ProductCostLike[],
  extraOptions: SalesSummaryOptions = {},
): ProfitReport {
  let options: SalesSummaryOptions & { products?: ProductCostLike[] };
  if (Array.isArray(optionsOrProducts)) {
    options = { ...extraOptions, products: optionsOrProducts };
  } else {
    options = optionsOrProducts || {};
  }
  const report = productReport(invoices, options);
  const costs = costMap(options.products);
  const byInvoice = calculateInvoiceRows(invoices, options)
    .filter((r) => !r.cancelled)
    .map(({ invoice, calc }) => {
      let costAmount = 0;
      calc.lines.forEach((line) => {
        const cost = costs.has(line.productId) ? costs.get(line.productId) : undefined;
        const profit = lineProfit({ taxableAmount: line.taxableAmount, qty: line.qty, cost });
        costAmount = addMoney(costAmount, profit.cost);
      });
      const revenue = calc.taxableAmount;
      const grossProfit = subtractMoney(revenue, costAmount);
      return {
        invoiceNo: String(field(invoice, "invoiceNo") ?? ""),
        date: String(field(invoice, "date") ?? "").slice(0, 10),
        revenue,
        costAmount,
        grossProfit,
        profitMargin: margin(grossProfit, revenue),
      };
    });
  return {
    revenue: report.revenue,
    costAmount: report.costAmount,
    grossProfit: report.grossProfit,
    profitMargin: report.profitMargin,
    hasCostData: report.hasCostData,
    byInvoice,
  };
}

/* ------------------------------------------------------------------ *
 * DASHBOARD (PHASE 15)
 * ------------------------------------------------------------------ */

export type DashboardStats = {
  /** Σ grand total of active invoices (customer-facing revenue). */
  totalRevenue: number;
  /** Σ taxable amount (GST-free revenue). */
  grossRevenue: number;
  todayRevenue: number;
  todayInvoiceCount: number;
  monthRevenue: number;
  yearRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  partialInvoices: number;
  cancelledInvoices: number;
  totalCustomers: number;
  activeCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  lowStockThreshold: number;
  totalStockUnits: number;
  totalStockValue: number;
  totalStockValueSelling: number;
  totalGst: number;
  outstandingAmount: number;
  grossProfit: number;
  profitMargin: number;
  hasCostData: boolean;
  /** Products at or below the low-stock threshold (dashboard list). */
  lowStockRows: Array<{ id: string; name: string; stock: number; unit: string; minStock: number }>;
};

export type DashboardOptions = SalesSummaryOptions & {
  referenceISO?: string;
  payments?: PaymentLike[];
  lowStockThreshold?: number;
};

/**
 * Dashboard headline numbers. Every value is derived from real invoice /
 * product / customer records through the same engines used everywhere else.
 */
export function dashboardStats<T extends AnyInvoice>(
  invoices: T[],
  products: StockLikeProduct[] = [],
  customers: CustomerLike[] = [],
  options: DashboardOptions = {},
): DashboardStats {
  const ref =
    options.referenceISO && /^\d{4}-\d{2}-\d{2}/.test(String(options.referenceISO))
      ? String(options.referenceISO)
      : todayISO();

  const rows = calculateInvoiceRows(invoices, options);
  const active = rows.filter((r) => !r.cancelled);
  const cancelledInvoices = (invoices || []).length - active.length;

  const salesFor = (preset: RangePreset) =>
    summarizeSalesInRange(invoices, resolveRange(preset, { referenceISO: ref }), options);

  const stock = stockReport(products, invoices, {
    ...options,
    lowStockThreshold: options.lowStockThreshold,
  });
  const profit = profitReport(invoices, { ...options, products });
  const activeCustomerIds = new Set(active.map((r) => String(field(r.invoice, "customerId") ?? "")));

  return {
    totalRevenue: sumMoney(active.map((r) => r.calc.grandTotal)),
    grossRevenue: sumMoney(active.map((r) => r.calc.taxableAmount)),
    todayRevenue: salesFor("today").totalSales,
    todayInvoiceCount: salesFor("today").invoiceCount,
    monthRevenue: salesFor("month").totalSales,
    yearRevenue: salesFor("year").totalSales,
    totalInvoices: active.length,
    paidInvoices: active.filter((r) => r.calc.paymentStatus === "Paid").length,
    pendingInvoices: active.filter((r) => r.calc.paymentStatus === "Pending").length,
    partialInvoices: active.filter((r) => r.calc.paymentStatus === "Partial").length,
    cancelledInvoices,
    totalCustomers: (customers || []).length,
    activeCustomers: (customers || []).filter((c) => activeCustomerIds.has(String(c?.id ?? ""))).length,
    totalProducts: stock.summary.totalProducts,
    lowStockProducts: stock.summary.lowStockCount,
    lowStockThreshold: stock.summary.lowStockThreshold,
    totalStockUnits: stock.summary.totalUnits,
    totalStockValue: stock.summary.stockValueCost,
    totalStockValueSelling: stock.summary.stockValueSelling,
    totalGst: sumMoney(active.map((r) => r.calc.gstTotal)),
    outstandingAmount: options.payments
      ? sumMoney(
          (customers || []).map((c) =>
            customerOutstanding(
              String(c?.id ?? ""),
              invoices as unknown as CustomerInvoiceLike[],
              options.payments as unknown as CustomerPaymentLike[],
            ),
          ),
        )
      : totalOutstanding(invoices as unknown as CustomerInvoiceLike[]),
    grossProfit: profit.grossProfit,
    profitMargin: profit.profitMargin,
    hasCostData: profit.hasCostData,
    lowStockRows: stock.lowStockRows,
  };
}

/* ------------------------------------------------------------------ *
 * FILTERED TOTALS (PHASE 23) + PAGINATION TOTALS (PHASE 24)
 * ------------------------------------------------------------------ */

export type FilteredInvoiceResult<T extends AnyInvoice> = {
  invoices: T[];
  rows: InvoiceRow<T>[];
  summary: SalesSummary;
};

/**
 * Filter first, total second. A filtered total may NEVER be derived from an
 * unfiltered total (search "Samsung" → only Samsung rows are counted).
 */
export function filteredInvoiceSummary<T extends AnyInvoice>(
  invoices: T[],
  filter: InvoiceFilter,
  options: SalesSummaryOptions = {},
): FilteredInvoiceResult<T> {
  const matching = filterInvoices(invoices, filter);
  return { invoices: matching, rows: calculateInvoiceRows(matching, options), summary: summarizeSales(matching, options) };
}

export type PaginatedTotals<T extends AnyInvoice> = {
  slice: PageSlice<T>;
  /** Total of the rows currently on screen — label it "page total". */
  pageTotal: number;
  /** Total of every filtered row — label it "filtered total". */
  filteredTotal: number;
  /** Total of the entire dataset — label it "overall total". */
  overallTotal: number;
};

/**
 * A page total is never presented as an overall total: all three figures are
 * returned separately so the UI can label them honestly.
 */
export function paginatedInvoiceTotals<T extends AnyInvoice>(
  filtered: T[],
  overall: T[],
  page: number,
  pageSize: number,
  options: SalesSummaryOptions = {},
): PaginatedTotals<T> {
  const slice = paginate(filtered, page, pageSize);
  return {
    slice,
    pageTotal: activeGrandTotal(calculateInvoiceRows(slice.pageItems, options)),
    filteredTotal: activeGrandTotal(calculateInvoiceRows(filtered, options)),
    overallTotal: activeGrandTotal(calculateInvoiceRows(overall, options)),
  };
}

/* ------------------------------------------------------------------ *
 * RECONCILIATION (PHASE 28)
 * ------------------------------------------------------------------ */

export type ReconciliationCheck = {
  name: string;
  left: number;
  right: number;
  diff: number;
  ok: boolean;
};

export type ReconciliationResult = {
  ok: boolean;
  checks: ReconciliationCheck[];
};

function check(name: string, left: number, right: number, tolerance = 0.01): ReconciliationCheck {
  const a = roundMoney(left);
  const b = roundMoney(right);
  const diff = roundMoney(a - b);
  return { name, left: a, right: b, diff, ok: Math.abs(diff) <= tolerance };
}

/** Internal consistency of ONE invoice calculation: the numbers must add up. */
export function reconcileInvoiceCalculation(calc: ReturnType<typeof calculateInvoice>): ReconciliationResult {
  const checks: ReconciliationCheck[] = [
    check("taxable + GST + round-off = grand total", addMoney(calc.taxableAmount, calc.gstTotal, calc.roundOff), calc.grandTotal),
    check("taxable + GST = before-round amount", addMoney(calc.taxableAmount, calc.gstTotal), calc.taxableBeforeRound),
    check("CGST + SGST + IGST = GST total", addMoney(calc.cgst, calc.sgst, calc.igst), calc.gstTotal),
    check("paid + balance = grand total", addMoney(calc.paidAmount, calc.balance), calc.grandTotal),
    check(
      "Σ line totals = before-round amount",
      sumMoney(calc.lines.map((l) => l.lineTotal)),
      calc.taxableBeforeRound,
    ),
    check(
      "Σ line taxable = invoice taxable",
      sumMoney(calc.lines.map((l) => l.taxableAmount)),
      calc.taxableAmount,
    ),
    check("Σ line GST = invoice GST", sumMoney(calc.lines.map((l) => l.gstAmount)), calc.gstTotal),
    check("subtotal − discount = taxable (tax-exclusive)", subtractMoney(calc.subtotal, calc.discountTotal), calc.taxableAmount),
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

/**
 * PHASE 28 — verify that every report agrees with every other report.
 *
 *   Σ invoice grand totals = sales report = invoice report = dashboard
 *   Σ invoice GST          = GST report = dashboard GST
 *   Σ balances             = payment report = dashboard outstanding
 *   per-invoice: taxable + GST + round-off = grand total
 */
export function reconcileApp<T extends AnyInvoice>(
  invoices: T[],
  products: StockLikeProduct[] = [],
  customers: CustomerLike[] = [],
  options: DashboardOptions = {},
): ReconciliationResult {
  const rows = calculateInvoiceRows(invoices, options);
  const active = rows.filter((r) => !r.cancelled);

  const invoiceSum = sumMoney(active.map((r) => r.calc.grandTotal));
  const gstSum = sumMoney(active.map((r) => r.calc.gstTotal));
  const paidSum = sumMoney(active.map((r) => r.calc.paidAmount));
  const balanceSum = sumMoney(active.map((r) => r.calc.balance));

  const sales = summarizeSales(invoices, options);
  const gst = gstReport(invoices, options);
  const inv = invoiceReport(invoices, options);
  const dash = dashboardStats(invoices, products, customers, options);
  const payments = paymentReport(invoices, options);
  const customersReport = customerReport(invoices, customers, options);

  let internalOk = true;
  active.forEach((r) => {
    if (!reconcileInvoiceCalculation(r.calc).ok) internalOk = false;
  });

  const checks: ReconciliationCheck[] = [
    check("Σ grand totals = sales report total", invoiceSum, sales.totalSales),
    check("Σ grand totals = invoice report total", invoiceSum, inv.summary.totalSales),
    check("Σ grand totals = dashboard revenue", invoiceSum, dash.totalRevenue),
    check("Σ GST = GST report total", gstSum, gst.gstTotal),
    check("Σ GST = dashboard GST", gstSum, dash.totalGst),
    check("GST by rate = GST report total", sumMoney(gst.byRate.map((r) => r.gstTotal)), gst.gstTotal),
    check("GST by HSN = GST report total", sumMoney(gst.byHsn.map((r) => r.gstTotal)), gst.gstTotal),
    check("GST by date = GST report total", sumMoney(gst.byDate.map((r) => r.gstTotal)), gst.gstTotal),
    check("GST by invoice = GST report total", sumMoney(gst.byInvoice.map((r) => r.gstTotal)), gst.gstTotal),
    check("Σ paid = payment report paid", paidSum, payments.paidAmount),
    check("Σ balance = payment report pending", balanceSum, payments.pendingAmount),
    check("Σ balance = dashboard outstanding", balanceSum, dash.outstandingAmount),
    check("customer outstanding = dashboard outstanding", customersReport.outstanding, dash.outstandingAmount),
    check("Σ taxable = GST report taxable", sumMoney(active.map((r) => r.calc.taxableAmount)), gst.taxableSales),
    { name: "per-invoice internal consistency", left: 0, right: 0, diff: 0, ok: internalOk },
  ];

  return { ok: checks.every((c) => c.ok), checks };
}
