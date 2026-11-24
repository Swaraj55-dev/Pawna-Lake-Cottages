import type { Metadata } from "next";
import { galleryCategories, site, videos } from "@/config/site";
import { getAllImages } from "@/lib/images";
import { GalleryBrowser } from "@/components/gallery/gallery-browser";
import { VideoEmbed } from "@/components/gallery/video-embed";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Gallery — Pawna Lake camping & cottages",
  description: `Photos of the Aroma and Bella cottages, Pawna Lake views, food, activities and night skies at ${site.name}.`,
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const images = await getAllImages();
  const tabs = galleryCategories.filter((c) => images.some((i) => i.category === c.key));

  return (
    <div className="pb-20 pt-28 md:pt-36">
      <div className="container-page">
        <SectionHeading
          eyebrow="Gallery"
          title="Life at the lake"
          intro="Cottages, the water, food, campfires and starry nights at Pawna Lake."
        />
        {images.length > 0 ? (
          <GalleryBrowser
            tabs={tabs.map(({ key, label }) => ({ key, label }))}
            images={images.map(({ src, alt, width, height, blurDataURL, category }) => ({
              src,
              alt,
              width,
              height,
              blurDataURL,
              category,
            }))}
          />
        ) : (
          <p className="text-muted-foreground">Photos are coming soon.</p>
        )}

        {videos.length > 0 && (
          <section aria-labelledby="videos-title" className="mt-20">
            <h2 id="videos-title" className="mb-8 text-4xl">Videos</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {videos.map((v) => (
                <VideoEmbed key={v.youtubeId} id={v.youtubeId} title={v.title} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
