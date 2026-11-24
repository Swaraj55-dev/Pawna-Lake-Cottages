import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BedDouble, Car, Clock } from "lucide-react";
import { about, cottages, inclusions, site } from "@/config/site";
import { getImages } from "@/lib/images";
import { PageHeader } from "@/components/sections/page-header";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "About us",
  description: `About ${site.name} — lakeside Aroma and Bella cottages for Pawna Lake camping in Maval, near Pune and Lonavala.`,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const photo = (await getImages("lake"))[0];
  const totalUnits = cottages.reduce((s, c) => s + c.unitsAvailable, 0);
  const included = [...inclusions.meals, ...inclusions.activities];

  return (
    <>
      <PageHeader eyebrow="About" title={`${site.name}, Pawna Lake`} intro={site.description} />
      <div className="container-page grid gap-12 pb-20 lg:grid-cols-2">
        {photo && (
          // Not wrapped in <Reveal>: it's the LCP element, so it renders immediately.
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={70}
              placeholder="blur"
              blurDataURL={photo.blurDataURL}
              className="object-cover"
            />
          </div>
        )}
        <div className="space-y-8">
          {about.story && (
            <Reveal className="space-y-4 text-lg leading-relaxed text-muted-foreground">
              {about.story.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Reveal>
          )}
          <Reveal>
            <h2 className="mb-4 text-3xl">At a glance</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-ink/5">
                <BedDouble className="mt-0.5 size-5 shrink-0 text-lake" aria-hidden />
                <span>
                  {totalUnits} cottages — {cottages.map((c) => `${c.unitsAvailable} ${c.name}s`).join(" & ")}
                </span>
              </li>
              <li className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-ink/5">
                <Clock className="mt-0.5 size-5 shrink-0 text-lake" aria-hidden />
                <span>
                  Check-in {site.checkIn} · Check-out {site.checkOut}
                </span>
              </li>
              {site.distances.map((d) => (
                <li key={d.from} className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-ink/5">
                  <Car className="mt-0.5 size-5 shrink-0 text-lake" aria-hidden />
                  <span>
                    About {d.km} km from {d.from}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          {included.length > 0 && (
            <Reveal>
              <h2 className="mb-3 text-3xl">Included in your stay</h2>
              <p className="text-muted-foreground">{included.join(" · ")}</p>
            </Reveal>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/book" className="inline-flex min-h-12 items-center rounded-full bg-sunset px-6 font-semibold text-ink hover:bg-[#f5b673]">
              Book your cottage
            </Link>
            <Link href="/contact" className="inline-flex min-h-12 items-center rounded-full border border-lake/30 px-6 font-semibold text-lake hover:bg-lake/5">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
