"use client";

import Image from "next/image";
import { format } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";
import { diffDays, isoToDate } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServerQuote } from "./api";
import { BottomBarOffset } from "@/components/cottage/booking-widget";
import type { BookCottage, Draft } from "./types";

export type PrimaryAction = {
  label: string;
  disabled?: boolean;
  busy?: boolean;
  /** when set, the button submits this form id */
  form?: string;
  onClick?: () => void;
};

function ActionButton({ action, className }: { action: PrimaryAction; className?: string }) {
  return (
    <button
      type={action.form ? "submit" : "button"}
      form={action.form}
      onClick={action.onClick}
      disabled={action.disabled || action.busy}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sunset px-6 font-semibold text-ink shadow-sm transition-colors hover:bg-[#f5b673] disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-muted-foreground disabled:shadow-none",
        className,
      )}
    >
      {action.busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
      {action.label}
      {!action.busy && <ArrowRight className="size-4" aria-hidden />}
    </button>
  );
}

function priceLine(cottage: BookCottage | undefined, quote: ServerQuote | undefined) {
  if (quote) return { label: "Total", value: formatINR(quote.quote.total), sub: `${formatINR(quote.quote.advance)} due now` };
  if (cottage?.fromPrice) return { label: "From", value: cottage.fromPrice, sub: "per person / night" };
  return null;
}

/** Desktop: sticky summary card. */
export function SummaryCard({
  cottage,
  draft,
  quote,
  action,
}: {
  cottage?: BookCottage;
  draft: Draft;
  quote?: ServerQuote;
  action: PrimaryAction;
}) {
  const nights = draft.checkIn && draft.checkOut ? diffDays(draft.checkIn, draft.checkOut) : 0;
  const price = priceLine(cottage, quote);
  return (
    <aside aria-label="Booking summary" className="sticky top-28 overflow-hidden rounded-3xl bg-card shadow-[0_24px_60px_-30px_rgb(14_59_67/0.45)] ring-1 ring-ink/5">
      {cottage?.image && (
        <div className="relative aspect-[16/9]">
          <Image src={cottage.image.src} alt="" fill sizes="360px" quality={60} className="object-cover" />
        </div>
      )}
      <div className="space-y-4 p-6">
        <p className="font-heading text-2xl">{cottage?.name ?? "Choose your cottage"}</p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Dates</dt>
            <dd className="text-right font-medium">
              {draft.checkIn ? format(isoToDate(draft.checkIn), "d MMM") : "—"}
              {draft.checkOut ? ` → ${format(isoToDate(draft.checkOut), "d MMM")}` : ""}
              {nights > 0 && <span className="text-muted-foreground"> · {nights}N</span>}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Guests</dt>
            <dd className="text-right font-medium">
              <span className="block">{draft.guests} · {draft.cottages} cottage{draft.cottages > 1 ? "s" : ""}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {draft.party.adults} adult{draft.party.adults === 1 ? "" : "s"}
                {draft.party.childrenHalf > 0 && ` · ${draft.party.childrenHalf} child${draft.party.childrenHalf === 1 ? "" : "ren"} (5–10)`}
                {draft.party.childrenFree > 0 && ` · ${draft.party.childrenFree} under 5`}
              </span>
            </dd>
          </div>
        </dl>
        {price && (
          <div className="flex items-end justify-between gap-3 border-t border-ink/10 pt-4">
            <span className="text-sm text-muted-foreground">{price.label}</span>
            <span className="text-right">
              <span className="block font-heading text-2xl text-lake">{price.value}</span>
              <span className="text-xs text-muted-foreground">{price.sub}</span>
            </span>
          </div>
        )}
        <ActionButton action={action} className="w-full" />
      </div>
    </aside>
  );
}

/** Mobile: fixed bottom bar with price + primary action. */
export function SummaryBar({
  cottage,
  quote,
  action,
}: {
  cottage?: BookCottage;
  quote?: ServerQuote;
  action: PrimaryAction;
}) {
  const price = priceLine(cottage, quote);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-sand/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_rgb(20_32_31/0.25)] backdrop-blur-md lg:hidden">
      <BottomBarOffset height={80} />
      <div className="container-page flex items-center justify-between gap-3 py-3">
        <div className="min-w-0 text-sm">
          {price ? (
            <>
              <p className="text-muted-foreground">{price.label}</p>
              <p className="truncate font-semibold text-lake">
                {price.value} <span className="font-normal text-muted-foreground">{price.sub}</span>
              </p>
            </>
          ) : (
            <p className="truncate font-semibold">{cottage?.name ?? "Book your stay"}</p>
          )}
        </div>
        <ActionButton action={action} className="shrink-0" />
      </div>
    </div>
  );
}
