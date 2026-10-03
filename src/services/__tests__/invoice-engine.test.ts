/**
 * PHASES 6/22 — invoice engine result + save path.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  buildInvoiceRecord,
  calculateInvoice,
  calculateInvoiceTotals,
  normalizeInvoiceItems,
  normalizeInvoiceStatus,
  resolveInvoiceTaxType,
  validateInvoiceBuild,
} from "../invoiceService";
import { BUSINESS, buildInvoice, line } from "./fixtures";

describe("calculateInvoice authoritative result (PHASE 6)", () => {
  it("returns the full contract shape", () => {
    const inv = buildInvoice({ customerId: "c1", items: [line({ price: 1000, qty: 2, discount: 10, gst: 18, productId: "p1" })] });
    const calc = calculateInvoice(inv, { businessState: BUSINESS });
    for (const key of ["subtotal", "discountTotal", "taxableAmount", "cgst", "sgst", "igst", "gstTotal", "roundOff", "grandTotal", "paidAmount", "balance", "paymentStatus", "itemCount", "totalQuantity"]) {
      assert.ok(key in calc, `missing ${key}`);
    }
    assert.equal(calc.subtotal, 2000);
    assert.equal(calc.itemCount, 1);
    assert.equal(calc.totalQuantity, 2);
  });
  it("re-derives payment fields from stored amounts", () => {
    const inv = buildInvoice({ customerId: "c1", paymentStatus: "Partial", paidAmount: 500, items: [line({ price: 1000, qty: 1, gst: 18, productId: "p1" })] });
    const calc = calculateInvoice(inv, { businessState: BUSINESS });
    assert.equal(calc.paymentStatus, "Partial");
    assert.equal(calc.paidAmount + calc.balance, calc.grandTotal);
  });
  it("recovers tax type for legacy invoices without a business state", () => {
    assert.equal(resolveInvoiceTaxType({ businessState: "Tamil Nadu", customerState: "Karnataka" }), "inter");
    assert.equal(resolveInvoiceTaxType({ igst: 10 }), "inter");
    assert.equal(resolveInvoiceTaxType({ cgst: 5, sgst: 5 }), "intra");
  });
  it("normalises invoice status safely", () => {
    assert.equal(normalizeInvoiceStatus("Cancelled"), "Cancelled");
    assert.equal(normalizeInvoiceStatus("bogus"), "Saved");
  });
  it("live bill totals match the saved record (PHASE 22 same-engine rule)", () => {
    const items = [line({ price: 6599, qty: 3, discount: 5, gst: 18, productId: "p1" })];
    const live = calculateInvoiceTotals(items, "Tamil Nadu", BUSINESS);
    const saved = calculateInvoice(buildInvoice({ customerId: "c1", items }), { businessState: BUSINESS });
    assert.equal(saved.grandTotal, live.grandTotal);
    assert.equal(saved.gstTotal, live.gstTotal);
  });
});

describe("invoice build path (PHASE 22)", () => {
  it("Paid persists the FULL total, Pending persists 0", () => {
    const paid = buildInvoiceRecord({
      invoiceNo: "V-1", date: "2026-10-01", customerId: "c1", customerName: "C",
      customerPhone: "1", customerGstin: "", customerAddress: "", customerState: BUSINESS,
      businessState: BUSINESS, paymentMode: "UPI", paymentStatus: "Paid", paidAmount: 0,
      items: [line({ price: 100, qty: 1, gst: 18, productId: "p1" })],
    });
    assert.equal(paid.paidAmount, paid.grandTotal);
  });
  it("Partial clamps the entered amount into [0, total]", () => {
    const over = buildInvoice({ customerId: "c1", paymentStatus: "Partial", paidAmount: 99999, items: [line({ price: 100, qty: 1, gst: 0, productId: "p1" })] });
    assert.ok(over.paidAmount <= over.grandTotal);
    assert.equal(over.paymentStatus, "Paid");
  });
  it("validation blocks bad rows (PHASE 26)", () => {
    const errors = validateInvoiceBuild({
      invoiceNo: "V-1", date: "2026-10-01", customerId: "", customerName: "", customerPhone: "",
      customerGstin: "", customerAddress: "", customerState: BUSINESS, businessState: BUSINESS,
      paymentMode: "UPI", paymentStatus: "Paid", paidAmount: 0,
      items: [{ price: 100, qty: 0, discount: 150, gst: 18 }],
    });
    assert.ok(errors.length >= 3, errors.join(" | "));
  });
  it("sanitises dirty line input", () => {
    const rows = normalizeInvoiceItems([{ price: -50, qty: -2, discount: 150, gst: 999 }], "intra");
    assert.ok(rows[0].unitPrice >= 0);
    assert.ok(rows[0].qty >= 0);
    assert.ok(rows[0].gstRate <= 100);
  });
});
