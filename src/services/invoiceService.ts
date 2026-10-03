/**
 * invoiceService.ts — THE invoice calculation engine.
 *
 * This is the ONLY place where invoice math lives. Every screen
 * (create invoice, invoice preview, saved invoice, invoice details,
 * A4 invoice, print, PDF, WhatsApp, dashboard, reports) must obtain its
 * numbers from here — never from hand-written per-screen formulas.
 *
 * Pipeline (gross -> discount -> taxable -> GST -> final):
 *   gross         = unitPrice × quantity
 *   discount      = % of gross (or a fixed amount), NEVER exceeding gross
 *   taxableAmount = gross - discount          (or GST extracted for
 *                                             GST-inclusive prices)
 *   gstAmount     = taxableAmount × rate       (split CGST/SGST or IGST)
 *   lineTotal     = taxableAmount + gstAmount
 *
 * Invoice level:
 *   beforeRound = ΣtaxableAmount + Σgst
 *   grandTotal  = round(beforeRound)            (round-off AFTER tax)
 *   roundOff    = grandTotal - beforeRound
 *   balance     = grandTotal - paidAmount
 */

import {
  addMoney,
  clamp,
  computeRoundOff,
  isValidNumber,
  roundMoney,
  multiplyMoney,
  percentage,
  subtractMoney,
  sumMoney,
  toNumber,
} from "./money";
import {
  extractTaxableFromInclusive,
  normalizeGstRate,
  resolveTaxType,
  splitGst,
  TaxType,
} from "./gstService";
import {
  computeBalance,
  derivePaymentStatus,
  normalizePaymentMode,
  resolvePaidAmount,
  PaymentMode,
  PaymentStatus,
} from "./paymentService";

/* ------------------------------------------------------------------ *
 * TYPES
 * ------------------------------------------------------------------ */

export type DiscountType = "percent" | "amount";

export type InvoiceStatus = "Draft" | "Saved" | "Paid" | "Partial" | "Pending" | "Cancelled";

export type InvoiceLineInput = {
  productId?: unknown;
  name?: unknown;
  hsn?: unknown;
  unit?: unknown;
  price?: unknown;
  qty?: unknown;
  discount?: unknown;
  discountType?: DiscountType | unknown;
  discountAmount?: unknown;
  gst?: unknown;
  /** True when `price` already includes GST (GST-inclusive pricing). */
  priceInclusive?: unknown;
};

export type InvoiceLineTotals = {
  productId: string;
  name: string;
  hsn: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountType: DiscountType;
  /** gross = unitPrice × quantity */
  gross: number;
  /** capped discount actually applied (never > gross) */
  discount: number;
  /** GST-free base after discount */
  taxableAmount: number;
  gstRate: number;
  priceInclusive: boolean;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  taxType: TaxType;
};

export type StoredInvoiceLike = {
  id?: unknown;
  customerId?: unknown;
  customerState?: unknown;
  businessState?: unknown;
  items?: Array<InvoiceLineInput | null | undefined> | null | undefined;
  paidAmount?: unknown;
  paymentStatus?: unknown;
  status?: unknown;
  grandTotal?: unknown;
  cgst?: unknown;
  sgst?: unknown;
  igst?: unknown;
};

/** The authoritative invoice totals (what the UI stores on its invoices). */
export type InvoiceTotals = {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxableBeforeRound: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  roundOff: number;
  grandTotal: number;
  itemCount: number;
  totalQuantity: number;
  taxType: TaxType;
};

/**
 * THE authoritative invoice result — every screen must use this.
 * (Superset of the required contract; extra keys never hurt callers.)
 */
export type InvoiceCalculation = InvoiceTotals & {
  paidAmount: number;
  balance: number;
  paymentStatus: PaymentStatus;
  lines: InvoiceLineTotals[];
  status: InvoiceStatus | string;
};

/* ------------------------------------------------------------------ *
 * PRODUCT / LINE ENGINE (PHASES 3 + 4 + 5)
 * ------------------------------------------------------------------ */

/** Normalise one line's discount instruction into percent vs amount. */
export function resolveDiscountType(raw: unknown): DiscountType {
  return raw === "amount" ? "amount" : "percent";
}

/** Discount applied to ONE line — never exceeds the line value. */
export function calculateLineDiscount(line: InvoiceLineInput, gross: number): number {
  const safeGross = Math.max(0, roundMoney(gross));
  if (resolveDiscountType(line?.discountType) === "amount") {
    return clamp(roundMoney(line?.discountAmount), 0, safeGross);
  }
  const pct = clamp(toNumber(line?.discount), 0, 100);
  return clamp(percentage(safeGross, pct), 0, safeGross);
}

export function calculateLine(item: InvoiceLineInput | null | undefined, taxType: TaxType): InvoiceLineTotals {
  const it: InvoiceLineInput = item ?? {};
  const qty = Math.max(0, toNumber(it.qty));
  const unitPrice = Math.max(0, roundMoney(it.price));
  const gstRate = normalizeGstRate(it.gst);
  const priceInclusive = !!it.priceInclusive;
  const discountType = resolveDiscountType(it.discountType);

  // gross = unitPrice × quantity
  const gross = multiplyMoney(unitPrice, qty);

  // discount -> taxable amount
  const discount = calculateLineDiscount(it, gross);
  const afterDiscount = subtractMoney(gross, discount);

  // GST — every line may carry its OWN rate.
  let taxableAmount: number;
  let gstAmount: number;
  if (priceInclusive && gstRate > 0) {
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
    unit: String(it.unit ?? "pcs"),
    qty,
    unitPrice,
    discountType,
    gross,
    discount,
    taxableAmount,
    gstRate,
    priceInclusive,
    gstAmount,
    cgst: split.cgst,
    sgst: split.sgst,
    igst: split.igst,
    lineTotal: addMoney(taxableAmount, gstAmount),
    taxType,
  };
}

export function calculateInvoiceLines(
  items: Array<InvoiceLineInput | null | undefined> | null | undefined,
  taxType: TaxType,
): InvoiceLineTotals[] {
  return (items || []).filter(Boolean).map((it) => calculateLine(it, taxType));
}

/* ------------------------------------------------------------------ *
 * AGGREGATION (PHASE 6)
 * ------------------------------------------------------------------ */

function aggregateLines(lines: InvoiceLineTotals[], taxType: TaxType): InvoiceTotals {
  const subtotal = sumMoney(lines.map((l) => l.gross));
  const discountTotal = sumMoney(lines.map((l) => l.discount));
  const taxableAmount = sumMoney(lines.map((l) => l.taxableAmount));
  const cgst = sumMoney(lines.map((l) => l.cgst));
  const sgst = sumMoney(lines.map((l) => l.sgst));
  const igst = sumMoney(lines.map((l) => l.igst));
  // GST total as the sum of line GST (reconciles with per-line display).
  const gstTotal = sumMoney(lines.map((l) => l.gstAmount));
  // Round-off happens AFTER tax and touches ONLY the final payable amount.
  const taxableBeforeRound = addMoney(taxableAmount, gstTotal);
  const { roundOff, roundedTotal } = computeRoundOff(taxableBeforeRound, 1);
  return {
    subtotal,
    discountTotal,
    taxableAmount,
    taxableBeforeRound,
    cgst,
    sgst,
    igst,
    gstTotal,
    roundOff,
    grandTotal: roundedTotal,
    itemCount: lines.length,
    totalQuantity: lines.reduce((s, l) => s + toNumber(l.qty), 0),
    taxType,
  };
}

/**
 * Totalling for a set of items — used by the live "Bill Summary" panel.
 * Includes everything a saved invoice needs EXCEPT payment fields.
 */
export function calculateInvoiceTotals(
  items: Array<InvoiceLineInput | null | undefined> | null | undefined,
  customerState: unknown,
  businessState: unknown,
): InvoiceTotals {
  const taxType = resolveTaxType(businessState, customerState);
  return aggregateLines(calculateInvoiceLines(items, taxType), taxType);
}

/**
 * Recover the tax type for a HISTORIC invoice (before `businessState` was
 * persisted on the record) from its stored CGST/SGST/IGST split. Old
 * invoices saved with the same engine keep reconciling.
 */
export function resolveInvoiceTaxType(invoice: StoredInvoiceLike | null | undefined): TaxType {
  const inv = invoice ?? {};
  if (inv.businessState !== undefined && inv.businessState !== null && String(inv.businessState) !== "") {
    return resolveTaxType(inv.businessState, inv.customerState);
  }
  if (toNumber(inv.igst) > 0) return "inter";
  if (toNumber(inv.cgst) > 0 || toNumber(inv.sgst) > 0) return "intra";
  return resolveTaxType(inv.businessState, inv.customerState);
}

/** A status may never be an unexpected string. Defaults to "Saved". */
export function normalizeInvoiceStatus(status: unknown): InvoiceStatus | string {
  return status === "Draft" ||
    status === "Saved" ||
    status === "Paid" ||
    status === "Partial" ||
    status === "Pending" ||
    status === "Cancelled"
    ? status
    : "Saved";
}

/** Stored paid amounts are clamped to [0, grandTotal] — never negative. */
function resolveStoredPaidAmount(invoice: StoredInvoiceLike, grandTotal: number): number {
  if (isValidNumber(invoice?.paidAmount)) {
    return clamp(roundMoney(invoice.paidAmount), 0, grandTotal);
  }
  return invoice?.paymentStatus === "Paid" ? grandTotal : 0;
}

/**
 * THE authoritative invoice result (PHASE 6 contract).
 *
 *   calculateInvoice(invoice) -> {
 *     subtotal, discountTotal, taxableAmount, cgst, sgst, igst, gstTotal,
 *     roundOff, grandTotal, paidAmount, balance, paymentStatus,
 *     itemCount, totalQuantity, ...
 *   }
 */
export function calculateInvoice(
  invoice: StoredInvoiceLike | null | undefined,
  options: { businessState?: unknown } = {},
): InvoiceCalculation {
  const inv = (invoice ?? {}) as StoredInvoiceLike & {
    items?: Array<InvoiceLineInput | null | undefined>;
  };
  const businessState =
    options.businessState !== undefined ? options.businessState : (inv as { businessState?: unknown }).businessState;
  const withState = { ...inv, businessState } as StoredInvoiceLike;
  const taxType = resolveInvoiceTaxType(withState);
  const lines = calculateInvoiceLines(inv.items, taxType);
  const totals = aggregateLines(lines, taxType);
  const paidAmount = resolveStoredPaidAmount(withState, totals.grandTotal);
  return {
    ...totals,
    lines,
    paidAmount,
    balance: computeBalance(totals.grandTotal, paidAmount),
    paymentStatus: derivePaymentStatus(totals.grandTotal, paidAmount),
    status: normalizeInvoiceStatus((inv as { status?: unknown }).status),
  };
}

/* ------------------------------------------------------------------ *
 * INVOICE CONSTRUCTION — create / save path (PHASE 22)
 * ------------------------------------------------------------------ */

export type InvoiceBuildInput = {
  id?: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  customerState: string;
  items: InvoiceLineInput[];
  businessState: string;
  paymentMode: PaymentMode | unknown;
  paymentStatus: PaymentStatus | unknown;
  paidAmount: unknown;
  notes?: string;
  terms?: string;
  status?: InvoiceStatus | unknown;
};

/** Friendly, blocking issues that must stop an invoice from being saved. */
export function validateInvoiceBuild(input: InvoiceBuildInput): string[] {
  const errors: string[] = [];
  if (!input.customerId) errors.push("Select a customer.");
  if (!input.items || input.items.length === 0) errors.push("Add at least one product.");
  if (!input.date || !/^\d{4}-\d{2}-\d{2}/.test(String(input.date))) errors.push("Pick a valid invoice date.");
  (input.items || []).forEach((it, i) => {
    if (toNumber(it?.qty) <= 0) errors.push(`Row ${i + 1}: quantity must be at least 1.`);
    if (toNumber(it?.price) < 0) errors.push(`Row ${i + 1}: price cannot be negative.`);
    if (resolveDiscountType(it?.discountType) === "percent") {
      if (toNumber(it?.discount) < 0 || toNumber(it?.discount) > 100) {
        errors.push(`Row ${i + 1}: discount must be between 0% and 100%.`);
      }
    }
    if (toNumber(it?.discountAmount) < 0) errors.push(`Row ${i + 1}: discount amount cannot be negative.`);
  });
  const totals = calculateInvoiceTotals(input.items, input.customerState, input.businessState);
  if (totals.grandTotal < 0) errors.push("Grand total cannot be negative.");
  if (toNumber(input.paidAmount) < 0) errors.push("Paid amount cannot be negative.");
  return errors;
}

/**
 * Sanitise billing lines exactly the way they must be persisted: no
 * negative quantities/prices, discounts clamped, GST rates normalised.
 */
export function normalizeInvoiceItems(
  items: Array<InvoiceLineInput | null | undefined> | null | undefined,
  taxType: TaxType,
): InvoiceLineTotals[] {
  return calculateInvoiceLines(items, taxType);
}

/**
 * Build the persisted invoice record for a save / update event.
 * Uses the SAME engine as the preview, the print view, the PDF,
 * WhatsApp and every report.
 */
export function buildInvoiceRecord(input: InvoiceBuildInput) {
  const taxType = resolveTaxType(input.businessState, input.customerState);
  const lines = normalizeInvoiceItems(input.items, taxType);
  const totals = aggregateLines(lines, taxType);
  const safeStatus: PaymentStatus =
    input.paymentStatus === "Paid" || input.paymentStatus === "Pending" || input.paymentStatus === "Partial"
      ? input.paymentStatus
      : "Pending";
  const paidAmount = resolvePaidAmount(safeStatus, totals.grandTotal, input.paidAmount);
  return {
    id: input.id || "",
    invoiceNo: input.invoiceNo,
    date: input.date,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerGstin: input.customerGstin,
    customerAddress: input.customerAddress,
    customerState: input.customerState,
    items: lines,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxableAmount: totals.taxableAmount,
    cgst: totals.cgst,
    sgst: totals.sgst,
    igst: totals.igst,
    gstTotal: totals.gstTotal,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal,
    paymentMode: normalizePaymentMode(input.paymentMode),
    paymentStatus: derivePaymentStatus(totals.grandTotal, paidAmount),
    paidAmount,
    notes: String(input.notes ?? ""),
    terms: String(input.terms ?? ""),
    status: normalizeInvoiceStatus(input.status ?? "Saved") as InvoiceStatus,
  };
}

/* ------------------------------------------------------------------ *
 * EDIT / DELETE / CANCEL RECONCILIATION (PHASES 9 + 10)
 * ------------------------------------------------------------------ */

export type ReconcilableItem = { productId: unknown; qty: unknown };

export type InvoiceReconciliation = {
  /** Signed stock deltas (productId -> delta; negative = deduct more). */
  stockChanges: Array<{ productId: string; delta: number }>;
  /** How the customer outstanding moves because of this event. */
  outstandingDelta: number;
  /** How paid moves because of this event. */
  paidDelta: number;
  /** How the invoice total moves because of this event. */
  totalDelta: number;
};

/**
 * Reconcile an invoice EDIT: old record vs new lines (PHASE 9).
 * Applies ONLY the difference — editing 2 → 5 deducts 3, not 5 more.
 */
export function reconcileInvoiceEdit(
  oldInvoice: StoredInvoiceLike | null | undefined,
  newItems: ReconcilableItem[],
  newCalculation: { grandTotal: number; paidAmount: number; balance: number },
): InvoiceReconciliation {
  const oldItems: ReconcilableItem[] = ((oldInvoice as { items?: ReconcilableItem[] })?.items || []).map((it) => ({
    productId: String((it as { productId?: unknown })?.productId ?? ""),
    qty: toNumber((it as { qty?: unknown })?.qty),
  }));
  const nextItems: ReconcilableItem[] = (newItems || []).map((it) => ({
    productId: String(it?.productId ?? ""),
    qty: toNumber(it?.qty),
  }));

  const changes = new Map<string, number>();
  oldItems.forEach((it) => {
    if (!it.productId) return;
    changes.set(it.productId, (changes.get(it.productId) || 0) + toNumber(it.qty));
  });
  nextItems.forEach((it) => {
    if (!it.productId) return;
    changes.set(it.productId, (changes.get(it.productId) || 0) - toNumber(it.qty));
  });

  const oldCalc = calculateInvoice(oldInvoice);
  return {
    stockChanges: [...changes.entries()]
      .filter(([, delta]) => delta !== 0)
      .map(([productId, delta]) => ({ productId, delta })),
    outstandingDelta: roundMoney(newCalculation.balance - oldCalc.balance),
    paidDelta: roundMoney(newCalculation.paidAmount - oldCalc.paidAmount),
    totalDelta: roundMoney(newCalculation.grandTotal - oldCalc.grandTotal),
  };
}

/**
 * Reconcile an invoice CANCELLATION / DELETION (PHASE 10).
 * Returns what must be REVERSED: stock restored, outstanding reduced,
 * paid/unpaid removed from sales and GST totals.
 */
export function reconcileInvoiceCancel(
  invoice: StoredInvoiceLike | null | undefined,
): InvoiceReconciliation & { restoreItems: ReconcilableItem[] } {
  const calc = calculateInvoice(invoice);
  const restoreItems: ReconcilableItem[] = ((invoice as { items?: ReconcilableItem[] })?.items || []).map((it) => ({
    productId: String((it as { productId?: unknown })?.productId ?? ""),
    qty: toNumber((it as { qty?: unknown })?.qty),
  }));
  return {
    stockChanges: restoreItems
      .filter((it) => it.productId && toNumber(it.qty) !== 0)
      .map((it) => ({ productId: String(it.productId), delta: toNumber(it.qty) })),
    outstandingDelta: -calc.balance,
    paidDelta: -calc.paidAmount,
    totalDelta: -calc.grandTotal,
    restoreItems,
  };
}
