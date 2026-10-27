const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const invoicesById = new Map();
const paymentsByKey = new Map();
let failPaymentWrite = false;
let paymentWrites = 0;

function document(data) {
  const doc = {
    ...data,
    toObject() {
      return { ...this, toObject: undefined, save: undefined };
    },
    async save() {
      invoicesById.set(this._id, this);
      return this;
    },
  };
  return doc;
}

const invoiceModelPath = require.resolve("../models/Invoice");
require(invoiceModelPath);
require.cache[invoiceModelPath].exports = {
  async findOneAndUpdate(filter, update) {
    const existing = [...invoicesById.values()].find(
      (invoice) => invoice.invoiceNo === filter.invoiceNo && invoice.status === "Draft",
    );
    if (existing) {
      Object.assign(existing, update.$set);
      return existing;
    }
    const saved = document({
      ...update.$set,
      _id: `invoice-test-${invoicesById.size + 1}`,
    });
    invoicesById.set(saved._id, saved);
    return saved;
  },
  async findOne(filter) {
    return invoicesById.get(filter._id) || null;
  },
};

const paymentModelPath = require.resolve("../models/Payment");
require(paymentModelPath);
require.cache[paymentModelPath].exports = {
  async findOne(filter) {
    return paymentsByKey.get(filter.idempotencyKey) || null;
  },
  async findOneAndUpdate(filter, update) {
    if (failPaymentWrite) throw new Error("database unavailable");
    const existing = paymentsByKey.get(filter.idempotencyKey);
    if (existing) return existing;
    paymentWrites += 1;
    const saved = document({
      ...update.$setOnInsert,
      _id: `payment-test-${paymentWrites}`,
    });
    paymentsByKey.set(filter.idempotencyKey, saved);
    return saved;
  },
};

const authPath = require.resolve("../middleware/auth");
require(authPath);
require.cache[authPath].exports.authenticate = (req, res, next) => {
  req.businessId = "business-test-id";
  req.userId = "staff-test-id";
  next();
};

const invoiceRoutes = require("../routes/invoices");
const app = express();
app.use(express.json());
app.use("/api/invoices", invoiceRoutes);

test("manual UPI confirmation persists payment before finalizing and is idempotent", async (t) => {
  invoicesById.clear();
  paymentsByKey.clear();
  paymentWrites = 0;
  failPaymentWrite = false;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/invoices`;

  const draftResponse = await fetch(`${baseUrl}/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoiceNo: "VELS-TEST-0001",
      customerId: "customer-test",
      customerName: "Test Customer",
      items: [{ name: "Test item", price: 100, qty: 1 }],
      grandTotal: 118,
      paymentMode: "UPI",
    }),
  });
  assert.equal(draftResponse.status, 200);
  const draft = await draftResponse.json();
  assert.equal(draft.status, "Draft");
  assert.equal(draft.paymentStatus, "Pending");

  failPaymentWrite = true;
  const failedResponse = await fetch(`${baseUrl}/${draft.id}/manual-payment`, {
    method: "POST",
  });
  assert.equal(failedResponse.status, 500);
  assert.equal(invoicesById.get(draft.id).paymentStatus, "Pending");
  assert.equal(paymentsByKey.size, 0);

  failPaymentWrite = false;
  const duplicateClickResponses = await Promise.all([
    fetch(`${baseUrl}/${draft.id}/manual-payment`, { method: "POST" }),
    fetch(`${baseUrl}/${draft.id}/manual-payment`, { method: "POST" }),
  ]);
  assert.deepEqual(duplicateClickResponses.map((response) => response.status), [200, 200]);
  const result = await duplicateClickResponses[0].json();
  assert.equal(result.invoice.status, "Paid");
  assert.equal(result.invoice.paidAmount, 118);
  assert.equal(result.payment.amount, 118);
  assert.equal(result.payment.mode, "UPI");
  assert.equal(result.payment.verificationMethod, "manual");
  assert.equal(result.payment.verificationStatus, "pending");
  assert.equal(result.payment.manualConfirmationBy, "staff-test-id");
  assert.ok(result.payment.manualConfirmedAt);

  const duplicateResponse = await fetch(`${baseUrl}/${draft.id}/manual-payment`, { method: "POST" });
  assert.equal(duplicateResponse.status, 200);
  assert.equal(paymentWrites, 1);
  assert.equal(paymentsByKey.size, 1);

  const cancelledDraftResponse = await fetch(`${baseUrl}/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoiceNo: "VELS-TEST-0002",
      customerId: "customer-test",
      customerName: "Test Customer",
      items: [{ name: "Test item", price: 50, qty: 1 }],
      grandTotal: 59,
      paymentMode: "UPI",
    }),
  });
  assert.equal(cancelledDraftResponse.status, 200);
  const cancelledDraft = await cancelledDraftResponse.json();
  assert.equal(cancelledDraft.status, "Draft");
  assert.equal(cancelledDraft.paymentStatus, "Pending");
  assert.equal(paymentsByKey.has(`${cancelledDraft.id}:manual-confirmation`), false);
});
