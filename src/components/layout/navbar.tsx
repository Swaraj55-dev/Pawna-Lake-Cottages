"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinks, site } from "@/config/site";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Routes that open with a full-bleed dark hero, where the bar starts transparent. */
function hasDarkHero(pathname: string) {
  return pathname === "/" || pathname.startsWith("/cottages/");
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  const transparent = hasDarkHero(pathname) && !scrolled;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300",
        transparent
          ? "bg-gradient-to-b from-ink/50 to-transparent text-sand"
          : "glass-light text-ink shadow-[0_1px_0_rgb(20_32_31/0.08)]",
      )}
    >
      <nav
        aria-label="Main"
        className="container-page flex h-16 items-center justify-between gap-4 md:h-20"
      >
        <Link
          href="/"
          className="font-heading text-lg font-semibold leading-tight md:text-xl"
        >
          {site.name}
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors",
                    transparent ? "hover:bg-sand/15" : "hover:bg-lake/10",
                    active && (transparent ? "bg-sand/15" : "bg-lake/10"),
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {site.phone && (
            <a
              href={`tel:${site.phone}`}
              aria-label={`Call ${site.phone}`}
              className={cn(
                "hidden size-11 items-center justify-center rounded-full transition-colors sm:inline-flex",
                transparent ? "hover:bg-sand/15" : "hover:bg-lake/10",
              )}
            >
              <Phone className="size-5" aria-hidden />
            </a>
          )}
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center rounded-full bg-sunset px-5 text-sm font-semibold text-ink shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#f5b673]"
          >
            Book now
          </Link>

          <Sheet>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full lg:hidden",
                transparent ? "hover:bg-sand/15" : "hover:bg-lake/10",
              )}
            >
              <Menu className="size-6" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm bg-sand">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl">{site.name}</SheetTitle>
              </SheetHeader>
              <ul className="flex flex-col px-2">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <SheetClose
                      render={<Link href={l.href} />}
                      className="flex min-h-12 items-center rounded-lg px-3 text-lg text-ink hover:bg-lake/10"
                    >
                      {l.label}
                    </SheetClose>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-3 p-4">
                <SheetClose
                  render={<Link href="/book" />}
                  className="flex min-h-12 items-center justify-center rounded-full bg-lake font-semibold text-sand"
                >
                  Book your cottage
                </SheetClose>
                {site.phone && (
                  <a
                    href={`tel:${site.phone}`}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-lake/30 font-medium text-lake"
                  >
                    <Phone className="size-4" aria-hidden /> Call {site.phone}
                  </a>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
