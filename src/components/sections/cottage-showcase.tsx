import { cottages } from "@/config/site";
import { getImages } from "@/lib/images";
import { formatINR, fromPrice } from "@/lib/format";
import { Reveal } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { SectionHeading } from "./section-heading";
import { CottageCard, type CottageCardData } from "./cottage-card";

export async function CottageShowcase() {
  const cards: CottageCardData[] = await Promise.all(
    cottages.map(async (c) => {
      const from = fromPrice(c);
      const images = c.images.length
        ? c.images.map((i) => ({ ...i, width: 1600, height: 1067 }))
        : (await getImages(c.slug)).slice(0, 6);
      return {
        slug: c.slug,
        name: c.name,
        shortDesc: c.shortDesc,
        maxGuests: c.maxGuests,
        unitsAvailable: c.unitsAvailable,
        amenities: c.amenities,
        fromPrice: from ? formatINR(from) : null,
        images,
      };
    }),
  );

  return (
    <section id="cottages" aria-labelledby="cottages-title" className="scroll-mt-20 py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="cottages-title"
          eyebrow="Pawna Lake cottages"
          title="Two ways to wake up by the lake"
          intro="Choose between our Aroma and Bella cottages — lakeside stays at Pawna Lake, Maval."
        />
        <div className="grid gap-8 md:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.1} className="h-full">
              <TiltCard className="h-full">
                <CottageCard c={c} />
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
