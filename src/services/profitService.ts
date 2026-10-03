/**
 * profitService.ts — Centralised profit / margin engine (PHASE 13).
 *
 * RULES
 *  - Revenue is the GST-FREE amount (taxable amount). GST collected is a
 *    government liability and is NEVER business profit.
 *  - Cost is `costPrice × quantity`. Discounts are already reflected in the
 *    taxable amount coming out of the invoice engine.
 *  - When a product has no cost price the engine reports a cost of 0 AND a
 *    `hasCost` flag of false, so callers can render "—" instead of a fake
 *    profit number.
 */

import { roundMoney, subtractMoney, toNumber, multiplyMoney } from "./money";

export type ProfitInput = {
  /** GST-free revenue for the line/invoice (from the invoice engine). */
  taxableAmount?: unknown;
  /** Units sold. */
  qty?: unknown;
  /** Per-unit cost price. `undefined` = cost unknown. */
  cost?: unknown;
  /** Total-unit cost; used when the caller already knows it (purchases). */
  costAmount?: unknown;
};

export type ProfitResult = {
  revenue: number;
  cost: number;
  grossProfit: number;
  profitMargin: number;
  hasCost: boolean;
};

/** Gross profit margin as a percentage of revenue (0 when revenue is 0). */
export function margin(grossProfit: unknown, revenue: unknown): number {
  const rev = toNumber(revenue);
  if (rev <= 0) return 0;
  return roundMoney((toNumber(grossProfit) / rev) * 100);
}

/** Mark-up percentage over cost (0 when cost is 0). */
export function markupPercent(grossProfit: unknown, cost: unknown): number {
  const c = toNumber(cost);
  if (c <= 0) return 0;
  return roundMoney((toNumber(grossProfit) / c) * 100);
}

/**
 * Profit for ONE line of an invoice.
 *   revenue     = taxable amount (GST-free, after discount)
 *   cost        = costPrice × qty
 *   grossProfit = revenue − cost
 */
export function lineProfit(input: ProfitInput | null | undefined): ProfitResult {
  const revenue = roundMoney(input?.taxableAmount);
  const qty = toNumber(input?.qty);
  const hasCost = input?.cost !== undefined && input?.cost !== null && input?.cost !== "";
  const cost = hasCost
    ? multiplyMoney(input?.cost, qty)
    : roundMoney(input?.costAmount);
  const grossProfit = subtractMoney(revenue, cost);
  return {
    revenue,
    cost: hasCost || input?.costAmount !== undefined ? cost : 0,
    grossProfit,
    profitMargin: margin(grossProfit, revenue),
    hasCost: hasCost || input?.costAmount !== undefined,
  };
}

/** Profit for a whole set of priced/sold lines. */
export function totalProfit(lines: Array<ProfitInput | null | undefined>): ProfitResult {
  return (lines || []).reduce<ProfitResult>(
    (acc, line) => {
      const one = lineProfit(line);
      const revenue = roundMoney(acc.revenue + one.revenue);
      const cost = roundMoney(acc.cost + one.cost);
      const grossProfit = subtractMoney(revenue, cost);
      return {
        revenue,
        cost,
        grossProfit,
        profitMargin: margin(grossProfit, revenue),
        hasCost: acc.hasCost || one.hasCost,
      };
    },
    { revenue: 0, cost: 0, grossProfit: 0, profitMargin: 0, hasCost: false },
  );
}

/** Product-level profit: selling price vs cost price for a quantity. */
export function productProfit(
  sellingPrice: unknown,
  costPrice: unknown,
  qty: unknown,
  options: { discount?: unknown; discountType?: "percent" | "amount"; discountAmount?: unknown } = {},
): ProfitResult & { gross: number; discount: number } {
  const quantity = toNumber(qty);
  const gross = multiplyMoney(sellingPrice, quantity);
  const discount =
    options.discountType === "amount"
      ? Math.min(gross, roundMoney(options.discountAmount))
      : Math.min(gross, roundMoney((gross * Math.max(0, Math.min(100, toNumber(options.discount)))) / 100));
  const revenue = subtractMoney(gross, discount);
  const hasCost = costPrice !== undefined && costPrice !== null && costPrice !== "";
  const cost = hasCost ? multiplyMoney(costPrice, quantity) : 0;
  const grossProfit = subtractMoney(revenue, cost);
  return {
    revenue,
    gross,
    discount,
    cost,
    grossProfit,
    profitMargin: margin(grossProfit, revenue),
    hasCost,
  };
}