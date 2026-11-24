import { cottages, getCottage, site } from "@/config/site";
import { getImages } from "@/lib/images";
import { formatINR, fromPrice } from "@/lib/format";
import { OG_SIZE, renderOg } from "@/lib/og";

export const alt = "Cottage at Pawna Lake";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return cottages.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCottage(slug) ?? cottages[0];
  const img = (await getImages(c.slug))[0]?.src;
  const from = fromPrice(c);
  return renderOg({
    eyebrow: "Pawna Lake cottage",
    title: c.name,
    subtitle: `Up to ${c.maxGuests} guests${from ? ` · from ${formatINR(from)} / person` : ""}`,
    image: img,
    footer: site.name,
  });
}
