import type { Metadata } from "next";
import { Suspense } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { getCottage } from "@/config/site";
import { requireAdmin } from "@/lib/admin-auth";
import { groupDateRanges } from "@/lib/admin/ranges";
import { isoToDate, todayIST } from "@/lib/dates";
import { getServiceClient } from "@/lib/supabase/admin";
import type { BlockedDateRow, PriceOverrideRow } from "@/lib/supabase/types";
import { BlockForm, DeleteRange, OverrideForm } from "@/components/admin/range-forms";

export const metadata: Metadata = { title: "Blocks & prices" };

const range = (from: string, to: string) =>
  from === to
    ? format(isoToDate(from), "EEE d MMM yyyy")
    : `${format(isoToDate(from), "d MMM")} – ${format(isoToDate(to), "d MMM yyyy")}`;
const cottageName = (slug: string) => getCottage(slug)?.name ?? slug;

async function Content() {
  await requireAdmin();
  const today = todayIST();
  const db = getServiceClient();
  const [blocks, prices] = await Promise.all([
    db.from("blocked_dates").select("*").gte("date", today).order("date").limit(2000),
    db.from("price_overrides").select("*").gte("date", today).order("date").limit(2000),
  ]);
  if (blocks.error || prices.error) throw new Error(blocks.error?.message ?? prices.error?.message);

  const blockRanges = groupDateRanges(
    blocks.data as BlockedDateRow[],
    (a, b) => a.units_blocked === b.units_blocked && a.reason === b.reason,
  );
  const priceRanges = groupDateRanges(
    prices.data as PriceOverrideRow[],
    (a, b) => a.price_per_person === b.price_per_person && a.label === b.label,
  );

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section aria-labelledby="blocks-title" className="space-y-5 rounded-3xl bg-card p-6 ring-1 ring-ink/5">
        <div>
          <h2 id="blocks-title" className="text-2xl">Block dates</h2>
          <p className="text-sm text-muted-foreground">
            Close a cottage type (or some of its units) for maintenance or private events. Existing bookings are not cancelled.
          </p>
        </div>
        <BlockForm today={today} />
        <h3 className="pt-2 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming blocks</h3>
        {blockRanges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dates blocked.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {blockRanges.map((r) => (
              <li key={r.ids[0]} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{range(r.from, r.to)}</p>
                  <p className="text-muted-foreground">
                    {cottageName(r.first.cottage_slug)} · {r.first.units_blocked ? `${r.first.units_blocked} unit(s)` : "all units"}
                    {r.first.reason && ` · ${r.first.reason}`}
                  </p>
                </div>
                <DeleteRange ids={r.ids} kind="block" label={`block ${range(r.from, r.to)}`} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="prices-title" className="space-y-5 rounded-3xl bg-card p-6 ring-1 ring-ink/5">
        <div>
          <h2 id="prices-title" className="text-2xl">Special-date prices</h2>
          <p className="text-sm text-muted-foreground">
            Replace the per-person rate for festivals and long weekends. Applies to new quotes immediately.
          </p>
        </div>
        <OverrideForm today={today} />
        <h3 className="pt-2 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming prices</h3>
        {priceRanges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No special prices set.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {priceRanges.map((r) => (
              <li key={r.ids[0]} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{range(r.from, r.to)}</p>
                  <p className="text-muted-foreground">
                    {cottageName(r.first.cottage_slug)} · ₹{r.first.price_per_person.toLocaleString("en-IN")}/person
                    {r.first.label && ` · ${r.first.label}`}
                  </p>
                </div>
                <DeleteRange ids={r.ids} kind="price" label={`price ${range(r.from, r.to)}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <>
      <h1 className="mb-6 text-3xl">Blocks &amp; special prices</h1>
      <Suspense
        fallback={
          <p className="flex items-center gap-2 py-16 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Loading…
          </p>
        }
      >
        <Content />
      </Suspense>
    </>
  );
}
