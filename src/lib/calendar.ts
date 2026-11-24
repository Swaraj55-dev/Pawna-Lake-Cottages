import type { ISODate } from "./dates";

/** "4:00 PM" -> { h: 16, m: 0 }; returns null if unparseable. */
export function parseTime12h(s: string): { h: number; m: number } | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])\s*$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/p/i.test(m[3])) h += 12;
  return { h, m: Number(m[2] ?? 0) };
}

/** IST wall-clock time on a date -> Google Calendar UTC stamp "YYYYMMDDTHHMMSSZ". */
export function istToUTCStamp(date: ISODate, time: { h: number; m: number }): string {
  const [y, mo, d] = date.split("-").map(Number);
  // IST = UTC+5:30
  const utc = new Date(Date.UTC(y, mo - 1, d, time.h, time.m) - 330 * 60_000);
  return utc.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(opts: {
  title: string;
  checkIn: ISODate;
  checkOut: ISODate;
  checkInTime: string;
  checkOutTime: string;
  details: string;
  location: string;
}): string {
  const tIn = parseTime12h(opts.checkInTime);
  const tOut = parseTime12h(opts.checkOutTime);
  const dates =
    tIn && tOut
      ? `${istToUTCStamp(opts.checkIn, tIn)}/${istToUTCStamp(opts.checkOut, tOut)}`
      : `${opts.checkIn.replace(/-/g, "")}/${opts.checkOut.replace(/-/g, "")}`; // all-day fallback
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates,
    details: opts.details,
    location: opts.location,
    ctz: "Asia/Kolkata",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
