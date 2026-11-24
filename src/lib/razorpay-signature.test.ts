import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "./razorpay-signature";

const secret = "test_secret_123";
const sign = (payload: string, s = secret) => createHmac("sha256", s).update(payload).digest("hex");

describe("verifyPaymentSignature", () => {
  const base = { orderId: "order_ABC", paymentId: "pay_XYZ", secret };

  it("accepts a valid signature", () => {
    expect(verifyPaymentSignature({ ...base, signature: sign("order_ABC|pay_XYZ") })).toBe(true);
  });
  it("rejects a signature for a different payment", () => {
    expect(verifyPaymentSignature({ ...base, signature: sign("order_ABC|pay_OTHER") })).toBe(false);
  });
  it("rejects a signature made with another secret", () => {
    expect(verifyPaymentSignature({ ...base, signature: sign("order_ABC|pay_XYZ", "wrong") })).toBe(false);
  });
  it("rejects malformed / empty input without throwing", () => {
    expect(verifyPaymentSignature({ ...base, signature: "" })).toBe(false);
    expect(verifyPaymentSignature({ ...base, signature: "not-hex!" })).toBe(false);
    expect(verifyPaymentSignature({ ...base, signature: "abcd" })).toBe(false);
    expect(verifyPaymentSignature({ ...base, secret: "", signature: sign("order_ABC|pay_XYZ") })).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });

  it("accepts the signature of the exact raw body", () => {
    expect(verifyWebhookSignature(body, sign(body), secret)).toBe(true);
  });
  it("rejects if the body was re-serialised or tampered with", () => {
    const tampered = body.replace("pay_1", "pay_2");
    expect(verifyWebhookSignature(tampered, sign(body), secret)).toBe(false);
    const reformatted = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyWebhookSignature(reformatted, sign(body), secret)).toBe(false);
  });
  it("rejects missing header or secret", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), "")).toBe(false);
  });
});
