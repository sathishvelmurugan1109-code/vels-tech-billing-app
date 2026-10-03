/**
 * money.ts — Centralised money engine for the VELS TECH billing application.
 *
 * RULES (see the calculation-upgrade spec):
 *  - All monetary values are NUMERIC internally (never formatted strings).
 *  - Internal working unit is "paise" (integer cents) to avoid binary
 *    floating-point drift, then converted back to a 2-decimal number.
 *  - Currency precision is ALWAYS 2 decimals.
 *  - Formatting (₹1,23,456.00) happens ONLY at the UI / output layer.
 *
 * Every calculation in the app must go through these helpers.
 */

export const CURRENCY_DECIMALS = 2;
const CURRENCY_FACTOR = 10 ** CURRENCY_DECIMALS; // 100

/**
 * Safely coerce any value to a finite number. Guards against NaN, Infinity,
 * null, undefined and numeric strings. Returns `fallback` (default 0) otherwise.
 */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Clamp a numeric value between min and max (inclusive). */
export function clamp(value: unknown, min: number, max: number): number {
  const n = toNumber(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Round a value to the given number of decimals using round-half-away-from-zero.
 * Uses a scaled toFixed(6) pass to eliminate binary representation error
 * (e.g. 1.005 -> 1.01 instead of 1.00).
 */
export function roundMoney(value: unknown, decimals: number = CURRENCY_DECIMALS): number {
  const n = toNumber(value);
  const factor = 10 ** decimals;
  const scaled = Number((n * factor).toFixed(6));
  const rounded = Math.round(Math.abs(scaled));
  return (n < 0 ? -1 : 1) * (rounded / factor);
}

/** Convert a currency amount to integer paise (cents). */
export function toCents(value: unknown): number {
  return Math.round(toNumber(value) * CURRENCY_FACTOR);
}

/** Convert integer paise (cents) back to a clean 2-decimal currency amount. */
export function fromCents(cents: unknown): number {
  return roundMoney(toNumber(cents) / CURRENCY_FACTOR);
}

/** Sum any number of monetary values with 2-decimal precision. */
export function addMoney(...values: unknown[]): number {
  return fromCents(values.reduce<number>((sum, v) => sum + toCents(v), 0));
}

/** Sum an array of monetary values with 2-decimal precision. */
export function sumMoney(values: unknown[]): number {
  return fromCents((values || []).reduce<number>((sum, v) => sum + toCents(v), 0));
}

/** a - b with 2-decimal precision. */
export function subtractMoney(a: unknown, b: unknown): number {
  return fromCents(toCents(a) - toCents(b));
}

/** a * b with 2-decimal precision (b may be a fractional quantity/rate). */
export function multiplyMoney(a: unknown, b: unknown): number {
  return roundMoney(toNumber(a) * toNumber(b));
}

/** a / b with 2-decimal precision. Returns 0 when b is 0 (never Infinity/NaN). */
export function divideMoney(a: unknown, b: unknown): number {
  const divisor = toNumber(b);
  if (divisor === 0) return 0;
  return roundMoney(toNumber(a) / divisor);
}

/**
 * Percentage of an amount: (amount * rate) / 100 with 2-decimal precision.
 * Example: percentage(1000, 18) === 180
 */
export function percentage(amount: unknown, rate: unknown): number {
  return roundMoney((toNumber(amount) * toNumber(rate)) / 100);
}

/**
 * Percentage that one value represents of another (0-100 scale, guarded).
 * Example: percentOf(180, 1000) === 18
 */
export function percentOf(part: unknown, whole: unknown): number {
  const w = toNumber(whole);
  if (w === 0) return 0;
  return roundMoney((toNumber(part) / w) * 100);
}

/** Round a value to the nearest `step` (default: nearest rupee). */
export function roundToNearest(value: unknown, step = 1): number {
  const s = toNumber(step, 1);
  if (s === 0) return roundMoney(value);
  const n = toNumber(value);
  const quotient = n / s;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(quotient))) * s;
}

/** Format currency for display ONLY. Never feed the output back into maths. */
export function formatCurrency(value: unknown): string {
  const n = roundMoney(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: CURRENCY_DECIMALS,
    maximumFractionDigits: CURRENCY_DECIMALS,
  }).format(n);
}

/* ------------------------------------------------------------------ *
 * VALIDATION GUARDS (PHASE 26)
 * ------------------------------------------------------------------ */

/** True when the value can be safely used as a finite number. */
export function isValidNumber(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string" && value.trim() !== "") {
    return Number.isFinite(Number(value.replace(/[^0-9.\-]/g, "")));
  }
  return false;
}

/** Money that may never be negative or NaN (prices, discounts, payments). */
export function safeMoney(value: unknown): number {
  return Math.max(0, roundMoney(value));
}

/** Quantity that may never be negative or NaN. */
export function safeQuantity(value: unknown): number {
  return Math.max(0, toNumber(value));
}

/* ------------------------------------------------------------------ *
 * ROUND-OFF (PHASE 21)
 *
 * Round-off is applied AFTER tax and may only adjust the final payable
 * amount. It never changes the taxable amount or the GST figures.
 * ------------------------------------------------------------------ */

export type RoundOffResult = { roundOff: number; roundedTotal: number };

export function computeRoundOff(amount: unknown, step = 1): RoundOffResult {
  const exact = roundMoney(amount);
  const roundedTotal = roundMoney(roundToNearest(exact, step));
  return { roundOff: subtractMoney(roundedTotal, exact), roundedTotal };
}

/* ------------------------------------------------------------------ *
 * OUTPUT-LAYER FORMATTERS (never feed these back into maths)
 * ------------------------------------------------------------------ */

/** Format a non-currency number (quantities, rates) for display. */
export function formatNumber(value: unknown, decimals: number = CURRENCY_DECIMALS): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundMoney(value, decimals));
}

/** Format a currency value WITHOUT the ₹ symbol (PDF/CSV tables). */
export function formatAmount(value: unknown, decimals: number = CURRENCY_DECIMALS): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundMoney(value, decimals));
}

/** Abbreviated Indian-notation amount (₹1.2L / ₹3.4Cr) for dashboards. */
export function formatCompact(value: unknown): string {
  const n = toNumber(value);
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(2)}K`;
  return formatCurrency(n);
}
