"use client";

import { useMemo, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { site, type CottageSlug } from "@/config/site";
import { addDays, dateToISO, diffDays, eachNight, isoToDate, todayIST, type ISODate } from "@/lib/dates";
import { useAvailability, useMediaQuery } from "./hooks";
import { WhatsAppFallback } from "./whatsapp-fallback";

const monthKey = (d: Date) => format(d, "yyyy-MM");

export function StepDates({
  type,
  checkIn,
  checkOut,
  onChange,
}: {
  type: CottageSlug;
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  onChange: (checkIn: ISODate | null, checkOut: ISODate | null) => void;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const today = todayIST();
  const lastDay = addDays(today, site.bookingWindowDays);
  const [month, setMonth] = useState<Date>(() => startOfMonth(isoToDate(checkIn ?? today)));
  const [message, setMessage] = useState<string | null>(null);

  const months = useMemo(
    () => (wide ? [monthKey(month), monthKey(addMonths(month, 1))] : [monthKey(month)]),
    [wide, month],
  );
  const { byDate, error, loading } = useAvailability(type, months);

  const isFull = (iso: ISODate) => byDate[iso]?.status === "full";
  const firstFullNight = (from: ISODate, to: ISODate) => eachNight(from, to).find(isFull);

  const selected: DateRange | undefined = checkIn
    ? { from: isoToDate(checkIn), to: checkOut ? isoToDate(checkOut) : undefined }
    : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    setMessage(null);
    if (!range?.from) return onChange(null, null);
    const from = dateToISO(range.from);
    const to = range.to ? dateToISO(range.to) : null;

    if (isFull(from)) {
      setMessage(`${format(range.from, "EEE d MMM")} is fully booked — please choose another check-in date.`);
      return onChange(null, null);
    }
    if (!to || to === from) return onChange(from, null);

    const nights = diffDays(from, to);
    if (nights > site.maxNights) {
      setMessage(`Online bookings are up to ${site.maxNights} nights. For longer stays, message us on WhatsApp.`);
      return onChange(from, null);
    }
    const blocked = firstFullNight(from, to);
    if (blocked) {
      setMessage(
        `The night of ${format(isoToDate(blocked), "EEE d MMM")} is fully booked, so this stay isn't available. Try other dates.`,
      );
      return onChange(from, null);
    }
    onChange(from, to);
  };

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  return (
    <div className="space-y-5">
      {error && (
        <WhatsAppFallback
          tone="warning"
          title="Live availability isn't available right now"
          message={`${error.message} You can still pick your dates and send them to us.`}
        />
      )}

      <div className="relative overflow-x-auto rounded-3xl bg-card p-3 ring-1 ring-ink/5 sm:p-5">
        <Calendar
          mode="range"
          resetOnSelect
          numberOfMonths={wide ? 2 : 1}
          month={month}
          onMonthChange={setMonth}
          startMonth={startOfMonth(isoToDate(today))}
          endMonth={isoToDate(lastDay)}
          selected={selected}
          onSelect={handleSelect}
          disabled={[{ before: isoToDate(today) }, { after: isoToDate(lastDay) }]}
          modifiers={{
            full: (d) => isFull(dateToISO(d)),
            limited: (d) => byDate[dateToISO(d)]?.status === "limited",
          }}
          modifiersClassNames={{
            full: "[&_button]:line-through [&_button]:decoration-destructive/70 [&_button]:text-muted-foreground",
            limited:
              "[&_button]:after:absolute [&_button]:after:bottom-1.5 [&_button]:after:size-1 [&_button]:after:rounded-full [&_button]:after:bg-sunset-deep",
          }}
          className="mx-auto bg-transparent p-0 [--cell-size:--spacing(11)]"
          labels={{
            labelDayButton: (date, mods) => {
              const iso = dateToISO(date);
              const a = byDate[iso];
              let s = format(date, "EEEE, d MMMM yyyy");
              if (mods.today) s = `Today, ${s}`;
              if (a?.status === "full") s += " — fully booked";
              else if (a?.status === "limited") s += ` — only ${a.available} left`;
              if (mods.selected) s += ", selected";
              return s;
            },
          }}
        />
        {loading && (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking availability…
          </span>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground" aria-label="Calendar legend">
        <li className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-lake" aria-hidden /> Selected
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-sunset-deep" aria-hidden /> Few left
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="line-through decoration-destructive/70" aria-hidden>
            12
          </span>
          Fully booked
        </li>
        <li>
          Check-in {site.checkIn} · Check-out {site.checkOut}
        </li>
      </ul>

      <div aria-live="polite" className="min-h-6">
        {message ? (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{message}</p>
        ) : checkIn && !checkOut ? (
          <p className="text-sm text-muted-foreground">
            Check-in <strong className="text-ink">{format(isoToDate(checkIn), "EEE d MMM")}</strong> — now choose your
            check-out date.
          </p>
        ) : checkIn && checkOut ? (
          <p className="text-sm">
            <strong>{format(isoToDate(checkIn), "EEE d MMM")}</strong> →{" "}
            <strong>{format(isoToDate(checkOut), "EEE d MMM yyyy")}</strong> · {nights} night{nights > 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Select your check-in date, then your check-out date.</p>
        )}
      </div>
    </div>
  );
}

/** Lowest units free across the stay from the cached availability (null = unknown). */
export function unitsLeftFrom(byDate: Record<ISODate, { available: number }>, checkIn: ISODate, checkOut: ISODate) {
  const vals = eachNight(checkIn, checkOut).map((d) => byDate[d]?.available);
  if (vals.some((v) => v === undefined)) return null;
  return Math.min(...(vals as number[]));
}
