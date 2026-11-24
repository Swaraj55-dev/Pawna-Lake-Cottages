"use client";

import { site } from "@/config/site";

/** Shape returned by POST /api/bookings */
export type BookingSession = {
  bookingId: string;
  bookingCode: string;
  expiresAt?: string | null;
  testMode?: boolean;
  confirmed?: boolean;
  checkout?: {
    key: string;
    orderId: string;
    amount: number;
    currency: string;
    prefill: { name: string; email: string; contact: string };
    description: string;
  };
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (resp: { error: { description?: string; reason?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

/** Loads Razorpay Standard Checkout once, only when the guest clicks Pay. */
export function loadRazorpay(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/**
 * Opens Checkout and resolves with the outcome. Never rejects for user actions:
 * "dismissed" = closed the window, "failed" = bank/UPI declined (they can retry).
 */
export async function openCheckout(
  session: BookingSession,
): Promise<{ type: "success"; data: RazorpaySuccess } | { type: "dismissed" } | { type: "failed"; reason: string }> {
  await loadRazorpay();
  const c = session.checkout!;
  return new Promise((resolve) => {
    let settled = false;
    // Checkout stays open after a failed attempt so the guest can retry;
    // remember the reason in case they close it instead.
    let lastFailure = "";
    const done = (v: Parameters<typeof resolve>[0]) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const rzp = new window.Razorpay!({
      key: c.key,
      amount: c.amount,
      currency: c.currency,
      order_id: c.orderId,
      name: site.name,
      description: c.description,
      prefill: c.prefill,
      notes: { booking_code: session.bookingCode },
      theme: { color: "#0E3B43" },
      retry: { enabled: true },
      handler: (resp: RazorpaySuccess) => done({ type: "success", data: resp }),
      modal: {
        ondismiss: () => done(lastFailure ? { type: "failed", reason: lastFailure } : { type: "dismissed" }),
        confirm_close: true,
      },
    });
    rzp.on("payment.failed", (resp) => {
      lastFailure = resp.error?.description || "The payment didn't go through.";
    });
    rzp.open();
  });
}
