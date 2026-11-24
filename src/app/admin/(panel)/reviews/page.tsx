import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getCottage } from "@/config/site";
import { ReviewModerationControls } from "@/components/admin/review-moderation-controls";
import { requireAdmin } from "@/lib/admin-auth";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { GuestReviewRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Guest reviews" };

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

async function PendingReviews() {
  await requireAdmin();

  if (!isSupabaseConfigured()) {
    return (
      <p className="rounded-3xl bg-card p-8 text-muted-foreground ring-1 ring-ink/5">
        Connect Supabase to review and moderate guest submissions.
      </p>
    );
  }

  const { data, error } = await getServiceClient()
    .from("guest_reviews")
    .select("id, name, cottage_slug, rating, review, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(101);
  if (error) throw new Error(`Pending guest reviews query failed: ${error.message}`);

  const rows = data ?? [];
  const hasMore = rows.length > 100;
  const pendingReviews = rows.slice(0, 100) as GuestReviewRow[];

  return (
    <>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {pendingReviews.length} pending review{pendingReviews.length === 1 ? "" : "s"}
        {hasMore ? " (showing the oldest 100)" : ""}
      </p>

      {pendingReviews.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-ink/5">
          <h2 className="font-heading text-2xl">You’re all caught up</h2>
          <p className="mt-2 text-muted-foreground">New guest submissions will appear here for approval.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pendingReviews.map((review) => (
            <li key={review.id} className="rounded-3xl bg-card p-6 ring-1 ring-ink/5">
              <article className="space-y-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{review.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getCottage(review.cottage_slug)?.name ?? review.cottage_slug} · {review.rating}/5 stars
                    </p>
                  </div>
                  <time dateTime={review.created_at} className="text-sm text-muted-foreground">
                    {dateFormatter.format(new Date(review.created_at))}
                  </time>
                </header>
                <p className="whitespace-pre-wrap leading-relaxed">{review.review}</p>
                <ReviewModerationControls id={review.id} />
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function AdminReviewsPage() {
  return (
    <section aria-labelledby="guest-reviews-title" className="space-y-6">
      <header>
        <h1 id="guest-reviews-title" className="font-heading text-3xl">Guest reviews</h1>
        <p className="mt-2 text-muted-foreground">
          Approve reviews to publish them on the homepage, or reject submissions that should not appear publicly.
        </p>
      </header>
      <Suspense
        fallback={
          <p className="flex items-center gap-2 py-16 text-muted-foreground" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Loading reviews…
          </p>
        }
      >
        <PendingReviews />
      </Suspense>
    </section>
  );
}
