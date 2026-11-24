import { site } from "@/config/site";
import {
  FacebookIcon,
  GoogleIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/ui/social-icons";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

const items = [
  { label: "Instagram", href: site.socials.instagram, Icon: InstagramIcon, cls: "from-[#833ab4] via-[#e1306c] to-[#f2a65a]" },
  { label: "Facebook", href: site.socials.facebook, Icon: FacebookIcon, cls: "from-[#1877f2] to-[#0e3b43]" },
  { label: "YouTube", href: site.socials.youtube, Icon: YoutubeIcon, cls: "from-[#c4302b] to-[#7a1d1a]" },
  { label: "Google reviews", href: site.socials.googleReviews, Icon: GoogleIcon, cls: "from-[#0e3b43] to-[#2f4f3a]" },
].filter((s) => s.href);

export function SocialStrip() {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="social-title" className="bg-lake py-20 text-sand md:py-24">
      <div className="container-page">
        <SectionHeading
          id="social-title"
          eyebrow="Stay in touch"
          title="Follow us for live updates"
          intro="Lake levels, sunsets, weekend availability and what’s cooking at the camp."
          align="center"
          tone="dark"
        />
        <Stagger as="ul" className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ label, href, Icon, cls }) => (
            <StaggerItem as="li" key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${cls} px-6 text-lg font-semibold text-white shadow-lg transition-transform hover:-translate-y-1`}
              >
                <Icon className="size-6" /> {label}
              </a>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
