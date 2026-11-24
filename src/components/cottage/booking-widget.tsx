import Link from "next/link";
import { CalendarCheck, Phone } from "lucide-react";
import { site, type Cottage } from "@/config/site";
import { formatINR, fromPrice } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/social-icons";

function PriceLine({ c }: { c: Cottage }) {
  const from = fromPrice(c);
  return from ? (
    <p>
      <span className="text-sm text-muted-foreground">from </span>
      <span className="font-heading text-3xl text-lake">{formatINR(from)}</span>
      <span className="text-sm text-muted-foreground"> / person / night</span>
    </p>
  ) : (
    <p className="font-heading text-2xl text-lake">Price on request</p>
  );
}

/** Desktop: sticky sidebar card. */
export function BookingWidget({ c }: { c: Cottage }) {
  const wa = whatsappLink({ cottageName: c.name });
  return (
    <div className="sticky top-28 space-y-5 rounded-3xl bg-card p-7 shadow-[0_24px_60px_-30px_rgb(14_59_67/0.45)] ring-1 ring-ink/5">
      <PriceLine c={c} />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-muted p-3">
          <dt className="text-muted-foreground">Check-in</dt>
          <dd className="font-semibold">{site.checkIn}</dd>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <dt className="text-muted-foreground">Check-out</dt>
          <dd className="font-semibold">{site.checkOut}</dd>
        </div>
      </dl>
      <Link
        href={`/book?type=${c.slug}`}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-sunset font-semibold text-ink transition-colors hover:bg-[#f5b673]"
      >
        <CalendarCheck className="size-5" aria-hidden /> Check availability
      </Link>
      <p className="text-center text-sm text-muted-foreground">
        Pay {site.advancePercent}% now to confirm, the rest at check-in.
      </p>
      {(wa || site.phone) && (
        <div className="flex gap-2 border-t border-ink/10 pt-5">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#1f7a4d] text-sm font-semibold text-white hover:bg-[#19663f]"
            >
              <WhatsAppIcon className="size-4" /> Book on WhatsApp
            </a>
          )}
          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              aria-label={`Call ${site.phone}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-lake/30 px-4 text-sm font-semibold text-lake hover:bg-lake/5"
            >
              <Phone className="size-4" aria-hidden /> Call
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Lifts floating buttons above a mobile bottom bar (below lg). */
export function BottomBarOffset({ height = 76 }: { height?: number }) {
  return <style>{`@media (max-width: 1023.98px) { :root { --bottom-bar-h: ${height}px; } }`}</style>;
}

/** Mobile: fixed bottom bar so the booking CTA is always reachable. */
export function BookingBar({ c }: { c: Cottage }) {
  const from = fromPrice(c);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-sand/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_rgb(20_32_31/0.25)] backdrop-blur-md lg:hidden">
      <BottomBarOffset />
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{c.name}</p>
          <p className="text-sm text-muted-foreground">
            {from ? (
              <>
                from <span className="font-semibold text-lake">{formatINR(from)}</span> / person
              </>
            ) : (
              "Price on request"
            )}
          </p>
        </div>
        <Link
          href={`/book?type=${c.slug}`}
          className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-sunset px-6 font-semibold text-ink"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}
