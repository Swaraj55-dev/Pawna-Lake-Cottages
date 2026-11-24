"use client";

import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { site } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { useEnquiry } from "./enquiry-store";

/**
 * Floating WhatsApp (prefilled with the current cottage/dates/guests) and
 * click-to-call buttons on every public page. Sits above any mobile bottom bar
 * via the --bottom-bar-h CSS variable.
 */
export function FloatingContact() {
  const pathname = usePathname();
  const enquiry = useEnquiry();
  const wa = whatsappLink(enquiry);

  if (pathname.startsWith("/admin")) return null;
  if (!wa && !site.phone) return null;

  return (
    <div
      className="fixed right-4 z-40 flex flex-col items-end gap-3 sm:right-6"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom) + var(--bottom-bar-h, 0px))" }}
    >
      {site.phone && (
        <a
          href={`tel:${site.phone}`}
          aria-label={`Call us at ${site.phone}`}
          className="inline-flex size-12 items-center justify-center rounded-full bg-lake text-sand shadow-lg shadow-ink/20 transition-transform hover:scale-105 md:hidden"
        >
          <Phone className="size-5" aria-hidden />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="group inline-flex h-14 items-center gap-2 rounded-full bg-[#1f7a4d] pl-4 pr-4 text-white shadow-lg shadow-ink/25 transition-[transform,padding] hover:scale-105 md:pr-5"
        >
          <WhatsAppIcon className="size-6" />
          <span className="hidden text-sm font-semibold md:inline">Book on WhatsApp</span>
        </a>
      )}
    </div>
  );
}
