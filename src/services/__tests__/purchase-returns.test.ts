/**
 * PHASES 18/19 — purchases, sales returns, refunds, supplier balances.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calculatePurchaseLine, calculatePurchaseTotals, calculateSalesReturn, purchaseStockChanges, reconcileSalesReturn, summarizePurchases, supplierOutstanding } from "../purchaseService";

describe("purchase engine (PHASE 18)", () => {
  it("totals cost lines with discount then GST", () => {
    const totals = calculatePurchaseTotals(
      [{ productId: "p1", purchasePrice: 5000, qty: 2, discount: 10, gst: 18 }],
      "Tamil Nadu",
      "Tamil Nadu",
    );
    assert.equal(totals.subtotal, 10000);
    assert.equal(totals.discountTotal, 1000);
    assert.equal(totals.taxableAmount, 9000);
    assert.equal(totals.gstTotal, 1620);
    assert.equal(totals.cgst, 810);
    assert.equal(totals.sgst, 810);
    assert.equal(totals.grandTotal, 10620);
  });
  it("inter-state purchases post IGST", () => {
    const totals = calculatePurchaseTotals(
      [{ productId: "p1", purchasePrice: 1000, qty: 1, gst: 18 }],
      "Tamil Nadu",
      "Karnataka",
    );
    assert.equal(totals.igst, 180);
    assert.equal(totals.cgst, 0);
  });
  it("purchase lines clamp discounts and handle inclusive prices", () => {
    const clamped = calculatePurchaseLine({ purchasePrice: 100, qty: 1, discount: 200, gst: 0 }, "intra");
    assert.equal(clamped.discount, 100);
    const inc = calculatePurchaseLine({ purchasePrice: 118, qty: 1, gst: 18, priceInclusive: true }, "intra");
    assert.equal(inc.taxableAmount, 100);
    assert.equal(inc.gstAmount, 18);
  });
  it("purchases move stock IN and summarise separately from sales GST", () => {
    assert.deepEqual(purchaseStockChanges([{ productId: "p1", qty: 5 }]), [{ productId: "p1", delta: 5 }]);
    const summary = summarizePurchases(
      [{ supplierState: "Tamil Nadu", items: [{ purchasePrice: 1000, qty: 1, gst: 18 }], paidAmount: 500 }],
      "Tamil Nadu",
    );
    assert.equal(summary.purchaseCount, 1);
    assert.equal(summary.grandTotal, 1180);
    assert.equal(summary.outstanding, 680);
  });
  it("tracks supplier outstanding", () => {
    const out = supplierOutstanding("s1",
      [{ supplierId: "s1", grandTotal: 1180, paidAmount: 180 }],
      [{ supplierId: "s1", amount: 500 }]);
    assert.equal(out, 500);
    assert.equal(supplierOutstanding("s1", [], []), 0);
  });
});

describe("returns and refunds (PHASE 19)", () => {
  it("a return reverses taxable + GST with the split intact", () => {
    const ret = calculateSalesReturn(
      [{ productId: "p1", price: 1000, qty: 1, discount: 10, gst: 18 }],
      "Tamil Nadu",
      "Tamil Nadu",
    );
    assert.equal(ret.taxableAmount, 900);
    assert.equal(ret.gstTotal, 162);
    assert.equal(ret.cgst, 81);
    assert.equal(ret.sgst, 81);
    assert.equal(ret.total, 1062);
    assert.deepEqual(ret.stockChanges, [{ productId: "p1", delta: 1 }]);
  });
  it("reconciliation lowers outstanding, pays the refund, reverses totals", () => {
    const ret = calculateSalesReturn([{ productId: "p1", price: 1000, qty: 1, gst: 18 }], "Tamil Nadu", "Tamil Nadu");
    const rec = reconcileSalesReturn(ret, { refund: 1180, previousOutstanding: 2000 });
    assert.equal(rec.paidDelta, 1180);
    assert.equal(rec.totalDelta, -1180);
    assert.equal(rec.gstDelta, -180);
    assert.ok(rec.outstandingDelta <= 0);
  });
  it("never credits back more than the customer owes", () => {
    const ret = calculateSalesReturn([{ productId: "p1", price: 1000, qty: 1, gst: 0 }], "Tamil Nadu", "Tamil Nadu");
    const rec = reconcileSalesReturn(ret, { refund: 0, previousOutstanding: 100 });
    assert.equal(rec.outstandingDelta, -100);
  });
});
