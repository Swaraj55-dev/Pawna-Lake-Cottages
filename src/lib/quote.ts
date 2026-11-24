import "server-only";
import { getCottage, site, type Cottage } from "@/config/site";
import { getPublicClient } from "@/lib/supabase/admin";
import type { PriceOverrideRow } from "@/lib/supabase/types";
import { bookingWindow, unitsLeftForStay } from "./availability";
import { AppError } from "./errors";
import { calculateQuote, type Quote } from "./pricing";
import type { StayRequest } from "./validation";

export async function fetchOverrides(slug: string, checkIn: string, checkOut: string): Promise<Record<string, number>> {
  const { data, error } = await getPublicClient()
    .from("price_overrides")
    .select("date, price_per_person")
    .eq("cottage_slug", slug)
    .gte("date", checkIn)
    .lt("date", checkOut);
  if (error) throw new Error(`price_overrides failed: ${error.message}`);
  return Object.fromEntries((data as Pick<PriceOverrideRow, "date" | "price_per_person">[]).map((r) => [r.date, r.price_per_person]));
}

export type ServerQuote = {
  cottage: Pick<Cottage, "slug" | "name" | "maxGuests" | "baseGuests">;
  quote: Quote;
  unitsLeft: number;
  available: boolean;
};

/**
 * The only trusted price: computed on the server from config + DB overrides,
 * with a live availability check. Never accept amounts from the client.
 */
export async function getServerQuote(req: StayRequest): Promise<ServerQuote> {
  const cottage = getCottage(req.type);
  if (!cottage) throw new AppError("UNKNOWN_COTTAGE", "Unknown cottage type.");

  const { weekday, weekend } = cottage.pricePerPerson;
  if (weekday == null || weekend == null) {
    throw new AppError(
      "PRICE_NOT_SET",
      `Online booking for the ${cottage.name} opens soon — please book on WhatsApp or call us for a quote.`,
      409,
    );
  }

  const { first, last } = bookingWindow();
  if (req.checkIn < first) throw new AppError("PAST_DATE", "Check-in can't be in the past.");
  if (req.checkIn > last) throw new AppError("OUT_OF_RANGE", "Those dates are too far ahead to book online.");

  const overrides = await fetchOverrides(cottage.slug, req.checkIn, req.checkOut);
  const quote = calculateQuote({
    checkIn: req.checkIn,
    checkOut: req.checkOut,
    guests: req.guests,
    cottages: req.cottages,
    rates: {
      weekday,
      weekend,
      extraPerson: cottage.extraPersonPrice,
      baseGuests: cottage.baseGuests,
      maxGuests: cottage.maxGuests,
    },
    overrides,
    weekendNights: site.weekendNights,
    convenienceFee: site.convenienceFee,
    advancePercent: site.advancePercent,
    maxNights: site.maxNights,
  });

  const unitsLeft = await unitsLeftForStay(cottage.slug, req.checkIn, req.checkOut);

  return {
    cottage: { slug: cottage.slug, name: cottage.name, maxGuests: cottage.maxGuests, baseGuests: cottage.baseGuests },
    quote,
    unitsLeft,
    available: unitsLeft >= req.cottages,
  };
}
