import { Car, MapPin, Navigation } from "lucide-react";
import { site } from "@/config/site";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

export function directionsUrl() {
  if (site.mapsDirectionsUrl) return site.mapsDirectionsUrl;
  const dest = site.address || `${site.name}, Pawna Lake, Maval, Pune`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

export function Location() {
  return (
    <section id="location" aria-labelledby="location-title" className="scroll-mt-20 bg-muted/60 py-20 md:py-28">
      <div className="container-page grid items-start gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <SectionHeading
            id="location-title"
            eyebrow="Getting here"
            title="On the shore of Pawna Lake"
            intro="A lakeside cottage near Pune and Lonavala — close enough for a weekend, far enough to switch off."
          />
          <Reveal className="space-y-6">
            {site.address && (
              <p className="flex gap-3 text-lg">
                <MapPin className="mt-1 size-5 shrink-0 text-lake" aria-hidden /> {site.address}
              </p>
            )}
            {site.distances.length > 0 && (
              <ul className="grid grid-cols-3 gap-3">
                {site.distances.map((d) => (
                  <li key={d.from} className="rounded-2xl bg-card p-4 text-center ring-1 ring-ink/5">
                    <Car className="mx-auto mb-2 size-5 text-lake" aria-hidden />
                    <p className="font-heading text-2xl">~{d.km} km</p>
                    <p className="text-sm text-muted-foreground">from {d.from}</p>
                  </li>
                ))}
              </ul>
            )}
            <a
              href={directionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lake px-6 font-semibold text-sand hover:bg-lake-deep"
            >
              <Navigation className="size-4" aria-hidden /> Get directions
            </a>
          </Reveal>
        </div>
        {site.mapsEmbedUrl ? (
          <Reveal className="overflow-hidden rounded-3xl ring-1 ring-ink/10">
            <iframe
              src={site.mapsEmbedUrl}
              title={`Map showing ${site.name} at Pawna Lake`}
              className="aspect-[4/3] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </Reveal>
        ) : (
          <Reveal className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-gradient-to-br from-lake to-forest p-8 text-center text-sand/80">
            <p>Map coming soon — use “Get directions” to open Google Maps.</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
