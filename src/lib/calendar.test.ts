import { describe, expect, it } from "vitest";
import { googleCalendarUrl, istToUTCStamp, parseTime12h } from "./calendar";
import { whatsappMessage } from "./whatsapp";
import { indianPhoneSchema } from "./validation";

describe("calendar links", () => {
  it("parses 12-hour times", () => {
    expect(parseTime12h("4:00 PM")).toEqual({ h: 16, m: 0 });
    expect(parseTime12h("11:30 am")).toEqual({ h: 11, m: 30 });
    expect(parseTime12h("12 AM")).toEqual({ h: 0, m: 0 });
    expect(parseTime12h("12:15 PM")).toEqual({ h: 12, m: 15 });
    expect(parseTime12h("noon")).toBeNull();
  });
  it("converts IST to UTC stamps", () => {
    expect(istToUTCStamp("2026-12-04", { h: 16, m: 0 })).toBe("20261204T103000Z");
    expect(istToUTCStamp("2026-12-06", { h: 2, m: 0 })).toBe("20261205T203000Z"); // crosses midnight
  });
  it("builds a Google Calendar URL", () => {
    const u = new URL(
      googleCalendarUrl({
        title: "Stay",
        checkIn: "2026-12-04",
        checkOut: "2026-12-06",
        checkInTime: "4:00 PM",
        checkOutTime: "11:00 AM",
        details: "d",
        location: "l",
      }),
    );
    expect(u.searchParams.get("dates")).toBe("20261204T103000Z/20261206T053000Z");
  });
});

describe("whatsapp message", () => {
  it("prefills only the known fields", () => {
    const m = whatsappMessage({ cottageName: "Aroma Cottage", checkIn: "2026-12-04", checkOut: "2026-12-06", guests: 3 });
    expect(m).toContain("Cottage: Aroma Cottage");
    expect(m).toContain("Check-in: Fri, 4 Dec 2026");
    expect(m).toContain("Guests: 3");
    expect(m).not.toContain("Cottages:");
  });
});

describe("indian phone validation", () => {
  it.each(["9876543210", "+91 98765 43210", "09876543210", "91-9876543210"])("accepts %s", (p) => {
    expect(indianPhoneSchema.parse(p)).toBe("9876543210");
  });
  it.each(["12345", "5876543210", "98765432101", "abcdefghij"])("rejects %s", (p) => {
    expect(indianPhoneSchema.safeParse(p).success).toBe(false);
  });
});
