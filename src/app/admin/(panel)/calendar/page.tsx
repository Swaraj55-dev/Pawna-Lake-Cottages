import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { addMonths, format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cottages, getCottage, type CottageSlug } from "@/config/site";
import { requireAdmin } from "@/lib/admin-auth";
import { isHoldExpired } from "@/lib/admin/bookings";
import { dayOfWeek, isoToDate, monthRange, todayIST } from "@/lib/dates";
import { getServiceClient } from "@/lib/supabase/admin";
import type { AvailabilityRow, BookingRow } from "@/lib/supabase/types";
import { cottageSlugSchema, monthSchema } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Occupancy" };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function CalendarContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = todayIST();
  const type: CottageSlug = cottageSlugSchema.safeParse(sp.type).data ?? "aroma";
  const month = monthSchema.safeParse(sp.month).data ?? today.slice(0, 7);
  const { from, to } = monthRange(month);

  const db = getServiceClient();
  const [avail, books, prices] = await Promise.all([
    db.rpc("get_availability", { p_slug: type, p_from: from, p_to: to }),
    db
      .from("bookings")
      .select("id, booking_code, name, check_in, check_out, cottages_count, guests, status, expires_at")
      .eq("cottage_slug", type)
      .in("status", ["confirmed", "completed", "pending_payment"])
      .lt("check_in", to)
      .gt("check_out", from)
      .order("check_in"),
    db.from("price_overrides").select("date, price_per_person, label").eq("cottage_slug", type).gte("date", from).lt("date", to),
  ]);
  if (avail.error || books.error || prices.error) throw new Error((avail.error ?? books.error ?? prices.error)!.message);

  const nights = (avail.data ?? []) as AvailabilityRow[];
  const bookings = (books.data ?? []) as Pick<BookingRow, "id" | "booking_code" | "name" | "check_in" | "check_out" | "cottages_count" | "guests" | "status" | "expires_at">[];
  const priceByDate = new Map((prices.data ?? []).map((p) => [p.date as string, p as { price_per_person: number; label: string | null }]));
  const activeBookings = bookings.filter((b) => !isHoldExpired(b));

  const lead = dayOfWeek(from);
  const prevMonth = format(addMonths(isoToDate(from), -1), "yyyy-MM");
  const nextMonth = format(addMonths(isoToDate(from), 1), "yyyy-MM");
  const totalBooked = nights.reduce((s, n) => s + n.booked, 0);
  const capacity = nights.reduce((s, n) => s + n.units_total, 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-card p-1 ring-1 ring-ink/10" role="group" aria-label="Cottage type">
          {cottages.map((c) => (
            <Link
              key={c.slug}
              href={`/admin/calendar?type=${c.slug}&month=${month}`}
              aria-current={c.slug === type ? "page" : undefined}
              className={cn("inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold", c.slug === type ? "bg-lake text-sand" : "hover:bg-muted")}
            >
              {c.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?type=${type}&month=${prevMonth}`} aria-label="Previous month" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-card">
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h2 className="min-w-44 text-center text-2xl">{format(isoToDate(from), "MMMM yyyy")}</h2>
          <Link href={`/admin/calendar?type=${type}&month=${nextMonth}`} aria-label="Next month" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-card">
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Occupancy {capacity ? Math.round((totalBooked / capacity) * 100) : 0}% · {activeBookings.length} booking{activeBookings.length === 1 ? "" : "s"}
        </p>
      </div>

      <div
        role="region"
        tabIndex={0}
        aria-label={`${getCottage(type)?.name} occupancy, ${format(isoToDate(from), "MMMM yyyy")}`}
        className="overflow-x-auto rounded-2xl bg-card p-2 outline-none ring-1 ring-ink/5 focus-visible:ring-2 focus-visible:ring-sunset"
      >
        <div className="grid min-w-[840px] grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} aria-hidden className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {w}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`lead-${i}`} aria-hidden />
          ))}
          {nights.map((n) => {
            const past = n.night < today;
            const pct = n.units_total ? (n.booked / n.units_total) * 100 : 0;
            const blockedPct = n.units_total ? (n.blocked / n.units_total) * 100 : 0;
            const checkIns = activeBookings.filter((b) => b.check_in === n.night);
            const price = priceByDate.get(n.night);
            return (
              <div
                key={n.night}
                data-date={n.night}
                className={cn(
                  "flex min-h-32 flex-col gap-1 rounded-xl p-2 ring-1",
                  n.available === 0 ? "bg-destructive/5 ring-destructive/20" : "ring-ink/10",
                  n.night === today && "ring-2 ring-sunset",
                  past && "bg-muted ring-transparent",
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">
                    <span className="sr-only">{format(isoToDate(n.night), "EEEE")} </span>
                    {Number(n.night.slice(8))}
                    {past && <span className="sr-only"> (past)</span>}
                  </span>
                  <span className={cn("text-xs font-semibold tabular-nums", n.available === 0 ? "text-destructive" : "text-forest")}>
                    {n.available}/{n.units_total} free
                  </span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                  <div className="h-full bg-lake" style={{ width: `${pct}%` }} />
                  <div className="h-full bg-[repeating-linear-gradient(45deg,#b42318_0_3px,transparent_3px_6px)]" style={{ width: `${blockedPct}%` }} />
                </div>
                <p className="sr-only">
                  {n.booked} booked, {n.blocked} blocked, {n.available} free
                </p>
                {n.blocked > 0 && <p className="text-[11px] font-semibold text-destructive">Blocked {n.blocked}</p>}
                {price && (
                  <p className="truncate text-[11px] font-semibold text-sunset-deep" title={price.label ?? undefined}>
                    ₹{price.price_per_person.toLocaleString("en-IN")}
                    {price.label && ` · ${price.label}`}
                  </p>
                )}
                <ul className="mt-auto space-y-0.5">
                  {checkIns.slice(0, 3).map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/admin?q=${b.booking_code}`}
                        className={cn(
                          "block truncate rounded px-1 text-[11px] hover:bg-muted",
                          b.status === "pending_payment" ? "text-sunset-deep" : "text-lake",
                        )}
                        title={`${b.name} · ${b.guests} guests · ${b.cottages_count} cottage(s) · until ${b.check_out}`}
                      >
                        ▸ {b.booking_code} ×{b.cottages_count}
                      </Link>
                    </li>
                  ))}
                  {checkIns.length > 3 && <li className="px-1 text-[11px] text-muted-foreground">+{checkIns.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-2"><span className="h-1.5 w-6 rounded-full bg-lake" /> Booked</li>
        <li className="inline-flex items-center gap-2"><span className="h-1.5 w-6 rounded-full bg-[repeating-linear-gradient(45deg,#b42318_0_3px,transparent_3px_6px)]" /> Blocked</li>
        <li className="text-lake">▸ Check-in (confirmed)</li>
        <li className="text-sunset-deep">▸ Check-in (awaiting payment)</li>
      </ul>
    </>
  );
}

export default function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  return (
    <>
      <h1 className="mb-6 text-3xl">Occupancy</h1>
      <Suspense
        fallback={
          <p className="flex items-center gap-2 py-16 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Loading calendar…
          </p>
        }
      >
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
