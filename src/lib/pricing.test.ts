import { describe, expect, it } from "vitest";
import { calculateQuote, PricingError, summarizeNights, type PricingInput, type Rates } from "./pricing";
import { addDays, dayOfWeek, diffDays, eachNight, isISODate, monthRange, todayIST } from "./dates";

// Test-only rates — NOT real business prices.
const rates: Rates = { weekday: 2000, weekend: 3000, extraPerson: 1000, baseGuests: 2, maxGuests: 4 };

// 2026-12-03 is a Thursday. Nights: Thu 3, Fri 4, Sat 5, Sun 6.
const base: PricingInput = {
  checkIn: "2026-12-03",
  checkOut: "2026-12-04",
  guests: 2,
  cottages: 1,
  rates,
  advancePercent: 50,
};

const q = (over: Partial<PricingInput>) => calculateQuote({ ...base, ...over });

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isISODate("2026-12-03")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-1-3")).toBe(false);
  });
  it("walks nights across month and year boundaries", () => {
    expect(eachNight("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
    expect(diffDays("2028-02-28", "2028-03-01")).toBe(2); // leap year
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("knows weekdays", () => {
    expect(dayOfWeek("2026-12-03")).toBe(4); // Thursday
    expect(dayOfWeek("2026-12-04")).toBe(5); // Friday
  });
  it("builds month ranges with exclusive end", () => {
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(monthRange("2027-02")).toEqual({ from: "2027-02-01", to: "2027-03-01" });
  });
  it("computes today in IST, not UTC", () => {
    // 20:00 UTC on Dec 3 is 01:30 on Dec 4 in India
    expect(todayIST(new Date("2026-12-03T20:00:00Z"))).toBe("2026-12-04");
  });
});

describe("calculateQuote — weekday / weekend mix", () => {
  it("prices a single weekday night", () => {
    const r = q({});
    expect(r.nightsCount).toBe(1);
    expect(r.nights[0]).toMatchObject({ kind: "weekday", ratePerPerson: 2000, amount: 4000 });
    expect(r.total).toBe(4000);
  });

  it("charges Fri and Sat nights at the weekend rate by default", () => {
    // Thu, Fri, Sat, Sun nights
    const r = q({ checkOut: "2026-12-07" });
    expect(r.nights.map((n) => n.kind)).toEqual(["weekday", "weekend", "weekend", "weekday"]);
    expect(r.subtotal).toBe(2 * 2000 + 2 * 3000 + 2 * 3000 + 2 * 2000); // 20000
  });

  it("treats Sunday night as a weekday (check-out Monday)", () => {
    const r = q({ checkIn: "2026-12-06", checkOut: "2026-12-07" });
    expect(r.nights[0].kind).toBe("weekday");
  });

  it("respects a custom weekend definition", () => {
    // Sat + Sun nights as weekend
    const r = q({ checkOut: "2026-12-07", weekendNights: [6, 0] });
    expect(r.nights.map((n) => n.kind)).toEqual(["weekday", "weekday", "weekend", "weekend"]);
  });
});

describe("calculateQuote — guests", () => {
  it("charges per person up to base occupancy", () => {
    expect(q({ guests: 1 }).total).toBe(2000);
    expect(q({ guests: 2 }).total).toBe(4000);
  });

  it("charges extra guests at the extra-person rate", () => {
    const r = q({ guests: 4 });
    expect(r.nights[0]).toMatchObject({ regularGuests: 2, extraGuests: 2, extraRate: 1000 });
    expect(r.total).toBe(2 * 2000 + 2 * 1000);
  });

  it("falls back to the normal rate for extra guests when no extra price is set", () => {
    const r = q({ guests: 3, rates: { ...rates, extraPerson: null } });
    expect(r.total).toBe(3 * 2000);
  });

  it("scales base occupancy by number of cottages", () => {
    // 2 cottages -> 4 regular guests, 1 extra
    const r = q({ guests: 5, cottages: 2 });
    expect(r.nights[0]).toMatchObject({ regularGuests: 4, extraGuests: 1 });
    expect(r.total).toBe(4 * 2000 + 1 * 1000);
  });

  it("rejects more guests than the cottages can hold", () => {
    expect(() => q({ guests: 5, cottages: 1 })).toThrowError(PricingError);
    try {
      q({ guests: 9, cottages: 2 });
    } catch (e) {
      expect((e as PricingError).code).toBe("TOO_MANY_GUESTS");
    }
  });

  it("requires at least one guest per cottage", () => {
    expect(() => q({ guests: 1, cottages: 2 })).toThrow(/at least one guest/);
  });

  it("charges half fare for ages 5–10 and rounds odd fares up to the nearest rupee", () => {
    const r = q({
      guests: 2,
      rates: { weekday: 1299, weekend: 1299, extraPerson: null, baseGuests: 2, maxGuests: 2 },
      party: { adults: 1, childrenHalf: 1, childrenFree: 0 },
    });
    expect(r.nights[0]).toMatchObject({ regularAdults: 1, regularHalfChildren: 1, regularFreeChildren: 0, amount: 1949 });
  });

  it("does not charge for children under five", () => {
    const r = q({
      guests: 2,
      rates: { weekday: 1299, weekend: 1299, extraPerson: null, baseGuests: 2, maxGuests: 2 },
      party: { adults: 1, childrenHalf: 0, childrenFree: 1 },
    });
    expect(r.nights[0]).toMatchObject({ regularAdults: 1, regularFreeChildren: 1, amount: 1299 });
  });
});

describe("calculateQuote — price overrides", () => {
  it("replaces the per-person rate on override dates only", () => {
    const r = q({ checkOut: "2026-12-07", overrides: { "2026-12-05": 5000 } });
    expect(r.nights.map((n) => [n.kind, n.ratePerPerson])).toEqual([
      ["weekday", 2000],
      ["weekend", 3000],
      ["override", 5000],
      ["weekday", 2000],
    ]);
    expect(r.subtotal).toBe(4000 + 6000 + 10000 + 4000);
  });

  it("overrides apply to regular guests; extra guests keep the extra rate", () => {
    const r = q({ guests: 3, overrides: { "2026-12-03": 4500 } });
    expect(r.total).toBe(2 * 4500 + 1 * 1000);
  });

  it("an override can lower the price below the weekend rate", () => {
    const r = q({ checkIn: "2026-12-04", checkOut: "2026-12-05", overrides: { "2026-12-04": 1500 } });
    expect(r.nights[0]).toMatchObject({ kind: "override", amount: 3000 });
  });

  it("ignores overrides outside the stay", () => {
    expect(q({ overrides: { "2026-12-25": 9999 } }).total).toBe(4000);
  });
});

describe("calculateQuote — fee, advance, balance", () => {
  it("adds the convenience fee once per booking", () => {
    const r = q({ checkOut: "2026-12-05", convenienceFee: 199 });
    expect(r.subtotal).toBe(4000 + 6000);
    expect(r.total).toBe(10199);
  });

  it("splits advance and balance and rounds to whole rupees", () => {
    const r = q({ convenienceFee: 1, advancePercent: 50 }); // total 4001
    expect(r.advance).toBe(2001); // Math.round(2000.5)
    expect(r.balance).toBe(2000);
    expect(r.advance + r.balance).toBe(r.total);
  });

  it("supports 100% advance and 0% advance", () => {
    expect(q({ advancePercent: 100 }).balance).toBe(0);
    expect(q({ advancePercent: 0 }).advance).toBe(0);
  });

  it("summarizes nights by rate", () => {
    const r = q({ checkOut: "2026-12-07" });
    expect(summarizeNights(r)).toEqual([
      { kind: "weekday", ratePerPerson: 2000, count: 2, amount: 8000 },
      { kind: "weekend", ratePerPerson: 3000, count: 2, amount: 12000 },
    ]);
  });
});

describe("calculateQuote — validation", () => {
  it.each([
    [{ checkOut: "2026-12-03" }, "MIN_NIGHTS"],
    [{ checkOut: "2026-12-01" }, "MIN_NIGHTS"],
    [{ checkIn: "2026-13-01" }, "INVALID_DATES"],
    [{ checkOut: "2027-02-01", maxNights: 14 }, "MAX_NIGHTS"],
    [{ cottages: 0 }, "INVALID_COTTAGES"],
    [{ guests: 2.5 }, "INVALID_GUESTS"],
    [{ rates: { ...rates, weekday: -1 } }, "INVALID_RATES"],
    [{ overrides: { "2026-12-03": 10.5 } }, "INVALID_RATES"],
    [{ advancePercent: 120 }, "INVALID_RATES"],
  ] as [Partial<PricingInput>, string][])("%o -> %s", (over, code) => {
    expect(() => q(over)).toThrowError(expect.objectContaining({ code }));
  });
});
