import { NextResponse, after } from "next/server";
import { site } from "@/config/site";
import { AppError, errorResponse, noStore } from "@/lib/errors";
import { getServerQuote } from "@/lib/quote";
import { createOrder, isRazorpayConfigured, isTestMode, razorpayKeyId } from "@/lib/razorpay";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase/admin";
import type { BookingRow } from "@/lib/supabase/types";
import { createBookingSchema } from "@/lib/validation";
import { sendBookingConfirmedEmails } from "@/lib/email";

const SQL_ERRORS: Record<string, AppError> = {
  NOT_AVAILABLE: new AppError("NOT_AVAILABLE", "Sorry — those dates just sold out. Please pick different dates.", 409),
  INVALID_GUESTS: new AppError("INVALID_GUESTS", "That many guests won't fit — add another cottage.", 400),
  INVALID_DATES: new AppError("INVALID_DATES", "Please check your dates.", 400),
  UNKNOWN_COTTAGE: new AppError("UNKNOWN_COTTAGE", "Unknown cottage type.", 400),
};

/**
 * POST /api/bookings  { stay, details }
 * 1. validate  2. server-side quote + availability  3. create_booking (15-min hold)
 * 4. Razorpay order for the advance  5. return the order for Checkout.
 * Amounts are NEVER taken from the client.
 */
export async function POST(request: Request) {
  try {
    if (!rateLimit(`book:${clientIp(request)}`, 6, 10 * 60_000)) {
      throw new AppError("RATE_LIMITED", "Too many booking attempts. Please wait a few minutes or book on WhatsApp.", 429);
    }

    const { stay, details } = createBookingSchema.parse(await request.json().catch(() => null));
    if (!isRazorpayConfigured()) {
      throw new AppError("NOT_CONFIGURED", "Online payment isn't set up yet. Please book on WhatsApp or call us.", 503);
    }

    const { quote, available, unitsLeft } = await getServerQuote(stay);
    if (!available) {
      throw new AppError(
        "NOT_AVAILABLE",
        unitsLeft > 0
          ? `Only ${unitsLeft} cottage${unitsLeft === 1 ? " is" : "s are"} left for these dates.`
          : "Sorry — those dates just sold out. Please pick different dates.",
        409,
      );
    }

    const db = getServiceClient();
    const payNothing = quote.advance === 0;
    const { data, error } = await db.rpc("create_booking", {
      p_slug: stay.type,
      p_check_in: stay.checkIn,
      p_check_out: stay.checkOut,
      p_guests: stay.guests,
      p_cottages: stay.cottages,
      p_name: details.name,
      p_phone: details.phone,
      p_email: details.email,
      p_food_pref: details.foodPref,
      p_notes: details.notes || null,
      p_total: quote.total,
      p_advance: quote.advance,
      p_breakdown: quote,
      p_source: "website",
      p_status: payNothing ? "confirmed" : "pending_payment",
      p_hold_minutes: site.holdMinutes,
    });
    if (error) {
      const known = Object.keys(SQL_ERRORS).find((k) => error.message.includes(k));
      if (known) throw SQL_ERRORS[known];
      throw new Error(`create_booking failed: ${error.message}`);
    }
    const booking = data as BookingRow;

    // Edge case: advancePercent = 0 -> confirmed immediately, nothing to pay online.
    if (payNothing) {
      after(() => sendBookingConfirmedEmails(booking));
      return NextResponse.json({ bookingId: booking.id, bookingCode: booking.booking_code, confirmed: true }, { headers: noStore });
    }

    let order;
    try {
      order = await createOrder({
        amountPaise: quote.advance * 100,
        receipt: booking.booking_code,
        notes: { booking_id: booking.id, booking_code: booking.booking_code, cottage: stay.type },
      });
    } catch (e) {
      // Release the hold so the cottage isn't blocked by a failed order.
      await db
        .from("bookings")
        .update({ status: "cancelled", status_note: "payment order could not be created" })
        .eq("id", booking.id)
        .eq("status", "pending_payment");
      console.error("[bookings] createOrder failed", e);
      throw new AppError("PAYMENT_UNAVAILABLE", "We couldn't reach the payment gateway. Please try again or book on WhatsApp.", 502);
    }

    const { error: upErr } = await db.from("bookings").update({ razorpay_order_id: order.id }).eq("id", booking.id);
    if (upErr) throw new Error(`saving order id failed: ${upErr.message}`);

    return NextResponse.json(
      {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        expiresAt: booking.expires_at,
        testMode: isTestMode(),
        checkout: {
          key: razorpayKeyId(),
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          prefill: { name: details.name, email: details.email, contact: `+91${details.phone}` },
          description: `${booking.booking_code} · advance ${site.advancePercent}%`,
        },
      },
      { status: 201, headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
