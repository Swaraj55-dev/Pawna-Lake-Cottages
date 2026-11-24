import Link from "next/link";
import { site } from "@/config/site";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center bg-lake-deep px-6 py-24 text-center text-sand">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sunset">404</p>
        <h1 className="mt-3 text-4xl md:text-5xl">Lost by the lake?</h1>
        <p className="mt-4 text-sand/80">This page doesn&apos;t exist. Let&apos;s get you back to {site.name}.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-sunset px-6 font-semibold text-ink">
            Go home
          </Link>
          <Link href="/book" className="glass inline-flex min-h-12 items-center rounded-full px-6 font-semibold">
            Book a cottage
          </Link>
        </div>
      </div>
    </main>
  );
}
