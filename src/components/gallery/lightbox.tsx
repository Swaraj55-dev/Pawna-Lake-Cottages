"use client";

import Image from "next/image";
import { useRef } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
};

/**
 * Full-screen, keyboard- and swipe-navigable image viewer.
 * Arrow keys / buttons to navigate, Esc to close, horizontal swipe on touch.
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const open = index !== null;
  const current = open ? images[index] : null;
  const go = (d: number) => {
    if (index === null) return;
    onIndexChange((index + d + images.length) % images.length);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-ink/95 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-[71] flex flex-col text-sand outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <div className="flex items-center justify-between gap-4 p-3 sm:p-4">
            <DialogPrimitive.Title className="truncate text-sm text-sand/80">
              {current?.alt}
            </DialogPrimitive.Title>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm tabular-nums text-sand/70" aria-live="polite">
                {index !== null ? `${index + 1} / ${images.length}` : ""}
              </span>
              <DialogPrimitive.Close
                aria-label="Close gallery"
                className="inline-flex size-11 items-center justify-center rounded-full bg-sand/10 hover:bg-sand/20"
              >
                <X className="size-5" aria-hidden />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className="relative flex-1 touch-pan-y select-none"
            onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
            onPointerUp={(e) => {
              if (!start.current) return;
              const dx = e.clientX - start.current.x;
              const dy = e.clientY - start.current.y;
              start.current = null;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
            }}
          >
            {current && (
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                quality={75}
                placeholder={current.blurDataURL ? "blur" : "empty"}
                blurDataURL={current.blurDataURL}
                className="object-contain p-2 sm:p-6"
              />
            )}
          </div>

          {images.length > 1 && (
            <div className="flex justify-center gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="inline-flex size-12 items-center justify-center rounded-full bg-sand/10 hover:bg-sand/20"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next image"
                className="inline-flex size-12 items-center justify-center rounded-full bg-sand/10 hover:bg-sand/20"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
