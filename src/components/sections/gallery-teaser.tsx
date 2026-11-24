import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTeaserImages } from "@/lib/images";
import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { SectionHeading } from "./section-heading";

export async function GalleryTeaser() {
  const images = await getTeaserImages(8);
  if (images.length === 0) return null;
  return (
    <section aria-labelledby="gallery-title" className="bg-muted/60 py-20 md:py-28">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading id="gallery-title" eyebrow="Gallery" title="Moments at the lake" />
          <Link
            href="/gallery"
            className="mb-10 inline-flex min-h-11 items-center gap-2 font-semibold text-lake hover:underline md:mb-14"
          >
            View full gallery <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <MasonryGrid
          images={images.map(({ src, alt, width, height, blurDataURL }) => ({ src, alt, width, height, blurDataURL }))}
        />
      </div>
    </section>
  );
}
