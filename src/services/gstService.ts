/**
 * gstService.ts — Centralised GST engine.
 *
 * Responsibilities:
 *  - Validate / normalise GST rates (0, 5, 12, 18, 28 and custom 0-100).
 *  - Decide the tax type automatically:
 *       Business State == Customer State  -> CGST + SGST  ("intra")
 *       Business State != Customer State  -> IGST         ("inter")
 *  - Split a GST amount into CGST/SGST or IGST so that parts always re-add
 *    to the total (no lost paise).
 *
 * Every GST figure in the app must come from here.
 */

import { roundMoney, toNumber, percentage } from "./money";

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number] | number;

export type TaxType = "intra" | "inter";

/** A GST rate is valid when it is a finite number between 0 and 100. */
export function isValidGstRate(rate: unknown): boolean {
  const r = toNumber(rate, NaN as unknown as number);
  return Number.isFinite(r) && r >= 0 && r <= 100;
}

/** Normalise any input into a safe, whole-number GST rate clamped to 0…100. */
export function normalizeGstRate(rate: unknown): number {
  const r = Math.round(toNumber(rate));
  if (!Number.isFinite(r)) return 0;
  return Math.min(100, Math.max(0, r));
}

/** Normalise a state name for comparison (trim + lowercase). */
export function normalizeState(state: unknown): string {
  return String(state ?? "").trim().toLowerCase();
}

/**
 * Determine tax type automatically from the business (company) state and the
 * customer's state.
 */
export function resolveTaxType(businessState: unknown, customerState: unknown): TaxType {
  return normalizeState(businessState) === normalizeState(customerState) ? "intra" : "inter";
}

/** Human label used by the UI. */
export function taxTypeLabel(taxType: TaxType): string {
  return taxType === "intra" ? "CGST + SGST (Intra-state)" : "IGST (Inter-state)";
}

export type GstSplit = {
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  taxType: TaxType;
};

/**
 * Split a GST amount into CGST/SGST (intra) or IGST (inter).
 * For intra-state the amount is halved; the second half is computed as
 * (total - firstHalf) so the two halves always re-add exactly to the total.
 */
export function splitGst(gstAmount: unknown, taxType: TaxType): GstSplit {
  const gstTotal = roundMoney(gstAmount);
  if (taxType === "inter") {
    return { cgst: 0, sgst: 0, igst: gstTotal, gstTotal, taxType };
  }
  const cgst = roundMoney(gstTotal / 2);
  const sgst = roundMoney(gstTotal - cgst);
  return { cgst, sgst, igst: 0, gstTotal, taxType };
}

/**
 * Compute GST for a taxable base at a given rate and split it by tax type.
 */
export function computeGst(taxableAmount: unknown, gstRate: unknown, taxType: TaxType): GstSplit {
  const rate = normalizeGstRate(gstRate);
  const gstTotal = percentage(taxableAmount, rate);
  return splitGst(gstTotal, taxType);
}

/* ------------------------------------------------------------------ *
 * GST-INCLUSIVE PRICING (PHASE 5)
 * ------------------------------------------------------------------ */

/** Options offered by the product / GST dropdowns. */
export const GST_RATE_OPTIONS: number[] = [...GST_RATES];

export const GST_RATE_LABELS: Record<number, string> = {
  0: "0% (Exempt)",
  5: "5%",
  12: "12%",
  18: "18%",
  28: "28%",
};

/** Plain-English label for a rate — used by select inputs. */
export function gstRateLabel(rate: unknown): string {
  const r = normalizeGstRate(rate);
  return GST_RATE_LABELS[r] ?? `${r}%`;
}

/**
 * Remove GST from an INCLUSIVE amount.
 *   taxable = inclusive × 100 / (100 + rate)
 * Returns the GST-free base rounded to 2 decimals.
 */
export function extractTaxableFromInclusive(inclusiveAmount: unknown, gstRate: unknown): number {
  const rate = normalizeGstRate(gstRate);
  const inclusive = roundMoney(inclusiveAmount);
  if (rate <= 0) return inclusive;
  return roundMoney((inclusive * 100) / (100 + rate));
}

export type GstInclusiveResult = GstSplit & {
  /** Amount the customer sees (GST included). */
  grossAmount: number;
  /** GST-free base amount. */
  taxableAmount: number;
};

/**
 * Compute GST for a GST-INCLUSIVE price. The two halves still re-add to the
 * extracted tax so no paise are ever lost.
 */
export function computeGstInclusive(
  inclusiveAmount: unknown,
  gstRate: unknown,
  taxType: TaxType,
): GstInclusiveResult {
  const grossAmount = roundMoney(inclusiveAmount);
  const taxableAmount = extractTaxableFromInclusive(grossAmount, gstRate);
  const gstAmount = roundMoney(grossAmount - taxableAmount);
  const split = splitGst(gstAmount, taxType);
  return { ...split, grossAmount, taxableAmount };
}

/**
 * Aggregate a set of per-line GST splits into one authoritative total.
 * CGST/SGST/IGST are accumulated independently so the invoice always
 * reconciles with its lines.
 */
export function aggregateGstSplits(splits: GstSplit[]): GstSplit {
  const cgst = roundMoney((splits || []).reduce((s, x) => s + toNumber(x.cgst), 0));
  const sgst = roundMoney((splits || []).reduce((s, x) => s + toNumber(x.sgst), 0));
  const igst = roundMoney((splits || []).reduce((s, x) => s + toNumber(x.igst), 0));
  const gstTotal = roundMoney((splits || []).reduce((s, x) => s + toNumber(x.gstTotal), 0));
  const taxType: TaxType = igst > 0 ? "inter" : "intra";
  return { cgst, sgst, igst, gstTotal, taxType };
}
