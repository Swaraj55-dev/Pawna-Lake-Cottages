import { format } from "date-fns";
import { site } from "@/config/site";
import { isoToDate, type ISODate } from "./dates";

/** Digits-only WhatsApp number from config, falling back to the env var. */
export function whatsappNumber(): string {
  return (site.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
}

export type WhatsAppEnquiry = {
  cottageName?: string;
  checkIn?: ISODate | null;
  checkOut?: ISODate | null;
  guests?: number;
  cottages?: number;
  name?: string;
};

const fmt = (iso: ISODate) => format(isoToDate(iso), "EEE, d MMM yyyy");

export function whatsappMessage(e: WhatsAppEnquiry = {}): string {
  const lines = [`Hi ${site.name}! I'd like to book a stay.`];
  if (e.cottageName) lines.push(`Cottage: ${e.cottageName}`);
  if (e.checkIn) lines.push(`Check-in: ${fmt(e.checkIn)}`);
  if (e.checkOut) lines.push(`Check-out: ${fmt(e.checkOut)}`);
  if (e.guests) lines.push(`Guests: ${e.guests}`);
  if (e.cottages && e.cottages > 1) lines.push(`Cottages: ${e.cottages}`);
  if (e.name) lines.push(`Name: ${e.name}`);
  lines.push("Is this available?");
  return lines.join("\n");
}

/** wa.me link with the enquiry prefilled, or null if no number is configured. */
export function whatsappLink(e: WhatsAppEnquiry = {}): string | null {
  const n = whatsappNumber();
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(whatsappMessage(e))}`;
}

/** Share link (no recipient) — opens WhatsApp's contact picker. */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
