"use client";

import Image from "next/image";
import { Check, Users } from "lucide-react";
import type { CottageSlug } from "@/config/site";
import { cn } from "@/lib/utils";
import type { BookCottage } from "./types";

export function StepCottage({
  cottages,
  value,
  onChange,
}: {
  cottages: BookCottage[];
  value: CottageSlug | null;
  onChange: (slug: CottageSlug) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Cottage type" className="grid gap-4 sm:grid-cols-2">
      {cottages.map((c) => {
        const selected = value === c.slug;
        return (
          <button
            key={c.slug}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c.slug)}
            className={cn(
              "group relative overflow-hidden rounded-3xl bg-card text-left ring-2 transition-all",
              selected ? "ring-lake shadow-[0_20px_50px_-28px_rgb(14_59_67/0.6)]" : "ring-ink/10 hover:ring-lake/40",
            )}
          >
            <div className="relative aspect-[16/10] bg-gradient-to-br from-lake to-forest">
              {c.image && (
                <Image
                  src={c.image.src}
                  alt={c.image.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  quality={60}
                  placeholder={c.image.blurDataURL ? "blur" : "empty"}
                  blurDataURL={c.image.blurDataURL}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <span
                className={cn(
                  "absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                  selected ? "border-lake bg-lake text-sand" : "border-sand/80 bg-ink/30 text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-5" />
              </span>
            </div>
            <div className="space-y-2 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-heading text-2xl">{c.name}</span>
                <span className="text-sm">
                  {c.fromPrice ? (
                    <>
                      from <strong className="text-lake">{c.fromPrice}</strong>/person
                    </>
                  ) : (
                    <span className="text-muted-foreground">Price on request</span>
                  )}
                </span>
              </div>
              {c.shortDesc && <p className="text-sm text-muted-foreground">{c.shortDesc}</p>}
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="size-4 text-lake" aria-hidden /> Up to {c.maxGuests} guests per cottage
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
