"use client";

import type { NightAvailability } from "@/lib/availability";
import type { ServerQuote } from "@/lib/quote";

export type { NightAvailability, ServerQuote };

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("NETWORK", "You seem to be offline. Check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      body?.error ?? `HTTP_${res.status}`,
      body?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }
  return body as T;
}

/** Errors where online booking can't proceed and WhatsApp is the way forward. */
export const isFallbackError = (e: ApiError | null | undefined) =>
  !!e &&
  (["NOT_CONFIGURED", "PRICE_NOT_SET", "SERVER_ERROR", "NETWORK"].includes(e.code) || e.status === 404 || e.status >= 500);
