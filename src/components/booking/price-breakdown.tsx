import { formatINR } from "@/lib/format";
import { summarizeNights, type Quote } from "@/lib/pricing";

const kindLabel = { weekday: "Weekday", weekend: "Weekend", override: "Special-date" } as const;

export function PriceBreakdown({ quote, showPayment = true }: { quote: Quote; showPayment?: boolean }) {
  const groups = summarizeNights(quote);
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl bg-muted/60 px-3 py-2 text-muted-foreground">
        <p>
          {quote.party.adults} adult{quote.party.adults === 1 ? "" : "s"} (11+) at full rate
          {quote.party.childrenHalf > 0 &&
            ` · ${quote.party.childrenHalf} child${quote.party.childrenHalf === 1 ? "" : "ren"} (5–10) at half rate`}
          {quote.party.childrenFree > 0 &&
            ` · ${quote.party.childrenFree} child${quote.party.childrenFree === 1 ? "" : "ren"} under 5 free`}
        </p>
        <p className="mt-1 text-xs">Every guest, including children, counts toward cottage capacity.</p>
      </div>
      <dl className="space-y-2">
        {groups.map((g) => (
          <div key={`${g.kind}-${g.ratePerPerson}`} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {kindLabel[g.kind]} · {g.count} night{g.count > 1 ? "s" : ""}
              <span className="block text-xs">
                Adult {formatINR(g.ratePerPerson)} · child (5–10) {formatINR(Math.round(g.ratePerPerson / 2))}
              </span>
            </dt>
            <dd className="shrink-0 tabular-nums">{formatINR(g.amount)}</dd>
          </div>
        ))}
        {quote.convenienceFee > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Convenience fee</dt>
            <dd className="tabular-nums">{formatINR(quote.convenienceFee)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 border-t border-ink/10 pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatINR(quote.total)}</dd>
        </div>
      </dl>
      {showPayment && (
        <dl className="space-y-2 rounded-2xl bg-lake p-4 text-sand">
          <div className="flex justify-between gap-4 text-base font-semibold">
            <dt>Pay now ({quote.advancePercent}% advance)</dt>
            <dd className="tabular-nums">{formatINR(quote.advance)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-sand/80">
            <dt>Balance at check-in</dt>
            <dd className="tabular-nums">{formatINR(quote.balance)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
