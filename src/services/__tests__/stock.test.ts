/**
 * PHASES 11/12 — stock engine + stock value.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { applyStockChanges, applyStockDelta, computeStockChanges, derivedOpeningStock, expectedCurrentStock, isLowStock, itemQuantityMap, ledgerNetChange, LOW_STOCK_THRESHOLD, lowStockProducts, reconcileStock, salesMovements, stockSummary, stockValue, totalStockUnits, validateStockAvailability } from "../stockService";
import { buildInvoice, line } from "./fixtures";

describe("stock engine (PHASE 11)", () => {
  it("create deducts, edit applies the difference, cancel restores", () => {
    const products = [{ id: "p1", stock: 14, price: 100 }];
    const created = applyStockChanges(products, computeStockChanges([], [{ productId: "p1", qty: 3 }]));
    assert.equal(created[0].stock, 11);
    const edited = applyStockChanges(created, computeStockChanges([{ productId: "p1", qty: 3 }], [{ productId: "p1", qty: 5 }]));
    assert.equal(edited[0].stock, 9);
    const restored = applyStockChanges(edited, computeStockChanges([{ productId: "p1", qty: 5 }], []));
    assert.equal(restored[0].stock, 14);
  });
  it("floors at zero unless negative stock is enabled", () => {
    const products = [{ id: "p1", stock: 1, price: 100 }];
    assert.equal(applyStockChanges(products, [{ productId: "p1", delta: -5 }])[0].stock, 0);
    assert.equal(applyStockChanges(products, [{ productId: "p1", delta: -5 }], { allowNegative: true })[0].stock, -4);
    assert.equal(applyStockDelta(products, "p1", 4)[0].stock, 5);
  });
  it("aggregates quantities and counts units", () => {
    const map = itemQuantityMap([{ productId: "p1", qty: 2 }, { productId: "p1", qty: 3 }, { productId: "", qty: 9 }]);
    assert.equal(map.get("p1"), 5);
    assert.equal(totalStockUnits([{ id: "a", stock: 4 }, { id: "b", stock: 6 }]), 10);
  });
  it("flags shortages and low stock", () => {
    const products = [{ id: "p1", stock: 2, price: 10 }, { id: "p2", stock: 50, price: 10 }];
    const shortages = validateStockAvailability(products, [{ productId: "p1", qty: 5 }]);
    assert.equal(shortages.length, 1);
    assert.equal(shortages[0].shortfall, 3);
    assert.equal(validateStockAvailability(products, [{ productId: "p1", qty: 5 }], { allowNegative: true }).length, 0);
    assert.equal(lowStockProducts(products)[0].id, "p1");
    assert.equal(isLowStock(10), true);
    assert.equal(isLowStock(11), false);
    assert.equal(LOW_STOCK_THRESHOLD, 10);
  });
  it("summarises the whole inventory with one call", () => {
    const summary = stockSummary([{ id: "a", stock: 5, price: 100, cost: 60 }, { id: "b", stock: 20, price: 50, cost: 30 }]);
    assert.equal(summary.totalProducts, 2);
    assert.equal(summary.totalUnits, 25);
    assert.equal(summary.lowStockCount, 1);
    assert.equal(summary.stockValueCost, 5 * 60 + 20 * 30);
    assert.equal(summary.stockValueSelling, 5 * 100 + 20 * 50);
  });
  it("reconciles recorded stock against the documented ledger", () => {
    const movement = { opening: 10, purchases: 5, sales: 4, returns: 1 };
    assert.equal(expectedCurrentStock(movement), 12);
    assert.equal(ledgerNetChange(movement), 6);
    assert.equal(derivedOpeningStock(12, movement), 10);
    assert.equal(reconcileStock([{ productId: "p1", actual: 12, movement }]).ok, true);
    const bad = reconcileStock([{ productId: "p1", actual: 9, movement }]);
    assert.equal(bad.ok, false);
    assert.equal(bad.rows[0].diff, -3);
  });
  it("derives sold quantities from invoices, skipping cancelled ones", () => {
    const good = buildInvoice({ customerId: "c1", items: [line({ price: 10, qty: 3, gst: 0, productId: "p1" })] });
    const bad = { ...buildInvoice({ customerId: "c1", items: [line({ price: 10, qty: 9, gst: 0, productId: "p1" })] }), status: "Cancelled" as const };
    const sales = salesMovements([good, bad]);
    assert.equal(sales.get("p1"), 3);
  });
});

describe("stock value (PHASE 12) — cost and selling never mix", () => {
  it("values at cost and at selling separately", () => {
    const products = [{ id: "p1", stock: 7, price: 6599, cost: 5000 }];
    assert.equal(stockValue(products, "cost"), 35000);
    assert.equal(stockValue(products, "selling"), 46193);
    assert.equal(stockValue(products), 35000);
  });
});
