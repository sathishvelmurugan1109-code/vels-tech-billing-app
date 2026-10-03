/**
 * PHASES 14/16/17 — sales summary, payment report, GST report.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { gstReport, paymentReport, summarizeSales, summarizeSalesInRange, summarizeSalesPeriods } from "../reportService";
import { BUSINESS, buildInvoice, line } from "./fixtures";

function sampleInvoices() {
  const intra = buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", date: "2026-10-01", paymentStatus: "Paid", paymentMode: "UPI", items: [line({ price: 1000, qty: 2, discount: 10, gst: 18, productId: "p1" })] });
  const inter = buildInvoice({ customerId: "c2", customerState: "Karnataka", date: "2026-10-02", paymentStatus: "Partial", paidAmount: 500, paymentMode: "Credit", items: [line({ price: 500, qty: 1, gst: 5, productId: "p2" })] });
  const cancelled = buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", date: "2026-10-02", paymentStatus: "Pending", status: "Cancelled", items: [line({ price: 9000, qty: 1, gst: 28, productId: "p9" })] });
  return { intra, inter, cancelled };
}

describe("sales summary (PHASE 14)", () => {
  it("splits gross / discount / net / GST / total", () => {
    const { intra } = sampleInvoices();
    const s = summarizeSales([intra], { businessState: BUSINESS });
    assert.equal(s.invoiceCount, 1);
    assert.equal(s.grossSales, 2000);
    assert.equal(s.discountTotal, 200);
    assert.equal(s.netSales, 1800);
    assert.equal(s.gstTotal, 324);
    assert.equal(s.totalSales, intra.grandTotal);
    assert.equal(s.paidAmount, intra.grandTotal);
    assert.equal(s.pendingAmount, 0);
  });
  it("excludes cancelled invoices from every sales figure", () => {
    const { intra, inter, cancelled } = sampleInvoices();
    const withCancelled = summarizeSales([intra, inter, cancelled], { businessState: BUSINESS });
    const without = summarizeSales([intra, inter], { businessState: BUSINESS });
    assert.equal(withCancelled.cancelledCount, 1);
    assert.ok(withCancelled.cancelledAmount > 0);
    assert.equal(withCancelled.totalSales, without.totalSales);
    assert.equal(withCancelled.gstTotal, without.gstTotal);
    assert.equal(withCancelled.invoiceCount, without.invoiceCount);
  });
  it("tracks partial payments and credit-mode sales", () => {
    const { inter } = sampleInvoices();
    const s = summarizeSales([inter], { businessState: BUSINESS });
    assert.equal(s.paidAmount, 500);
    assert.equal(s.pendingAmount, inter.grandTotal - 500);
    assert.equal(s.creditAmount, inter.grandTotal);
  });
  it("ranges filter by local date only", () => {
    const { intra, inter } = sampleInvoices();
    const day1 = summarizeSalesInRange([intra, inter], { from: "2026-10-01", to: "2026-10-01" }, { businessState: BUSINESS });
    assert.equal(day1.invoiceCount, 1);
    assert.equal(day1.totalSales, intra.grandTotal);
  });
  it("period presets resolve around a fixed reference date", () => {
    const { intra, inter } = sampleInvoices();
    const periods = summarizeSalesPeriods([intra, inter], ["today", "month"], { businessState: BUSINESS, referenceISO: "2026-10-02" });
    assert.equal(periods[0].summary.invoiceCount, 1); // only `inter` is 10-02
    assert.equal(periods[0].summary.totalSales, inter.grandTotal);
    assert.equal(periods[1].summary.invoiceCount, 2);
  });
  it("empty input yields honest zeroes", () => {
    const s = summarizeSales([], { businessState: BUSINESS });
    assert.equal(s.totalSales, 0);
    assert.equal(s.averageInvoiceValue, 0);
  });
});

describe("payment report (PHASE 16)", () => {
  it("groups by mode and status with a collection rate", () => {
    const { intra, inter } = sampleInvoices();
    const report = paymentReport([intra, inter], { businessState: BUSINESS });
    assert.equal(report.byMode.length, 2);
    assert.equal(report.byStatus.length, 2);
    assert.equal(report.paidAmount, intra.grandTotal + 500);
    assert.ok(report.collectionRate > 0 && report.collectionRate < 100);
    assert.equal(report.partialAmount, inter.grandTotal - 500);
  });
  it("collection rate is 0 with no sales and 100 when fully paid", () => {
    assert.equal(paymentReport([], { businessState: BUSINESS }).collectionRate, 0);
    const { intra } = sampleInvoices();
    assert.equal(paymentReport([intra], { businessState: BUSINESS }).collectionRate, 100);
  });
});
