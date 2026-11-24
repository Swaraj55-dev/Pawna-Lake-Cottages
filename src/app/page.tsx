import Link from "next/link";
import { site } from "@/config/site";

// Phase 1 placeholder — the full scroll-story home page is built in Phase 2.
export default function Home() {
  return (
    <section className="relative flex min-h-dvh items-center bg-[radial-gradient(ellipse_at_70%_80%,#f2a65a55,transparent_55%),linear-gradient(180deg,#0a2a30,#0e3b43_60%,#2f4f3a)] text-sand">
      <div className="container-page pt-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-sunset">
          Pawna Lake · Maval
        </p>
        <h1 className="max-w-3xl text-5xl leading-[1.05] md:text-7xl">{site.tagline}</h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/book" className="inline-flex min-h-12 items-center rounded-full bg-sunset px-6 font-semibold text-ink">
            Book your cottage
          </Link>
          <Link href="/gallery" className="glass inline-flex min-h-12 items-center rounded-full px-6 font-semibold">
            Explore the camp
          </Link>
        </div>
      </div>
    </section>
  );
}
