import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

type PaymentEntity = { id: string; order_id: string | null; amount: number; currency: string; status: string };
type WebhookEvent = {
  event: string;
  payload?: { payment?: { entity?: PaymentEntity } };
};

/**
 * POST /api/webhooks/razorpay — backup confirmation path.
 * Configure in Razorpay Dashboard -> Webhooks with events `payment.captured`
 * and `order.paid`, URL https://<your-domain>/api/webhooks/razorpay and the
 * secret from RAZORPAY_WEBHOOK_SECRET.
 *
 * Idempotent: confirm_booking_payment() returns "already_confirmed" on replays,
 * and Razorpay retries are safe.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  // The signature covers the exact raw bytes — read text, never re-serialise.
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }
  // 503 -> Razorpay retries later, once the database is configured.
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!["payment.captured", "order.paid"].includes(event.event) || !payment?.order_id || payment.status !== "captured") {
    // Acknowledge events we don't act on so Razorpay doesn't retry them.
    return NextResponse.json({ received: true, ignored: event.event });
  }

  try {
    const { outcome } = await confirmPayment({
      orderId: payment.order_id,
      paymentId: payment.id,
      amountPaise: payment.amount,
      currency: payment.currency,
      via: "webhook",
    });
    // 200 even for not_found (e.g. an order from another integration) — nothing to retry.
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    console.error("[webhook] confirm failed", e);
    // 500 -> Razorpay retries later, which is what we want for transient DB errors.
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
