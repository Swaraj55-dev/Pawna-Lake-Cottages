import "server-only";
import { after } from "next/server";
import { getServiceClient } from "@/lib/supabase/admin";
import type { BookingRow } from "@/lib/supabase/types";
import { sendBookingConfirmedEmails, sendPaymentIssueEmail } from "./email";

export type ConfirmOutcome =
  | "confirmed"
  | "late_confirmed"
  | "already_confirmed"
  | "duplicate_payment"
  | "refund_required"
  | "pending"
  | "not_found";

/**
 * Shared by /api/payments/verify and the Razorpay webhook. The SQL function is
 * atomic and idempotent, so only ONE caller ever sees "confirmed" — and only
 * that caller sends the confirmation emails (after the response is sent).
 */
export async function confirmPayment(opts: {
  orderId: string;
  paymentId: string;
  /** null until Razorpay confirms the payment has been captured */
  amountPaise: number | null;
  currency: string | null;
  via: "verify" | "webhook";
}): Promise<{ outcome: ConfirmOutcome; bookingId: string | null }> {
  const db = getServiceClient();
  const { data, error } = await db.rpc("confirm_booking_payment", {
    p_order_id: opts.orderId,
    p_payment_id: opts.paymentId,
    p_amount_paise: opts.amountPaise,
    p_currency: opts.currency,
  });
  if (error) throw new Error(`confirm_booking_payment failed: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as { outcome: ConfirmOutcome; booking_id: string | null };
  const outcome = row?.outcome ?? "not_found";
  const bookingId = row?.booking_id ?? null;

  console.info(`[payments] ${opts.via}: order=${opts.orderId} payment=${opts.paymentId} -> ${outcome}`);

  if (bookingId && ["confirmed", "late_confirmed", "refund_required", "duplicate_payment"].includes(outcome)) {
    after(async () => {
      const { data: b } = await db.from("bookings").select("*").eq("id", bookingId).single();
      if (!b) return;
      if (outcome === "confirmed" || outcome === "late_confirmed") {
        await sendBookingConfirmedEmails(b as BookingRow);
      } else {
        await sendPaymentIssueEmail(b as BookingRow, outcome as "refund_required" | "duplicate_payment", opts.paymentId);
      }
    });
  }
  return { outcome, bookingId };
}
