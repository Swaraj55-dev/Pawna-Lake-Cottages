"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { WhatsAppEnquiry } from "@/lib/whatsapp";

/**
 * Tiny global store for "what is the visitor looking at / choosing right now",
 * so the floating WhatsApp button on every page can prefill the message.
 */
const EMPTY: WhatsAppEnquiry = {};
let state: WhatsAppEnquiry = EMPTY;
const listeners = new Set<() => void>();

export function setEnquiry(next: WhatsAppEnquiry) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useEnquiry(): WhatsAppEnquiry {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Sets the enquiry while mounted; resets on unmount (e.g. leaving the page). */
export function useProvideEnquiry(e: WhatsAppEnquiry) {
  const key = JSON.stringify(e);
  useEffect(() => {
    setEnquiry(JSON.parse(key) as WhatsAppEnquiry);
    return () => setEnquiry(EMPTY);
  }, [key]);
}

/** Drop-in for server components: <ProvideEnquiry cottageName="…" /> */
export function ProvideEnquiry(props: WhatsAppEnquiry) {
  useProvideEnquiry(props);
  return null;
}
