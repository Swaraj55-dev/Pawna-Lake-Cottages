import { Hero } from "@/components/sections/hero";
import { CottageShowcase } from "@/components/sections/cottage-showcase";
import { Experience } from "@/components/sections/experience";
import { Inclusions } from "@/components/sections/inclusions";
import { GalleryTeaser } from "@/components/sections/gallery-teaser";
import { Reviews } from "@/components/sections/reviews";
import { Location } from "@/components/sections/location";
import { Faq } from "@/components/sections/faq";
import { SocialStrip } from "@/components/sections/social-strip";

export default function Home() {
  return (
    <>
      <Hero />
      <CottageShowcase />
      <Experience />
      <Inclusions />
      <GalleryTeaser />
      <Reviews />
      <Location />
      <Faq />
      <SocialStrip />
    </>
  );
}
