import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BedDouble, Check, Clock, Users } from "lucide-react";
import { cottages, getCottage, policies, site } from "@/config/site";
import { getImages, getPanorama } from "@/lib/images";
import { formatINR, fromPrice, weekdayLabel, weekendLabel } from "@/lib/format";
import { CottageMedia } from "@/components/cottage/cottage-media";
import { BookingBar, BookingWidget } from "@/components/cottage/booking-widget";
import { Reveal } from "@/components/motion/reveal";
import { ProvideEnquiry } from "@/components/contact/enquiry-store";
import { JsonLd } from "@/components/json-ld";
import { accommodationLd, breadcrumbLd } from "@/lib/seo";

export function generateStaticParams() {
  return cottages.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cottages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = getCottage(slug);
  if (!c) return {};
  const description = `${c.name} at ${site.name} — a lakeside cottage at Pawna Lake near Pune & Lonavala for up to ${c.maxGuests} guests. Check availability and book online.`;
  // The share image comes from ./opengraph-image.tsx
  return {
    title: `${c.name} — Pawna Lake cottage near Pune & Lonavala`,
    description,
    alternates: { canonical: `/cottages/${c.slug}` },
    openGraph: { title: `${c.name} | ${site.name}`, description, url: `/cottages/${c.slug}` },
  };
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <section className="border-t border-ink/10 py-10">
        <h2 className="mb-5 text-3xl">{title}</h2>
        {children}
      </section>
    </Reveal>
  );
}

export default async function CottagePage({ params }: PageProps<"/cottages/[slug]">) {
  const { slug } = await params;
  const c = getCottage(slug);
  if (!c) notFound();

  const [images, panorama] = await Promise.all([getImages(c.slug), getPanorama(c.slug)]);
  const hero = images[0];
  const other = cottages.find((o) => o.slug !== c.slug);
  const hasPrices = fromPrice(c) !== null;
  const { weekday, weekend } = c.pricePerPerson;

  return (
    <article className="pb-24 lg:pb-0">
      {/* Hero */}
      <header className="relative isolate flex h-[68svh] min-h-[460px] items-end overflow-hidden bg-lake-deep text-sand">
        {hero && (
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            quality={75}
            placeholder="blur"
            blurDataURL={hero.blurDataURL}
            className="-z-20 object-cover"
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/40" />
        <div className="container-page pb-10 md:pb-14">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-sand/75">
            <Link href="/" className="hover:text-sunset">Home</Link> <span aria-hidden>/</span>{" "}
            <Link href="/#cottages" className="hover:text-sunset">Cottages</Link> <span aria-hidden>/</span>{" "}
            <span aria-current="page">{c.name}</span>
          </nav>
          <h1 className="text-5xl md:text-7xl">{c.name}</h1>
          {c.shortDesc && <p className="mt-3 max-w-2xl text-lg text-sand/85">{c.shortDesc}</p>}
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            <li className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <Users className="size-4" aria-hidden /> Up to {c.maxGuests} guests
            </li>
            <li className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <BedDouble className="size-4" aria-hidden /> {c.unitsAvailable} cottages
            </li>
            <li className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
              <Clock className="size-4" aria-hidden /> {site.checkIn} – {site.checkOut}
            </li>
          </ul>
        </div>
      </header>

      <div className="container-page grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-16">
        <div>
          <CottageMedia
            name={c.name}
            panorama={panorama}
            images={images.map(({ src, alt, width, height, blurDataURL }) => ({ src, alt, width, height, blurDataURL }))}
          />

          <div className="mt-12">
            {c.longDesc && (
              <Block title={`About the ${c.name}`}>
                <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">{c.longDesc}</p>
              </Block>
            )}

            {c.amenities.length > 0 && (
              <Block title="Amenities">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {c.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-3">
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-lake/10 text-lake">
                        <Check className="size-4" aria-hidden />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            <Block title="Capacity">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Max guests", `${c.maxGuests} per cottage`],
                  ["Base occupancy", `${c.baseGuests} guests`],
                  ["Check-in", site.checkIn],
                  ["Check-out", site.checkOut],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-card p-4 ring-1 ring-ink/5">
                    <dt className="text-sm text-muted-foreground">{k}</dt>
                    <dd className="mt-1 font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Block>

            <Block title="Prices">
              {hasPrices ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] overflow-hidden rounded-2xl bg-card text-left ring-1 ring-ink/5">
                    <caption className="sr-only">{c.name} prices per person per night</caption>
                    <thead className="bg-lake text-sand">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-semibold">Rate</th>
                        <th scope="col" className="px-5 py-3 font-semibold">Applies to</th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">Per person / night</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      <tr>
                        <th scope="row" className="px-5 py-4 font-semibold">Weekday</th>
                        <td className="px-5 py-4 text-muted-foreground">{weekdayLabel()}</td>
                        <td className="px-5 py-4 text-right font-semibold">{weekday ? formatINR(weekday) : "On request"}</td>
                      </tr>
                      <tr>
                        <th scope="row" className="px-5 py-4 font-semibold">Weekend</th>
                        <td className="px-5 py-4 text-muted-foreground">{weekendLabel()}</td>
                        <td className="px-5 py-4 text-right font-semibold">{weekend ? formatINR(weekend) : "On request"}</td>
                      </tr>
                      {c.extraPersonPrice ? (
                        <tr>
                          <th scope="row" className="px-5 py-4 font-semibold">Extra guest</th>
                          <td className="px-5 py-4 text-muted-foreground">Above {c.baseGuests} guests</td>
                          <td className="px-5 py-4 text-right font-semibold">{formatINR(c.extraPersonPrice)}</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Festival and long-weekend dates may be priced differently — your exact total is shown before payment.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Prices are shared on request. Check availability for your dates or message us and we&apos;ll get back with a quote.
                </p>
              )}
            </Block>

            {policies.rules.length > 0 && (
              <Block title="House rules">
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground marker:text-sunset">
                  {policies.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </Block>
            )}

            <Block title="Cancellation">
              <p className="text-muted-foreground">
                {policies.cancellation || "Please read our cancellation policy before booking."}{" "}
                <Link href="/policies#cancellation" className="font-semibold text-lake underline underline-offset-4">
                  Full policy
                </Link>
              </p>
            </Block>
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Book this cottage">
          <BookingWidget c={c} />
        </aside>
      </div>

      {other && (
        <section className="bg-muted/60 py-14">
          <div className="container-page flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sunset-deep">Also at the lake</p>
              <p className="mt-2 font-heading text-3xl">{other.name}</p>
              {other.shortDesc && <p className="mt-1 text-muted-foreground">{other.shortDesc}</p>}
            </div>
            <Link
              href={`/cottages/${other.slug}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lake px-6 font-semibold text-sand hover:bg-lake-deep"
            >
              View {other.name} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <BookingBar c={c} />
      <ProvideEnquiry cottageName={c.name} />
      <JsonLd data={accommodationLd(c, images.filter((i) => !i.placeholder).map((i) => i.src))} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: c.name, path: `/cottages/${c.slug}` },
        ])}
      />
    </article>
  );
}
