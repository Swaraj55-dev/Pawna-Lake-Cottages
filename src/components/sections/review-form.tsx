"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Star } from "lucide-react";
import { cottages } from "@/config/site";

export function ReviewForm() {
  const [rating, setRating] = useState(5);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name") ?? ""),
      cottage: String(data.get("cottage") ?? ""),
      rating,
      review: String(data.get("review") ?? ""),
      website: String(data.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof result?.message === "string" ? result.message : "We couldn't submit your review. Please try again.");
      }
      setMessage({
        kind: "success",
        text: typeof result?.message === "string" ? result.message : "Thanks! Your review was sent for approval.",
      });
      form.reset();
      setRating(5);
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "We couldn't submit your review. Please try again.",
      });
    } finally {
      setPending(false);
    }
  };

  if (message?.kind === "success") {
    return (
      <p role="status" className="rounded-2xl bg-forest/10 p-5 font-medium text-forest ring-1 ring-forest/15">
        {message.text}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-3xl bg-card p-6 ring-1 ring-ink/5 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-semibold">
          Your name
          <input name="name" required minLength={2} maxLength={80} autoComplete="name" className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base font-normal" />
        </label>
        <label className="space-y-1.5 text-sm font-semibold">
          Which cottage did you stay in?
          <select name="cottage" required defaultValue="aroma" className="h-12 w-full rounded-xl border border-input bg-card px-4 text-base font-normal">
            {cottages.map((cottage) => (
              <option key={cottage.slug} value={cottage.slug}>{cottage.name}</option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Your rating</legend>
        <div className="mt-2 flex gap-2">
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1;
            return (
              <label key={value} className="cursor-pointer rounded-lg p-1 text-sunset focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lake">
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                />
                <Star className={`size-7 ${value <= rating ? "fill-sunset text-sunset" : "text-ink/25"}`} aria-hidden />
                <span className="sr-only">{value} star{value === 1 ? "" : "s"}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="space-y-1.5 text-sm font-semibold">
        Tell us about your stay
        <textarea
          name="review"
          required
          maxLength={60}
          rows={5}
          aria-describedby="review-length-hint"
          placeholder="What did you enjoy? What would you tell someone planning a visit?"
          className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base font-normal"
        />
        <span id="review-length-hint" className="block text-xs font-normal text-muted-foreground">
          Maximum 60 characters.
        </span>
      </label>

      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="sr-only" />
      {message?.kind === "error" && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {message.text}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sunset px-6 font-semibold text-ink hover:bg-[#f5b673] disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? "Sending review…" : "Submit review"}
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Reviews are checked by our team before they appear publicly.</p>
      </div>
    </form>
  );
}
