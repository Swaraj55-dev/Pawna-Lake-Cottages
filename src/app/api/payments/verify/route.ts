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

    let payment: Awaited<ReturnType<typeof fetchPayment>>;
    try {
      payment = await fetchPayment(body.razorpay_payment_id);
    } catch (e) {
      console.warn("[verify] fetchPayment failed; waiting for the payment webhook", e);
      const { outcome, bookingId } = await confirmPayment({
        orderId: body.razorpay_order_id,
        paymentId: body.razorpay_payment_id,
        amountPaise: null,
        currency: null,
        via: "verify",
      });
      if (outcome === "not_found" || !bookingId) throw new AppError("NOT_FOUND", "Booking not found for this payment.", 404);
      return NextResponse.json({ bookingId, outcome }, { status: 202, headers: noStore });
    }

    if (payment.order_id !== body.razorpay_order_id) {
      throw new AppError("INVALID_PAYMENT", "Payment does not match this order.", 400);
    }

    if (payment.status !== "captured") {
      const { outcome, bookingId } = await confirmPayment({
        orderId: body.razorpay_order_id,
        paymentId: body.razorpay_payment_id,
        amountPaise: null,
        currency: null,
        via: "verify",
      });
      if (outcome === "not_found" || !bookingId) throw new AppError("NOT_FOUND", "Booking not found for this payment.", 404);
      return NextResponse.json({ bookingId, outcome }, { status: 202, headers: noStore });
    }

    if (!Number.isSafeInteger(payment.amount) || payment.amount < 0) {
      throw new AppError("INVALID_PAYMENT", "Payment details could not be verified.", 400);
    }

    const { outcome, bookingId } = await confirmPayment({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      amountPaise: payment.amount,
      currency: payment.currency,
      via: "verify",
    });
    if (outcome === "not_found" || !bookingId) throw new AppError("NOT_FOUND", "Booking not found for this payment.", 404);

    return NextResponse.json({ bookingId, outcome }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
