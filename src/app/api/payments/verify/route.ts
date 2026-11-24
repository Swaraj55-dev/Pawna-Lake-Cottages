import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, errorResponse, noStore } from "@/lib/errors";
import { confirmPayment } from "@/lib/payments";
import { fetchPayment, isRazorpayConfigured } from "@/lib/razorpay";
import { verifyPaymentSignature } from "@/lib/razorpay-signature";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

/**
 * POST /api/payments/verify — called by Checkout's success handler.
 * Verifies the HMAC signature, then confirms the booking (idempotent).
 */
export async function POST(request: Request) {
  try {
    if (!isRazorpayConfigured()) throw new AppError("NOT_CONFIGURED", "Online payment isn't set up yet.", 503);
    const body = bodySchema.parse(await request.json().catch(() => null));

    const valid = verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    if (!valid) throw new AppError("INVALID_SIGNATURE", "We couldn't verify this payment. If money was debited, contact us.", 400);

    // Record what was actually paid (falls back to the order amount via the booking).
    let amountPaise: number | null = null;
    try {
      const p = await fetchPayment(body.razorpay_payment_id);
      if (p.order_id !== body.razorpay_order_id) throw new AppError("INVALID_PAYMENT", "Payment does not match this order.", 400);
      amountPaise = p.amount;
    } catch (e) {
      if (e instanceof AppError) throw e;
      console.warn("[verify] fetchPayment failed, using booking advance", e);
    }

    const { outcome, bookingId } = await confirmPayment({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      amountPaise,
      via: "verify",
    });
    if (outcome === "not_found" || !bookingId) throw new AppError("NOT_FOUND", "Booking not found for this payment.", 404);

    return NextResponse.json({ bookingId, outcome }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
