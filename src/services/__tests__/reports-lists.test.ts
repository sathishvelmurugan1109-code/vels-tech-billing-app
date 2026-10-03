/**
 * PHASE 16 — customer, stock, invoice reports + filtered/paginated totals.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { dashboardStats, filteredInvoiceSummary, invoiceReport, paginatedInvoiceTotals, customerReport, stockReport } from "../reportService";
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

describe("customer / stock / invoice reports (PHASE 16)", () => {
  it("customer report balances to the dashboard outstanding", () => {
    const invoices = fixtureInvoices();
    const report = customerReport(invoices, CUSTOMERS, { businessState: BUSINESS });
    assert.equal(report.totalCustomers, 2);
    assert.equal(report.activeCustomers, 2);
    assert.equal(report.outstanding, dashboardStats(invoices, PRODUCTS, CUSTOMERS, { businessState: BUSINESS }).outstandingAmount);
    assert.ok(report.rows[0].invoiceCount >= 1);
  });
  it("stock report shares the same summary as the dashboard", () => {
    const invoices = fixtureInvoices();
    const report = stockReport(PRODUCTS, invoices, { businessState: BUSINESS });
    const dash = dashboardStats(invoices, PRODUCTS, CUSTOMERS, { businessState: BUSINESS });
    assert.equal(report.valueAtCost, dash.totalStockValue);
    assert.equal(report.summary.stockValueCost, dash.totalStockValue);
    assert.equal(report.valueAtSelling, 14 * 54990 + 7 * 7990);
    assert.equal(report.lowStockRows.length, 1);
    const p1 = report.movementRows.find((r) => r.productId === "p1")!;
    assert.equal(p1.soldQuantity, 2); // cancelled invoice excluded
  });
  it("invoice report totals match its sales summary", () => {
    const report = invoiceReport(fixtureInvoices(), { businessState: BUSINESS });
    assert.equal(report.rows.length, 3);
    assert.equal(report.rows.filter((r) => r.status === "Cancelled").length, 1);
    const total = report.rows.filter((r) => r.status !== "Cancelled").reduce((s, r) => s + r.grandTotal, 0);
    assert.equal(total, report.summary.totalSales);
  });
});

describe("filtered + paginated totals (PHASES 23/24)", () => {
  it("filters first, then totals from the filtered rows", () => {
    const invoices = fixtureInvoices();
    const filtered = filteredInvoiceSummary(invoices, { search: "Lakshmi" }, { businessState: BUSINESS });
    assert.equal(filtered.invoices.length, 1);
    assert.equal(filtered.summary.invoiceCount, 1);
    const byCustomer = filteredInvoiceSummary(invoices, { customerId: "c1" }, { businessState: BUSINESS });
    assert.equal(byCustomer.invoices.length, 2); // includes the cancelled one
    assert.equal(byCustomer.summary.invoiceCount, 1); // only active invoice counts
    const byDate = filteredInvoiceSummary(invoices, { range: { from: "2026-10-01", to: "2026-10-01" } }, { businessState: BUSINESS });
    assert.equal(byDate.summary.invoiceCount, 1);
  });
  it("page total and filtered total stay labelled separately", () => {
    const invoices = fixtureInvoices();
    const active = invoices.filter((i) => i.status !== "Cancelled");
    const paged = paginatedInvoiceTotals(active, invoices, 1, 1, { businessState: BUSINESS });
    assert.equal(paged.slice.pageItems.length, 1);
    assert.ok(paged.pageTotal <= paged.filteredTotal);
    assert.equal(paged.filteredTotal, paged.overallTotal);
  });
});
