"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { CottageSlug } from "@/config/site";
import type { ISODate } from "@/lib/dates";
import type { StayRequest } from "@/lib/validation";
import { ApiError, apiFetch, type NightAvailability, type ServerQuote } from "./api";

/* ------------------------------------------------------------ media query */

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/* ------------------------------------------------------------ availability */

type MonthResult = { nights: NightAvailability[] } | { error: ApiError };

/**
 * Fetches /api/availability for each requested month (cached per type+month).
 * `loading` is derived — true while any requested month has no result yet.
 */
export function useAvailability(type: CottageSlug | null, months: string[]) {
  const [cache, setCache] = useState<Record<string, MonthResult>>({});
  const inflight = useRef(new Set<string>());
  const monthsKey = months.join(",");

  useEffect(() => {
    if (!type) return;
    for (const month of monthsKey.split(",")) {
      const key = `${type}:${month}`;
      if (inflight.current.has(key)) continue;
      inflight.current.add(key);
      apiFetch<{ nights: NightAvailability[] }>(`/api/availability?type=${type}&month=${month}`)
        .then((r) => setCache((c) => ({ ...c, [key]: { nights: r.nights } })))
        .catch((e: ApiError) => {
          inflight.current.delete(key); // allow retry on next render/month change
          setCache((c) => ({ ...c, [key]: { error: e } }));
        });
    }
  }, [type, monthsKey]);

  return useMemo(() => {
    const byDate: Record<ISODate, NightAvailability> = {};
    let error: ApiError | null = null;
    let loading = false;
    if (type) {
      for (const month of months) {
        const r = cache[`${type}:${month}`];
        if (!r) loading = true;
        else if ("error" in r) error ??= r.error;
        else for (const n of r.nights) byDate[n.date] = n;
      }
    }
    return { byDate, error, loading };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, type, monthsKey]);
}

/* ------------------------------------------------------------ quote */

type QuoteResult = { key: string; data?: ServerQuote; error?: ApiError };

/** Debounced server quote for the current stay. Pass null to skip. */
export function useQuote(stay: StayRequest | null, delay = 300) {
  const key = stay ? JSON.stringify(stay) : "";
  const [result, setResult] = useState<QuoteResult>({ key: "" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      apiFetch<ServerQuote>("/api/quote", { method: "POST", body: key, signal: ctrl.signal })
        .then((data) => setResult({ key, data }))
        .catch((error: ApiError) => {
          if (!ctrl.signal.aborted) setResult({ key, error });
        });
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [key, delay, nonce]);

  const current = result.key === key && key !== "";
  return {
    data: current ? result.data : undefined,
    error: current ? result.error : undefined,
    loading: key !== "" && !current,
    refresh: () => setNonce((n) => n + 1),
  };
}
