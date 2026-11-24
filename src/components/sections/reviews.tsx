"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { reviews, site } from "@/config/site";
import { GoogleIcon } from "@/components/ui/social-icons";
import { SectionHeading } from "./section-heading";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={i < Math.round(value) ? "size-4 fill-sunset text-sunset" : "size-4 text-sunset/40"}
        />
      ))}
    </span>
  );
}

/** Only renders real reviews and a real rating from config; hidden otherwise. */
export function Reviews() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  const rating = site.googleRating;
  if (reviews.length === 0 && !rating) return null;
  const r = reviews[i];

  return (
    <section aria-labelledby="reviews-title" className="py-20 md:py-28">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading id="reviews-title" eyebrow="Guests" title="What our guests say" />
          {rating && (
            <a
              href={site.socials.googleReviews || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-10 inline-flex min-h-11 items-center gap-3 rounded-full bg-card px-5 py-2 ring-1 ring-ink/10 md:mb-14"
            >
              <GoogleIcon className="size-5" />
              <span className="font-semibold">{rating.rating.toFixed(1)}</span>
              <Stars value={rating.rating} />
              <span className="text-sm text-muted-foreground">({rating.count} Google reviews)</span>
            </a>
          )}
        </div>

        {r && (
          <div className="relative mx-auto max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.figure
                key={i}
                initial={reduce ? false : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -30 }}
                transition={{ duration: 0.4 }}
                className="rounded-3xl bg-card p-8 ring-1 ring-ink/5 md:p-12"
              >
                <Stars value={r.rating} />
                <blockquote className="mt-4 font-heading text-2xl leading-snug md:text-3xl">“{r.text}”</blockquote>
                <figcaption className="mt-6 text-muted-foreground">
                  — {r.author}
                  {r.date && <span>, {r.date}</span>}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
            {reviews.length > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Previous review"
                  onClick={() => setI((i - 1 + reviews.length) % reviews.length)}
                  className="inline-flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 hover:bg-muted"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
                  {i + 1} / {reviews.length}
                </span>
                <button
                  type="button"
                  aria-label="Next review"
                  onClick={() => setI((i + 1) % reviews.length)}
                  className="inline-flex size-11 items-center justify-center rounded-full ring-1 ring-ink/15 hover:bg-muted"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
