import { site } from "@/config/site";
import { getImages } from "@/lib/images";
import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = `${site.name} — lakeside cottages at Pawna Lake near Pune & Lonavala`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const lake = (await getImages("lake"))[0]?.src ?? "/images/hero-poster.webp";
  return renderOg({
    eyebrow: "Pawna Lake · Maval · Pune",
    title: site.tagline,
    subtitle: "Lakeside Aroma & Bella cottages near Pune and Lonavala",
    image: lake.startsWith("/images/lake/placeholder") ? "/images/hero-poster.webp" : lake,
    footer: site.name,
  });
}
