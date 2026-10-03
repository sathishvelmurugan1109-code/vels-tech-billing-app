/**
 * stockService.ts — Centralised stock & inventory engine.
 *
 * Model:
 *   Current Stock = Opening
 *                 + Purchases
 *                 + Stock Adjustments In
 *                 - Sales
 *                 - Stock Adjustments Out
 *                 + Returns
 *
 * Stock mutations are expressed as signed deltas so that invoice editing,
 * deletion and returns apply only the DIFFERENCE (never a duplicate
 * deduction/restoration).
 */

import { toNumber, roundMoney } from "./money";

export type StockLike = { id: string; stock: number; price?: number; cost?: number };

export type StockChange = { productId: string; delta: number };

/** Low-stock threshold (matches the existing UI rule of "≤ 10 qty"). */
export const LOW_STOCK_THRESHOLD = 10;

export type StockItemInput = { productId: string; qty: unknown };

/** Build a map of productId -> total quantity for a set of invoice items. */
export function itemQuantityMap(items: StockItemInput[]): Map<string, number> {
  const map = new Map<string, number>();
  (items || []).forEach((it) => {
    const qty = toNumber(it.qty, 0);
    if (!it.productId || qty === 0) return;
    map.set(it.productId, (map.get(it.productId) || 0) + qty);
  });
  return map;
}

/**
 * Compute the stock deltas required to move from `oldItems` (previous invoice
 * state) to `newItems` (new invoice state).
 *
 *   create invoice : old = [],  new = items      -> deduct qty
 *   edit invoice   : old = old, new = new        -> apply only the difference
 *   delete invoice : old = items, new = []       -> restore qty
 *
 * Example: old qty 2, new qty 5 -> delta = -3 (deduct 3 more, not 5).
 */
export function computeStockChanges(
  oldItems: StockItemInput[],
  newItems: StockItemInput[],
): StockChange[] {
  const deltas = new Map<string, number>();
  const add = (id: string, d: number) => deltas.set(id, (deltas.get(id) || 0) + d);

  // Restore / keep only the part that was previously on the invoice.
  itemQuantityMap(oldItems).forEach((qty, id) => add(id, qty));
  // Deduct the part that is on the invoice now.
  itemQuantityMap(newItems).forEach((qty, id) => add(id, -qty));

  return [...deltas.entries()]
    .filter(([, delta]) => delta !== 0)
    .map(([productId, delta]) => ({ productId, delta }));
}

/**
 * Apply signed stock changes to the product list.
 * Stock is floored at 0 unless `allowNegative` is explicitly enabled.
 */
export function applyStockChanges<T extends StockLike>(
  products: T[],
  changes: StockChange[],
  options: { allowNegative?: boolean } = {},
): T[] {
  const { allowNegative = false } = options;
  if (!changes.length) return products;
  const byId = new Map(changes.map((c) => [c.productId, c.delta]));
  return products.map((p) => {
    const delta = byId.get(p.id);
    if (delta === undefined) return p;
    let next = toNumber(p.stock) + delta;
    if (!allowNegative && next < 0) next = 0;
    return { ...p, stock: next };
  });
}

/** Total number of stock units across all products. */
export function totalStockUnits(products: StockLike[]): number {
  return (products || []).reduce((sum, p) => sum + toNumber(p.stock), 0);
}

/** Products at or below the low-stock threshold. */
export function lowStockProducts<T extends StockLike>(
  products: T[],
  threshold: number = LOW_STOCK_THRESHOLD,
): T[] {
  return (products || []).filter((p) => toNumber(p.stock) <= threshold);
}

export function isLowStock(stock: unknown, threshold: number = LOW_STOCK_THRESHOLD): boolean {
  return toNumber(stock) <= threshold;
}

/**
 * Stock valuation.
 *   basis "cost"    -> current stock × cost price
 *   basis "selling" -> current stock × selling price
 * Cost and selling bases are never mixed.
 */
export function stockValue(products: StockLike[], basis: "cost" | "selling" = "cost"): number {
  return roundMoney(
    (products || []).reduce((sum, p) => {
      const unit = basis === "cost" ? toNumber(p.cost, toNumber(p.price)) : toNumber(p.price);
      return sum + toNumber(p.stock) * unit;
    }, 0),
  );
}

/* ------------------------------------------------------------------ *
 * VALIDATION + SUMMARIES (PHASES 11/12/15/26)
 * ------------------------------------------------------------------ */

export type StockShortage = {
  productId: string;
  required: number;
  available: number;
  shortfall: number;
};

/**
 * Check whether every sale quantity is actually available.
 * Returns one shortage record per under-stocked product ([] = all clear).
 * Shortages are IGNORED when `allowNegative` is enabled in settings.
 */
export function validateStockAvailability<T extends StockLike>(
  products: T[],
  items: StockItemInput[],
  options: { allowNegative?: boolean } = {},
): StockShortage[] {
  if (options.allowNegative) return [];
  const stockById = new Map((products || []).map((p) => [p.id, toNumber(p.stock)]));
  const shortages: StockShortage[] = [];
  itemQuantityMap(items).forEach((required, productId) => {
    const available = stockById.get(productId) ?? 0;
    if (required > available) {
      shortages.push({
        productId,
        required,
        available,
        shortfall: roundMoney(required - available),
      });
    }
  });
  return shortages;
}

/** Signed stock change for one product (positive = restock, negative = sale). */
export function applyStockDelta<T extends StockLike>(
  products: T[],
  productId: string,
  delta: number,
  options: { allowNegative?: boolean } = {},
): T[] {
  return applyStockChanges(products, [{ productId, delta }], options);
}

export type StockSummary = {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
  lowStockThreshold: number;
  stockValueCost: number;
  stockValueSelling: number;
};

/**
 * ONE authoritative stock headline used by the dashboard, the inventory
 * screen and the stock report — they can no longer disagree.
 */
export function stockSummary<T extends StockLike>(
  products: T[],
  threshold: number = LOW_STOCK_THRESHOLD,
): StockSummary {
  const list = products || [];
  return {
    totalProducts: list.length,
    totalUnits: totalStockUnits(list),
    lowStockCount: lowStockProducts(list, threshold).length,
    lowStockThreshold: threshold,
    stockValueCost: stockValue(list, "cost"),
    stockValueSelling: stockValue(list, "selling"),
  };
}

/**
 * Reconciliation: the current stock of every product back-derived from its
 * documented movements. Used by the reconciliation report.
 *
 *   current = opening + purchases + adjustmentsIn - sales - adjustmentsOut + returns
 */
export type StockMovement = {
  opening?: unknown;
  purchases?: unknown;
  adjustmentsIn?: unknown;
  sales?: unknown;
  adjustmentsOut?: unknown;
  returns?: unknown;
};

export function expectedCurrentStock(movement: StockMovement): number {
  const m = movement || {};
  return (
    toNumber(m.opening) +
    toNumber(m.purchases) +
    toNumber(m.adjustmentsIn) -
    toNumber(m.sales) -
    toNumber(m.adjustmentsOut) +
    toNumber(m.returns)
  );
}
