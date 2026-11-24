"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { CottageSlug } from "@/config/site";
import { formatINR } from "@/lib/format";
import { guestDetailsSchema, type GuestDetailsInput, type StayRequest } from "@/lib/validation";
import { useProvideEnquiry } from "@/components/contact/enquiry-store";
import { ApiError, apiFetch } from "./api";
import { useQuote } from "./hooks";
import { BookingProgress, STEPS } from "./progress";
import { StepCottage } from "./step-cottage";
import { StepDates } from "./step-dates";
import { StepGuests } from "./step-guests";
import { DETAILS_FORM_ID, StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { SummaryBar, SummaryCard, type PrimaryAction } from "./summary";
import { WhatsAppFallback } from "./whatsapp-fallback";
import { EMPTY_DRAFT, type BookCottage, type Draft } from "./types";

const STORAGE_KEY = "pwn-booking-draft-v1";
const TITLES = ["Choose your cottage", "Pick your dates", "Guests & cottages", "Your details", "Review & pay"];

function readStoredDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Draft) } : null;
  } catch {
    return null;
  }
}

/** Highest step the current draft is allowed to be on. */
function maxValidStep(d: Draft, cottage?: BookCottage): number {
  if (!d.type || !cottage) return 0;
  if (!d.checkIn || !d.checkOut) return 1;
  if (d.guests < d.cottages || d.guests > cottage.maxGuests * d.cottages) return 2;
  if (!d.details || !guestDetailsSchema.safeParse(d.details).success) return 3;
  return 4;
}

export function BookingFlow({ cottages }: { cottages: BookCottage[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [pay, setPay] = useState<{ busy: boolean; error: ApiError | null }>({ busy: false, error: null });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const cottage = cottages.find((c) => c.slug === draft?.type);

  /* ---------------- init: restore draft + ?type / ?step from the URL ---------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stored = readStoredDraft() ?? EMPTY_DRAFT;
    const t = params.get("type");
    const typeParam = cottages.some((c) => c.slug === t) ? (t as CottageSlug) : null;
    const init: Draft = typeParam && typeParam !== stored.type ? { ...EMPTY_DRAFT, details: stored.details, type: typeParam } : stored;
    const c = cottages.find((x) => x.slug === init.type);
    const valid = maxValidStep(init, c);
    const requested = Number(params.get("step") ?? "") - 1;
    const start = Number.isInteger(requested) && requested >= 0 ? Math.min(requested, valid) : typeParam ? Math.min(1, valid) : 0;

    // Seed history so the browser Back button walks back through the steps.
    const url = new URL(window.location.href);
    url.searchParams.delete("step");
    window.history.replaceState({ bookingStep: 0 }, "", url);
    if (start > 0) {
      url.searchParams.set("step", String(start + 1));
      window.history.pushState({ bookingStep: start }, "", url);
    }
    // One-time hydration from browser-only state (sessionStorage / URL).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(init);
    setStep(start);
    setMaxReached(valid);
  }, [cottages]);

  /* ---------------- persist draft for this tab ---------------- */
  useEffect(() => {
    if (!draft) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* private mode etc. */
    }
  }, [draft]);

  /* ---------------- browser back / forward ---------------- */
  const validStep = draft ? maxValidStep(draft, cottage) : 0;
  const validRef = useRef(validStep);
  useEffect(() => {
    validRef.current = validStep;
  }, [validStep]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = e.state?.bookingStep;
      if (typeof s === "number") setStep(Math.min(s, validRef.current));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* ---------------- focus the step heading on change (a11y) ---------------- */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    const top = topRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 96, behavior: "smooth" });
  }, [step]);

  const goTo = useCallback(
    (n: number) => {
      setStep(n);
      setMaxReached((m) => Math.max(m, n));
      setPay({ busy: false, error: null });
      const url = new URL(window.location.href);
      if (n === 0) url.searchParams.delete("step");
      else url.searchParams.set("step", String(n + 1));
      window.history.pushState({ bookingStep: n }, "", url);
    },
    [],
  );

  const update = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  /* ---------------- live server quote ---------------- */
  const stay: StayRequest | null =
    draft?.type && draft.checkIn && draft.checkOut
      ? { type: draft.type, checkIn: draft.checkIn, checkOut: draft.checkOut, guests: draft.guests, cottages: draft.cottages }
      : null;
  const quote = useQuote(step >= 1 ? stay : null);

  /* ---------------- WhatsApp prefill everywhere ---------------- */
  useProvideEnquiry({
    cottageName: cottage?.name,
    checkIn: draft?.checkIn,
    checkOut: draft?.checkOut,
    guests: draft?.checkIn ? draft.guests : undefined,
    cottages: draft?.cottages,
    name: draft?.details?.name || undefined,
  });

  /* ---------------- payment (Razorpay wired in Phase 7) ---------------- */
  const startPayment = async () => {
    if (!stay || !draft?.details) return;
    setPay({ busy: true, error: null });
    try {
      const details = guestDetailsSchema.parse(draft.details);
      const res = await apiFetch<{ bookingId: string }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ stay, details }),
      });
      router.push(`/book/success/${res.bookingId}`);
    } catch (e) {
      setPay({
        busy: false,
        error: e instanceof ApiError ? e : new ApiError("SERVER_ERROR", "We couldn't start the payment.", 500),
      });
      quote.refresh();
    }
  };

  const action: PrimaryAction = useMemo(() => {
    if (!draft) return { label: "Continue", disabled: true };
    switch (step) {
      case 0:
        return { label: "Choose dates", disabled: !draft.type, onClick: () => goTo(1) };
      case 1:
        return { label: "Continue", disabled: !(draft.checkIn && draft.checkOut), onClick: () => goTo(2) };
      case 2:
        return {
          label: "Continue",
          disabled: validStep < 3 || (quote.data ? !quote.data.available : false),
          onClick: () => goTo(3),
        };
      case 3:
        return { label: "Review booking", form: DETAILS_FORM_ID };
      default:
        return {
          label: quote.data ? `Pay ${formatINR(quote.data.quote.advance)} securely` : "Pay securely",
          disabled: !quote.data || !quote.data.available || quote.loading,
          busy: pay.busy,
          onClick: startPayment,
        };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, step, quote.data, quote.loading, pay.busy, validStep, goTo]);

  if (!draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground" role="status">
        <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> Loading booking…
      </div>
    );
  }

  const reachable = Math.min(maxReached, validStep);

  return (
    <div ref={topRef} className="scroll-mt-28">
      <BookingProgress step={step} maxReached={reachable} onStep={goTo} />

      <div className="grid gap-10 pb-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
        <section aria-labelledby="step-title">
          <h2 id="step-title" ref={headingRef} tabIndex={-1} className="mb-6 text-3xl outline-none md:text-4xl">
            <span className="sr-only">
              Step {step + 1} of {STEPS.length}:{" "}
            </span>
            {TITLES[step]}
          </h2>

          {step === 0 && (
            <StepCottage
              cottages={cottages}
              value={draft.type}
              onChange={(slug) => {
                if (slug !== draft.type) {
                  const c = cottages.find((x) => x.slug === slug)!;
                  update({ type: slug, cottages: 1, guests: Math.min(draft.guests, c.maxGuests) });
                  setMaxReached(1);
                }
                goTo(1);
              }}
            />
          )}

          {step === 1 && draft.type && (
            <StepDates
              type={draft.type}
              checkIn={draft.checkIn}
              checkOut={draft.checkOut}
              onChange={(checkIn, checkOut) => update({ checkIn, checkOut })}
            />
          )}

          {step === 2 && cottage && draft.checkIn && draft.checkOut && (
            <StepGuests
              cottage={cottage}
              checkIn={draft.checkIn}
              checkOut={draft.checkOut}
              guests={draft.guests}
              cottagesCount={draft.cottages}
              onChange={(guests, n) => update({ guests, cottages: n })}
            />
          )}

          {step === 3 && (
            <StepDetails
              defaultValues={draft.details}
              onChange={(v) => update({ details: { ...draft.details, ...v } })}
              onValid={(_raw, parsed) => {
                // store the normalised values (e.g. phone -> 10 digits) that the server will see
                update({ details: parsed });
                goTo(4);
              }}
            />
          )}

          {step === 4 && cottage && draft.checkIn && draft.checkOut && draft.details && (
            <StepReview
              cottage={cottage}
              draft={{ ...draft, checkIn: draft.checkIn, checkOut: draft.checkOut, details: draft.details as GuestDetailsInput }}
              quote={quote.data}
              quoteError={quote.error}
              quoteLoading={quote.loading}
              payError={pay.error}
              onEdit={goTo}
            />
          )}

          {step >= 1 && step <= 2 && quote.error?.code === "PRICE_NOT_SET" && (
            <div className="mt-6">
              <WhatsAppFallback title="Online booking opens soon" message={quote.error.message} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-6">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-lake hover:bg-lake/5"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}
            <WhatsAppFallback compact />
          </div>
        </section>

        <div className="hidden lg:block">
          <SummaryCard cottage={cottage} draft={draft} quote={quote.data} action={action} />
        </div>
      </div>

      <SummaryBar cottage={cottage} quote={quote.data} action={action} />
    </div>
  );
}
