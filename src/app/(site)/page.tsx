import type { Metadata } from "next";
import { site } from "@/config/site";
import { getAllImages } from "@/lib/images";
import { faqLd, lodgingBusinessLd } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { Hero } from "@/components/sections/hero";
import { HeroScene } from "@/components/three/hero-scene";
import { CottageShowcase } from "@/components/sections/cottage-showcase";
import { Experience } from "@/components/sections/experience";
import { Inclusions } from "@/components/sections/inclusions";
import { GalleryTeaser } from "@/components/sections/gallery-teaser";
import { Reviews } from "@/components/sections/reviews";
import { Location } from "@/components/sections/location";
import { Faq } from "@/components/sections/faq";
import { SocialStrip } from "@/components/sections/social-strip";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Pawna Lake cottages & lakeside camping near Pune, Lonavala` },
  description: `Stay in lakeside Aroma or Bella cottages at Pawna Lake, Maval — Pawna Lake camping a short drive from Pune and Lonavala. Check live availability and book online.`,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default async function Home() {
  const photos = (await getAllImages()).filter((i) => !i.placeholder).slice(0, 6).map((i) => i.src);
  return (
    <>
      <Hero>
        <HeroScene />
      </Hero>
      <CottageShowcase />
      <Experience />
      <Inclusions />
      <GalleryTeaser />
      <Reviews />
      <Location />
      <Faq />
      <SocialStrip />
      <JsonLd data={lodgingBusinessLd(photos)} />
      <JsonLd data={faqLd()} />
    </>
  );
}
