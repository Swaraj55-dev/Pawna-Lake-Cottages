/**
 * Date-only helpers on ISO "YYYY-MM-DD" strings, computed in UTC so they never
 * drift with the server's or visitor's timezone. A "night" is identified by its
 * start date: a stay from 2026-12-04 to 2026-12-06 has nights 12-04 and 12-05.
 */

export type ISODate = string; // YYYY-MM-DD

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string): s is ISODate {
  if (!ISO_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function toUTC(iso: ISODate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(iso: ISODate): number {
  return toUTC(iso).getUTCDay();
}

/** Start dates of each night in [checkIn, checkOut). */
export function eachNight(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const n = diffDays(checkIn, checkOut);
  return Array.from({ length: Math.max(n, 0) }, (_, i) => addDays(checkIn, i));
}

/** "2026-12" -> { from: "2026-12-01", to: "2027-01-01" } (to is exclusive). */
export function monthRange(month: string): { from: ISODate; to: ISODate } {
  const [y, m] = month.split("-").map(Number);
  const from = fromUTC(new Date(Date.UTC(y, m - 1, 1)));
  const to = fromUTC(new Date(Date.UTC(y, m, 1)));
  return { from, to };
}

/** Today's date in India (the property's timezone). */
export function todayIST(now: Date = new Date()): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Local calendar Date (from a date picker) -> ISO date, using its local Y/M/D. */
export function dateToISO(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO date -> local calendar Date at midnight (for date pickers / display). */
export function isoToDate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
