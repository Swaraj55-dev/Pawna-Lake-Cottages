import { formatINR } from "@/lib/format";
import { summarizeNights, type Quote } from "@/lib/pricing";

const kindLabel = { weekday: "Weekday", weekend: "Weekend", override: "Special-date" } as const;

export function PriceBreakdown({ quote, showPayment = true }: { quote: Quote; showPayment?: boolean }) {
  const groups = summarizeNights(quote);
  const extra = quote.nights[0]?.extraGuests ?? 0;
  const regular = quote.nights[0]?.regularGuests ?? quote.guests;
  return (
    <div className="space-y-3 text-sm">
      <dl className="space-y-2">
        {groups.map((g) => (
          <div key={`${g.kind}-${g.ratePerPerson}`} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {kindLabel[g.kind]} · {g.count} night{g.count > 1 ? "s" : ""} × {formatINR(g.ratePerPerson)} × {regular}{" "}
              guest{regular > 1 ? "s" : ""}
              {extra > 0 && ` + ${extra} extra × ${formatINR(quote.nights[0].extraRate)}`}
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
