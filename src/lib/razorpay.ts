import "server-only";
import { NotConfiguredError } from "./errors";

/**
 * Minimal Razorpay REST client (Orders + Payments) using fetch + Basic auth.
 * Docs: https://razorpay.com/docs/api/orders/  — amounts are in paise.
 */
const API = "https://api.razorpay.com/v1";

// Server code reads only non-NEXT_PUBLIC vars: NEXT_PUBLIC_* are inlined at build
// time, so they'd ignore keys added to the environment after the build.
export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** The Key ID is public by design (Checkout needs it); sent to the browser per order. */
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? "";

function auth() {
  if (!isRazorpayConfigured()) throw new NotConfiguredError("Online payment");
  const token = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const desc = body?.error?.description ?? res.statusText;
    throw new Error(`Razorpay ${path} failed (${res.status}): ${desc}`);
  }
  return body as T;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
};

export function createOrder(opts: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: opts.amountPaise,
      currency: "INR",
      receipt: opts.receipt.slice(0, 40),
      notes: opts.notes,
    }),
  });
}

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
};

export function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export const isTestMode = () => razorpayKeyId().startsWith("rzp_test_");
