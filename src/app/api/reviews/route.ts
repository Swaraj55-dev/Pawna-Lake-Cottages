import { NextResponse } from "next/server";
import { AppError, errorResponse, noStore } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { guestReviewSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      throw new AppError("REVIEWS_UNAVAILABLE", "Guest reviews are temporarily unavailable.", 503);
    }
    if (!rateLimit(`reviews-read:${clientIp(request)}`, 60, 10 * 60_000)) {
      throw new AppError("RATE_LIMITED", "Please wait a moment before loading reviews again.", 429);
    }

    const { data, error } = await getServiceClient()
      .from("guest_reviews")
      .select("id, name, cottage_slug, rating, review, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(`published reviews query failed: ${error.message}`);

    return NextResponse.json({ reviews: data ?? [] }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!rateLimit(`review-submit:${clientIp(request)}`, 3, 60 * 60_000)) {
      throw new AppError("RATE_LIMITED", "Too many review submissions. Please try again later.", 429);
    }

    const raw = await request.json().catch(() => null);
    if (raw && typeof raw === "object" && typeof raw.website === "string" && raw.website.length > 0) {
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    const review = guestReviewSchema.parse(raw);
    if (!isSupabaseConfigured()) {
      throw new AppError("REVIEWS_UNAVAILABLE", "Review submissions are not available right now.", 503);
    }

    const { error } = await getServiceClient().from("guest_reviews").insert({
      name: review.name,
      cottage_slug: review.cottage,
      rating: review.rating,
      review: review.review,
      status: "pending",
    });
    if (error) throw new Error(`guest review insert failed: ${error.message}`);

    return NextResponse.json(
      { ok: true, message: "Thanks for sharing your experience. Your review is waiting for approval before it appears publicly." },
      { status: 201, headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
