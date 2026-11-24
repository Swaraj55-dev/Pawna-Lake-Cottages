import type { Metadata } from "next";
import { cottages, site } from "@/config/site";
import { getImages } from "@/lib/images";
import { formatINR, fromPrice } from "@/lib/format";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { BookCottage } from "@/components/booking/types";

export const metadata: Metadata = {
  title: "Book your Pawna Lake cottage",
  description: `Check live availability and book the Aroma or Bella cottage at ${site.name}, Pawna Lake — pay ${site.advancePercent}% now, the rest at check-in.`,
  alternates: { canonical: "/book" },
};

export default async function BookPage() {
  const data: BookCottage[] = await Promise.all(
    cottages.map(async (c) => {
      const img = (await getImages(c.slug))[0];
      const from = fromPrice(c);
      return {
        slug: c.slug,
        name: c.name,
        shortDesc: c.shortDesc,
        maxGuests: c.maxGuests,
        baseGuests: c.baseGuests,
        unitsAvailable: c.unitsAvailable,
        fromPrice: from ? formatINR(from) : null,
        image: img ? { src: img.src, alt: img.alt, blurDataURL: img.blurDataURL } : null,
      };
    }),
  );

  return (
    <div className="container-page pb-16 pt-28 md:pt-36">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-sunset-deep">Book your stay</p>
      <h1 className="mb-8 text-4xl md:text-5xl">Reserve a cottage by the lake</h1>
      <BookingFlow cottages={data} />
    </div>
  );
}
