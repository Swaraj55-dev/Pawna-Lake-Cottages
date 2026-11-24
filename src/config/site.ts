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
  advancePercent: number;
  cancellationPolicy?: string;
  houseRules?: string[];
  checkInNote?: string;
  mealPlan?: {
    time: string;
    title: string;
    note?: string;
    shared?: string[];
    vegetarian?: string[];
    nonVegetarian?: string[];
  }[];
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
  // Used for SEO meta descriptions.
  description:
    "Lakeside Aroma and Bella cottages at Pawna Lake, Maval — a peaceful stay near Pune and Lonavala. Aroma stays include meals and kayaking.",
  address: "", // TODO: "<full address>, Pawna Lake, Maval, Pune 410406"
  mapsEmbedUrl: "https://maps.google.com/maps?q=18.6627,73.4983&z=17&output=embed",
  mapsDirectionsUrl: "https://maps.google.com/maps/search/Aroma%20cottages%20pawnalake/@18.6627,73.4983,17z?hl=en",
  phone: "+91 8459101481",
  whatsapp: "918459101481",
  email: "", // TODO
  socials: {
    instagram: "", // TODO
    facebook: "", // TODO
    youtube: "", // TODO
    googleReviews: "", // TODO
  },
  checkIn: "4:00 PM",
  checkOut: "11:00 AM",
  /** Flat convenience fee per booking, in INR. */
  convenienceFee: 0,
  /**
   * Nights that are charged at the weekend rate, as JS day numbers of the
   * night's *start date* (0 = Sunday … 6 = Saturday). Default: Fri + Sat nights.
   */
  weekendNights: [5, 6] as number[],
  /** Longest stay bookable online, in nights. */
  maxNights: 14,
  /** How far ahead guests can book online, in days. */
  bookingWindowDays: 365,
  /** Minutes a pending booking holds the cottage while the guest pays. */
  holdMinutes: 15,
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
    shortDesc: "A stay for two with a delicious meal plan and kayaking included.",
    longDesc:
      "Aroma Cottage is designed for two guests. Make the most of your Pawna Lake stay with a complete meal plan and kayaking included for ₹1,299 per person per night.",
    advancePercent: 30,
    cancellationPolicy:
      "More than 24 hours before your scheduled check-in, you may request a refund, postponement, or changes to your booking. Please contact us as early as possible so we can assist.\n\nWithin 24 hours of check-in and after arrival, refunds, postponements, and booking changes are not available. We’re sorry, but no on-the-spot changes can be made.",
    houseRules: [
      "Check-in is after 4:00 PM. Late check-in is allowed; early check-in is not available.",
      "Snacks and tea are served from 5:30 PM to 6:00 PM; the starter is served from 8:00 PM to 9:00 PM; dinner is served from 10:00 PM to 11:00 PM; breakfast is served from 9:00 AM.",
      "Silent hours are from 12:00 AM to 6:00 AM.",
      "Check-out is by 11:00 AM. Early check-out is allowed; late check-out is not available.",
    ],
    checkInNote:
      "Check-in is after 4:00 PM (late arrival is allowed; early check-in is not). Check-out is by 11:00 AM (early departure is allowed; late check-out is not). Please carry a valid photo ID for every adult guest.",
    mealPlan: [
      { time: "5:30 PM - 6:00 PM", title: "Snacks & tea", shared: ["Misal pav", "Tea"] },
      {
        time: "8:00 PM - 9:00 PM",
        title: "Starter & DJ",
        note: "DJ music on regular evenings; Saturday evenings feature live music with a singer.",
        vegetarian: ["Fried paneer"],
        nonVegetarian: ["Fried chicken"],
      },
      {
        time: "10:00 PM - 11:00 PM",
        title: "Dinner",
        shared: ["Desserts"],
        vegetarian: ["Mutter paneer", "Dal", "Rice"],
        nonVegetarian: ["Chicken curry", "Chicken masala"],
      },
      { time: "From 9:00 AM", title: "Breakfast", shared: ["Poha", "Tea"] },
    ],
    maxGuests: 2,
    baseGuests: 2,
    unitsAvailable: 20,
    pricePerPerson: { weekday: 1299, weekend: 1299 },
    extraPersonPrice: null,
    amenities: [], // TODO: e.g. "Private washroom", "Lake view"
    images: [],
  },
  {
    slug: "bella",
    name: "Bella Cottage",
    shortDesc: "TODO: one-line description of the Bella Cottage.",
    longDesc: "TODO: a paragraph describing the Bella Cottage — view, interiors, bed setup and what makes it special.",
    advancePercent: 50,
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
  meals: [] as string[], // TODO: add property-wide meal inclusions if they apply to every cottage.
  activities: [] as string[], // TODO: add property-wide activities if they apply to every cottage.
};

export const policies = {
  /** Shared note shown in confirmation emails and the terms. */
  checkInNote: "Please carry a valid photo ID for every adult guest.",
  /** Shown on /policies. */
  lastUpdated: "24 November 2026",
};

/** /about page. Sections with empty text are hidden. */
export const about = {
  story: "", // TODO: a few paragraphs about the property, its hosts and what makes it special
};

export const faqs: { q: string; a: string }[] = [
  // TODO: add real FAQs, e.g. { q: "What are check-in and check-out times?", a: "..." }
];

/** Shared home-page highlights that apply to both cottages, without cottage-specific schedules. */
export const experience: { key: string; title: string; description: string }[] = [
  {
    key: "arrival",
    title: "Arrive and settle in",
    description: "Find your cottage, get comfortable, and leave the day’s rush behind.",
  },
  {
    key: "lakeside",
    title: "Make time for the lake",
    description: "Take in the Pawna setting and enjoy the outdoors at your own pace.",
  },
  {
    key: "dining",
    title: "Good food, good company",
    description: "Discover the dining and refreshments offered with your chosen cottage stay.",
  },
  {
    key: "evening",
    title: "Ease into the evening",
    description: "Share stories, unwind, and enjoy a slower pace as the day winds down.",
  },
  {
    key: "morning",
    title: "Wake up by the water",
    description: "Start the day gently and savour a fresh morning in the lakeside air.",
  },
  {
    key: "departure",
    title: "Leave feeling refreshed",
    description: "Take a few last moments to enjoy the view before heading home.",
  },
];

/** Image categories, each mapped to a folder in /public/images. */
export const galleryCategories = [
  { key: "aroma", label: "Aroma" },
  { key: "bella", label: "Bella" },
  { key: "lake", label: "Lake" },
  { key: "food", label: "Food" },
  { key: "activities", label: "Activities" },
  { key: "night", label: "Night" },
] as const;
export type GalleryCategory = (typeof galleryCategories)[number]["key"];

/**
 * Optional YouTube videos for the gallery page (hidden when empty).
 * `youtubeId` is the part after "v=" in a YouTube URL.
 */
export const videos: { title: string; youtubeId: string }[] = [];

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
