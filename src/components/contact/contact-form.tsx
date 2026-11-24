"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/lib/validation";
import { ApiError, apiFetch } from "@/components/booking/api";
import { WhatsAppFallback } from "@/components/booking/whatsapp-fallback";

const cls = "h-12 rounded-xl bg-card px-4 text-base";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema), mode: "onTouched" });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await apiFetch("/api/contact", { method: "POST", body: JSON.stringify(values) });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("SERVER_ERROR", "Something went wrong.", 500));
    }
  });

  if (sent) {
    return (
      <div role="status" className="space-y-3 rounded-3xl bg-card p-8 text-center ring-1 ring-ink/5">
        <CheckCircle2 className="mx-auto size-12 text-forest" aria-hidden />
        <p className="font-heading text-2xl">Thank you — message sent!</p>
        <p className="text-muted-foreground">We&apos;ll get back to you soon. For anything urgent, WhatsApp or call us.</p>
      </div>
    );
  }

  const err = (k: keyof ContactInput) =>
    errors[k] ? (
      <p id={`c-${k}-error`} className="text-sm font-medium text-destructive">
        {errors[k]?.message}
      </p>
    ) : null;
  const a11y = (k: keyof ContactInput) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `c-${k}-error` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl bg-card p-6 ring-1 ring-ink/5 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="c-name" className="text-sm font-semibold">Name</label>
          <Input id="c-name" autoComplete="name" className={cls} {...a11y("name")} {...register("name")} />
          {err("name")}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="c-phone" className="text-sm font-semibold">Phone (optional)</label>
          <Input id="c-phone" type="tel" autoComplete="tel" className={cls} {...a11y("phone")} {...register("phone")} />
          {err("phone")}
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="c-email" className="text-sm font-semibold">Email</label>
        <Input id="c-email" type="email" autoComplete="email" className={cls} {...a11y("email")} {...register("email")} />
        {err("email")}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="c-message" className="text-sm font-semibold">Message</label>
        <Textarea id="c-message" rows={5} className="rounded-xl bg-card px-4 py-3 text-base" placeholder="Dates you have in mind, group size, questions…" {...a11y("message")} {...register("message")} />
        {err("message")}
      </div>
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>
      {error &&
        (error.status === 503 || error.status >= 500 ? (
          <WhatsAppFallback tone="warning" title="We couldn't send your message" message={error.message} />
        ) : (
          <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error.message}
          </p>
        ))}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lake px-7 font-semibold text-sand hover:bg-lake-deep disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />} Send message
      </button>
    </form>
  );
}
