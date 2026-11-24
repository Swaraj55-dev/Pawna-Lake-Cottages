import type { MetadataRoute } from "next";
import { cottages } from "@/config/site";
import { siteUrl } from "@/lib/links";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    ...cottages.map((c) => ({ path: `/cottages/${c.slug}`, priority: 0.9, changeFrequency: "weekly" as const })),
    { path: "/book", priority: 0.9, changeFrequency: "weekly" },
    { path: "/gallery", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
    { path: "/policies", priority: 0.3, changeFrequency: "yearly" },
  ];
  return pages.map((p) => ({ url: siteUrl(p.path), priority: p.priority, changeFrequency: p.changeFrequency }));
}
