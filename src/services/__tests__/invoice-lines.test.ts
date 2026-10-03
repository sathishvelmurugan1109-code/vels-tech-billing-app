/**
 * PHASES 3/4/5 — product lines, discount engine, GST engine.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeGst, computeGstInclusive, extractTaxableFromInclusive, GST_RATE_OPTIONS, gstRateLabel, isValidGstRate, normalizeGstRate, normalizeState, resolveTaxType, splitGst, taxTypeLabel } from "../gstService";
import { calculateInvoice, calculateInvoiceLines, calculateInvoiceTotals, calculateLine, calculateLineDiscount, resolveDiscountType } from "../invoiceService";

describe("discount engine (PHASE 4)", () => {
  it("percent discount reduces the line", () => {
    assert.equal(calculateLineDiscount({ discountType: "percent", discount: 10 }, 1000), 100);
  });
  it("fixed discount amount is honoured", () => {
    assert.equal(calculateLineDiscount({ discountType: "amount", discountAmount: 250 }, 1000), 250);
  });
  it("discount never exceeds the line value", () => {
    assert.equal(calculateLineDiscount({ discountType: "percent", discount: 200 }, 500), 500);
    assert.equal(calculateLineDiscount({ discountType: "amount", discountAmount: 9999 }, 500), 500);
    assert.equal(calculateLineDiscount({ discountType: "percent", discount: 100 }, 500), 500);
  });
  it("negative discounts clamp to zero", () => {
    assert.equal(calculateLineDiscount({ discountType: "percent", discount: -5 }, 500), 0);
    assert.equal(calculateLineDiscount({ discountType: "amount", discountAmount: -5 }, 500), 0);
  });
  it("unknown discount type defaults to percent", () => {
    assert.equal(resolveDiscountType(undefined), "percent");
    assert.equal(resolveDiscountType("amount"), "amount");
  });
});

describe("product line calculations (PHASE 3)", () => {
  it("gross = unitPrice × quantity", () => {
    const line = calculateLine({ price: 6599, qty: 3, discount: 0, gst: 18 }, "intra");
    assert.equal(line.gross, 19797);
    assert.equal(line.discount, 0);
    assert.equal(line.taxableAmount, 19797);
  });
  it("gross → discount → taxable → GST → total pipeline", () => {
    const line = calculateLine({ price: 1000, qty: 2, discount: 10, gst: 18 }, "intra");
    assert.equal(line.gross, 2000);
    assert.equal(line.discount, 200);
    assert.equal(line.taxableAmount, 1800);
    assert.equal(line.gstAmount, 324);
    assert.equal(line.cgst, 162);
    assert.equal(line.sgst, 162);
    assert.equal(line.igst, 0);
    assert.equal(line.lineTotal, 2124);
  });
  it("every product keeps its own GST rate", () => {
    const lines = calculateInvoiceLines(
      [
        { price: 100, qty: 1, discount: 0, gst: 5 },
        { price: 100, qty: 1, discount: 0, gst: 28 },
      ],
      "intra",
    );
    assert.equal(lines[0].gstAmount, 5);
    assert.equal(lines[1].gstAmount, 28);
  });
  it("filters out empty rows", () => {
    assert.equal(calculateInvoiceLines([null, undefined, { price: 1, qty: 1, gst: 0 }], "intra").length, 1);
  });
});

describe("GST rates + tax types (PHASE 5)", () => {
  it("supports 0/5/12/18/28 and custom rates", () => {
    assert.deepEqual([...GST_RATE_OPTIONS], [0, 5, 12, 18, 28]);
    assert.equal(isValidGstRate(18), true);
    assert.equal(isValidGstRate(-1), false);
    assert.equal(isValidGstRate(101), false);
    assert.equal(normalizeGstRate(18.7), 19);
    assert.equal(gstRateLabel(0), "0% (Exempt)");
    assert.equal(gstRateLabel(30), "30%");
  });
  it("same state → CGST+SGST; different state → IGST", () => {
    assert.equal(resolveTaxType("Tamil Nadu", "Tamil Nadu"), "intra");
    assert.equal(resolveTaxType("Tamil Nadu", "Karnataka"), "inter");
    assert.equal(resolveTaxType("  tamil nadu ", "TAMIL NADU"), "intra");
    assert.equal(normalizeState(" Karnataka "), "karnataka");
    assert.ok(taxTypeLabel("intra").includes("CGST"));
  });
  it("18% splits into 9 + 9 with no lost paise", () => {
    const split = computeGst(1000, 18, "intra");
    assert.equal(split.cgst, 90);
    assert.equal(split.sgst, 90);
    assert.equal(split.igst, 0);
    assert.equal(split.gstTotal, 180);
  });
  it("split halves always re-add exactly", () => {
    const split = splitGst(10.01, "intra");
    assert.equal(split.cgst + split.sgst, 10.01);
  });
  it("inter-state goes entirely to IGST", () => {
    const split = computeGst(1000, 18, "inter");
    assert.deepEqual([split.cgst, split.sgst, split.igst, split.gstTotal], [0, 0, 180, 180]);
  });
  it("GST-exclusive vs GST-inclusive pricing", () => {
    // ₹118 inclusive @18% = ₹100 taxable + ₹18 tax
    assert.equal(extractTaxableFromInclusive(118, 18), 100);
    const inc = computeGstInclusive(118, 18, "intra");
    assert.equal(inc.taxableAmount, 100);
    assert.equal(inc.gstTotal, 18);
    assert.equal(inc.cgst + inc.sgst, 18);
    const line = calculateLine({ price: 118, qty: 1, discount: 0, gst: 18, priceInclusive: true }, "intra");
    assert.equal(line.taxableAmount, 100);
    assert.equal(line.lineTotal, 118);
  });
});

describe("invoice aggregation (PHASE 6)", () => {
  it("calculateInvoiceTotals sums lines and rounds once, after tax", () => {
    const totals = calculateInvoiceTotals(
      [
        { price: 1000, qty: 2, discount: 10, gst: 18 },
        { price: 500, qty: 1, discount: 0, gst: 5 },
      ],
      "Tamil Nadu",
      "Tamil Nadu",
    );
    assert.equal(totals.subtotal, 2500);
    assert.equal(totals.discountTotal, 200);
    assert.equal(totals.taxableAmount, 2300);
    assert.equal(totals.gstTotal, 349);
    const before = 2300 + 349;
    assert.equal(totals.taxableBeforeRound, before);
    assert.equal(totals.roundOff, Math.round(before) - before);
    assert.equal(totals.grandTotal, Math.round(before));
  });
});
