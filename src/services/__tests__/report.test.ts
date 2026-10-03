/**
 * PHASE 28 — cross-report reconciliation: every report must agree.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calculateInvoice, StoredInvoiceLike } from "../invoiceService";
import { reconcileApp, reconcileInvoiceCalculation } from "../reportService";
import { BUSINESS, buildInvoice, line } from "./fixtures";

const PRODUCTS = [
  { id: "p1", name: "Laptop", stock: 14, unit: "pcs", price: 54990, cost: 48000, gst: 18, hsn: "8471" },
  { id: "p2", name: "Mouse", stock: 7, unit: "pcs", price: 7990, cost: 6000, gst: 18, hsn: "8471" },
];
const CUSTOMERS = [
  { id: "c1", name: "Arjun", phone: "1", state: "Tamil Nadu" },
  { id: "c2", name: "Lakshmi", phone: "2", state: "Karnataka" },
];

function mixedInvoices() {
  return [
    buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", customerName: "Arjun", date: "2026-10-01", paymentStatus: "Paid", items: [line({ price: 6599, qty: 3, discount: 5, gst: 18, productId: "p1", name: "Laptop", hsn: "8471" })] }),
    buildInvoice({ customerId: "c2", customerState: "Karnataka", customerName: "Lakshmi", date: "2026-10-02", paymentStatus: "Partial", paidAmount: 500, paymentMode: "Credit", items: [line({ price: 7990, qty: 2, gst: 18, productId: "p2", name: "Mouse", hsn: "8471" }), line({ price: 499, qty: 1, gst: 12, productId: "p2", name: "Mouse", hsn: "4013" })] }),
    buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", date: "2026-10-03", paymentStatus: "Pending", items: [line({ price: 250, qty: 5, discount: 50, discountType: "amount" as const, gst: 5, productId: "p2", name: "Mouse", hsn: "4013" })] }),
    buildInvoice({ customerId: "c2", customerState: "Karnataka", date: "2026-10-03", paymentStatus: "Paid", status: "Cancelled", items: [line({ price: 9999, qty: 1, gst: 28, productId: "p1" })] }),
  ];
}

describe("per-invoice reconciliation (PHASE 28)", () => {
  it("every invoice's own numbers add up", () => {
    const invoices = mixedInvoices();
    const active = invoices.filter((i) => i.status !== "Cancelled");
    active.forEach((inv) => {
      const calc = calculateInvoice(inv as StoredInvoiceLike, { businessState: BUSINESS });
      const rec = reconcileInvoiceCalculation(calc);
      const failing = rec.checks.filter((c) => !c.ok).map((c) => c.name);
      assert.deepEqual(failing, [], `failed checks: ${failing.join(", ")}`);
      assert.ok(rec.checks.length >= 8);
    });
  });
});

describe("cross-report reconciliation (PHASE 28)", () => {
  it("sales = GST = payments = dashboard = invoice report", () => {
    const rec = reconcileApp(mixedInvoices(), PRODUCTS, CUSTOMERS, { businessState: BUSINESS, referenceISO: "2026-10-03" });
    const failing = rec.checks.filter((c) => !c.ok);
    assert.deepEqual(failing.map((c) => `${c.name} (${c.left} vs ${c.right})`), []);
    assert.ok(rec.ok);
    assert.ok(rec.checks.length >= 15);
  });
  it("holds after mixed mutations (edits + a cancellation)", () => {
    const invoices = mixedInvoices();
    const edited = invoices.map((inv, idx) =>
      idx === 0 ? { ...inv, items: [{ ...inv.items[0], qty: 7 }] } : inv,
    );
    const rec = reconcileApp(edited, PRODUCTS, CUSTOMERS, { businessState: BUSINESS });
    assert.ok(rec.ok, rec.checks.filter((c) => !c.ok).map((c) => c.name).join(", "));
  });
  it("holds for an empty dataset too", () => {
    const rec = reconcileApp([], PRODUCTS, CUSTOMERS, { businessState: BUSINESS });
    assert.ok(rec.ok);
  });
});
