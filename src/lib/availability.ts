import "server-only";
import { getCottage, site, type CottageSlug } from "@/config/site";
import { getPublicClient } from "@/lib/supabase/admin";
import type { AvailabilityRow } from "@/lib/supabase/types";
import { addDays, monthRange, todayIST, type ISODate } from "./dates";
import { AppError } from "./errors";

export type NightStatus = "available" | "limited" | "full" | "closed";

export type NightAvailability = {
  date: ISODate;
  available: number;
  status: NightStatus;
};

/** Raw per-night availability for [from, to) from the database. */
export async function fetchAvailability(slug: CottageSlug, from: ISODate, to: ISODate): Promise<AvailabilityRow[]> {
  const { data, error } = await getPublicClient().rpc("get_availability", {
    p_slug: slug,
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(`get_availability failed: ${error.message}`);
  return (data ?? []) as AvailabilityRow[];
}

/** Bookable window: today (IST) … today + bookingWindowDays. */
export function bookingWindow() {
  const first = todayIST();
  return { first, last: addDays(first, site.bookingWindowDays) };
}

/**
 * Availability for each night of a month, with past nights and nights beyond
 * the booking window marked "closed".
 */
export async function getMonthAvailability(slug: CottageSlug, month: string): Promise<NightAvailability[]> {
  const cottage = getCottage(slug);
  if (!cottage) throw new AppError("UNKNOWN_COTTAGE", "Unknown cottage type.");

  const { from, to } = monthRange(month);
  const { first, last } = bookingWindow();
  if (to <= first || from > last) {
    throw new AppError("OUT_OF_RANGE", "That month is outside the booking window.");
  }

  const rows = await fetchAvailability(slug, from, to);
  const limitedAt = Math.max(1, Math.floor(cottage.unitsAvailable / 3));
  return rows.map((r) => {
    const closed = r.night < first || r.night > last;
    const available = closed ? 0 : r.available;
    const status: NightStatus = closed ? "closed" : available === 0 ? "full" : available <= limitedAt ? "limited" : "available";
    return { date: r.night, available, status };
  });
}

/** Fewest units free across every night of the stay (what can actually be booked). */
export async function unitsLeftForStay(slug: CottageSlug, checkIn: ISODate, checkOut: ISODate): Promise<number> {
  const rows = await fetchAvailability(slug, checkIn, checkOut);
  if (rows.length === 0) return 0;
  return Math.min(...rows.map((r) => r.available));
}
