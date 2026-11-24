import { site, type Cottage } from "@/config/site";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** e.g. [5,6] -> "Fri & Sat nights", [0,1,2,3,4] -> "Sun–Thu nights" */
export function nightsLabel(days: number[]): string {
  const d = [...days].sort((a, b) => a - b);
  if (d.length === 0) return "";
  const contiguous = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  if (d.length > 2 && contiguous) return `${DAY[d[0]]}–${DAY[d[d.length - 1]]} nights`;
  if (d.length === 1) return `${DAY[d[0]]} nights`;
  return `${d.slice(0, -1).map((x) => DAY[x]).join(", ")} & ${DAY[d[d.length - 1]]} nights`;
}

export const weekendLabel = () => nightsLabel(site.weekendNights);
export const weekdayLabel = () =>
  nightsLabel([0, 1, 2, 3, 4, 5, 6].filter((d) => !site.weekendNights.includes(d)));

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
