"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Lightweight YouTube embed: shows the thumbnail and only loads the
 * (privacy-enhanced) player iframe after the visitor clicks play.
 */
export function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0"
          aria-label={`Play video: ${title}`}
        >
          <Image
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            quality={60}
            className="object-cover opacity-85 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-sunset text-ink shadow-xl transition-transform group-hover:scale-110">
              <Play className="ml-1 size-7 fill-current" aria-hidden />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4 text-left font-semibold text-sand">
            {title}
          </span>
        </button>
      )}
    </div>
  );
}
