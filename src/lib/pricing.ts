/**
 * Pure pricing functions — no I/O, no config imports — so they are trivially
 * unit-testable and identical on server and client. The server is the only
 * place a quote is *trusted* (see lib/quote.ts); the client may call these for
 * instant previews.
 *
 * Model (all amounts in whole rupees):
 *   for each night:
 *     rate          = override for that date ?? (weekend night ? weekend : weekday)
 *     regularGuests = min(guests, baseGuests × cottages)
 *     extraGuests   = guests − regularGuests
 *     nightAmount   = regularGuests × rate + extraGuests × (extraPersonPrice ?? rate)
 *   subtotal = Σ nightAmount
 *   total    = subtotal + convenienceFee
 *   advance  = round(total × advancePercent / 100), balance = total − advance
 */
import { dayOfWeek, diffDays, eachNight, isISODate, type ISODate } from "./dates";

export type GuestBreakdown = {
  adults: number;
  childrenHalf: number;
  childrenFree: number;
};

export type Rates = {
  weekday: number;
  weekend: number;
  /** per extra guest above baseGuests × cottages; null = charge the normal rate */
  extraPerson: number | null;
  baseGuests: number;
  maxGuests: number;
};

export type PricingInput = {
  checkIn: ISODate;
  checkOut: ISODate;
  guests: number;
  party?: GuestBreakdown;
  cottages: number;
  rates: Rates;
  /** ISO date -> per-person price for that night */
  overrides?: Record<ISODate, number>;
  /** JS weekday numbers of nights charged at the weekend rate (default Fri, Sat) */
  weekendNights?: number[];
  convenienceFee?: number;
  advancePercent: number;
  /** maximum stay length; default 30 */
  maxNights?: number;
};

export type NightPrice = {
  date: ISODate;
  kind: "weekday" | "weekend" | "override";
  ratePerPerson: number;
  regularGuests: number;
  extraGuests: number;
  regularAdults: number;
  regularHalfChildren: number;
  regularFreeChildren: number;
  extraAdults: number;
  extraHalfChildren: number;
  extraFreeChildren: number;
  extraRate: number;
  amount: number;
};

export type Quote = {
  checkIn: ISODate;
  checkOut: ISODate;
  nightsCount: number;
  guests: number;
  party: GuestBreakdown;
  cottages: number;
  nights: NightPrice[];
  subtotal: number;
  convenienceFee: number;
  total: number;
  advancePercent: number;
  advance: number;
  balance: number;
};

export type PricingErrorCode =
  | "INVALID_DATES"
  | "MIN_NIGHTS"
  | "MAX_NIGHTS"
  | "INVALID_GUESTS"
  | "TOO_MANY_GUESTS"
  | "INVALID_COTTAGES"
  | "INVALID_RATES";

export class PricingError extends Error {
  constructor(
    public code: PricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

const isWholeNonNeg = (n: number) => Number.isInteger(n) && n >= 0;

export function priceNight(
  date: ISODate,
  guests: number,
  cottages: number,
  rates: Rates,
  overrides: Record<ISODate, number>,
  weekendNights: number[],
  party: GuestBreakdown = { adults: guests, childrenHalf: 0, childrenFree: 0 },
): NightPrice {
  const override = overrides[date];
  const isWeekend = weekendNights.includes(dayOfWeek(date));
  const kind: NightPrice["kind"] = override !== undefined ? "override" : isWeekend ? "weekend" : "weekday";
  const ratePerPerson = override ?? (isWeekend ? rates.weekend : rates.weekday);
  const regularCapacity = Math.min(guests, rates.baseGuests * cottages);
  const regularAdults = Math.min(party.adults, regularCapacity);
  const remainingForRegularChildren = regularCapacity - regularAdults;
  const regularHalfChildren = Math.min(party.childrenHalf, remainingForRegularChildren);
  const regularFreeChildren = Math.min(
    party.childrenFree,
    remainingForRegularChildren - regularHalfChildren,
  );
  const regularGuests = regularAdults + regularHalfChildren + regularFreeChildren;
  const extraAdults = party.adults - regularAdults;
  const extraHalfChildren = party.childrenHalf - regularHalfChildren;
  const extraFreeChildren = party.childrenFree - regularFreeChildren;
  const extraGuests = extraAdults + extraHalfChildren + extraFreeChildren;
  const extraRate = rates.extraPerson ?? ratePerPerson;
  const regularHalfRate = Math.round(ratePerPerson / 2);
  const extraHalfRate = Math.round(extraRate / 2);
  const amount =
    regularAdults * ratePerPerson +
    regularHalfChildren * regularHalfRate +
    extraAdults * extraRate +
    extraHalfChildren * extraHalfRate;
  return {
    date,
    kind,
    ratePerPerson,
    regularGuests,
    extraGuests,
    regularAdults,
    regularHalfChildren,
    regularFreeChildren,
    extraAdults,
    extraHalfChildren,
    extraFreeChildren,
    extraRate,
    amount,
  };
}

export function calculateQuote(input: PricingInput): Quote {
  const {
    checkIn,
    checkOut,
    guests,
    party = { adults: guests, childrenHalf: 0, childrenFree: 0 },
    cottages,
    rates,
    overrides = {},
    weekendNights = [5, 6],
    convenienceFee = 0,
    advancePercent,
    maxNights = 30,
  } = input;

  if (!isISODate(checkIn) || !isISODate(checkOut)) {
    throw new PricingError("INVALID_DATES", "Dates must be valid YYYY-MM-DD values.");
  }
  const nightsCount = diffDays(checkIn, checkOut);
  if (nightsCount < 1) throw new PricingError("MIN_NIGHTS", "Check-out must be at least one night after check-in.");
  if (nightsCount > maxNights) throw new PricingError("MAX_NIGHTS", `Stays are limited to ${maxNights} nights.`);

  if (!Number.isInteger(cottages) || cottages < 1) {
    throw new PricingError("INVALID_COTTAGES", "At least one cottage is required.");
  }
  if (!Number.isInteger(guests) || guests < cottages) {
    throw new PricingError("INVALID_GUESTS", "Each cottage needs at least one guest.");
  }
  if (
    ![party.adults, party.childrenHalf, party.childrenFree].every((count) => Number.isInteger(count) && count >= 0) ||
    party.adults < cottages ||
    party.adults + party.childrenHalf + party.childrenFree !== guests
  ) {
    throw new PricingError("INVALID_GUESTS", "Guest ages must add up to the total, with one adult per cottage.");
  }
  if (guests > rates.maxGuests * cottages) {
    throw new PricingError(
      "TOO_MANY_GUESTS",
      `Up to ${rates.maxGuests} guests per cottage — add another cottage for ${guests} guests.`,
    );
  }
  const rateValues = [rates.weekday, rates.weekend, convenienceFee, ...(rates.extraPerson === null ? [] : [rates.extraPerson])];
  if (
    !rateValues.every(isWholeNonNeg) ||
    !Object.values(overrides).every(isWholeNonNeg) ||
    !Number.isInteger(rates.baseGuests) ||
    rates.baseGuests < 1 ||
    !Number.isInteger(rates.maxGuests) ||
    rates.maxGuests < 1
  ) {
    throw new PricingError("INVALID_RATES", "Rates must be whole, non-negative rupee amounts.");
  }
  if (advancePercent < 0 || advancePercent > 100) {
    throw new PricingError("INVALID_RATES", "advancePercent must be between 0 and 100.");
  }

  const nights = eachNight(checkIn, checkOut).map((d) =>
    priceNight(d, guests, cottages, rates, overrides, weekendNights, party),
  );
  const subtotal = nights.reduce((s, n) => s + n.amount, 0);
  const total = subtotal + convenienceFee;
  const advance = Math.round((total * advancePercent) / 100);

  return {
    checkIn,
    checkOut,
    nightsCount,
    guests,
    party,
    cottages,
    nights,
    subtotal,
    convenienceFee,
    total,
    advancePercent,
    advance,
    balance: total - advance,
  };
}

/** Groups nights by kind+rate for a compact breakdown ("2 weekday nights × …"). */
export function summarizeNights(q: Quote) {
  const groups = new Map<string, { kind: NightPrice["kind"]; ratePerPerson: number; count: number; amount: number }>();
  for (const n of q.nights) {
    const key = `${n.kind}:${n.ratePerPerson}:${n.extraRate}`;
    const g = groups.get(key) ?? { kind: n.kind, ratePerPerson: n.ratePerPerson, count: 0, amount: 0 };
    g.count += 1;
    g.amount += n.amount;
    groups.set(key, g);
  }
  return [...groups.values()];
}
