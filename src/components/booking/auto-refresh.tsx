"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the server component every few seconds (e.g. while a payment confirms). */
export function AutoRefresh({ everyMs = 4000, maxTries = 15 }: { everyMs?: number; maxTries?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > maxTries) return clearInterval(t);
      router.refresh();
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs, maxTries]);
  return null;
}

/** Clears the saved booking draft once a booking exists. */
export function ClearBookingDraft() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("pwn-booking-draft-v1");
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
