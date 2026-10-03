/**
 * PHASE 7 — payment engine on its own.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeBalance, computePayment, computePaymentFromLedger, derivePaymentStatus, normalizePaymentMode, resolvePaidAmount, sanitizePayment, sumPayments } from "../paymentService";

describe("payment engine (PHASE 7)", () => {
  it("balance = total − paid, never negative", () => {
    assert.equal(computeBalance(1000, 400), 600);
    assert.equal(computeBalance(1000, 1500), 0);
  });
  it("derives Paid / Pending / Partial automatically", () => {
    assert.equal(derivePaymentStatus(1000, 1000), "Paid");
    assert.equal(derivePaymentStatus(1000, 1500), "Paid");
    assert.equal(derivePaymentStatus(1000, 0), "Pending");
    assert.equal(derivePaymentStatus(1000, 1), "Partial");
    assert.equal(derivePaymentStatus(1000, 999.99), "Partial");
  });
  it("computePayment enforces the status rules", () => {
    assert.deepEqual(computePayment(1000, "Paid", 0), { grandTotal: 1000, paidAmount: 1000, balance: 0, paymentStatus: "Paid" });
    assert.equal(computePayment(1000, "Pending", 500).paidAmount, 0);
    assert.equal(computePayment(1000, "Partial", 500).paymentStatus, "Partial");
    assert.equal(computePayment(1000, "Partial", -50).paidAmount, 0);
  });
  it("multi-entry ledgers sum and re-derive status", () => {
    const ledger = computePaymentFromLedger(1000, [{ amount: 400 }, { amount: 400 }]);
    assert.equal(ledger.paidAmount, 800);
    assert.equal(ledger.paymentStatus, "Partial");
    assert.equal(ledger.entryCount, 2);
    const full = computePaymentFromLedger(1000, [{ amount: 600 }, { amount: 500 }]);
    assert.equal(full.paidAmount, 1000);
    assert.equal(full.paymentStatus, "Paid");
  });
  it("sanitises modes and amounts", () => {
    assert.equal(normalizePaymentMode("Crypto"), "Cash");
    assert.equal(normalizePaymentMode("UPI"), "UPI");
    assert.equal(sanitizePayment(-10), 0);
    assert.equal(sumPayments([{ amount: 100 }, 50, { amount: "25" }]), 175);
    assert.equal(resolvePaidAmount("Paid", 1180, 0), 1180);
  });
});
