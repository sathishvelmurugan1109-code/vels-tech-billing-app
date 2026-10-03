/**
 * paymentService.ts — Centralised payment engine.
 *
 * Handles paid amount, balance, and automatic payment-status derivation.
 * Supports Paid / Pending / Partial and multiple payment entries.
 */

import { roundMoney, subtractMoney, addMoney, toNumber, clamp } from "./money";

export type PaymentStatus = "Paid" | "Pending" | "Partial";
export type PaymentMode = "Cash" | "UPI" | "Card" | "Credit";

export const PAYMENT_STATUSES: PaymentStatus[] = ["Paid", "Pending", "Partial"];
export const PAYMENT_MODES: PaymentMode[] = ["UPI", "Cash", "Card", "Credit"];

/**
 * balance = grandTotal - paidAmount.
 * Never returns a negative value (over-payment is treated as zero balance).
 */
export function computeBalance(grandTotal: unknown, paidAmount: unknown): number {
  const balance = subtractMoney(grandTotal, paidAmount);
  return balance < 0 ? 0 : balance;
}

/**
 * Automatically derive payment status:
 *   paid >= grandTotal -> "Paid"
 *   paid <= 0          -> "Pending"
 *   0 < paid < total   -> "Partial"
 * Zero-value invoices are considered settled when anything is recorded.
 */
export function derivePaymentStatus(grandTotal: unknown, paidAmount: unknown): PaymentStatus {
  const total = roundMoney(grandTotal);
  const paid = roundMoney(paidAmount);
  if (total <= 0) return paid > 0 ? "Paid" : "Paid";
  if (paid >= total) return "Paid";
  if (paid <= 0) return "Pending";
  return "Partial";
}

/**
 * Resolve the paid amount to persist for a chosen status, applying the
 * existing business rules:
 *   Paid    -> full grand total
 *   Pending -> 0
 *   Partial -> user-entered amount, clamped to [0, grandTotal]
 */
export function resolvePaidAmount(
  status: PaymentStatus,
  grandTotal: unknown,
  inputPaid: unknown,
): number {
  const total = roundMoney(grandTotal);
  if (status === "Paid") return total;
  if (status === "Pending") return 0;
  return clamp(roundMoney(inputPaid), 0, total);
}

/** Sum multiple payment entries into one authoritative paid amount. */
export function sumPayments(entries: Array<{ amount: unknown } | unknown>): number {
  return addMoney(
    ...entries.map((e) => {
      const raw = typeof e === "object" && e !== null ? (e as any).amount : e;
      return sanitizePayment(raw);
    }),
  );
}

/** Safe guard: a payment amount may never be negative or NaN. */
export function sanitizePayment(value: unknown): number {
  const n = toNumber(value);
  return n < 0 ? 0 : n;
}

/* ------------------------------------------------------------------ *
 * PAYMENT RESOLUTION — SINGLE SOURCE (PHASE 7)
 * ------------------------------------------------------------------ */

export type PaymentResolution = {
  grandTotal: number;
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentStatus;
};

/**
 * Authoritative payment outcome for one invoice save/edit event.
 *
 *   Paid    -> paidAmount is ALWAYS the full grand total
 *   Pending -> paidAmount is ALWAYS 0
 *   Partial -> the entered amount, clamped to [0, grandTotal]
 *
 * The returned status is RE-DERIVED from the amounts so that a stale or
 * hand-typed status can never disagree with the money.
 */
export function computePayment(
  grandTotal: unknown,
  status: PaymentStatus | unknown,
  inputPaid: unknown,
): PaymentResolution {
  const total = toNumber(grandTotal) < 0 ? 0 : roundMoney(grandTotal);
  const safeStatus: PaymentStatus =
    status === "Paid" || status === "Pending" || status === "Partial" ? status : "Pending";
  const paidAmount = resolvePaidAmount(safeStatus, total, inputPaid);
  return {
    grandTotal: total,
    paidAmount,
    balance: computeBalance(total, paidAmount),
    paymentStatus: derivePaymentStatus(total, paidAmount),
  };
}

/** A payment mode may never be an unexpected string. Falls back to "Cash". */
export function normalizePaymentMode(mode: unknown): PaymentMode {
  return mode === "Cash" || mode === "UPI" || mode === "Card" || mode === "Credit"
    ? mode
    : "Cash";
}

/* ------------------------------------------------------------------ *
 * MULTI-PAYMENT LEDGERS
 * ------------------------------------------------------------------ */

export type PaymentEntry = { amount: unknown; mode?: unknown; date?: unknown; note?: unknown };

export type PaymentLedgerResult = PaymentResolution & { entryCount: number };

/**
 * Settle an invoice against zero or more payment entries (part payments,
 * advance + final settlement, card + cash split…).
 * All entries are summed through the money engine; the status is derived.
 */
export function computePaymentFromLedger(grandTotal: unknown, entries: PaymentEntry[]): PaymentLedgerResult {
  const total = toNumber(grandTotal) < 0 ? 0 : roundMoney(grandTotal);
  const paidAmount = Math.min(total, Math.max(0, sumPayments(entries)));
  return {
    grandTotal: total,
    paidAmount,
    balance: computeBalance(total, paidAmount),
    paymentStatus: derivePaymentStatus(total, paidAmount),
    entryCount: (entries || []).length,
  };
}
