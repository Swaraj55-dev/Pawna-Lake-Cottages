"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cottages, reviews as curatedReviews } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { ReviewForm } from "./review-form";

type ReviewApiRow = {
  id: string;
  name: string;
  cottage_slug: string;
  rating: number;
  review: string;
  created_at: string;
};

type PublishedReview = {
  id: string;
  author: string;
  text: string;
  rating: number;
  date?: string;
  cottage?: string;
};

function isReviewApiResponse(value: unknown): value is { reviews: ReviewApiRow[] } {
  if (!value || typeof value !== "object" || !("reviews" in value) || !Array.isArray(value.reviews)) return false;
  return value.reviews.every(
    (row: unknown) =>
      !!row &&
      typeof row === "object" &&
      "id" in row &&
      typeof row.id === "string" &&
      "name" in row &&
      typeof row.name === "string" &&
      "cottage_slug" in row &&
      typeof row.cottage_slug === "string" &&
      "rating" in row &&
      typeof row.rating === "number" &&
      row.rating >= 1 &&
      row.rating <= 5 &&
      "review" in row &&
      typeof row.review === "string" &&
      "created_at" in row &&
      typeof row.created_at === "string",
  );
}

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

export function Reviews() {
  const [submitted, setSubmitted] = useState<PublishedReview[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const reduce = useReducedMotion();
  const allReviews: PublishedReview[] = [
    ...submitted,
    ...curatedReviews.map((review, i) => ({
      id: `curated-${i}`,
      author: review.author,
      text: review.text,
      rating: review.rating,
      date: review.date,
    })),
  ];
  const active = allReviews[index];
  const average = allReviews.length
    ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
    : null;

  useEffect(() => {
    let activeRequest = true;
    fetch("/api/reviews", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(typeof result?.message === "string" ? result.message : "Reviews could not be loaded.");
        }
        if (!isReviewApiResponse(result)) throw new Error("Reviews could not be loaded.");
        return result.reviews;
      })
      .then((rows) => {
        if (!activeRequest) return;
        setSubmitted(
          rows.map((row) => ({
            id: row.id,
            author: row.name,
            text: row.review,
            rating: row.rating,
            date: new Date(row.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            cottage: cottages.find((cottage) => cottage.slug === row.cottage_slug)?.name,
          })),
        );
        setLoadError(false);
      })
      .catch(() => {
        if (activeRequest) setLoadError(true);
      });

    return () => {
      activeRequest = false;
    };
  }, []);

  return (
    <section aria-labelledby="reviews-title" className="bg-lake/5 py-20 md:py-28">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            id="reviews-title"
            eyebrow="Guest reviews"
            title="Stories from stays by the lake"
            intro="Every visit is different. Read what guests have shared, or tell us about your own stay."
          />
          <button
            type="button"
            aria-expanded={showForm}
            aria-controls="guest-review-form"
            onClick={() => setShowForm((open) => !open)}
            className="mb-10 inline-flex min-h-12 items-center rounded-full bg-lake px-6 font-semibold text-sand transition-colors hover:bg-lake-deep md:mb-14"
          >
            {showForm ? "Close form" : "Write a review"}
          </button>
        </div>

        {showForm && (
          <div id="guest-review-form" className="mb-10">
            <ReviewForm />
          </div>
        )}

        {active ? (
          <div className="relative mx-auto max-w-3xl">
            {average !== null && (
              <p className="mb-5 text-center text-sm text-muted-foreground">
                <strong className="text-ink">{average.toFixed(1)} / 5</strong> average from {allReviews.length} published guest
                {allReviews.length === 1 ? "" : "s"}
              </p>
            )}
            <AnimatePresence mode="wait">
              <motion.figure
                key={active.id}
                initial={reduce ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl bg-card p-7 shadow-sm ring-1 ring-ink/5 md:p-12"
              >
                <Stars value={active.rating} />
                <blockquote className="mt-4 font-heading text-2xl leading-snug md:text-3xl">
                  “{active.text}”
                </blockquote>
                <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-ink">
                    {active.author}
                    {active.cottage && <span className="font-normal text-muted-foreground"> · {active.cottage}</span>}
                  </span>
                  {active.date && <time>{active.date}</time>}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
            {allReviews.length > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Previous review"
                  onClick={() => setIndex((current) => (current - 1 + allReviews.length) % allReviews.length)}
                  className="inline-flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-ink/15 transition-colors hover:bg-muted"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
                  {index + 1} / {allReviews.length}
                </span>
                <button
                  type="button"
                  aria-label="Next review"
                  onClick={() => setIndex((current) => (current + 1) % allReviews.length)}
                  className="inline-flex size-11 items-center justify-center rounded-full bg-card ring-1 ring-ink/15 transition-colors hover:bg-muted"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl rounded-3xl bg-card p-8 text-center ring-1 ring-ink/5">
            <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-sunset/15 text-sunset-deep">
              <Star className="size-6" aria-hidden />
            </div>
            <h3 className="mt-4 font-heading text-2xl">Be the first to share a stay story</h3>
            <p className="mt-2 text-muted-foreground">
              We only show reviews guests have submitted and our team has approved.
            </p>
          </div>
        )}
        {loadError && (
          <p role="status" className="mx-auto mt-4 max-w-3xl text-center text-sm text-muted-foreground">
            Published reviews couldn&apos;t be loaded right now. Please try again later.
          </p>
        )}
      </div>
    </section>
  );
}
