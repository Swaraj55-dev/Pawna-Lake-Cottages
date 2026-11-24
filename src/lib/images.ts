import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { cacheLife } from "next/cache";
import { galleryCategories, type GalleryCategory } from "@/config/site";

export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL: string;
  category: GalleryCategory;
  placeholder: boolean;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;
const ROOT = path.join(process.cwd(), "public", "images");

const categoryLabel = Object.fromEntries(galleryCategories.map((c) => [c.key, c.label])) as Record<
  GalleryCategory,
  string
>;

function altFromFilename(file: string, category: GalleryCategory, placeholder: boolean) {
  const label = category === "aroma" || category === "bella" ? `${categoryLabel[category]} Cottage` : categoryLabel[category];
  if (placeholder) return `Placeholder image — ${label} at Pawna Lake`;
  const words = file.replace(IMAGE_EXT, "").replace(/[-_]+/g, " ").replace(/\d+/g, "").trim();
  return words ? `${label} — ${words}` : `${label} at Pawna Lake`;
}

/**
 * Reads every image in /public/images/<category>. If the folder contains any
 * real photos, generated `placeholder-*` files are ignored automatically.
 * Optional `_alt.json` in the folder maps filename → alt text.
 */
export async function getImages(category: GalleryCategory): Promise<SiteImage[]> {
  "use cache";
  cacheLife("max");

  const dir = path.join(ROOT, category);
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => IMAGE_EXT.test(f) && !f.startsWith("panorama")).sort();
  } catch {
    return [];
  }
  const real = files.filter((f) => !f.startsWith("placeholder-"));
  const chosen = real.length > 0 ? real : files;

  let altMap: Record<string, string> = {};
  try {
    altMap = JSON.parse(await readFile(path.join(dir, "_alt.json"), "utf8"));
  } catch {
    /* optional */
  }

  return Promise.all(
    chosen.map(async (file) => {
      const full = path.join(dir, file);
      const img = sharp(full);
      const meta = await img.metadata();
      const blur = await img.resize(12).webp({ quality: 40 }).toBuffer();
      const placeholder = file.startsWith("placeholder-");
      return {
        src: `/images/${category}/${file}`,
        alt: altMap[file] ?? altFromFilename(file, category, placeholder),
        width: meta.width ?? 1600,
        height: meta.height ?? 1067,
        blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
        category,
        placeholder,
      };
    }),
  );
}

/** URL of /public/images/<slug>/panorama.(jpg|webp) if present, else null. */
export async function getPanorama(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("max");
  try {
    const f = (await readdir(path.join(ROOT, slug))).find((n) => /^panorama\.(jpe?g|webp)$/i.test(n));
    return f ? `/images/${slug}/${f}` : null;
  } catch {
    return null;
  }
}

export async function getAllImages(): Promise<SiteImage[]> {
  const groups = await Promise.all(galleryCategories.map((c) => getImages(c.key)));
  return groups.flat();
}

/** Round-robin across categories so a teaser shows variety. */
export async function getTeaserImages(count = 8): Promise<SiteImage[]> {
  const order: GalleryCategory[] = ["lake", "aroma", "food", "night", "bella", "activities"];
  const groups = await Promise.all(order.map((c) => getImages(c)));
  const out: SiteImage[] = [];
  for (let i = 0; out.length < count; i++) {
    let added = false;
    for (const g of groups) {
      if (g[i] && out.length < count) {
        out.push(g[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
