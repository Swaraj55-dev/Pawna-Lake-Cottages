"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getCottage, site } from "@/config/site";
import { requireAdmin } from "@/lib/admin-auth";
import { isAdminEmail } from "@/lib/admin-emails";
import { unitsLeftForStay } from "@/lib/availability";
import { diffDays, eachNight, isISODate, addDays } from "@/lib/dates";
import { sendBookingConfirmedEmails } from "@/lib/email";
import { getServerQuote } from "@/lib/quote";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { createAuthClient } from "@/lib/supabase/server";
import type { BookingRow, BookingStatus, GuestReviewStatus } from "@/lib/supabase/types";
import { cottageSlugSchema, foodPrefSchema, indianPhoneSchema, isoDateSchema } from "@/lib/validation";
import { STATUSES } from "@/lib/admin/bookings";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
  /** Submitted values echoed back on failure so the form can re-fill them. */
  values?: Record<string, string>;
  /** Changes on every response; forms use it as a key to re-mount with alues. */
  nonce?: string;
};

/** Failure result that preserves what the admin typed (React 19 resets forms after actions). */
const failWith = (formData: FormData, r: Omit<ActionState, "ok" | "values" | "nonce">): ActionState => ({
  ok: false,
  ...r,
  values: Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>,
  nonce: crypto.randomUUID(),
});

const fieldErrors = (e: z.ZodError) =>
  Object.fromEntries(e.issues.map((i) => [i.path.join("."), i.message]));

const sqlMessage = (msg: string) =>
  msg.includes("NOT_AVAILABLE")
    ? "Not enough cottages are free for those dates."
    : msg.includes("INVALID_TRANSITION")
      ? "That status change isn't allowed."
      : msg.includes("INVALID_GUESTS")
        ? "Too many guests for that number of cottages."
        : msg.includes("NOT_FOUND")
          ? "Booking not found."
          : "Something went wrong. Please try again.";

/* ------------------------------------------------------------------ auth */

export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, fieldErrors: { email: "Enter a valid email address" } };
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase isn't configured yet — see the README." };

  // Only allow-listed addresses get a link, but the reply is identical either way
  // so the form can't be used to discover who the admins are.
  if (isAdminEmail(email.data)) {
    const h = await headers();
    const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.data,
      options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: true },
    });
    if (error) console.error("[admin] signInWithOtp failed:", error.message);
  }
  return { ok: true, message: "If this address is authorised, a sign-in link is on its way. Check your inbox." };
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ bookings */

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(STATUSES),
  note: z.string().trim().max(300).optional(),
});

export async function updateBookingStatus(input: { id: string; status: BookingStatus; note?: string }): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { id, status, note } = parsed.data;
  const stamp = `${status} by ${admin.email} on ${new Date().toISOString().slice(0, 10)}${note ? `: ${note}` : ""}`;
  const { error } = await getServiceClient().rpc("admin_set_booking_status", { p_id: id, p_status: status, p_note: stamp });
  if (error) return { ok: false, message: sqlMessage(error.message) };
  refresh();
  return { ok: true, message: `Marked ${status.replace("_", " ")}.` };
}

const reviewModerationSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
});

export async function moderateGuestReview(id: string, status: GuestReviewStatus): Promise<ActionState> {
  await requireAdmin();
  const parsed = reviewModerationSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: "Invalid review moderation request." };

  const { data, error } = await getServiceClient()
    .from("guest_reviews")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: `Couldn't update the review: ${error.message}` };
  if (!data) return { ok: false, message: "This review has already been moderated." };

  refresh();
  return { ok: true, message: `Review ${parsed.data.status}.` };
}

/* ------------------------------------------------------------------ manual booking */

const manualSchema = z
  .object({
    type: cottageSlugSchema,
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.coerce.number().int().min(1).max(60),
    cottages: z.coerce.number().int().min(1).max(20),
    adults: z.coerce.number().int().min(0).max(60),
    childrenHalf: z.coerce.number().int().min(0).max(60),
    childrenFree: z.coerce.number().int().min(0).max(60),
    name: z.string().trim().min(2, "Enter the guest's name").max(120),
    phone: indianPhoneSchema,
    email: z.preprocess((v) => (v === "" ? undefined : v), z.email("Invalid email").optional()),
    foodPref: z.preprocess((v) => (v === "" ? undefined : v), foodPrefSchema.optional()),
    notes: z.string().trim().max(1000).optional(),
    source: z.enum(["whatsapp", "phone", "walk_in"]),
    total: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).max(10_000_000).optional()),
    paid: z.preprocess((v) => (v === "" ? 0 : v), z.coerce.number().int().min(0).max(10_000_000)),
    sendEmail: z.preprocess((v) => v === "on", z.boolean()),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] })
  .refine((v) => diffDays(v.checkIn, v.checkOut) <= 60, { message: "Max 60 nights", path: ["checkOut"] })
  .superRefine((v, ctx) => {
    if (v.adults < v.cottages) {
      ctx.addIssue({
        code: "custom",
        message: "At least one adult (11+) is required per cottage.",
        path: ["adults"],
      });
    }
    if (v.adults + v.childrenHalf + v.childrenFree !== v.guests) {
      ctx.addIssue({
        code: "custom",
        message: "Adult and child counts must add up to the total guests.",
        path: ["guests"],
      });
    }
  });

export async function createManualBooking(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failWith(formData, { message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) });
  const v = parsed.data;
  const cottage = getCottage(v.type)!;
  if (v.guests > cottage.maxGuests * v.cottages || v.guests < v.cottages) {
    return failWith(formData, { fieldErrors: { guests: `1–${cottage.maxGuests} guests per cottage` } });
  }

  // Total: what the admin entered, else the standard server price.
  let total = v.total;
  if (total === undefined) {
    try {
          total = (
            await getServerQuote({
              type: v.type,
              checkIn: v.checkIn,
              checkOut: v.checkOut,
              guests: v.guests,
              party: { adults: v.adults, childrenHalf: v.childrenHalf, childrenFree: v.childrenFree },
              cottages: v.cottages,
            })
          ).quote.total;
    } catch {
      return failWith(formData, { fieldErrors: { total: "Enter the agreed total (no standard price is set for these dates)." } });
    }
  }
  if (v.paid > total) return failWith(formData, { fieldErrors: { paid: "Paid can't exceed the total." } });

  const db = getServiceClient();
  const { data, error } = await db.rpc("create_booking", {
    p_slug: v.type,
    p_check_in: v.checkIn,
    p_check_out: v.checkOut,
    p_guests: v.guests,
    p_cottages: v.cottages,
    p_name: v.name,
    p_phone: v.phone,
    p_email: v.email ?? null,
    p_food_pref: v.foodPref ?? null,
    p_notes: v.notes || null,
    p_total: total,
    p_advance: v.paid,
    p_breakdown: { manual: true, enteredTotal: v.total ?? null },
    p_source: v.source,
    p_status: "confirmed",
    p_hold_minutes: site.holdMinutes,
    p_adults: v.adults,
    p_children_half: v.childrenHalf,
    p_children_free: v.childrenFree,
    p_food_veg: v.foodPref === "veg" ? v.guests : 0,
    p_food_non_veg: v.foodPref === "non_veg" ? v.guests : 0,
    p_food_jain: v.foodPref === "jain" ? v.guests : 0,
  });
  if (error) return failWith(formData, { message: sqlMessage(error.message) });
  const booking = data as BookingRow;

  const { data: updated } = await db.from("bookings").update({ amount_paid: v.paid }).eq("id", booking.id).select("*").single();
  if (v.sendEmail && v.email && updated) {
    after(() => sendBookingConfirmedEmails(updated as BookingRow, { notifyAdmin: false }));
  }
  refresh();
  return {
    ok: true,
    message: `Booking ${booking.booking_code} created.`,
    data: { id: booking.id, code: booking.booking_code },
  };
}

/** Live helper for the manual booking form: units left + standard price. */
export async function checkStay(input: {
  type: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  party: { adults: number; childrenHalf: number; childrenFree: number };
  cottages: number;
}) {
  await requireAdmin();
  const type = cottageSlugSchema.safeParse(input.type);
  if (!type.success || !isISODate(input.checkIn) || !isISODate(input.checkOut) || input.checkOut <= input.checkIn) {
    return { unitsLeft: null as number | null, standardTotal: null as number | null };
  }
  const unitsLeft = await unitsLeftForStay(type.data, input.checkIn, input.checkOut).catch(() => null);
  const standardTotal = await getServerQuote({
    type: type.data,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: Math.max(1, input.guests || 1),
    party: input.party,
    cottages: Math.max(1, input.cottages || 1),
  })
    .then((q) => q.quote.total)
    .catch(() => null);
  return { unitsLeft, standardTotal };
}

/* ------------------------------------------------------------------ blocked dates & price overrides */

const rangeSchema = z
  .object({
    type: z.enum(["aroma", "bella", "all"]),
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((v) => v.to >= v.from, { message: "End date must be on or after start", path: ["to"] })
  .refine((v) => diffDays(v.from, v.to) <= 120, { message: "Max 120 days at a time", path: ["to"] });

const slugsFor = (t: "aroma" | "bella" | "all") => (t === "all" ? ["aroma", "bella"] : [t]);
const datesFor = (from: string, to: string) => eachNight(from, addDays(to, 1)); // inclusive

export async function addBlockedDates(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = rangeSchema.and(
    z.object({
      units: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(50).optional()),
      reason: z.string().trim().max(200).optional(),
    }),
  );
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failWith(formData, { fieldErrors: fieldErrors(parsed.error) });
  const { type, from, to, units, reason } = parsed.data;
  const rows = slugsFor(type).flatMap((slug) =>
    datesFor(from, to).map((date) => ({ cottage_slug: slug, date, units_blocked: units ?? null, reason: reason || null })),
  );
  const db = getServiceClient();
  const { error } = await db.from("blocked_dates").upsert(rows, { onConflict: "cottage_slug,date" });
  if (error) return failWith(formData, { message: `Couldn't save: ${error.message}` });

  // Warn about existing bookings on those dates (blocking doesn't cancel them).
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("cottage_slug", slugsFor(type))
    .in("status", ["confirmed", "pending_payment"])
    .lte("check_in", to)
    .gt("check_out", from);
  refresh();
  return {
    ok: true,
    nonce: crypto.randomUUID(), // re-mount -> clears the form after success
    message: `Blocked ${rows.length} night${rows.length === 1 ? "" : "s"}.${count ? ` Note: ${count} existing booking${count === 1 ? "" : "s"} overlap these dates — they are NOT cancelled.` : ""}`,
  };
}

const idsSchema = z.array(z.uuid()).min(1).max(500);

export async function deleteBlockedDates(ids: string[]): Promise<ActionState> {
  await requireAdmin();
  if (!idsSchema.safeParse(ids).success) return { ok: false, message: "Invalid request." };
  const { error } = await getServiceClient().from("blocked_dates").delete().in("id", ids);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true, message: "Unblocked." };
}

export async function addPriceOverrides(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const schema = rangeSchema.and(
    z.object({
      price: z.coerce.number().int("Whole rupees only").min(0).max(1_000_000),
      label: z.string().trim().max(80).optional(),
    }),
  );
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failWith(formData, { fieldErrors: fieldErrors(parsed.error) });
  const { type, from, to, price, label } = parsed.data;
  const rows = slugsFor(type).flatMap((slug) =>
    datesFor(from, to).map((date) => ({ cottage_slug: slug, date, price_per_person: price, label: label || null })),
  );
  const { error } = await getServiceClient().from("price_overrides").upsert(rows, { onConflict: "cottage_slug,date" });
  if (error) return failWith(formData, { message: `Couldn't save: ${error.message}` });
  refresh();
  return { ok: true, nonce: crypto.randomUUID(), message: `Set ₹${price.toLocaleString("en-IN")}/person on ${rows.length} night${rows.length === 1 ? "" : "s"}.` };
}

export async function deletePriceOverrides(ids: string[]): Promise<ActionState> {
  await requireAdmin();
  if (!idsSchema.safeParse(ids).success) return { ok: false, message: "Invalid request." };
  const { error } = await getServiceClient().from("price_overrides").delete().in("id", ids);
  if (error) return { ok: false, message: error.message };
  refresh();
  return { ok: true, message: "Removed." };
}
