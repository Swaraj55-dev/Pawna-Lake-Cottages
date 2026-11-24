"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { BedDouble, ChevronLeft, ChevronRight, Users } from "lucide-react";
import type { LightboxImage } from "@/components/gallery/lightbox";
import { cn } from "@/lib/utils";

export type CottageCardData = {
  slug: string;
  name: string;
  shortDesc: string;
  maxGuests: number;
  unitsAvailable: number;
  amenities: string[];
  fromPrice: string | null;
  images: LightboxImage[];
};

/** Scroll-snap image carousel. Native swipe on touch, buttons + dots for others. */
function Carousel({ images, name }: { images: LightboxImage[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + images.length) % images.length;
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  if (images.length === 0) {
    return <div className="aspect-[4/3] bg-gradient-to-br from-lake to-forest" aria-hidden />;
  }

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={`${name} photos`}>
      <div
        ref={track}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / el.clientWidth));
        }}
        data-lenis-prevent
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            className="relative h-full w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${images.length}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(min-width: 1024px) 45vw, (min-width: 768px) 50vw, 100vw"
              quality={60}
              placeholder={img.blurDataURL ? "blur" : "empty"}
              blurDataURL={img.blurDataURL}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollTo(active - 1)}
            aria-label="Previous photo"
            className="glass absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-sand"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(active + 1)}
            aria-label="Next photo"
            className="glass absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-sand"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
            {images.map((img, i) => (
              <span
                key={img.src}
                className={cn("h-1.5 rounded-full bg-sand transition-all", i === active ? "w-5" : "w-1.5 opacity-60")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CottageCard({ c }: { c: CottageCardData }) {
  return (
    <article
      aria-labelledby={`cottage-${c.slug}`}
      className="group relative overflow-hidden rounded-3xl bg-card shadow-[0_20px_60px_-30px_rgb(14_59_67/0.45)] ring-1 ring-ink/5"
    >
      <Carousel images={c.images} name={c.name} />
      <div className="space-y-4 p-6 md:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={`cottage-${c.slug}`} className="text-3xl">
            {c.name}
          </h3>
          <p className="text-lg">
            {c.fromPrice ? (
              <>
                <span className="text-sm text-muted-foreground">from </span>
                <span className="font-semibold text-lake">{c.fromPrice}</span>
                <span className="text-sm text-muted-foreground"> / person</span>
              </>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">Price on request</span>
            )}
          </p>
        </div>
        {c.shortDesc && <p className="text-muted-foreground">{c.shortDesc}</p>}
        <ul className="flex flex-wrap gap-2 text-sm">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
            <Users className="size-4 text-lake" aria-hidden /> Up to {c.maxGuests} guests
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
            <BedDouble className="size-4 text-lake" aria-hidden /> {c.unitsAvailable} cottages
          </li>
          {c.amenities.slice(0, 4).map((a) => (
            <li key={a} className="rounded-full bg-muted px-3 py-1.5">
              {a}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`/book?type=${c.slug}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-lake px-6 font-semibold text-sand transition-colors hover:bg-lake-deep sm:flex-none"
          >
            Book now
          </Link>
          <Link
            href={`/cottages/${c.slug}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-lake/30 px-6 font-semibold text-lake transition-colors hover:bg-lake/5 sm:flex-none"
          >
            View details<span className="sr-only"> of {c.name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
