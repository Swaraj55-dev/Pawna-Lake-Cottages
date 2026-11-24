import { addDays } from "@/lib/dates";

/**
 * Groups per-date rows into contiguous ranges with identical values, e.g.
 * 5 rows for 20–24 Dec "Private event" -> one range. Pure; unit-tested.
 */
export function groupDateRanges<T extends { id: string; date: string; cottage_slug: string }>(
  rows: T[],
  sameValue: (a: T, b: T) => boolean,
) {
  const sorted = [...rows].sort((a, b) =>
    a.cottage_slug === b.cottage_slug ? a.date.localeCompare(b.date) : a.cottage_slug.localeCompare(b.cottage_slug),
  );
  const out: { first: T; from: string; to: string; ids: string[] }[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && last.first.cottage_slug === r.cottage_slug && addDays(last.to, 1) === r.date && sameValue(last.first, r)) {
      last.to = r.date;
      last.ids.push(r.id);
    } else {
      out.push({ first: r, from: r.date, to: r.date, ids: [r.id] });
    }
  }
  return out.sort((a, b) => a.from.localeCompare(b.from) || a.first.cottage_slug.localeCompare(b.first.cottage_slug));
}
