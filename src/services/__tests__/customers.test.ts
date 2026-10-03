/**
 * PHASE 8 — customer outstanding (transaction based).
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { allCustomerOutstandings, applyCredit, applyCustomerPayment, customerOutstanding, customerOutstandingFromInvoices, customerPaymentsTotal, nextOutstandingAfterInvoice, totalOutstanding } from "../customerService";
import { buildInvoice, line } from "./fixtures";

describe("customer outstanding (PHASE 8)", () => {
  it("credit raises it, payment lowers it, never below zero", () => {
    assert.equal(applyCredit(1000, 500), 1500);
    assert.equal(applyCustomerPayment(1500, 400), 1100);
    assert.equal(applyCustomerPayment(100, 500), 0);
  });
  it("derives outstanding from invoices minus payments, ignoring cancelled", () => {
    const inv1 = buildInvoice({ customerId: "c1", paymentStatus: "Partial", paidAmount: 400, items: [line({ price: 1000, qty: 1, gst: 0, productId: "p1" })] });
    const inv2 = buildInvoice({ customerId: "c1", paymentStatus: "Pending", items: [line({ price: 500, qty: 1, gst: 0, productId: "p1" })] });
    const cx = buildInvoice({ customerId: "c1", paymentStatus: "Pending", status: "Cancelled", items: [line({ price: 9999, qty: 1, gst: 0, productId: "p1" })] });
    const invoices = [inv1, inv2, cx];
    assert.equal(customerOutstandingFromInvoices("c1", invoices), (inv1.grandTotal - 400) + inv2.grandTotal);
    assert.equal(customerOutstanding("c1", invoices, [{ customerId: "c1", amount: 100 }]), (inv1.grandTotal - 400) + inv2.grandTotal - 100);
    assert.equal(customerPaymentsTotal("c1", [{ customerId: "c1", amount: 100 }, { customerId: "c2", amount: 50 }]), 100);
    assert.equal(totalOutstanding(invoices), (inv1.grandTotal - 400) + inv2.grandTotal);
  });
  it("computes outstandings for many customers in one pass", () => {
    const invoices = [buildInvoice({ customerId: "c1", paymentStatus: "Pending", items: [line({ price: 100, qty: 1, gst: 0, productId: "p1" })] })];
    const map = allCustomerOutstandings(["c1", "c2"], invoices);
    assert.ok((map.get("c1") ?? 0) > 0);
    assert.equal(map.get("c2"), 0);
  });
  it("nextOutstandingAfterInvoice reconciles instead of overwriting", () => {
    assert.equal(nextOutstandingAfterInvoice(1000, 200, 350), 1150);
  });
});
