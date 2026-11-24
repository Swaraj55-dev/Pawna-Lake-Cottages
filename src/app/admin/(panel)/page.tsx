import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { AlertTriangle, Download, Loader2, Search } from "lucide-react";
import { getCottage } from "@/config/site";
import { requireAdmin } from "@/lib/admin-auth";
import { bookingStats, PAGE_SIZE, parseFilters, queryBookings, type BookingFilters } from "@/lib/admin/bookings";
import { isoToDate } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusControl } from "@/components/admin/status-control";

export const metadata: Metadata = { title: "Bookings" };

const d = (iso: string) => format(isoToDate(iso), "d MMM");
const FOOD = { veg: "Veg", non_veg: "Non-veg", jain: "Jain" } as const;

function qs(f: BookingFilters, patch: Partial<BookingFilters> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...patch })) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const field = "h-11 rounded-xl border border-input bg-card px-3 text-sm";

function Filters({ f }: { f: BookingFilters }) {
  return (
    <form method="get" className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-ink/5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
      <label className="relative">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input name="q" defaultValue={f.q} placeholder="Code, name, phone or email" className={`${field} w-full pl-9`} />
      </label>
      <label>
        <span className="sr-only">Status</span>
        <select name="status" defaultValue={f.status ?? ""} className={`${field} w-full`}>
          <option value="">All statuses</option>
          <option value="pending_payment">Pending payment</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="attention">⚠ Needs refund</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Cottage</span>
        <select name="type" defaultValue={f.type ?? ""} className={`${field} w-full`}>
          <option value="">All cottages</option>
          <option value="aroma">Aroma</option>
          <option value="bella">Bella</option>
        </select>
      </label>
      <label className="flex flex-col">
        <span className="sr-only">Stay from</span>
        <input type="date" name="from" defaultValue={f.from} aria-label="Staying on or after" className={field} />
      </label>
      <label className="flex flex-col">
        <span className="sr-only">Stay to</span>
        <input type="date" name="to" defaultValue={f.to} aria-label="Staying on or before" className={field} />
      </label>
      <label>
        <span className="sr-only">Sort</span>
        <select name="sort" defaultValue={f.sort ?? "created"} className={`${field} w-full`}>
          <option value="created">Newest first</option>
          <option value="checkin">By check-in</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="inline-flex min-h-11 items-center rounded-full bg-lake px-5 text-sm font-semibold text-sand hover:bg-lake-deep">
          Apply
        </button>
        <Link href="/admin" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-lake hover:bg-lake/5">
          Reset
        </Link>
      </div>
    </form>
  );
}

async function Bookings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const f = parseFilters(await searchParams);
  const [{ rows, count }, stats] = await Promise.all([queryBookings(f), bookingStats()]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link href="/admin?status=confirmed&sort=checkin" className="rounded-2xl bg-card p-5 ring-1 ring-ink/5 hover:ring-lake/30">
          <p className="text-sm text-muted-foreground">Upcoming confirmed stays</p>
          <p className="font-heading text-3xl text-lake">{stats.upcoming}</p>
        </Link>
        <Link href="/admin?status=pending_payment" className="rounded-2xl bg-card p-5 ring-1 ring-ink/5 hover:ring-lake/30">
          <p className="text-sm text-muted-foreground">Live payment holds</p>
          <p className="font-heading text-3xl text-sunset-deep">{stats.pending}</p>
        </Link>
        <Link
          href="/admin?status=attention"
          className={`rounded-2xl p-5 ring-1 ${stats.attention ? "bg-destructive/10 ring-destructive/30" : "bg-card ring-ink/5"}`}
        >
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {stats.attention > 0 && <AlertTriangle className="size-4 text-destructive" aria-hidden />} Payments needing a refund
          </p>
          <p className={`font-heading text-3xl ${stats.attention ? "text-destructive" : "text-lake"}`}>{stats.attention}</p>
        </Link>
      </div>

      <Filters f={f} />

      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {count} booking{count === 1 ? "" : "s"}
          {pages > 1 && ` · page ${f.page} of ${pages}`}
        </p>
        <a
          href={`/api/admin/bookings.csv${qs(f, { page: 1 })}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-lake/30 px-4 text-sm font-semibold text-lake hover:bg-lake/5"
        >
          <Download className="size-4" aria-hidden /> Export CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-ink/5">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <caption className="sr-only">Bookings</caption>
          <thead className="border-b border-ink/10 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">Booking</th>
              <th scope="col" className="px-4 py-3">Guest</th>
              <th scope="col" className="px-4 py-3">Stay</th>
              <th scope="col" className="px-4 py-3 text-right">Amount</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No bookings match these filters.
                </td>
              </tr>
            )}
            {rows.map((b) => {
              const attention = /refund required/i.test(b.status_note ?? "");
              const expired = b.holdExpired;
              return (
                <tr key={b.id} className={attention ? "bg-destructive/5" : undefined}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono font-semibold">{b.booking_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(b.created_at), "d MMM, h:mm a")} · {b.source.replace("_", "-")}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold">{b.name}</p>
                    <a href={`tel:+91${b.phone}`} className="block text-lake hover:underline">
                      {b.phone}
                    </a>
                    {b.email && <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{b.email}</p>}
                    {b.notes && <p className="mt-1 max-w-[16rem] text-xs italic text-muted-foreground">“{b.notes}”</p>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold">
                      {getCottage(b.cottage_slug)?.name ?? b.cottage_slug}
                      {b.cottages_count > 1 && ` × ${b.cottages_count}`}
                    </p>
                    <p>
                      {d(b.check_in)} → {d(b.check_out)} <span className="text-muted-foreground">· {b.nights}N</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.guests} guests{b.food_pref && ` · ${FOOD[b.food_pref]}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right align-top tabular-nums">
                    <p className="font-semibold">{formatINR(b.total_amount)}</p>
                    <p className="text-xs text-forest">paid {formatINR(b.amount_paid)}</p>
                    {b.total_amount - b.amount_paid > 0 && (
                      <p className="text-xs text-muted-foreground">due {formatINR(b.total_amount - b.amount_paid)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={b.status} expired={expired} />
                    {b.status_note && (
                      <p className={`mt-1 max-w-[18rem] text-xs ${attention ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                        {b.status_note}
                      </p>
                    )}
                    {b.razorpay_payment_id && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{b.razorpay_payment_id}</p>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusControl id={b.id} code={b.booking_code} status={b.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex justify-between">
          {f.page > 1 ? (
            <Link href={`/admin${qs(f, { page: f.page - 1 })}`} className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-lake hover:bg-lake/5">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {f.page < pages && (
            <Link href={`/admin${qs(f, { page: f.page + 1 })}`} className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold text-lake hover:bg-lake/5">
              Next →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

export default function BookingsPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <h1 className="mb-6 text-3xl">Bookings</h1>
      <Suspense
        fallback={
          <p className="flex items-center gap-2 py-16 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Loading bookings…
          </p>
        }
      >
        <Bookings searchParams={searchParams} />
      </Suspense>
    </>
  );
}
