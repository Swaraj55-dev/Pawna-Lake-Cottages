import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { cottages, site } from "@/config/site";
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/ui/social-icons";
import { CopyrightYear } from "./copyright-year";

const socialLinks = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, href: site.socials.instagram },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon, href: site.socials.facebook },
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon, href: site.socials.youtube },
  { key: "google", label: "Google reviews", Icon: GoogleIcon, href: site.socials.googleReviews },
].filter((s) => s.href);

export function Footer() {
  return (
    <footer className="bg-lake-deep text-sand">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p className="font-heading text-2xl">{site.name}</p>
          <p className="text-sand/75">{site.tagline}</p>
          <p className="text-sm text-sand/75">
            Lakeside cottages at Pawna Lake, Maval — near Pune &amp; Lonavala.
          </p>
        </div>

        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest text-sunset">
            Stay
          </h2>
          <ul className="space-y-1">
            {cottages.map((c) => (
              <li key={c.slug}>
                <Link href={`/cottages/${c.slug}`} className="inline-flex min-h-11 items-center hover:text-sunset">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/gallery" className="inline-flex min-h-11 items-center hover:text-sunset">
                Gallery
              </Link>
            </li>
            <li>
              <Link href="/book" className="inline-flex min-h-11 items-center hover:text-sunset">
                Book a stay
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest text-sunset">
            Contact
          </h2>
          <address className="space-y-3 not-italic text-sand/90">
            {site.address && (
              <p className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {site.address}
              </p>
            )}
            {site.phone && (
              <a href={`tel:${site.phone}`} className="flex min-h-11 items-center gap-2 hover:text-sunset">
                <Phone className="size-4" aria-hidden /> {site.phone}
              </a>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className="flex min-h-11 items-center gap-2 hover:text-sunset">
                <Mail className="size-4" aria-hidden /> {site.email}
              </a>
            )}
            <Link href="/contact" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-sunset">
              Send us a message
            </Link>
          </address>
        </div>

        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-widest text-sunset">
            Policies
          </h2>
          <ul className="space-y-1">
            <li><Link href="/policies#cancellation" className="inline-flex min-h-11 items-center hover:text-sunset">Cancellation</Link></li>
            <li><Link href="/policies#terms" className="inline-flex min-h-11 items-center hover:text-sunset">Terms</Link></li>
            <li><Link href="/policies#privacy" className="inline-flex min-h-11 items-center hover:text-sunset">Privacy</Link></li>
          </ul>
          {socialLinks.length > 0 && (
            <ul className="mt-4 flex gap-2" aria-label="Social media">
              {socialLinks.map(({ key, label, Icon, href }) => (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex size-11 items-center justify-center rounded-full bg-sand/10 transition-colors hover:bg-sunset hover:text-ink"
                  >
                    <Icon className="size-5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-sand/10">
        <p className="container-page py-5 text-sm text-sand/70">
          © <CopyrightYear /> {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
