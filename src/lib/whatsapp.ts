import { format } from "date-fns";
import { site } from "@/config/site";

/** Digits-only WhatsApp number from config, falling back to the env var. */
export function whatsappNumber(): string {
  return (site.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, "");
}

export type WhatsAppEnquiry = {
  cottageName?: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  guests?: number;
  cottages?: number;
  name?: string;
};

export function whatsappMessage(e: WhatsAppEnquiry = {}): string {
  const lines = [`Hi ${site.name}! I'd like to book a stay.`];
  if (e.cottageName) lines.push(`Cottage: ${e.cottageName}`);
  if (e.checkIn) lines.push(`Check-in: ${format(e.checkIn, "EEE, d MMM yyyy")}`);
  if (e.checkOut) lines.push(`Check-out: ${format(e.checkOut, "EEE, d MMM yyyy")}`);
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
