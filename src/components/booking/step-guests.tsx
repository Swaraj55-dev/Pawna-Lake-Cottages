"use client";

import { useMemo } from "react";
import { BedDouble, Minus, Plus, Users } from "lucide-react";
import { addDays, type ISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useAvailability } from "./hooks";
import { unitsLeftFrom } from "./step-dates";
import type { BookCottage } from "./types";

function Stepper({
  label,
  hint,
  icon: Icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  icon: typeof Users;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-ink/5">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-lake/10 text-lake">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p id={`${id}-label`} className="font-semibold">
            {label}
          </p>
          {hint && (
            <p id={`${id}-hint`} className="text-sm text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
      </div>
      <div role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="inline-flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 hover:bg-muted disabled:opacity-35"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <output aria-live="polite" className="w-8 text-center text-xl font-semibold tabular-nums">
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="inline-flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 hover:bg-muted disabled:opacity-35"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Months (YYYY-MM) touched by the nights of a stay. */
function stayMonths(checkIn: ISODate, checkOut: ISODate) {
  const last = addDays(checkOut, -1);
  const out = new Set([checkIn.slice(0, 7), last.slice(0, 7)]);
  return [...out];
}

export function useUnitsLeft(cottage: BookCottage, checkIn: ISODate, checkOut: ISODate) {
  const months = useMemo(() => stayMonths(checkIn, checkOut), [checkIn, checkOut]);
  const { byDate, error } = useAvailability(cottage.slug, months);
  const left = unitsLeftFrom(byDate, checkIn, checkOut);
  // Unknown (loading / not configured) -> allow up to the total; server re-checks anyway.
  return { unitsLeft: left ?? cottage.unitsAvailable, known: left !== null, error };
}

export function StepGuests({
  cottage,
  checkIn,
  checkOut,
  guests,
  cottagesCount,
  onChange,
}: {
  cottage: BookCottage;
  checkIn: ISODate;
  checkOut: ISODate;
  guests: number;
  cottagesCount: number;
  onChange: (guests: number, cottages: number) => void;
}) {
  const { unitsLeft, known } = useUnitsLeft(cottage, checkIn, checkOut);
  const maxCottages = Math.max(1, unitsLeft);
  const maxGuests = cottage.maxGuests * cottagesCount;

  const setCottages = (n: number) => {
    const c = Math.min(Math.max(n, 1), maxCottages);
    onChange(Math.min(Math.max(guests, c), cottage.maxGuests * c), c);
  };

  return (
    <div className="space-y-4">
      <Stepper
        label="Guests"
        hint={`Up to ${cottage.maxGuests} per cottage`}
        icon={Users}
        value={guests}
        min={cottagesCount}
        max={maxGuests}
        onChange={(g) => onChange(g, cottagesCount)}
      />
      <Stepper
        label="Cottages"
        hint={known ? `${unitsLeft} ${cottage.name}${unitsLeft === 1 ? "" : "s"} left for your dates` : undefined}
        icon={BedDouble}
        value={cottagesCount}
        min={1}
        max={maxCottages}
        onChange={setCottages}
      />
      {guests >= maxGuests && cottagesCount < maxCottages && (
        <p className="rounded-xl bg-lake/5 px-4 py-3 text-sm text-muted-foreground">
          Travelling with more people?{" "}
          <button type="button" onClick={() => setCottages(cottagesCount + 1)} className="font-semibold text-lake underline underline-offset-4">
            Add another cottage
          </button>{" "}
          to fit up to {cottage.maxGuests * (cottagesCount + 1)} guests.
        </p>
      )}
      {known && unitsLeft === 0 && (
        <p role="alert" className={cn("rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive")}>
          These dates just sold out. Please go back and pick different dates.
        </p>
      )}
    </div>
  );
}
