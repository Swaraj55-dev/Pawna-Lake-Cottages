import { describe, expect, it } from "vitest";
import { groupDateRanges } from "./ranges";

type R = { id: string; date: string; cottage_slug: string; reason: string | null };
const r = (id: string, date: string, slug = "aroma", reason: string | null = "x"): R => ({ id, date, cottage_slug: slug, reason });
const same = (a: R, b: R) => a.reason === b.reason;

describe("groupDateRanges", () => {
  it("merges consecutive dates with the same value", () => {
    const g = groupDateRanges([r("3", "2026-12-22"), r("1", "2026-12-20"), r("2", "2026-12-21")], same);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ from: "2026-12-20", to: "2026-12-22", ids: ["1", "2", "3"] });
  });
  it("splits on gaps, different values and different cottages", () => {
    const g = groupDateRanges(
      [r("1", "2026-12-20"), r("2", "2026-12-22"), r("3", "2026-12-23", "aroma", "y"), r("4", "2026-12-20", "bella")],
      same,
    );
    expect(g.map((x) => `${x.first.cottage_slug}:${x.from}..${x.to}`)).toEqual([
      "aroma:2026-12-20..2026-12-20",
      "bella:2026-12-20..2026-12-20",
      "aroma:2026-12-22..2026-12-22",
      "aroma:2026-12-23..2026-12-23",
    ]);
  });
  it("merges across month ends", () => {
    expect(groupDateRanges([r("1", "2026-12-31"), r("2", "2027-01-01")], same)).toHaveLength(1);
  });
});
