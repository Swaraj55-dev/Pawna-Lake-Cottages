/**
 * SINGLE SOURCE OF TRUTH for all business data.
 *
 * Anything marked `TODO` is a placeholder that must be replaced with real
 * information before launch. Empty strings / empty arrays / `null` values are
 * intentional: the UI hides the related section or element when data is empty,
 * so nothing invented is ever shown to visitors.
 */

export type CottageSlug = "aroma" | "bella";

export type Cottage = {
  slug: CottageSlug;
  name: string;
  shortDesc: string;
  longDesc: string;
  maxGuests: number;
  baseGuests: number;
  /** Number of physical cottages of this type. */
  unitsAvailable: number;
  /** Per person, per night, in INR. `null` = not configured yet ("Price on request"). */
  pricePerPerson: { weekday: number | null; weekend: number | null };
  /** Per extra person (above baseGuests), per night, in INR. */
  extraPersonPrice: number | null;
  amenities: string[];
  /** Filled from /public/images/<slug>/* — see README. */
  images: { src: string; alt: string }[];
};

export type Review = {
  author: string;
  text: string;
  rating: number; // 1–5
  date?: string;
  source?: "google" | "instagram" | "direct";
};

export const site = {
  name: "Pawna Lake Cottages", // TODO: replace with the real brand name
  tagline: "Wake up to Pawna Lake", // TODO: confirm tagline
  description:
    "Lakeside Aroma and Bella cottages at Pawna Lake, Maval — a peaceful camping stay near Pune and Lonavala with meals, boating and campfire evenings.",
  address: "", // TODO: "<full address>, Pawna Lake, Maval, Pune 410406"
  mapsEmbedUrl: "", // TODO: Google Maps "Embed a map" src URL
  mapsDirectionsUrl: "", // TODO: Google Maps share link for directions
  phone: "", // TODO: "+91XXXXXXXXXX"
  whatsapp: "", // TODO: digits only, e.g. "91XXXXXXXXXX"
  email: "", // TODO
  socials: {
    instagram: "", // TODO
    facebook: "", // TODO
    youtube: "", // TODO
    googleReviews: "", // TODO
  },
  checkIn: "4:00 PM", // TODO: confirm
  checkOut: "11:00 AM", // TODO: confirm
  advancePercent: 50, // TODO: confirm
  /** Flat convenience fee per booking, in INR. */
  convenienceFee: 0,
  /**
   * Nights that are charged at the weekend rate, as JS day numbers of the
   * night's *start date* (0 = Sunday … 6 = Saturday). Default: Fri + Sat nights.
   */
  weekendNights: [5, 6] as number[],
  /** Google rating badge — leave `null` until you have the real figure. */
  googleRating: null as { rating: number; count: number } | null,
  /** Approximate driving distances shown in the Location section. TODO: confirm. */
  distances: [
    { from: "Pune", km: 55 },
    { from: "Lonavala", km: 25 },
    { from: "Mumbai", km: 115 },
  ],
} as const;

export const cottages: Cottage[] = [
  {
    slug: "aroma",
    name: "Aroma Cottage",
    shortDesc: "TODO: one-line description of the Aroma Cottage.",
    longDesc: "TODO: a paragraph describing the Aroma Cottage — view, interiors, bed setup and what makes it special.",
    maxGuests: 4, // TODO: confirm
    baseGuests: 2, // TODO: confirm
    unitsAvailable: 5, // TODO: confirm number of physical Aroma cottages
    pricePerPerson: { weekday: null, weekend: null }, // TODO: set real prices
    extraPersonPrice: null, // TODO
    amenities: [], // TODO: e.g. "Private washroom", "Lake view"
    images: [],
  },
  {
    slug: "bella",
    name: "Bella Cottage",
    shortDesc: "TODO: one-line description of the Bella Cottage.",
    longDesc: "TODO: a paragraph describing the Bella Cottage — view, interiors, bed setup and what makes it special.",
    maxGuests: 4, // TODO: confirm
    baseGuests: 2, // TODO: confirm
    unitsAvailable: 5, // TODO: confirm number of physical Bella cottages
    pricePerPerson: { weekday: null, weekend: null }, // TODO: set real prices
    extraPersonPrice: null, // TODO
    amenities: [], // TODO
    images: [],
  },
];

export const inclusions = {
  meals: [] as string[], // TODO: e.g. "Evening tea & snacks", "BBQ", "Dinner", "Breakfast"
  activities: [] as string[], // TODO: e.g. "Boating", "Campfire", "Music", "Games"
};

export const policies = {
  cancellation: "", // TODO: cancellation policy text
  rules: [] as string[], // TODO: e.g. "Silent hours 12–6 AM"
};

export const faqs: { q: string; a: string }[] = [
  // TODO: add real FAQs, e.g. { q: "What are check-in and check-out times?", a: "..." }
];

/** Only real reviews. Leave empty to hide the Reviews section. */
export const reviews: Review[] = [];

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/cottages/aroma", label: "Aroma" },
  { href: "/cottages/bella", label: "Bella" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function getCottage(slug: string): Cottage | undefined {
  return cottages.find((c) => c.slug === slug);
}
