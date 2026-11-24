import { Suspense } from "react";
import { Navbar, NavbarFallback } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { FloatingContact } from "@/components/contact/floating-contact";

/** Public website chrome: navbar, footer, smooth scroll, floating WhatsApp/call. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grain flex min-h-dvh flex-col">
      <SmoothScroll />
      {/* usePathname() is request-time data on dynamic routes -> Suspense keeps a static shell */}
      <Suspense fallback={<NavbarFallback />}>
        <Navbar />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <FloatingContact />
      </Suspense>
    </div>
  );
}
