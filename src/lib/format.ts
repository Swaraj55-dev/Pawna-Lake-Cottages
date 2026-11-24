import type { Cottage } from "@/config/site";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number) {
  return inr.format(amount);
}

/** Lowest configured per-person price, or null when prices aren't set yet. */
export function fromPrice(c: Cottage): number | null {
  const prices = [c.pricePerPerson.weekday, c.pricePerPerson.weekend].filter(
    (p): p is number => typeof p === "number" && p > 0,
  );
  return prices.length ? Math.min(...prices) : null;
}
