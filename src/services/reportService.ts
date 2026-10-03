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

import { roundMoney, sumMoney, toNumber } from "./money";
import { calculateInvoice, StoredInvoiceLike } from "./invoiceService";
import { customerOutstanding, totalOutstanding } from "./customerService";
import { inRange, DateRange, todayISO } from "./dateService";
import { stockSummary } from "./stockService";

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
export function filterInvoices<T extends Record<string, unknown>>(
  invoices: T[],
  filter: InvoiceFilter = {},
): T[] {
  return (invoices || []).filter((inv) => {
    if (filter.customerId && String(inv.customerId ?? "") !== String(filter.customerId)) return false;
    if (filter.status && String(inv.status ?? "") !== filter.status) return false;
    if (filter.paymentStatus && String(inv.paymentStatus ?? "") !== filter.paymentStatus) return false;
    if (filter.range && !inRange(inv.date, filter.range)) return false;
    if (filter.search && !matchesSearch(inv, filter.search)) return false;
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

/*__MORE__*/
