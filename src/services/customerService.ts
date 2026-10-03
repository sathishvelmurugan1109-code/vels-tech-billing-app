/**
 * customerService.ts — transaction-based customer outstanding (PHASE 8).
 *
 * RULE (never break it):
 *   currentOutstanding = previousOutstanding + newCredit - payment
 *
 * Balances are DERIVED from invoice records, never simply overwritten:
 * credit invoices raise it, recorded payments lower it, cancelled
 * invoices release it. Double counting is impossible because every
 * transition goes through one of these pure helpers.
 */

import { clamp, roundMoney, sumMoney, toNumber } from "./money";

/** Cancelled invoices never contribute to any outstanding. */
function isCancelled(inv: { status?: unknown }): boolean {
  return String(inv?.status ?? "").toLowerCase() === "cancelled";
}

export type CustomerInvoiceLike = {
  customerId?: unknown;
  grandTotal?: unknown;
  paidAmount?: unknown;
  paymentStatus?: unknown;
  status?: unknown;
};

export type CustomerPaymentLike = {
  customerId?: unknown;
  amount?: unknown;
};

/** Sum of UNPAID balances (grandTotal − paidAmount) across live invoices. */
export function customerOutstandingFromInvoices(
  customerId: unknown,
  invoices: CustomerInvoiceLike[],
): number {
  const id = String(customerId ?? "");
  const balances = (invoices || [])
    .filter((inv) => String(inv?.customerId ?? "") === id)
    .filter((inv) => !isCancelled(inv))
    .map((inv) => {
      const total = roundMoney(inv?.grandTotal);
      const paid = clamp(roundMoney(inv?.paidAmount), 0, Math.max(0, total));
      return Math.max(0, roundMoney(total - paid));
    });
  return sumMoney(balances);
}

/** Sum of standalone payment receipts recorded against the customer. */
export function customerPaymentsTotal(customerId: unknown, payments: CustomerPaymentLike[]): number {
  const id = String(customerId ?? "");
  return sumMoney(
    (payments || [])
      .filter((p) => String(p?.customerId ?? "") === id)
      .map((p) => Math.max(0, roundMoney(p?.amount))),
  );
}

/**
 * Authoritative outstanding for one customer:
 *   invoice balances − standalone receipts (never below zero).
 */
export function customerOutstanding(
  customerId: unknown,
  invoices: CustomerInvoiceLike[],
  payments: CustomerPaymentLike[] = [],
): number {
  return Math.max(
    0,
    roundMoney(customerOutstandingFromInvoices(customerId, invoices) - customerPaymentsTotal(customerId, payments)),
  );
}

/** Outstanding for EVERY customer in one pass (dashboard + report). */
export function allCustomerOutstandings(
  customerIds: unknown[],
  invoices: CustomerInvoiceLike[],
  payments: CustomerPaymentLike[] = [],
): Map<string, number> {
  const out = new Map<string, number>();
  (customerIds || []).forEach((id) => {
    out.set(String(id), customerOutstanding(id, invoices, payments));
  });
  return out;
}

/** Total outstanding across the business (dashboard headline). */
export function totalOutstanding(
  invoices: CustomerInvoiceLike[],
  payments: CustomerPaymentLike[] = [],
): number {
  return sumMoney(
    (invoices || [])
      .filter((inv) => !isCancelled(inv))
      .map((inv) => {
        const total = roundMoney(inv?.grandTotal);
        const paid = clamp(roundMoney(inv?.paidAmount), 0, Math.max(0, total));
        return Math.max(0, roundMoney(total - paid));
      }),
  );
}

/** Apply a new credit event to a previous balance (pure, testable). */
export function applyCredit(previousOutstanding: unknown, newCredit: unknown): number {
  return Math.max(0, roundMoney(toNumber(previousOutstanding) + Math.max(0, roundMoney(newCredit))));
}

/** Apply a payment receipt to a previous balance (pure, testable). */
export function applyCustomerPayment(previousOutstanding: unknown, payment: unknown): number {
  return Math.max(0, roundMoney(toNumber(previousOutstanding) - Math.max(0, roundMoney(payment))));
}

/**
 * Next outstanding after an invoice event (create / edit / cancel):
 * derives BOTH sides through the money engine so the caller's stored
 * customer balance can be reconciled instead of overwritten.
 */
export function nextOutstandingAfterInvoice(
  previousOutstanding: unknown,
  oldBalance: unknown,
  newBalance: unknown,
): number {
  return Math.max(0, roundMoney(toNumber(previousOutstanding) - toNumber(oldBalance) + toNumber(newBalance)));
}
