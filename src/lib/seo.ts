import { cottages, faqs, inclusions, site, type Cottage } from "@/config/site";
import { parseTime12h } from "./calendar";
import { fromPrice } from "./format";
import { siteUrl } from "./links";

/**
 * schema.org builders. Only real data from site.ts is emitted — empty fields are
 * omitted, and no ratings/reviews markup is generated (self-serving review
 * markup isn't eligible for rich results and we never invent ratings).
 */
const compact = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<T>;

const time24 = (t: string) => {
  const p = parseTime12h(t);
  return p ? `${String(p.h).padStart(2, "0")}:${String(p.m).padStart(2, "0")}` : undefined;
};

function priceRange(): string | undefined {
  const prices = cottages.flatMap((c) => [c.pricePerPerson.weekday, c.pricePerPerson.weekend]).filter((p): p is number => !!p);
  if (!prices.length) return undefined;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? `₹${lo} per person` : `₹${lo}–₹${hi} per person`;
}

export function lodgingBusinessLd(images: string[] = []) {
  const sameAs = Object.values(site.socials).filter(Boolean);
  return compact({
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": siteUrl("/#lodging"),
    name: site.name,
    description: site.description,
    url: siteUrl("/"),
    image: images.map((i) => siteUrl(i)),
    telephone: site.phone,
    email: site.email,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: site.address || undefined,
      addressLocality: "Maval",
      addressRegion: "Maharashtra",
      postalCode: "410406",
      addressCountry: "IN",
    }),
    hasMap: site.mapsDirectionsUrl,
    checkinTime: time24(site.checkIn),
    checkoutTime: time24(site.checkOut),
    priceRange: priceRange(),
    currenciesAccepted: "INR",
    sameAs,
    amenityFeature: [...inclusions.meals, ...inclusions.activities].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    containsPlace: cottages.map((c) => ({ "@id": siteUrl(`/cottages/${c.slug}#accommodation`) })),
  });
}

export function accommodationLd(c: Cottage, images: string[] = []) {
  const from = fromPrice(c);
  return compact({
    "@context": "https://schema.org",
    "@type": "Accommodation",
    "@id": siteUrl(`/cottages/${c.slug}#accommodation`),
    name: `${c.name} — ${site.name}`,
    description: c.longDesc.startsWith("TODO") ? c.shortDesc.startsWith("TODO") ? undefined : c.shortDesc : c.longDesc,
    url: siteUrl(`/cottages/${c.slug}`),
    image: images.map((i) => siteUrl(i)),
    occupancy: { "@type": "QuantitativeValue", maxValue: c.maxGuests, unitText: "guests" },
    amenityFeature: c.amenities.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    containedInPlace: { "@id": siteUrl("/#lodging") },
    offers: from
      ? {
          "@type": "Offer",
          priceCurrency: "INR",
          price: from,
          priceSpecification: { "@type": "UnitPriceSpecification", price: from, priceCurrency: "INR", unitText: "per person per night" },
          url: siteUrl(`/book?type=${c.slug}`),
        }
      : undefined,
  });
}

export function faqLd() {
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(it.path) })),
  };
}

/** Safe serialisation for <script type="application/ld+json"> (escapes `<`). */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
