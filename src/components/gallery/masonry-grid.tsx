"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Lightbox, type LightboxImage } from "./lightbox";

/** CSS-columns masonry of images; each tile opens the lightbox. */
/** `eagerCount`: tiles likely above the fold load eagerly (first one with high priority) for LCP. */
export function MasonryGrid({ images, eagerCount = 0 }: { images: LightboxImage[]; eagerCount?: number }) {
  const [index, setIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  return (
    <>
      <ul className="columns-2 gap-3 md:columns-3 md:gap-4 [&>li]:mb-3 md:[&>li]:mb-4">
        {images.map((img, i) => (
          <motion.li
            key={img.src}
            className="break-inside-avoid"
            // above-the-fold tiles render immediately (no fade) so they can be the LCP
            initial={reduce || i < eagerCount ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -5% 0px" }}
            transition={{ duration: 0.6, delay: (i % 3) * 0.06 }}
          >
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full overflow-hidden rounded-2xl"
              aria-label={`Open image: ${img.alt}`}
            >
              <Image
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                sizes="(min-width: 768px) 33vw, 50vw"
                quality={60}
                loading={i < eagerCount ? "eager" : "lazy"}
                fetchPriority={i === 0 && eagerCount > 0 ? "high" : undefined}
                placeholder={img.blurDataURL ? "blur" : "empty"}
                blurDataURL={img.blurDataURL}
                className="h-auto w-full transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-ink/40 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand className="size-5 text-sand" aria-hidden />
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
      <Lightbox images={images} index={index} onIndexChange={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}
