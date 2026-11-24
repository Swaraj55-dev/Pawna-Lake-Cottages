"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Images, Move3d, Rotate3d } from "lucide-react";
import { Lightbox, type LightboxImage } from "@/components/gallery/lightbox";
import { cn } from "@/lib/utils";

const PanoramaViewer = dynamic(() => import("@/components/three/panorama-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sand/70">Loading 360° view…</div>
  ),
});

/** Photos grid + optional "360° / 3D view" tab (only when a panorama exists). */
export function CottageMedia({
  name,
  images,
  panorama,
}: {
  name: string;
  images: LightboxImage[];
  panorama: string | null;
}) {
  const [tab, setTab] = useState<"photos" | "360">("photos");
  const [index, setIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const id = useId();

  const photos = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:grid-rows-2 sm:gap-3">
      {images.slice(0, 5).map((img, i) => (
        <button
          key={img.src}
          type="button"
          onClick={() => setIndex(i)}
          aria-label={`Open photo ${i + 1} of ${images.length}: ${img.alt}`}
          className={cn(
            "group relative overflow-hidden rounded-2xl",
            i === 0 ? "col-span-2 aspect-[4/3] sm:row-span-2 sm:aspect-auto" : "aspect-[4/3]",
          )}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes={i === 0 ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 640px) 20vw, 50vw"}
            quality={60}
            placeholder={img.blurDataURL ? "blur" : "empty"}
            blurDataURL={img.blurDataURL}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {i === 4 && images.length > 5 && (
            <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-lg font-semibold text-sand">
              +{images.length - 5} more
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <section aria-label={`${name} photos`}>
      {panorama && (
        <div role="tablist" aria-label="Media view" className="mb-4 inline-flex rounded-full bg-muted p-1">
          {(
            [
              ["photos", "Photos", Images],
              ["360", "360° / 3D view", Rotate3d],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              type="button"
              id={`${id}-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`${id}-panel-${key}`}
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                tab === key ? "bg-lake text-sand shadow" : "text-ink hover:bg-ink/5",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      )}

      <div
        role={panorama ? "tabpanel" : undefined}
        id={`${id}-panel-photos`}
        aria-labelledby={panorama ? `${id}-tab-photos` : undefined}
        hidden={tab !== "photos"}
      >
        {photos}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex(0)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-lake/30 px-5 text-sm font-semibold text-lake hover:bg-lake/5"
          >
            <Images className="size-4" aria-hidden /> View all {images.length} photos
          </button>
        )}
      </div>

      {panorama && (
        <div
          role="tabpanel"
          id={`${id}-panel-360`}
          aria-labelledby={`${id}-tab-360`}
          hidden={tab !== "360"}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-lake-deep sm:aspect-[16/9]">
            {tab === "360" && <PanoramaViewer src={panorama} autoRotate={!reduce} />}
            <p className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink/60 px-4 py-2 text-sm text-sand">
              <Move3d className="size-4" aria-hidden /> Drag to look around
            </p>
          </div>
        </div>
      )}

      <Lightbox images={images} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} />
    </section>
  );
}
