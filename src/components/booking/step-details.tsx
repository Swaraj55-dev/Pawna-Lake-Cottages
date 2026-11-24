"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { guestDetailsSchema, type GuestDetails, type GuestDetailsInput } from "@/lib/validation";

export const DETAILS_FORM_ID = "guest-details";

const FOOD = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
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
  defaultValues,
  onValid,
  onChange,
}: {
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
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "", ...defaultValues, agree: defaultValues?.agree ?? undefined },
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
        name="foodPref"
        render={({ field }) => (
          <fieldset aria-describedby={errors.foodPref ? "foodPref-error" : undefined}>
            <legend className="mb-1.5 text-sm font-semibold">Food preference</legend>
            <div role="radiogroup" aria-label="Food preference" className="flex flex-wrap gap-2">
              {FOOD.map((f) => {
                const checked = field.value === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => field.onChange(f.value)}
                    onBlur={field.onBlur}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ring-1 transition-colors",
                      checked ? "bg-lake text-sand ring-lake" : "bg-card ring-ink/15 hover:bg-muted",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {errors.foodPref && (
              <p id="foodPref-error" className="mt-1.5 text-sm font-medium text-destructive">
                {errors.foodPref.message}
              </p>
            )}
          </fieldset>
        )}
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
