import "server-only";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase/admin";
import type { BookingRow } from "@/lib/supabase/types";
import { requireAdmin } from "@/lib/admin-auth";
import { isoDateSchema } from "@/lib/validation";

export const STATUSES = ["pending_payment", "confirmed", "cancelled", "completed"] as const;

const optional = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), s.optional());

export const bookingFiltersSchema = z.object({
  from: optional(isoDateSchema),
  to: optional(isoDateSchema),
  status: optional(z.enum([...STATUSES, "attention"])),
  type: optional(z.enum(["aroma", "bella"])),
  q: optional(z.string().trim().max(80)),
  sort: optional(z.enum(["created", "checkin"])),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;

export function parseFilters(sp: Record<string, string | string[] | undefined>): BookingFilters {
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const r = bookingFiltersSchema.safeParse(flat);
  return r.success ? r.data : { page: 1 };
}

/** Keep search text safe inside a PostgREST or() filter. */
const sanitize = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

export const PAGE_SIZE = 50;

/** Admin-only booking query. Calls requireAdmin() itself (defence in depth). */
export async function queryBookings(f: BookingFilters, opts: { all?: boolean } = {}) {
  await requireAdmin();
  let q = getServiceClient().from("bookings").select("*", { count: "exact" });

  if (f.status === "attention") q = q.ilike("status_note", "%refund required%");
  else if (f.status) q = q.eq("status", f.status);
  if (f.type) q = q.eq("cottage_slug", f.type);
  // stays overlapping [from, to]
  if (f.from) q = q.gt("check_out", f.from);
  if (f.to) q = q.lte("check_in", f.to);
  if (f.q) {
    const s = sanitize(f.q);
    if (s) q = q.or(`booking_code.ilike.%${s}%,name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }
  q = f.sort === "checkin" ? q.order("check_in", { ascending: true }) : q.order("created_at", { ascending: false });
  if (!opts.all) {
    const from = (f.page - 1) * PAGE_SIZE;
    q = q.range(from, from + PAGE_SIZE - 1);
  } else {
    q = q.limit(5000);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(`bookings query failed: ${error.message}`);
  const now = Date.now();
  const rows = ((data ?? []) as BookingRow[]).map((b) => ({ ...b, holdExpired: isHoldExpired(b, now) }));
  return { rows, count: count ?? 0 };
}

/** A pending_payment booking whose 15-minute hold has passed (not yet swept by cron). */
export function isHoldExpired(b: Pick<BookingRow, "status" | "expires_at">, now = Date.now()) {
  return b.status === "pending_payment" && !!b.expires_at && Date.parse(b.expires_at) < now;
}

/** Headline numbers for the dashboard. */
export async function bookingStats() {
  await requireAdmin();
  const db = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const [upcoming, pending, attention] = await Promise.all([
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed").gte("check_in", today),
    db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending_payment").gt("expires_at", new Date().toISOString()),
    db.from("bookings").select("id", { count: "exact", head: true }).ilike("status_note", "%refund required%"),
  ]);
  return { upcoming: upcoming.count ?? 0, pending: pending.count ?? 0, attention: attention.count ?? 0 };
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function bookingsToCsv(rows: BookingRow[]): string {
  const cols: [string, (b: BookingRow) => unknown][] = [
    ["Booking code", (b) => b.booking_code],
    ["Status", (b) => b.status],
    ["Source", (b) => b.source],
    ["Cottage", (b) => b.cottage_slug],
    ["Cottages", (b) => b.cottages_count],
    ["Check-in", (b) => b.check_in],
    ["Check-out", (b) => b.check_out],
    ["Nights", (b) => b.nights],
    ["Guests", (b) => b.guests],
    ["Name", (b) => b.name],
    ["Phone", (b) => b.phone],
    ["Email", (b) => b.email],
    ["Food", (b) => b.food_pref],
    ["Total (INR)", (b) => b.total_amount],
    ["Advance (INR)", (b) => b.advance_amount],
    ["Paid (INR)", (b) => b.amount_paid],
    ["Balance (INR)", (b) => Math.max(b.total_amount - b.amount_paid, 0)],
    ["Notes", (b) => b.notes],
    ["Status note", (b) => b.status_note],
    ["Razorpay order", (b) => b.razorpay_order_id],
    ["Razorpay payment", (b) => b.razorpay_payment_id],
    ["Created", (b) => b.created_at],
  ];
  const lines = [cols.map(([h]) => csvCell(h)).join(","), ...rows.map((b) => cols.map(([, f]) => csvCell(f(b))).join(","))];
  return "﻿" + lines.join("\r\n"); // BOM so Excel opens UTF-8 (₹, names) correctly
}
