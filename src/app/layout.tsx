import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";
import { Suspense } from "react";
import { Navbar, NavbarFallback } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { FloatingContact } from "@/components/contact/floating-contact";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — Pawna Lake cottages near Pune & Lonavala`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e3b43",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${inter.variable} antialiased`}>
      <body className="grain flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-sand focus:px-4 focus:py-3 focus:text-ink"
        >
          Skip to content
        </a>
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
      </body>
    </html>
  );
}
