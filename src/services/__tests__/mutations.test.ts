/**
 * PHASES 9/10 — edit & cancel reconciliation.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calculateInvoiceTotals, planInvoiceMutation, planInvoiceMutationFromItems, reconcileInvoiceCancel, reconcileInvoiceEdit } from "../invoiceService";
import { BUSINESS, buildInvoice, line } from "./fixtures";

describe("edit reconciliation (PHASE 9)", () => {
  it("edit 2 → 5 deducts exactly 3 more (never 5)", () => {
    const oldInv = buildInvoice({ customerId: "c1", items: [line({ price: 100, qty: 2, gst: 0, productId: "p1" })] });
    const newItems = [{ ...oldInv.items[0], qty: 5 }];
    const totals = calculateInvoiceTotals(newItems, BUSINESS, BUSINESS);
    const rec = reconcileInvoiceEdit(oldInv, newItems, { grandTotal: totals.grandTotal, paidAmount: 0, balance: totals.grandTotal });
    assert.deepEqual(rec.stockChanges, [{ productId: "p1", delta: -3 }]);
    assert.equal(rec.totalDelta, totals.grandTotal - oldInv.grandTotal);
  });
  it("editing down restores stock", () => {
    const oldInv = buildInvoice({ customerId: "c1", items: [line({ price: 100, qty: 5, gst: 0, productId: "p1" })] });
    const newItems = [{ ...oldInv.items[0], qty: 2 }];
    const rec = reconcileInvoiceEdit(oldInv, newItems, { grandTotal: 200, paidAmount: 0, balance: 200 });
    assert.deepEqual(rec.stockChanges, [{ productId: "p1", delta: 3 }]);
  });
  it("planInvoiceMutation unifies create / edit / cancel", () => {
    const inv = buildInvoice({ customerId: "c1", items: [line({ price: 100, qty: 2, gst: 0, productId: "p1" })] });
    const created = planInvoiceMutation(null, inv, { businessState: BUSINESS });
    assert.deepEqual(created.stockChanges, [{ productId: "p1", delta: -2 }]);
    assert.equal(created.totalDelta, inv.grandTotal);

    const edited = { ...inv, items: [{ ...inv.items[0], qty: 5 }] };
    const plan = planInvoiceMutation(inv, edited, { businessState: BUSINESS });
    assert.deepEqual(plan.stockChanges, [{ productId: "p1", delta: -3 }]);

    const cancelled = planInvoiceMutation(inv, null, { businessState: BUSINESS });
    assert.deepEqual(cancelled.stockChanges, [{ productId: "p1", delta: 2 }]);
    assert.equal(cancelled.totalDelta, -inv.grandTotal);
    assert.equal(cancelled.paidDelta, -inv.paidAmount);
  });
  it("already-cancelled invoices contribute nothing on re-cancel", () => {
    const inv = { ...buildInvoice({ customerId: "c1", items: [line({ price: 100, qty: 2, gst: 0, productId: "p1" })] }), status: "Cancelled" as const };
    const plan = planInvoiceMutation(inv, null, { businessState: BUSINESS });
    assert.deepEqual(plan.stockChanges, []);
    assert.equal(plan.totalDelta, 0);
  });
  it("planInvoiceMutationFromItems works from the form state", () => {
    const oldInv = buildInvoice({ customerId: "c1", items: [line({ price: 100, qty: 2, gst: 0, productId: "p1" })] });
    const plan = planInvoiceMutationFromItems(oldInv, [{ ...oldInv.items[0], qty: 5 }], { grandTotal: 500, paidAmount: 0, balance: 500, gstTotal: 0 }, { businessState: BUSINESS });
    assert.deepEqual(plan.stockChanges, [{ productId: "p1", delta: -3 }]);
    assert.equal(plan.totalDelta, 500 - oldInv.grandTotal);
  });
});

describe("cancel reconciliation (PHASE 10)", () => {
  it("restores stock and reverses money", () => {
    const inv = buildInvoice({ customerId: "c1", items: [line({ price: 100, qty: 2, gst: 18, productId: "p1" })] });
    const rec = reconcileInvoiceCancel(inv);
    assert.deepEqual(rec.stockChanges, [{ productId: "p1", delta: 2 }]);
    assert.equal(rec.totalDelta, -inv.grandTotal);
  });
});
