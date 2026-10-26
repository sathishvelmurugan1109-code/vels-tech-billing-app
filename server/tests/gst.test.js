const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const { splitGstTotal } = require("../utils/gst");

describe("backend GST tax split", () => {
  it("derives Tamil Nadu intra-state components from the total GST", () => {
    assert.deepEqual(splitGstTotal(180, "Tamil Nadu", "Tamil Nadu"), {
      cgst: 90,
      sgst: 90,
      igst: 0,
    });
  });

  it("derives persisted invoice components during backend validation", async () => {
    const invoice = new Invoice({
      businessId: new mongoose.Types.ObjectId(),
      invoiceNo: "TN-1",
      date: "2026-10-26",
      businessState: "Tamil Nadu",
      customerState: "Tamil Nadu",
      gstTotal: 180,
    });

    await invoice.validate();
    assert.deepEqual(
      { cgst: invoice.cgst, sgst: invoice.sgst, igst: invoice.igst },
      { cgst: 90, sgst: 90, igst: 0 },
    );
  });

  it("recognizes Tamil Nadu state code aliases", () => {
    assert.deepEqual(splitGstTotal(10, "TN", "33"), {
      cgst: 5,
      sgst: 5,
      igst: 0,
    });
  });

  it("assigns inter-state tax entirely to IGST", () => {
    assert.deepEqual(splitGstTotal(18, "Tamil Nadu", "Karnataka"), {
      cgst: 0,
      sgst: 0,
      igst: 18,
    });
  });

  it("splits an odd paise without losing tax", () => {
    const split = splitGstTotal(0.01, "Tamil Nadu", "Tamil Nadu");
    assert.deepEqual(split, { cgst: 0.01, sgst: 0, igst: 0 });
    assert.equal(split.cgst + split.sgst, 0.01);
  });

  it("treats invalid or negative tax totals as zero", () => {
    assert.deepEqual(splitGstTotal(-5, "Tamil Nadu", "Tamil Nadu"), {
      cgst: 0,
      sgst: 0,
      igst: 0,
    });
    assert.deepEqual(splitGstTotal(NaN, "Tamil Nadu", "Tamil Nadu"), {
      cgst: 0,
      sgst: 0,
      igst: 0,
    });
  });
});
