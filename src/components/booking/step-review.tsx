"use client";

import { format } from "date-fns";
import { Loader2, Pencil, ShieldCheck } from "lucide-react";
import { site } from "@/config/site";
import { isoToDate } from "@/lib/dates";
import type { GuestDetailsInput } from "@/lib/validation";
import type { ApiError, ServerQuote } from "./api";
import { isFallbackError } from "./api";
import { PriceBreakdown } from "./price-breakdown";
import { WhatsAppFallback } from "./whatsapp-fallback";
import type { BookCottage, Draft } from "./types";

const FOOD_LABEL = { veg: "Veg", non_veg: "Non-veg", jain: "Jain" } as const;

function Row({ label, value, onEdit }: { label: string; value: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-lake hover:bg-lake/5"
      >
        <Pencil className="size-3.5" aria-hidden /> Edit<span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>
  );
}

export function StepReview({
  cottage,
  draft,
  quote,
  quoteError,
  quoteLoading,
  payError,
  payInfo,
  testMode,
  onEdit,
}: {
  payInfo: string | null;
  testMode: boolean;
  cottage: BookCottage;
  draft: Draft & { checkIn: string; checkOut: string; details: GuestDetailsInput };
  quote?: ServerQuote;
  quoteError?: ApiError;
  quoteLoading: boolean;
  payError: ApiError | null;
  onEdit: (step: number) => void;
}) {
  const d = draft.details;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <dl className="divide-y divide-ink/10 rounded-3xl bg-card px-5 ring-1 ring-ink/5">
        <Row label="Cottage" value={cottage.name} onEdit={() => onEdit(0)} />
        <Row
          label="Dates"
          value={
            <>
              {format(isoToDate(draft.checkIn), "EEE d MMM")} → {format(isoToDate(draft.checkOut), "EEE d MMM yyyy")}
              <span className="block text-sm font-normal text-muted-foreground">
                Check-in {site.checkIn} · Check-out {site.checkOut}
              </span>
            </>
          }
          onEdit={() => onEdit(1)}
        />
        <Row
          label="Guests"
          value={`${draft.guests} guest${draft.guests > 1 ? "s" : ""} · ${draft.cottages} cottage${draft.cottages > 1 ? "s" : ""}`}
          onEdit={() => onEdit(2)}
        />
        <Row
          label="Guest details"
          value={
            <>
              {d.name}
              <span className="block text-sm font-normal text-muted-foreground">
                {d.phone} · {d.email}
                {d.foodPref && ` · ${FOOD_LABEL[d.foodPref]}`}
              </span>
              {d.notes && <span className="block text-sm font-normal text-muted-foreground">“{d.notes}”</span>}
            </>
          }
          onEdit={() => onEdit(3)}
        />
      </dl>

      <div className="space-y-4">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-ink/5">
          <h3 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Price breakdown
          </h3>
          {quoteLoading && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Calculating the latest price…
            </p>
          )}
          {quote && <PriceBreakdown quote={quote.quote} />}
          {quote && !quote.available && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              Sorry — only {quote.unitsLeft} cottage{quote.unitsLeft === 1 ? " is" : "s are"} left for these dates now.
              Please edit your dates or number of cottages.
            </p>
          )}
          {quoteError && !isFallbackError(quoteError) && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {quoteError.message}
            </p>
          )}
          {quoteError && isFallbackError(quoteError) && (
            <WhatsAppFallback tone="warning" title="Finish your booking on WhatsApp" message={quoteError.message} />
          )}
        </div>

        {payInfo && (
          <p role="status" className="rounded-xl bg-lake/5 px-4 py-3 text-sm font-medium text-lake ring-1 ring-lake/15">
            {payInfo}
          </p>
        )}
        {testMode && (
          <p className="rounded-xl bg-sunset/15 px-4 py-3 text-sm ring-1 ring-sunset/40">
            <strong>Test mode:</strong> no real money is charged. Use Razorpay test UPI <code>success@razorpay</code> or a
            test card.
          </p>
        )}
        {payError && (
          isFallbackError(payError) ? (
            <WhatsAppFallback tone="warning" title="We couldn't start the payment" message={payError.message} />
          ) : (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {payError.message}
            </p>
          )
        )}

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
          Secure payment by Razorpay (UPI, cards, net banking). Your cottage is held for {site.holdMinutes} minutes
          while you pay.
        </p>
      </div>
    </div>
  );
}
