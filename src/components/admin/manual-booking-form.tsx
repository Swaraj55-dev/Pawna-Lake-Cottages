"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { checkStay, createManualBooking, type ActionState } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const input = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base sm:text-sm aria-invalid:border-destructive";

function F({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function ManualBookingForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createManualBooking, { ok: false });
  const [stay, setStay] = useState({ type: "aroma", checkIn: "", checkOut: "", guests: 2, cottages: 1 });
  const [check, setCheck] = useState<{ key: string; unitsLeft: number | null; standardTotal: number | null } | null>(null);
  const key = JSON.stringify(stay);
  const ready = stay.checkIn && stay.checkOut && stay.checkOut > stay.checkIn;

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      checkStay(stay).then((r) => setCheck({ key, ...r }));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const e = state.fieldErrors ?? {};
  const v = (k: string, d = "") => state.values?.[k] ?? d;
  const aria = (n: string) => ({ "aria-invalid": !!e[n], "aria-describedby": e[n] ? `${n}-error` : undefined });
  const live = check && check.key === key ? check : null;

  if (state.ok && state.data) {
    return (
      <div role="status" className="max-w-xl space-y-4 rounded-3xl bg-card p-8 ring-1 ring-ink/5">
        <CheckCircle2 className="size-10 text-forest" aria-hidden />
        <p className="text-2xl font-heading">{state.message}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin?q=${state.data.code}`} className="inline-flex min-h-11 items-center rounded-full bg-lake px-5 font-semibold text-sand">
            View booking
          </Link>
          <a href="/admin/new" className="inline-flex min-h-11 items-center rounded-full border border-lake/30 px-5 font-semibold text-lake">
            Add another
          </a>
        </div>
      </div>
    );
  }

  return (
    <form key={state.nonce ?? "initial"} action={action} noValidate className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <fieldset className="grid gap-4 rounded-3xl bg-card p-6 ring-1 ring-ink/5 sm:grid-cols-2">
          <legend className="sr-only">Stay</legend>
          <F label="Cottage" name="type" error={e.type}>
            <select id="type" name="type" value={stay.type} onChange={(ev) => setStay({ ...stay, type: ev.target.value })} className={input}>
              <option value="aroma">Aroma Cottage</option>
              <option value="bella">Bella Cottage</option>
            </select>
          </F>
          <F label="Booked via" name="source" error={e.source}>
            <select id="source" name="source" defaultValue={v("source", "whatsapp")} className={input}>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </F>
          <F label="Check-in" name="checkIn" error={e.checkIn}>
            <input id="checkIn" name="checkIn" type="date" min={today} required value={stay.checkIn} onChange={(ev) => setStay({ ...stay, checkIn: ev.target.value })} className={input} {...aria("checkIn")} />
          </F>
          <F label="Check-out" name="checkOut" error={e.checkOut}>
            <input id="checkOut" name="checkOut" type="date" min={stay.checkIn || today} required value={stay.checkOut} onChange={(ev) => setStay({ ...stay, checkOut: ev.target.value })} className={input} {...aria("checkOut")} />
          </F>
          <F label="Guests" name="guests" error={e.guests}>
            <input id="guests" name="guests" type="number" min={1} max={60} value={stay.guests} onChange={(ev) => setStay({ ...stay, guests: Number(ev.target.value) })} className={input} {...aria("guests")} />
          </F>
          <F label="Cottages" name="cottages" error={e.cottages}>
            <input id="cottages" name="cottages" type="number" min={1} max={20} value={stay.cottages} onChange={(ev) => setStay({ ...stay, cottages: Number(ev.target.value) })} className={input} {...aria("cottages")} />
          </F>
        </fieldset>

        <fieldset className="grid gap-4 rounded-3xl bg-card p-6 ring-1 ring-ink/5 sm:grid-cols-2">
          <legend className="sr-only">Guest</legend>
          <F label="Guest name" name="name" error={e.name}>
            <input id="name" name="name" autoComplete="off" required defaultValue={v("name")} className={input} {...aria("name")} />
          </F>
          <F label="Mobile" name="phone" error={e.phone}>
            <input id="phone" name="phone" type="tel" inputMode="numeric" required defaultValue={v("phone")} className={input} {...aria("phone")} />
          </F>
          <F label="Email (optional)" name="email" error={e.email}>
            <input id="email" name="email" type="email" defaultValue={v("email")} className={input} {...aria("email")} />
          </F>
          <F label="Food preference" name="foodPref" error={e.foodPref}>
            <select id="foodPref" name="foodPref" defaultValue={v("foodPref")} className={input}>
              <option value="">—</option>
              <option value="veg">Veg</option>
              <option value="non_veg">Non-veg</option>
              <option value="jain">Jain</option>
            </select>
          </F>
          <div className="sm:col-span-2">
            <F label="Notes" name="notes" error={e.notes}>
              <textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={v("notes")} className={cn(input, "h-auto py-2")} />
            </F>
          </div>
        </fieldset>
      </div>

      <aside className="space-y-4 self-start rounded-3xl bg-card p-6 ring-1 ring-ink/5 lg:sticky lg:top-24">
        <div aria-live="polite" className="min-h-12 rounded-2xl bg-muted p-4 text-sm">
          {!ready ? (
            <p className="text-muted-foreground">Pick dates to check availability.</p>
          ) : !live ? (
            <p className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Checking…
            </p>
          ) : (
            <>
              <p className={cn("font-semibold", live.unitsLeft !== null && live.unitsLeft < stay.cottages ? "text-destructive" : "text-forest")}>
                {live.unitsLeft === null ? "Availability unknown" : `${live.unitsLeft} cottage${live.unitsLeft === 1 ? "" : "s"} free for these dates`}
              </p>
              <p className="text-muted-foreground">
                Standard price: {live.standardTotal !== null ? fmt(live.standardTotal) : "not set"}
              </p>
            </>
          )}
        </div>
        <F label="Total agreed (₹)" name="total" error={e.total} hint="Leave blank to use the standard price.">
          <input id="total" name="total" type="number" min={0} inputMode="numeric" placeholder={live?.standardTotal != null ? String(live.standardTotal) : ""} defaultValue={v("total")} className={input} {...aria("total")} />
        </F>
        <F label="Amount already paid (₹)" name="paid" error={e.paid}>
          <input id="paid" name="paid" type="number" min={0} inputMode="numeric" defaultValue={v("paid", "0")} className={input} {...aria("paid")} />
        </F>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="sendEmail" defaultChecked={v("sendEmail") === "on"} className="mt-0.5 size-4 accent-[#0E3B43]" />
          Email the confirmation to the guest
        </label>
        {state.message && !state.ok && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-sunset font-semibold text-ink hover:bg-[#f5b673] disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Create confirmed booking
        </button>
        <p className="text-xs text-muted-foreground">Availability is re-checked when you save, so double-bookings are impossible.</p>
      </aside>
    </form>
  );
}
