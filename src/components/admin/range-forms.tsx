"use client";

import { useActionState, useTransition, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  addBlockedDates,
  addPriceOverrides,
  deleteBlockedDates,
  deletePriceOverrides,
  type ActionState,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const input = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base sm:text-sm aria-invalid:border-destructive";

function Msg({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("text-sm font-medium", state.ok ? "text-forest" : "text-destructive")}>
      {state.message}
    </p>
  );
}

function RangeFields({
  today,
  errors,
  idPrefix,
  values,
}: {
  today: string;
  errors: Record<string, string>;
  idPrefix: string;
  values?: Record<string, string>;
}) {
  const [from, setFrom] = useState(values?.from ?? "");
  return (
    <>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Cottage</span>
        <select name="type" defaultValue={values?.type ?? "all"} className={input}>
          <option value="all">Both (Aroma + Bella)</option>
          <option value="aroma">Aroma</option>
          <option value="bella">Bella</option>
        </select>
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">From night</span>
        <input id={`${idPrefix}-from`} name="from" type="date" min={today} required value={from} onChange={(e) => setFrom(e.target.value)} className={input} aria-invalid={!!errors.from} />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">To night (inclusive)</span>
        <input name="to" type="date" min={from || today} required defaultValue={values?.to} className={input} aria-invalid={!!errors.to} />
        {errors.to && <span className="block text-sm font-medium text-destructive">{errors.to}</span>}
      </label>
    </>
  );
}

export function BlockForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addBlockedDates, { ok: false });
  const e = state.fieldErrors ?? {};
  return (
    <form key={state.nonce ?? "initial"} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RangeFields today={today} errors={e} idPrefix="block" values={state.values} />
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Units to block</span>
        <input name="units" type="number" min={1} placeholder="All units" defaultValue={state.values?.units} className={input} aria-invalid={!!e.units} />
      </label>
      <label className="space-y-1.5 text-sm sm:col-span-2">
        <span className="font-semibold">Reason (private)</span>
        <input name="reason" maxLength={200} placeholder="Maintenance, private event…" defaultValue={state.values?.reason} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lake px-5 text-sm font-semibold text-sand hover:bg-lake-deep disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Block dates
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function OverrideForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addPriceOverrides, { ok: false });
  const e = state.fieldErrors ?? {};
  return (
    <form key={state.nonce ?? "initial"} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RangeFields today={today} errors={e} idPrefix="price" values={state.values} />
      <label className="space-y-1.5 text-sm">
        <span className="font-semibold">Price per person / night (₹)</span>
        <input name="price" type="number" min={0} required inputMode="numeric" defaultValue={state.values?.price} className={input} aria-invalid={!!e.price} />
        {e.price && <span className="block text-sm font-medium text-destructive">{e.price}</span>}
      </label>
      <label className="space-y-1.5 text-sm sm:col-span-2">
        <span className="font-semibold">Label</span>
        <input name="label" maxLength={80} placeholder="Diwali, New Year’s Eve…" defaultValue={state.values?.label} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lake px-5 text-sm font-semibold text-sand hover:bg-lake-deep disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Set price
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function DeleteRange({ ids, kind, label }: { ids: string[]; kind: "block" | "price"; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const run = () =>
    start(async () => {
      const r = kind === "block" ? await deleteBlockedDates(ids) : await deletePriceOverrides(ids);
      if (!r.ok) setErr(r.message ?? "Failed");
      setConfirming(false);
    });
  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button type="button" onClick={run} disabled={pending} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-destructive px-3 text-xs font-semibold text-white">
          {pending && <Loader2 className="size-3 animate-spin" aria-hidden />} Remove
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-9 items-center rounded-full px-2 text-xs font-semibold hover:bg-muted">
          Cancel
        </button>
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${label}`}
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </>
  );
}
