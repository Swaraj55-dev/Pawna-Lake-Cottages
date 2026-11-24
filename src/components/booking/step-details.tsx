"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  guestDetailsSchemaForGuests,
  type GuestDetails,
  type GuestDetailsInput,
} from "@/lib/validation";

export const DETAILS_FORM_ID = "guest-details";

const FOOD = [
  { value: "veg", label: "Vegetarian" },
  { value: "nonVeg", label: "Non-vegetarian" },
  { value: "jain", label: "Jain" },
] as const;

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = "h-12 rounded-xl bg-card px-4 text-base";

export function StepDetails({
  guestCount,
  defaultValues,
  onValid,
  onChange,
}: {
  guestCount: number;
  defaultValues: Partial<GuestDetailsInput> | null;
  onValid: (values: GuestDetailsInput, parsed: GuestDetails) => void;
  onChange?: (values: Partial<GuestDetailsInput>) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<GuestDetailsInput, unknown, GuestDetails>({
    resolver: zodResolver(useMemo(() => guestDetailsSchemaForGuests(guestCount), [guestCount])),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      notes: "",
      ...defaultValues,
      foodCounts: defaultValues?.foodCounts ?? { veg: guestCount, nonVeg: 0, jain: 0 },
      agree: defaultValues?.agree ?? undefined,
    },
    mode: "onTouched",
  });

  const describedBy = (k: keyof GuestDetailsInput, hint = false) =>
    errors[k] ? `${k}-error` : hint ? `${k}-hint` : undefined;

  return (
    <form
      id={DETAILS_FORM_ID}
      noValidate
      onSubmit={handleSubmit((parsed) => onValid(getValues(), parsed))}
      onBlur={() => onChange?.(getValues())}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("name")}
            className={inputCls}
            {...register("name")}
          />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone?.message} hint="10-digit Indian mobile — we'll call or WhatsApp you here">
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
              +91
            </span>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-invalid={!!errors.phone}
              aria-describedby={describedBy("phone", true)}
              className={cn(inputCls, "rounded-l-none")}
              {...register("phone")}
            />
          </div>
        </Field>
      </div>

      <Field id="email" label="Email" error={errors.email?.message} hint="Your booking confirmation is sent here">
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={describedBy("email", true)}
          className={inputCls}
          {...register("email")}
        />
      </Field>

      <Controller
        control={control}
        name="foodCounts"
        render={({ field }) => {
          const counts = field.value ?? { veg: guestCount, nonVeg: 0, jain: 0 };
          const selected = counts.veg + counts.nonVeg + counts.jain;
          return (
            <fieldset aria-describedby={errors.foodCounts?.message ? "foodCounts-error" : "foodCounts-hint"}>
              <legend className="mb-1.5 text-sm font-semibold">Food preference by guest</legend>
              <p id="foodCounts-hint" className="mb-3 text-sm text-muted-foreground">
                Choose how many guests need each meal type. The total must match your {guestCount} guests.
              </p>
              <div className="space-y-2">
                {FOOD.map(({ value, label }) => (
                  <div key={value} className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4 ring-1 ring-ink/5">
                    <span className="font-medium">{label}</span>
                    <div role="group" aria-label={`${label} guests`} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange({ ...counts, [value]: counts[value] - 1 })}
                        onBlur={field.onBlur}
                        disabled={counts[value] <= 0}
                        aria-label={`Fewer ${label} guests`}
                        className="inline-flex size-10 items-center justify-center rounded-full ring-1 ring-ink/15 hover:bg-muted disabled:opacity-35"
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <output aria-live="polite" className="w-8 text-center text-lg font-semibold tabular-nums">
                        {counts[value]}
                      </output>
                      <button
                        type="button"
                        onClick={() => field.onChange({ ...counts, [value]: counts[value] + 1 })}
                        onBlur={field.onBlur}
                        disabled={selected >= guestCount}
                        aria-label={`More ${label} guests`}
                        className="inline-flex size-10 items-center justify-center rounded-full ring-1 ring-ink/15 hover:bg-muted disabled:opacity-35"
                      >
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
                {selected} of {guestCount} guests assigned
              </p>
              {errors.foodCounts?.message && (
                <p id="foodCounts-error" className="mt-1.5 text-sm font-medium text-destructive">
                  {errors.foodCounts.message}
                </p>
              )}
            </fieldset>
          );
        }}
      />

      <Field id="notes" label="Special requests (optional)" error={errors.notes?.message}>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Celebrating something? Arrival time, dietary needs…"
          aria-invalid={!!errors.notes}
          aria-describedby={describedBy("notes")}
          className="rounded-xl bg-card px-4 py-3 text-base"
          {...register("notes")}
        />
      </Field>

      <Controller
        control={control}
        name="agree"
        render={({ field }) => (
          <div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-ink/5">
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true ? true : undefined)}
                onBlur={field.onBlur}
                aria-invalid={!!errors.agree}
                aria-describedby={errors.agree ? "agree-error" : undefined}
                className="mt-0.5 size-5"
              />
              <span className="text-sm">
                I agree to the{" "}
                <Link href="/policies#cancellation" target="_blank" className="font-semibold text-lake underline underline-offset-4">
                  cancellation policy
                </Link>{" "}
                and house rules.
              </span>
            </label>
            {errors.agree && (
              <p id="agree-error" className="mt-1.5 text-sm font-medium text-destructive">
                {errors.agree.message}
              </p>
            )}
          </div>
        )}
      />
    </form>
  );
}
