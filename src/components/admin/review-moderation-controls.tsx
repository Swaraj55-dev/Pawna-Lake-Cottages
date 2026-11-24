"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { moderateGuestReview } from "@/app/admin/actions";
import type { GuestReviewStatus } from "@/lib/supabase/types";

export function ReviewModerationControls({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const moderate = (status: Extract<GuestReviewStatus, "approved" | "rejected">) => {
    startTransition(async () => {
      const result = await moderateGuestReview(id, status);
      setMessage(result.message ?? (result.ok ? "Review updated." : "Couldn't update the review."));
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => moderate("approved")}
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        <Check className="size-4" aria-hidden />
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => moderate("rejected")}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive/30 px-4 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-60"
      >
        <X className="size-4" aria-hidden />
        Reject
      </button>
      {message && (
        <p role="status" className="w-full text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
