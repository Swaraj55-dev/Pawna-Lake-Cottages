import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/links";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/", "/book/success/"] }],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
