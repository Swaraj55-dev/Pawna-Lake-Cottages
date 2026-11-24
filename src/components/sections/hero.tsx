import Link from "next/link";
import { getImageProps } from "next/image";
import { ChevronDown } from "lucide-react";
import { site } from "@/config/site";
import { Magnetic } from "@/components/motion/magnetic";

/**
 * Full-screen hero. Phase 2: static art-directed poster.
 * Phase 3 layers the lazy React Three Fiber scene on top of this poster.
 */
export function Hero({ children }: { children?: React.ReactNode }) {
  const common = { alt: "", sizes: "100vw", quality: 75 };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: "/images/hero-poster.webp", width: 1920, height: 1080 });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({
    ...common,
    src: "/images/hero-poster-mobile.webp",
    width: 900,
    height: 1600,
    fetchPriority: "high",
    loading: "eager",
  });

  return (
    <section aria-labelledby="hero-title" className="relative isolate flex h-[100svh] min-h-[560px] items-end overflow-hidden bg-lake-deep text-sand">
      <picture className="absolute inset-0 -z-20">
        <source media="(min-width: 768px)" srcSet={desktop} />
        <source srcSet={mobile} />
        <img {...rest} alt="" className="h-full w-full object-cover" />
      </picture>

      {/* 3D scene slot (Phase 3) */}
      {children}

      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/30" aria-hidden />

      <div className="container-page pb-24 md:pb-28">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-sunset md:text-sm">
          Pawna Lake · Maval · Pune
        </p>
        <h1 id="hero-title" className="max-w-4xl text-5xl leading-[1.02] sm:text-6xl md:text-8xl">
          {site.tagline}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-sand/85 md:text-xl">
          Lakeside Aroma &amp; Bella cottages for Pawna Lake camping — a slow, golden-hour escape
          near Pune and Lonavala.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Magnetic>
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center rounded-full bg-sunset px-7 text-base font-semibold text-ink shadow-lg shadow-sunset/20 transition-colors hover:bg-[#f5b673]"
            >
              Book your cottage
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="#cottages"
              className="glass inline-flex min-h-12 items-center rounded-full px-7 text-base font-semibold text-sand transition-colors hover:bg-sand/20"
            >
              Explore the camp
            </Link>
          </Magnetic>
        </div>
      </div>

      <a
        href="#cottages"
        aria-label="Scroll to cottages"
        className="absolute bottom-5 left-1/2 hidden size-11 -translate-x-1/2 items-center justify-center rounded-full text-sand/80 motion-safe:animate-bounce md:inline-flex"
      >
        <ChevronDown className="size-6" aria-hidden />
      </a>
    </section>
  );
}
