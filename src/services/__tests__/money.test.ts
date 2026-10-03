/**
 * PHASE 2 — money engine + PHASE 26 validation.
 * Integer-paise arithmetic, 2-decimal precision, numeric-only internals.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  addMoney,
  clamp,
  computeRoundOff,
  divideMoney,
  formatAmount,
  formatCompact,
  formatCurrency,
  formatNumber,
  fromCents,
  isValidNumber,
  multiplyMoney,
  percentage,
  roundMoney,
  roundToNearest,
  safeMoney,
  safeQuantity,
  subtractMoney,
  sumMoney,
  toCents,
  toNumber,
} from "../money";

describe("toNumber — NaN/Infinity/null/undefined guards", () => {
  it("passes valid numbers through", () => {
    assert.equal(toNumber(5), 5);
    assert.equal(toNumber(0), 0);
    assert.equal(toNumber(-3.5), -3.5);
  });
  it("falls back on NaN, Infinity, null, undefined", () => {
    assert.equal(toNumber(NaN), 0);
    assert.equal(toNumber(Infinity), 0);
    assert.equal(toNumber(-Infinity), 0);
    assert.equal(toNumber(null), 0);
    assert.equal(toNumber(undefined), 0);
  });
  it("parses numeric strings, never formatted currency back into maths", () => {
    assert.equal(toNumber("42"), 42);
    assert.equal(toNumber("  7.5 "), 7.5);
  });
  it("honours a custom fallback", () => {
    assert.equal(toNumber(undefined, 10), 10);
  });
});

describe("2-decimal precision without float drift", () => {
  it("0.1 + 0.2 = 0.30, not 0.30000000000000004", () => {
    assert.equal(addMoney(0.1, 0.2), 0.3);
    assert.equal(sumMoney([0.1, 0.2]), 0.3);
  });
  it("1.005 rounds half away from zero", () => {
    assert.equal(roundMoney(1.005), 1.01);
    assert.equal(roundMoney(-1.005), -1.01);
  });
  it("subtractMoney keeps paise exact", () => {
    assert.equal(subtractMoney(10, 9.99), 0.01);
  });
  it("multiplyMoney rounds to 2 decimals", () => {
    assert.equal(multiplyMoney(19.99, 3), 59.97);
    assert.equal(multiplyMoney(6599, 3), 19797);
  });
  it("percentage is exact for GST-style rates", () => {
    assert.equal(percentage(1000, 18), 180);
    assert.equal(percentage(999, 5), 49.95);
  });
  it("divideMoney never returns Infinity/NaN", () => {
    assert.equal(divideMoney(10, 0), 0);
    assert.equal(divideMoney(10, 4), 2.5);
  });
  it("cents round-trip is lossless at 2 decimals", () => {
    assert.equal(toCents(12.34), 1234);
    assert.equal(fromCents(1234), 12.34);
  });
});

describe("round-off policy (PHASE 21)", () => {
  it("grand totals round to the nearest rupee after tax", () => {
    assert.deepEqual(computeRoundOff(7786.82), { roundOff: 0.18, roundedTotal: 7787 });
    assert.deepEqual(computeRoundOff(100.5), { roundOff: 0.5, roundedTotal: 101 });
  });
  it("roundToNearest defaults to whole rupees", () => {
    assert.equal(roundToNearest(100.4), 100);
    assert.equal(roundToNearest(100.5), 101);
  });
});

describe("validation guards (PHASE 26)", () => {
  it("clamp honours bounds", () => {
    assert.equal(clamp(150, 0, 100), 100);
    assert.equal(clamp(-5, 0, 100), 0);
    assert.equal(clamp(50, 0, 100), 50);
  });
  it("isValidNumber rejects junk", () => {
    assert.equal(isValidNumber(5), true);
    assert.equal(isValidNumber(NaN), false);
    assert.equal(isValidNumber(Infinity), false);
    assert.equal(isValidNumber(null), false);
    assert.equal(isValidNumber(""), false);
  });
  it("safeMoney/safeQuantity never go negative or NaN", () => {
    assert.equal(safeMoney(-5), 0);
    assert.equal(safeMoney(NaN), 0);
    assert.equal(safeQuantity(-2), 0);
    assert.equal(safeQuantity("3"), 3);
  });
});

describe("formatters are output-only (strings, never inputs)", () => {
  it("formatCurrency uses Indian notation", () => {
    assert.equal(typeof formatCurrency(6599), "string");
    assert.ok(formatCurrency(123456).includes("1,23,456"));
  });
  it("compacts large dashboard figures", () => {
    assert.equal(formatCompact(1_00_000), "₹1.00L");
    assert.ok(formatNumber(12.345, 2).includes("12.35"));
    assert.ok(formatAmount(1000).includes("1,000"));
  });
});
