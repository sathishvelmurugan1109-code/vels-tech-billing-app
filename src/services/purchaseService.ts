/**
 * purchaseService.ts — Centralised PURCHASE + SALES-RETURN / REFUND engine
 * (PHASES 18 + 19).
 *
 * The billing app currently has no purchase or returns screen, so nothing in
 * the UI calls this module yet. It exists so that purchases and returns are
 * NOT implemented later with their own ad-hoc formulas: GST is computed by
 * the same GST engine, stock by the same stock engine and money by the same
 * money engine. Purchase GST is kept strictly separate from sales GST.
 */

import { addMoney, clamp, percentage, roundMoney, subtractMoney, sumMoney, toNumber } from "./money";
import { extractTaxableFromInclusive, normalizeGstRate, resolveTaxType, splitGst, TaxType } from "./gstService";
import { StockChange } from "./stockService";

/* ------------------------------------------------------------------ *
 * PURCHASES (PHASE 18)
 * ------------------------------------------------------------------ */

export type PurchaseLineInput = {
  productId?: unknown;
  name?: unknown;
  hsn?: unknown;
  /** Purchase (cost) price per unit. */
  purchasePrice?: unknown;
  qty?: unknown;
  discount?: unknown;
  discountType?: "percent" | "amount" | unknown;
  gst?: unknown;
  priceInclusive?: unknown;
};

export type PurchaseLineTotals = {
  productId: string;
  name: string;
  hsn: string;
  qty: number;
  purchasePrice: number;
  gross: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  taxType: TaxType;
};

/** One purchase line — cost price in, GST split out. */
export function calculatePurchaseLine(
  line: PurchaseLineInput | null | undefined,
  taxType: TaxType,
): PurchaseLineTotals {
  const it = line ?? {};
  const qty = Math.max(0, toNumber(it.qty));
  const purchasePrice = Math.max(0, roundMoney(it.purchasePrice));
  const gstRate = normalizeGstRate(it.gst);
  const gross = roundMoney(purchasePrice * qty);
  const discount =
    it.discountType === "amount"
      ? clamp(roundMoney(it.discount), 0, gross)
      : clamp(percentage(gross, clamp(toNumber(it.discount), 0, 100)), 0, gross);
  const afterDiscount = subtractMoney(gross, discount);

  let taxableAmount: number;
  let gstAmount: number;
  if (it.priceInclusive && gstRate > 0) {
    taxableAmount = extractTaxableFromInclusive(afterDiscount, gstRate);
    gstAmount = subtractMoney(afterDiscount, taxableAmount);
  } else {
    taxableAmount = afterDiscount;
    gstAmount = percentage(taxableAmount, gstRate);
  }
  const split = splitGst(gstAmount, taxType);
  return {
    productId: String(it.productId ?? ""),
    name: String(it.name ?? ""),
    hsn: String(it.hsn ?? ""),
    qty,
    purchasePrice,
    gross,
    discount,
    taxableAmount,
    gstRate,
    gstAmount,
    cgst: split.cgst,
    sgst: split.sgst,
    igst: split.igst,
    lineTotal: addMoney(taxableAmount, gstAmount),
    taxType,
  };
}

export type PurchaseTotals = {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  grandTotal: number;
  itemCount: number;
  totalQuantity: number;
  lines: PurchaseLineTotals[];
};

/** Purchase invoice totals — the SUM of the purchase lines, nothing else. */
export function calculatePurchaseTotals(
  lines: PurchaseLineInput[],
  businessState: unknown,
  supplierState: unknown,
): PurchaseTotals {
  const taxType = resolveTaxType(businessState, supplierState);
  const rows = (lines || []).filter(Boolean).map((line) => calculatePurchaseLine(line, taxType));
  const taxableAmount = sumMoney(rows.map((r) => r.taxableAmount));
  const gstTotal = sumMoney(rows.map((r) => r.gstAmount));
  return {
    subtotal: sumMoney(rows.map((r) => r.gross)),
    discountTotal: sumMoney(rows.map((r) => r.discount)),
    taxableAmount,
    cgst: sumMoney(rows.map((r) => r.cgst)),
    sgst: sumMoney(rows.map((r) => r.sgst)),
    igst: sumMoney(rows.map((r) => r.igst)),
    gstTotal,
    grandTotal: addMoney(taxableAmount, gstTotal),
    itemCount: rows.length,
    totalQuantity: rows.reduce((s, r) => s + r.qty, 0),
    lines: rows,
  };
}

/** Stock IN for a purchase: `Current Stock + Purchase Quantity`. */
export function purchaseStockChanges(
  lines: Array<{ productId?: unknown; qty?: unknown }>,
): StockChange[] {
  const deltas = new Map<string, number>();
  (lines || []).forEach((line) => {
    const id = String(line?.productId ?? "");
    const qty = toNumber(line?.qty);
    if (!id || qty === 0) return;
    deltas.set(id, (deltas.get(id) || 0) + qty);
  });
  return [...deltas.entries()].map(([productId, delta]) => ({ productId, delta }));
}

/* ------------------------------------------------------------------ *
 * SUPPLIER PAYMENTS / OUTSTANDING
 * ------------------------------------------------------------------ */

export type SupplierPurchaseLike = { supplierId?: unknown; grandTotal?: unknown; paidAmount?: unknown };
export type SupplierPaymentLike = { supplierId?: unknown; amount?: unknown };

/** What the business still owes one supplier (never negative). */
export function supplierOutstanding(
  supplierId: unknown,
  purchases: SupplierPurchaseLike[],
  payments: SupplierPaymentLike[] = [],
): number {
  const id = String(supplierId ?? "");
  const owed = sumMoney(
    (purchases || [])
      .filter((p) => String(p?.supplierId ?? "") === id)
      .map((p) => Math.max(0, subtractMoney(p?.grandTotal, clamp(p?.paidAmount, 0, toNumber(p?.grandTotal))))),
  );
  const paid = sumMoney(
    (payments || [])
      .filter((p) => String(p?.supplierId ?? "") === id)
      .map((p) => Math.max(0, roundMoney(p?.amount))),
  );
  return Math.max(0, subtractMoney(owed, paid));
}

/* ------------------------------------------------------------------ *
 * SALES RETURNS / REFUNDS (PHASE 19)
 *
 * A return is the MIRROR of a sale:
 *   stock       + qty                     (goods come back in)
 *   revenue     − taxableAmount
 *   GST         − gstAmount               (the split is reversed, never guessed)
 *   outstanding − credit given back
 *   paid        − refund actually handed back
 * ------------------------------------------------------------------ */

export type ReturnLineInput = {
  productId?: unknown;
  name?: unknown;
  hsn?: unknown;
  price?: unknown;
  qty?: unknown;
  discount?: unknown;
  discountType?: "percent" | "amount" | unknown;
  gst?: unknown;
  priceInclusive?: unknown;
};

export type ReturnCalculation = {
  lines: PurchaseLineTotals[];
  /** Value of goods returned, GST-free. */
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  /** Total credit-note value (taxable + GST). */
  total: number;
  /** Stock that must go back into inventory (positive deltas). */
  stockChanges: StockChange[];
};

/**
 * Reverse a sale for the returned lines. The line maths reuses the SAME
 * gross → discount → taxable → GST pipeline so tax and discount effects are
 * always reversed — never "just the product price".
 */
export function calculateSalesReturn(
  lines: ReturnLineInput[],
  businessState: unknown,
  customerState: unknown,
): ReturnCalculation {
  const taxType = resolveTaxType(businessState, customerState);
  const rows = (lines || []).filter(Boolean).map((line) =>
    calculatePurchaseLine(
      {
        productId: line.productId,
        name: line.name,
        hsn: line.hsn,
        purchasePrice: line.price,
        qty: line.qty,
        discount: line.discount,
        discountType: line.discountType,
        gst: line.gst,
        priceInclusive: line.priceInclusive,
      },
      taxType,
    ),
  );
  const taxableAmount = sumMoney(rows.map((r) => r.taxableAmount));
  const gstTotal = sumMoney(rows.map((r) => r.gstAmount));
  return {
    lines: rows,
    taxableAmount,
    cgst: sumMoney(rows.map((r) => r.cgst)),
    sgst: sumMoney(rows.map((r) => r.sgst)),
    igst: sumMoney(rows.map((r) => r.igst)),
    gstTotal,
    total: addMoney(taxableAmount, gstTotal),
    stockChanges: purchaseStockChanges(lines),
  };
}

/**
 * How a return / refund moves the books:
 *   outstandingDelta is NEGATIVE (the customer owes less)
 *   paidDelta        is the refund actually handed back
 *   totalDelta       is the negative revenue reversal
 *   gstDelta         is the negative GST reversal
 */
export type ReturnReconciliation = {
  outstandingDelta: number;
  paidDelta: number;
  totalDelta: number;
  gstDelta: number;
  stockChanges: StockChange[];
};

export function reconcileSalesReturn(
  calculation: ReturnCalculation,
  options: { refund?: unknown; previousOutstanding?: unknown } = {},
): ReturnReconciliation {
  const outstandingBefore = Math.max(0, roundMoney(options.previousOutstanding));
  const refund = clamp(roundMoney(options.refund), 0, calculation.total);
  // The customer can never be credited back more than they still owe.
  const outstandingDelta = -Math.min(outstandingBefore, subtractMoney(calculation.total, refund));
  return {
    outstandingDelta: roundMoney(outstandingDelta),
    paidDelta: refund,
    totalDelta: -calculation.total,
    gstDelta: -calculation.gstTotal,
    stockChanges: calculation.stockChanges,
  };
}

/* ------------------------------------------------------------------ *
 * PURCHASE SUMMARY (never mix purchase GST with sales GST)
 * ------------------------------------------------------------------ */

export type PurchaseSummary = {
  purchaseCount: number;
  taxableAmount: number;
  gstTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  paidAmount: number;
  outstanding: number;
};

/** Aggregate a set of purchase records through the purchase engine. */
export function summarizePurchases(
  purchases: Array<{
    supplierId?: unknown;
    supplierState?: unknown;
    items?: PurchaseLineInput[];
    paidAmount?: unknown;
  }>,
  businessState: unknown,
): PurchaseSummary {
  const rows = (purchases || []).map((p) => ({
    totals: calculatePurchaseTotals(p?.items || [], businessState, p?.supplierState),
    paidAmount: Math.max(0, roundMoney(p?.paidAmount)),
  }));
  const grandTotal = sumMoney(rows.map((r) => r.totals.grandTotal));
  const paidAmount = sumMoney(rows.map((r) => r.paidAmount));
  return {
    purchaseCount: rows.length,
    taxableAmount: sumMoney(rows.map((r) => r.totals.taxableAmount)),
    gstTotal: sumMoney(rows.map((r) => r.totals.gstTotal)),
    cgst: sumMoney(rows.map((r) => r.totals.cgst)),
    sgst: sumMoney(rows.map((r) => r.totals.sgst)),
    igst: sumMoney(rows.map((r) => r.totals.igst)),
    grandTotal,
    paidAmount,
    outstanding: Math.max(0, subtractMoney(grandTotal, paidAmount)),
  };
}