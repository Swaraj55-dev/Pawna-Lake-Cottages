import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { format } from "date-fns";
import { CalendarPlus, CheckCircle2, Clock, Loader2, Navigation, XCircle } from "lucide-react";
import { getCottage, site } from "@/config/site";
import { getBookingById } from "@/lib/bookings";
import { googleCalendarUrl } from "@/lib/calendar";
import { isoToDate } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { directionsUrl, siteUrl } from "@/lib/links";
import { whatsappLink, whatsappShareLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { AutoRefresh, ClearBookingDraft } from "@/components/booking/auto-refresh";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

const FOOD = { veg: "Veg", non_veg: "Non-veg", jain: "Jain" } as const;
const d = (iso: string) => format(isoToDate(iso), "EEE, d MMM yyyy");

async function BookingDetails({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const b = await getBookingById(bookingId);

  if (!b) {
    const wa = whatsappLink();
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-card p-8 text-center ring-1 ring-ink/5">
        <h1 className="text-3xl">We couldn&apos;t find that booking</h1>
        <p className="mt-3 text-muted-foreground">
          The link may be incomplete. If you&apos;ve paid, don&apos;t worry — your confirmation email has your booking code, or
          contact us and we&apos;ll look it up.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1f7a4d] px-6 font-semibold text-white">
              <WhatsAppIcon className="size-5" /> WhatsApp us
            </a>
          )}
          <Link href="/contact" className="inline-flex min-h-12 items-center rounded-full bg-lake px-6 font-semibold text-sand">
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  const cottage = getCottage(b.cottage_slug);
  const name = cottage?.name ?? b.cottage_slug;
  const dates = `${d(b.check_in)} → ${d(b.check_out)}`;
  const calUrl = googleCalendarUrl({
    title: `${name} — ${site.name}`,
    checkIn: b.check_in,
    checkOut: b.check_out,
    checkInTime: site.checkIn,
    checkOutTime: site.checkOut,
    details: `Booking ${b.booking_code}\n${b.guests} guests · ${b.cottages_count} cottage(s)\nBalance at check-in: ${formatINR(b.total_amount - b.amount_paid)}\n${siteUrl()}`,
    location: site.address || `${site.name}, Pawna Lake, Maval, Pune`,
  });
  const share = whatsappShareLink(
    `We're off to Pawna Lake! 🌅 Staying at the ${name}, ${site.name} — ${dates}. ${siteUrl()}`,
  );
  const hostWa = whatsappLink({ cottageName: name, checkIn: b.check_in, checkOut: b.check_out, guests: b.guests, name: b.name });

  const status = {
    confirmed: { Icon: CheckCircle2, cls: "text-forest", title: "You're booked!", text: `A confirmation has been sent to ${b.email ?? "you"}.` },
    completed: { Icon: CheckCircle2, cls: "text-forest", title: "Thanks for staying with us", text: "We hope to see you again soon." },
    pending_payment: {
      Icon: Clock,
      cls: "text-sunset-deep",
      title: "Confirming your payment…",
      text: "This usually takes a few seconds. This page updates automatically — please don't pay twice.",
    },
    cancelled: {
      Icon: XCircle,
      cls: "text-destructive",
      title: "This booking isn't active",
      text: b.status_note?.startsWith("expired")
        ? "The payment wasn't completed in time, so the cottage was released. If money was debited, contact us and we'll sort it out right away."
        : "This booking was cancelled. Contact us if you have any questions.",
    },
  }[b.status];

  return (
    <div className="mx-auto max-w-3xl">
      {b.status === "pending_payment" && <AutoRefresh />}
      {b.status !== "cancelled" && <ClearBookingDraft />}

      <div className="text-center">
        <status.Icon className={`mx-auto size-14 ${status.cls}`} aria-hidden />
        <h1 className="mt-4 text-4xl md:text-5xl">{status.title}</h1>
        <p className="mt-3 text-muted-foreground" role={b.status === "pending_payment" ? "status" : undefined}>
          {status.text}
        </p>
        <p className="mt-6 inline-flex flex-col items-center rounded-2xl bg-lake px-8 py-4 text-sand">
          <span className="text-xs uppercase tracking-[0.3em] text-sand/70">Booking code</span>
          <span className="font-heading text-3xl tracking-wider">{b.booking_code}</span>
        </p>
      </div>

      <dl className="mt-10 grid gap-px overflow-hidden rounded-3xl bg-ink/10 ring-1 ring-ink/5 sm:grid-cols-2">
        {[
          ["Cottage", `${name}${b.cottages_count > 1 ? ` × ${b.cottages_count}` : ""}`],
          ["Guests", `${b.guests}${b.food_pref ? ` · ${FOOD[b.food_pref]}` : ""}`],
          ["Check-in", `${d(b.check_in)}, ${site.checkIn}`],
          ["Check-out", `${d(b.check_out)}, ${site.checkOut}`],
          ["Total", formatINR(b.total_amount)],
          [b.status === "confirmed" || b.status === "completed" ? "Paid" : "Advance due", formatINR(b.amount_paid || b.advance_amount)],
          ["Balance at check-in", formatINR(b.total_amount - (b.amount_paid || 0))],
          ["Booked for", `${b.name} · ••••${b.phone.slice(-4)}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-card p-5">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="mt-1 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {(b.status === "confirmed" || b.status === "completed") && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <a href={calUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lake px-5 font-semibold text-sand hover:bg-lake-deep">
            <CalendarPlus className="size-5" aria-hidden /> Add to Google Calendar
          </a>
          <a href={share} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1f7a4d] px-5 font-semibold text-white hover:bg-[#19663f]">
            <WhatsAppIcon className="size-5" /> Share on WhatsApp
          </a>
          <a href={directionsUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-lake/30 px-5 font-semibold text-lake hover:bg-lake/5">
            <Navigation className="size-5" aria-hidden /> Directions
          </a>
        </div>
      )}

      {hostWa && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Questions?{" "}
          <a href={hostWa} target="_blank" rel="noopener noreferrer" className="font-semibold text-lake underline underline-offset-4">
            Message us on WhatsApp
          </a>{" "}
          with your booking code.
        </p>
      )}
    </div>
  );
}

export default function SuccessPage({ params }: PageProps<"/book/success/[bookingId]">) {
  return (
    <div className="container-page pb-20 pt-28 md:pt-36">
      <Suspense
        fallback={
          <p className="flex items-center justify-center gap-2 py-20 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Loading your booking…
          </p>
        }
      >
        <BookingDetails params={params} />
      </Suspense>
    </div>
  );
}
