import { site } from "@/config/site";

export function directionsUrl() {
  if (site.mapsDirectionsUrl) return site.mapsDirectionsUrl;
  const dest = site.address || `${site.name}, Pawna Lake, Maval, Pune`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

export function siteUrl(path = "") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
