import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getServiceClient: vi.fn() }));

const { bookingsToCsv, parseFilters } = await import("./bookings");

const row = {
  id: "1",
  booking_code: "PWN-AAAAA",
  cottage_slug: "aroma",
  check_in: "2026-12-04",
  check_out: "2026-12-06",
  nights: 2,
  guests: 2,
  cottages_count: 1,
  name: 'Ravi "R" Kumar',
  phone: "9876543210",
  email: null,
  food_pref: "veg",
  notes: "=HYPERLINK(\"http://evil\")",
  total_amount: 12000,
  advance_amount: 6000,
  amount_paid: 6000,
  price_breakdown: null,
  status: "confirmed",
  status_note: null,
  source: "website",
  razorpay_order_id: null,
  razorpay_payment_id: null,
  expires_at: null,
  confirmed_at: null,
  created_at: "2026-11-24T10:00:00Z",
  updated_at: "2026-11-24T10:00:00Z",
} as const;

describe("bookingsToCsv", () => {
  const csv = bookingsToCsv([row as never]);
  it("starts with a UTF-8 BOM and a header row", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\r\n")[0]).toContain('"Booking code"');
  });
  it("escapes quotes", () => {
    expect(csv).toContain('"Ravi ""R"" Kumar"');
  });
  it("neutralises spreadsheet formula injection", () => {
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });
  it("computes balance and leaves nulls empty", () => {
    const [header, line] = csv.replace(/^﻿/, "").split("\r\n");
    const unq = (s: string) => s.replace(/^"|"$/g, "").split('","');
    const h = unq(header);
    const c = unq(line);
    expect(c[h.indexOf("Balance (INR)")]).toBe("6000");
    expect(c[h.indexOf("Email")]).toBe("");
  });
});

describe("parseFilters", () => {
  it("ignores empty values and bad input", () => {
    expect(parseFilters({ from: "", status: "nope", page: "x" })).toEqual({ page: 1 });
  });
  it("parses valid filters", () => {
    expect(parseFilters({ from: "2026-12-01", status: "attention", type: "bella", q: " ravi ", page: "3" })).toMatchObject({
      from: "2026-12-01",
      status: "attention",
      type: "bella",
      q: "ravi",
      page: 3,
    });
  });
});
