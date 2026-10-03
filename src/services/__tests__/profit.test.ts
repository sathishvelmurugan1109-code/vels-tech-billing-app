/**
 * PHASE 13 — profit engine. GST collected is a liability, never profit.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { lineProfit, margin, markupPercent, productProfit, totalProfit } from "../profitService";

describe("profit engine (PHASE 13)", () => {
  it("revenue is GST-free, profit = revenue − cost", () => {
    const profit = lineProfit({ taxableAmount: 1800, qty: 2, cost: 700 });
    assert.equal(profit.revenue, 1800);
    assert.equal(profit.cost, 1400);
    assert.equal(profit.grossProfit, 400);
    assert.equal(profit.profitMargin, 22.22);
    assert.equal(profit.hasCost, true);
  });
  it("unknown cost reports zero cost with hasCost=false", () => {
    const profit = lineProfit({ taxableAmount: 1000, qty: 1 });
    assert.equal(profit.cost, 0);
    assert.equal(profit.hasCost, false);
    assert.equal(profit.grossProfit, 1000);
  });
  it("totals many lines exactly", () => {
    const total = totalProfit([
      { taxableAmount: 1000, qty: 1, cost: 600 },
      { taxableAmount: 500, qty: 2, cost: 100 },
    ]);
    assert.equal(total.revenue, 1500);
    assert.equal(total.cost, 800);
    assert.equal(total.grossProfit, 700);
    assert.equal(total.hasCost, true);
  });
  it("margin is 0 when revenue is 0 (never NaN)", () => {
    assert.equal(margin(100, 0), 0);
    assert.equal(markupPercent(100, 0), 0);
    assert.equal(markupPercent(50, 100), 50);
  });
  it("productProfit honours percent and fixed discounts", () => {
    const pct = productProfit(1000, 700, 2, { discount: 10, discountType: "percent" });
    assert.equal(pct.gross, 2000);
    assert.equal(pct.discount, 200);
    assert.equal(pct.revenue, 1800);
    assert.equal(pct.grossProfit, 400);
    const fixed = productProfit(1000, 700, 2, { discountType: "amount", discountAmount: 300 });
    assert.equal(fixed.discount, 300);
  });
});
