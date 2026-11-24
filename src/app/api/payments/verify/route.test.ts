import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  fetchPayment: vi.fn(),
  isRazorpayConfigured: vi.fn(),
  verifyPaymentSignature: vi.fn(),
}));

vi.mock("@/lib/payments", () => ({ confirmPayment: mocks.confirmPayment }));
vi.mock("@/lib/razorpay", () => ({
  fetchPayment: mocks.fetchPayment,
  isRazorpayConfigured: mocks.isRazorpayConfigured,
}));
vi.mock("@/lib/razorpay-signature", () => ({
  verifyPaymentSignature: mocks.verifyPaymentSignature,
}));

const { POST } = await import("./route");

const body = {
  razorpay_order_id: "order_1",
  razorpay_payment_id: "pay_1",
  razorpay_signature: "signature",
};

function request() {
  return new Request("http://localhost/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isRazorpayConfigured.mockReturnValue(true);
    mocks.verifyPaymentSignature.mockReturnValue(true);
    mocks.confirmPayment.mockResolvedValue({ outcome: "confirmed", bookingId: "booking-1" });
  });

  it("confirms only a captured payment and passes its amount and currency for DB validation", async () => {
    mocks.fetchPayment.mockResolvedValue({
      id: body.razorpay_payment_id,
      order_id: body.razorpay_order_id,
      amount: 200_000,
      currency: "INR",
      status: "captured",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.confirmPayment).toHaveBeenCalledWith({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      amountPaise: 200_000,
      currency: "INR",
      via: "verify",
    });
  });

  it("leaves an authorized payment pending for the capture webhook", async () => {
    mocks.fetchPayment.mockResolvedValue({
      id: body.razorpay_payment_id,
      order_id: body.razorpay_order_id,
      amount: 200_000,
      currency: "INR",
      status: "authorized",
    });
    mocks.confirmPayment.mockResolvedValue({ outcome: "pending", bookingId: "booking-1" });

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ outcome: "pending", bookingId: "booking-1" });
    expect(mocks.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: null,
      currency: null,
      via: "verify",
    }));
  });

  it("leaves the booking pending when the Razorpay lookup fails", async () => {
    mocks.fetchPayment.mockRejectedValue(new Error("Razorpay unavailable"));
    mocks.confirmPayment.mockResolvedValue({ outcome: "pending", bookingId: "booking-1" });

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ outcome: "pending", bookingId: "booking-1" });
    expect(mocks.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({
      amountPaise: null,
      currency: null,
      via: "verify",
    }));
  });

  it("rejects a payment belonging to a different order", async () => {
    mocks.fetchPayment.mockResolvedValue({
      id: body.razorpay_payment_id,
      order_id: "order_other",
      amount: 200_000,
      currency: "INR",
      status: "captured",
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.confirmPayment).not.toHaveBeenCalled();
  });
});
