"use client";

import { useEffect, useMemo, useState } from "react";
import { MasonryGrid } from "./masonry-grid";
import type { LightboxImage } from "./lightbox";
import { cn } from "@/lib/utils";

type Img = LightboxImage & { category: string };

/** Filter tabs + masonry. The active tab is mirrored in ?c= so it can be shared. */
export function GalleryBrowser({
  images,
  tabs,
}: {
  images: Img[];
  tabs: { key: string; label: string }[];
}) {
  const [active, setActive] = useState("all");

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c");
    // Sync from the URL once on mount (not available during prerender).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (c && tabs.some((t) => t.key === c)) setActive(c);
  }, [tabs]);

  const select = (key: string) => {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === "all") url.searchParams.delete("c");
    else url.searchParams.set("c", key);
    window.history.replaceState(null, "", url);
  };

  const shown = useMemo(
    () => (active === "all" ? images : images.filter((i) => i.category === active)),
    [active, images],
  );

  const all = [{ key: "all", label: "All" }, ...tabs];

  return (
    <>
      <div
        role="tablist"
        aria-label="Filter photos"
        className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        data-lenis-prevent
      >
        {all.map((t) => {
          const count = t.key === "all" ? images.length : images.filter((i) => i.category === t.key).length;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={active === t.key}
              aria-controls="gallery-panel"
              onClick={() => select(t.key)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                active === t.key ? "bg-lake text-sand" : "bg-card text-ink ring-1 ring-ink/10 hover:bg-muted",
              )}
            >
              {t.label}
              <span className={cn("text-xs", active === t.key ? "text-sand/70" : "text-muted-foreground")}>{count}</span>
            </button>
          );
        })}
      </div>
      <div id="gallery-panel" role="tabpanel" aria-live="polite">
        {/* key resets the grid (and its lightbox index) when the filter changes */}
        <MasonryGrid key={active} images={shown} />
      </div>
    </>
  );
}
