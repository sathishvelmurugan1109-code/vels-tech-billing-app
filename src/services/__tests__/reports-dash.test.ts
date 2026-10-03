/**
 * PHASES 15/13 — dashboard headline stats + product/profit reports.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calculateInvoice, StoredInvoiceLike } from "../invoiceService";
import { dashboardStats, profitReport, productReport } from "../reportService";
import { BUSINESS, buildInvoice, line } from "./fixtures";

const PRODUCTS = [
  { id: "p1", name: "Laptop", stock: 14, unit: "pcs", price: 54990, cost: 48000, gst: 18, hsn: "8471" },
  { id: "p2", name: "Mouse", stock: 7, unit: "pcs", price: 7990, cost: 6000, gst: 18, hsn: "8471" },
];
const CUSTOMERS = [
  { id: "c1", name: "Arjun", phone: "1", state: "Tamil Nadu" },
  { id: "c2", name: "Lakshmi", phone: "2", state: "Karnataka" },
];

function fixtureInvoices() {
  return [
    buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", customerName: "Arjun", date: "2026-10-01", paymentStatus: "Paid", items: [line({ price: 1000, qty: 2, discount: 10, gst: 18, productId: "p1", name: "Laptop", hsn: "8471" })] }),
    buildInvoice({ customerId: "c2", customerState: "Karnataka", customerName: "Lakshmi", date: "2026-10-02", paymentStatus: "Partial", paidAmount: 500, items: [line({ price: 500, qty: 3, gst: 5, productId: "p2", name: "Mouse", hsn: "8471" })] }),
    buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", date: "2026-10-02", paymentStatus: "Pending", status: "Cancelled", items: [line({ price: 9999, qty: 1, gst: 28, productId: "p1" })] }),
  ];
}

describe("dashboard (PHASE 15)", () => {
  it("derives every headline from real records", () => {
    const invoices = fixtureInvoices();
    const dash = dashboardStats(invoices, PRODUCTS, CUSTOMERS, { businessState: BUSINESS, referenceISO: "2026-10-02" });
    const engineTotal = invoices
      .filter((i) => i.status !== "Cancelled")
      .reduce((s, inv) => s + calculateInvoice(inv as StoredInvoiceLike, { businessState: BUSINESS }).grandTotal, 0);
    assert.equal(dash.totalRevenue, engineTotal);
    assert.equal(dash.totalInvoices, 2);
    assert.equal(dash.paidInvoices, 1);
    assert.equal(dash.partialInvoices, 1);
    assert.equal(dash.pendingInvoices, 0);
    assert.equal(dash.cancelledInvoices, 1);
    assert.equal(dash.todayInvoiceCount, 1);
    assert.equal(dash.totalCustomers, 2);
    assert.equal(dash.activeCustomers, 2);
    assert.equal(dash.totalProducts, 2);
    assert.equal(dash.lowStockProducts, 1); // p2 at 7 units
    assert.equal(dash.totalStockUnits, 21);
    assert.equal(dash.totalStockValue, 14 * 48000 + 7 * 6000);
    assert.ok(dash.outstandingAmount > 0);
    assert.equal(dash.hasCostData, true);
    assert.ok(dash.grossProfit < 0);
    assert.equal(dash.lowStockRows[0].id, "p2");
  });
  it("reports no fake profit when cost data is absent", () => {
    const dash = dashboardStats(fixtureInvoices(), [{ id: "p1", stock: 5, price: 100 }], CUSTOMERS, { businessState: BUSINESS });
    assert.equal(dash.hasCostData, false);
    assert.equal(dash.grossProfit, 0);
  });
});

describe("product / profit reports (PHASE 13/16)", () => {
  it("aggregates per-product sales with exact cost maths", () => {
    const report = productReport(fixtureInvoices(), { businessState: BUSINESS, products: PRODUCTS });
    assert.equal(report.rows.length, 2);
    const laptop = report.rows.find((r) => r.productId === "p1")!;
    assert.equal(laptop.quantitySold, 2); // cancelled invoice excluded
    assert.equal(laptop.revenue, 1800);
    assert.equal(laptop.costAmount, 2 * 48000);
    assert.equal(laptop.grossProfit, 1800 - 2 * 48000);
    assert.equal(report.hasCostData, true);
  });
  it("profit report reconciles revenue - cost = profit", () => {
    const report = profitReport(fixtureInvoices(), { businessState: BUSINESS, products: PRODUCTS });
    assert.equal(report.revenue - report.costAmount, report.grossProfit);
    assert.equal(report.byInvoice.length, 2);
  });
});
