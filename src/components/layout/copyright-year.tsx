import { cacheLife } from "next/cache";

/** Cached so the footer stays in the static shell (Cache Components). */
export async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
