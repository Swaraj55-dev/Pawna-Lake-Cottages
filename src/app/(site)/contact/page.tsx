import type { Metadata } from "next";
import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import { site } from "@/config/site";
import { directionsUrl } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { ContactForm } from "@/components/contact/contact-form";
import { PageHeader } from "@/components/sections/page-header";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Contact ${site.name} at Pawna Lake, Maval — questions about our lakeside cottages near Pune & Lonavala, group stays and directions.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const wa = whatsappLink();
  const quick = [
    wa && { href: wa, label: "WhatsApp", value: "Fastest reply", Icon: WhatsAppIcon, external: true },
    site.phone && { href: `tel:${site.phone}`, label: "Call", value: site.phone, Icon: Phone, external: false },
    site.email && { href: `mailto:${site.email}`, label: "Email", value: site.email, Icon: Mail, external: false },
    { href: directionsUrl(), label: "Directions", value: "Open in Google Maps", Icon: Navigation, external: true },
  ].filter(Boolean) as { href: string; label: string; value: string; Icon: React.ComponentType<{ className?: string }>; external: boolean }[];

  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to us" intro="Questions about dates, groups or getting here? Send a message or reach us directly." />
      <div className="container-page grid gap-10 pb-20 lg:grid-cols-[1fr_380px]">
        <ContactForm />
        <aside aria-label="Other ways to reach us" className="space-y-3">
          {quick.map(({ href, label, value, Icon, external }) => (
            <a
              key={label}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex min-h-16 items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-ink/5 transition-shadow hover:shadow-md"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-lake text-sunset">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="text-sm text-muted-foreground">{value}</span>
              </span>
            </a>
          ))}
          {site.address && (
            <p className="flex gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-ink/5">
              <MapPin className="mt-0.5 size-5 shrink-0 text-lake" aria-hidden /> {site.address}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
