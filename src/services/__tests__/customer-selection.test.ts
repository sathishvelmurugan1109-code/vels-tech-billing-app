/**
 * Regression tests for the POS customer-selection bug and invoice totals.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  buildInvoiceRecord,
  calculateInvoiceTotals,
  validateInvoiceBuild,
} from "../invoiceService";

const BUSINESS = "Tamil Nadu";

describe("customer selection regression", () => {
  it("rejects a missing customer id", () => {
    const errors = validateInvoiceBuild({
      invoiceNo: "V-1",
      date: "2026-10-01",
      customerId: "",
      customerName: "",
      customerPhone: "",
      customerGstin: "",
      customerAddress: "",
      customerState: BUSINESS,
      businessState: BUSINESS,
      paymentMode: "UPI",
      paymentStatus: "Paid",
      paidAmount: 0,
      items: [{ productId: "p1", price: 100, qty: 1, gst: 18 }],
    });
    assert.ok(errors.includes("Select a customer."), errors.join(" | "));
  });

  it("rejects a whitespace-only customer id", () => {
    const errors = validateInvoiceBuild({
      invoiceNo: "V-1",
      date: "2026-10-01",
      customerId: "   ",
      customerName: "C",
      customerPhone: "9876543210",
      customerGstin: "",
      customerAddress: "",
      customerState: BUSINESS,
      businessState: BUSINESS,
      paymentMode: "UPI",
      paymentStatus: "Paid",
      paidAmount: 0,
      items: [{ productId: "p1", price: 100, qty: 1, gst: 18 }],
    });
    assert.ok(errors.includes("Select a customer."), errors.join(" | "));
  });

  it("uses the selected customer's actual id when building an invoice", () => {
    const record = buildInvoiceRecord({
      invoiceNo: "V-1",
      date: "2026-10-01",
      customerId: "cust_selected_42",
      customerName: "Selected Customer",
      customerPhone: "9876543210",
      customerGstin: "",
      customerAddress: "",
      customerState: BUSINESS,
      businessState: BUSINESS,
      paymentMode: "UPI",
      paymentStatus: "Paid",
      paidAmount: 0,
      items: [{ productId: "p1", price: 100, qty: 2, gst: 18 }],
    });
    assert.equal(record.customerId, "cust_selected_42");
  });

  it("keeps frontend preview and persisted invoice totals in agreement", () => {
    const items = [{ productId: "p1", price: 6599, qty: 3, discount: 5, gst: 18 }];
    const live = calculateInvoiceTotals(items as any, BUSINESS, BUSINESS);
    const saved = buildInvoiceRecord({
      invoiceNo: "V-1",
      date: "2026-10-01",
      customerId: "c1",
      customerName: "C",
      customerPhone: "9876543210",
      customerGstin: "",
      customerAddress: "",
      customerState: BUSINESS,
      businessState: BUSINESS,
      paymentMode: "UPI",
      paymentStatus: "Paid",
      paidAmount: 0,
      items: items as any,
    });
    assert.equal(saved.grandTotal, live.grandTotal);
    assert.equal(saved.gstTotal, live.gstTotal);
    assert.equal(saved.taxableAmount, live.taxableAmount);
    assert.equal(saved.subtotal, live.subtotal);
    assert.equal(saved.discountTotal, live.discountTotal);
    assert.equal(saved.roundOff, live.roundOff);
  });
});