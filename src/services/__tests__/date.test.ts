/**
 * PHASE 20 — local date handling, range presets, timezone safety.
 */
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { addDays, currentMonthRange, daysBetween, endOfMonth, endOfWeek, endOfYear, inRange, isToday, isValidISODate, parseLocalDate, previousMonthRange, resolveRange, startOfMonth, startOfWeek, startOfYear, toISODate, todayISO } from "../dateService";

describe("date engine (PHASE 20)", () => {
  it("todayISO is LOCAL time, never UTC-shifted", () => {
    const nearMidnight = new Date(2026, 9, 3, 0, 30, 0); // local 00:30
    assert.equal(todayISO(nearMidnight), "2026-10-03");
    assert.equal(toISODate(new Date(2026, 0, 5)), "2026-01-05");
  });
  it("parses ISO dates as LOCAL midnight", () => {
    const d = parseLocalDate("2026-10-03");
    assert.ok(d instanceof Date);
    assert.equal(d && d.getFullYear(), 2026);
    assert.equal(parseLocalDate("not-a-date"), null);
    assert.equal(parseLocalDate(123), null);
    assert.equal(isValidISODate("2026-10-03"), true);
    assert.equal(isValidISODate("nope"), false);
  });
  it("addDays crosses month boundaries", () => {
    assert.equal(addDays("2026-01-31", 1), "2026-02-01");
    assert.equal(addDays("2026-10-03", -3), "2026-09-30");
  });
  it("builds week/month/year ranges", () => {
    assert.equal(startOfWeek("2026-10-03"), "2026-09-28"); // Saturday → Monday
    assert.equal(endOfWeek("2026-10-03"), "2026-10-04");
    assert.equal(startOfMonth("2026-10-15"), "2026-10-01");
    assert.equal(endOfMonth("2026-02-10"), "2026-02-28");
    assert.equal(startOfYear("2026-10-03"), "2026-01-01");
    assert.equal(endOfYear("2026-10-03"), "2026-12-31");
    assert.deepEqual(currentMonthRange("2026-10-03"), { from: "2026-10-01", to: "2026-10-31" });
  });
  it("resolves every preset deterministically", () => {
    assert.deepEqual(resolveRange("today", { referenceISO: "2026-10-03" }), { preset: "today", from: "2026-10-03", to: "2026-10-03" });
    assert.deepEqual(resolveRange("yesterday", { referenceISO: "2026-10-03" }), { preset: "yesterday", from: "2026-10-02", to: "2026-10-02" });
    assert.deepEqual(resolveRange("prevMonth", { referenceISO: "2026-10-03" }), { preset: "prevMonth", from: "2026-09-01", to: "2026-09-30" });
    assert.deepEqual(previousMonthRange("2026-01-15"), { from: "2025-12-01", to: "2025-12-31" });
    assert.deepEqual(resolveRange("all", {}).from, "0000-01-01");
    assert.deepEqual(resolveRange("custom", { referenceISO: "2026-10-03", custom: { from: "2026-10-05", to: "2026-10-01" } }), { preset: "custom", from: "2026-10-01", to: "2026-10-05" });
  });
  it("compares ranges with pure strings (no timezone math)", () => {
    assert.equal(inRange("2026-10-03", { from: "2026-10-01", to: "2026-10-31" }), true);
    assert.equal(inRange("2026-10-03T10:00:00", { from: "2026-10-03", to: "2026-10-03" }), true);
    assert.equal(inRange("2026-09-30", { from: "2026-10-01", to: "2026-10-31" }), false);
    assert.equal(inRange(123, { from: "2026-10-01", to: "2026-10-31" }), false);
    assert.equal(isToday("2026-10-03", new Date(2026, 9, 3, 12)), true);
    assert.equal(daysBetween("2026-10-01", "2026-10-03"), 2);
    assert.equal(daysBetween("nope", "2026-10-03"), 0);
  });
});
