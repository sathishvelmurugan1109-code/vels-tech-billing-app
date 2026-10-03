/**
 * PHASE 17 — GST report: grouped, engine-sourced, reconciling.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { calculateInvoice, StoredInvoiceLike } from "../invoiceService";
import { gstReport } from "../reportService";
import { BUSINESS, buildInvoice, line } from "./fixtures";

describe("GST report (PHASE 17)", () => {
  it("headline figures equal the invoice figures", () => {
    const invoices = [
      buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", items: [line({ price: 1000, qty: 1, gst: 18, productId: "p1" })] }),
      buildInvoice({ customerId: "c2", customerState: "Karnataka", items: [line({ price: 1000, qty: 1, gst: 18, productId: "p1" })] }),
    ];
    const report = gstReport(invoices, { businessState: BUSINESS });
    const engineGst = invoices.reduce((s, inv) => s + calculateInvoice(inv as StoredInvoiceLike, { businessState: BUSINESS }).gstTotal, 0);
    assert.equal(report.gstTotal, engineGst);
    // intra invoice → 180 split, inter invoice → 180 IGST
    assert.equal(report.cgst, 90);
    assert.equal(report.sgst, 90);
    assert.equal(report.igst, 180);
    assert.equal(report.taxableSales, 2000);
  });
  it("every grouping adds back up to the headline GST", () => {
    const invoices = [
      buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", items: [line({ price: 100, qty: 1, gst: 5, productId: "p1", hsn: "A" }), line({ price: 100, qty: 1, gst: 12, productId: "p2", hsn: "B" })] }),
      buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", items: [line({ price: 100, qty: 1, gst: 28, productId: "p3", hsn: "A" })] }),
    ];
    const report = gstReport(invoices, { businessState: BUSINESS });
    const sum = (rows: { gstTotal: number }[]) => rows.reduce((s, r) => s + r.gstTotal, 0);
    assert.equal(sum(report.byRate), report.gstTotal);
    assert.equal(sum(report.byHsn), report.gstTotal);
    assert.equal(sum(report.byDate), report.gstTotal);
    assert.equal(sum(report.byInvoice), report.gstTotal);
    assert.equal(report.byRate.length, 3);
    assert.equal(report.byInvoice.length, 2);
  });
  it("group rows carry taxable + split + value", () => {
    const invoices = [buildInvoice({ customerId: "c1", customerState: "Tamil Nadu", items: [line({ price: 1000, qty: 1, gst: 18, productId: "p1", hsn: "8471" })] })];
    const report = gstReport(invoices, { businessState: BUSINESS });
    const row = report.byRate[0];
    assert.equal(row.key, "18");
    assert.equal(row.taxableAmount, 1000);
    assert.equal(row.cgst + row.sgst, 180);
    assert.equal(row.invoiceCount, 1);
    assert.equal(report.byHsn[0].key, "8471");
  });
});
