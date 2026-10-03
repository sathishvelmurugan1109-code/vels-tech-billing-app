/**
 * dateService.ts — Consistent, LOCAL date handling for the whole application.
 *
 * RULES:
 *  - All invoice dates are ISO calendar strings "YYYY-MM-DD" in LOCAL time.
 *  - NEVER use `new Date().toISOString()` for "today" (that is UTC and can
 *    shift the calendar day near midnight — the old `todayISO` bug).
 *  - Parsing is always done as a LOCAL midnight date so comparisons never
 *    mix UTC and local offsets.
 *
 * Every screen, filter and report resolves its date ranges through here.
 */

export type DateRange = { from: string; to: string };

export type RangePreset =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "prevMonth"
  | "year"
  | "all"
  | "custom";

/* ------------------------------------------------------------------ *
 * CONSTRUCTORS / CONVERSIONS (all LOCAL time)
 * ------------------------------------------------------------------ */

/** Format any Date as a local "YYYY-MM-DD" calendar string. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's calendar date in LOCAL time (never UTC). */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/**
 * Parse an ISO "YYYY-MM-DD" (optionally with time) string as a LOCAL date.
 * Returns null when the string is not a real date — callers must not crash.
 */
export function parseLocalDate(input: unknown): Date | null {
  if (typeof input !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when the value is a real "YYYY-MM-DD" calendar date. */
export function isValidISODate(input: unknown): boolean {
  return parseLocalDate(input) !== null;
}

/** Add (or subtract) whole calendar days to an ISO date string. */
export function addDays(isoDate: string, days: number): string {
  const d = parseLocalDate(isoDate) ?? new Date();
  d.setDate(d.getDate() + Math.trunc(days));
  return toISODate(d);
}

/* ------------------------------------------------------------------ *
 * RANGE BUILDERS (all LOCAL time)
 * ------------------------------------------------------------------ */

/** Monday of the week that contains `isoDate`. */
export function startOfWeek(isoDate: string): string {
  const d = parseLocalDate(isoDate) ?? new Date();
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export function endOfWeek(isoDate: string): string {
  return addDays(startOfWeek(isoDate), 6);
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function endOfMonth(isoDate: string): string {
  const d = parseLocalDate(startOfMonth(isoDate)) ?? new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return toISODate(d);
}

export function startOfYear(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-01-01`;
}

export function endOfYear(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-12-31`;
}

export function previousMonthRange(referenceISO: string): DateRange {
  const d = parseLocalDate(startOfMonth(referenceISO)) ?? new Date();
  d.setMonth(d.getMonth() - 1);
  const ref = toISODate(d);
  return { from: startOfMonth(ref), to: endOfMonth(ref) };
}

export function currentMonthRange(referenceISO: string): DateRange {
  return { from: startOfMonth(referenceISO), to: endOfMonth(referenceISO) };
}

/* ------------------------------------------------------------------ *
 * PRESET RESOLUTION
 * ------------------------------------------------------------------ */

/**
 * Resolve a human range preset into an exact { from, to } date range.
 * `custom` passes the supplied range straight through (clamped so that
 * from <= to).
 */
export function resolveRange(
  preset: RangePreset,
  opts: { referenceISO?: string; custom?: DateRange } = {},
): DateRange & { preset: RangePreset } {
  const ref = isValidISODate(opts.referenceISO) ? String(opts.referenceISO) : todayISO();
  switch (preset) {
    case "yesterday":
      return { preset, from: addDays(ref, -1), to: addDays(ref, -1) };
    case "week":
      return { preset, from: startOfWeek(ref), to: endOfWeek(ref) };
    case "month":
      return { preset, ...currentMonthRange(ref) };
    case "prevMonth":
      return { preset, ...previousMonthRange(ref) };
    case "year":
      return { preset, from: startOfYear(ref), to: endOfYear(ref) };
    case "all":
      return { preset, from: "0000-01-01", to: "9999-12-31" };
    case "custom": {
      const c = opts.custom ?? { from: ref, to: ref };
      const from = isValidISODate(c.from) ? String(c.from) : ref;
      const to = isValidISODate(c.to) ? String(c.to) : ref;
      return from <= to ? { preset, from, to } : { preset, from: to, to: from };
    }
    case "today":
    default:
      return { preset, from: ref, to: ref };
  }
}

/** Inclusive range membership — pure string comparison, no timezone math. */
export function inRange(isoDate: unknown, range: DateRange): boolean {
  if (typeof isoDate !== "string") return false;
  const day = isoDate.slice(0, 10);
  return day >= range.from && day <= range.to;
}

/** True when the date is today (local). */
export function isToday(isoDate: unknown, now: Date = new Date()): boolean {
  return typeof isoDate === "string" && isoDate.slice(0, 10) === todayISO(now);
}

/** Calendar age in days between two ISO dates (date-only, never negative for display). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseLocalDate(fromISO);
  const b = parseLocalDate(toISO);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
