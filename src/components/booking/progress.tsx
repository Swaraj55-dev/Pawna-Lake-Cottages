"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEPS = ["Cottage", "Dates", "Guests", "Details", "Pay"] as const;

export function BookingProgress({
  step,
  maxReached,
  onStep,
}: {
  step: number;
  maxReached: number;
  onStep: (i: number) => void;
}) {
  return (
    <nav aria-label="Booking progress" className="mb-8">
      <p className="mb-3 text-sm font-medium text-muted-foreground sm:hidden">
        Step {step + 1} of {STEPS.length}: <span className="text-ink">{STEPS[step]}</span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10 sm:hidden" aria-hidden>
        <div
          className="h-full rounded-full bg-sunset transition-[width] duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          const reachable = i <= maxReached && !current;
          return (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                onClick={() => reachable && onStep(i)}
                disabled={!reachable}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-sm font-semibold transition-colors",
                  current ? "text-ink" : done ? "text-lake hover:text-lake-deep" : "text-muted-foreground",
                  !reachable && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full text-sm",
                    current && "bg-sunset text-ink",
                    done && "bg-lake text-sand",
                    !current && !done && "bg-ink/10",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                {label}
                {done && <span className="sr-only">(completed)</span>}
              </button>
              {i < STEPS.length - 1 && (
                <span aria-hidden className={cn("h-px flex-1", i < step ? "bg-lake" : "bg-ink/15")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
