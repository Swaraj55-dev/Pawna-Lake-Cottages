"use client";

import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { site } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";
import { useEnquiry } from "@/components/contact/enquiry-store";

/** "Book on WhatsApp" with the current choices prefilled; falls back to call / contact form. */
export function WhatsAppFallback({
  title,
  message,
  tone = "info",
  compact = false,
}: {
  title?: string;
  message?: string;
  tone?: "info" | "warning";
  compact?: boolean;
}) {
  const enquiry = useEnquiry();
  const wa = whatsappLink(enquiry);

  const buttons = (
    <div className="flex flex-wrap gap-2">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1f7a4d] px-5 text-sm font-semibold text-white hover:bg-[#19663f]"
        >
          <WhatsAppIcon className="size-4" /> Book on WhatsApp
        </a>
      )}
      {site.phone && (
        <a
          href={`tel:${site.phone}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-lake/30 px-5 text-sm font-semibold text-lake hover:bg-lake/5"
        >
          <Phone className="size-4" aria-hidden /> Call {site.phone}
        </a>
      )}
      {!wa && !site.phone && (
        <Link
          href="/contact"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lake px-5 text-sm font-semibold text-sand hover:bg-lake-deep"
        >
          <MessageCircle className="size-4" aria-hidden /> Send us a message
        </Link>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Prefer to book by chat?</span>
        {buttons}
      </div>
    );
  }

  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "space-y-3 rounded-2xl p-5 ring-1",
        tone === "warning" ? "bg-sunset/15 ring-sunset/40" : "bg-lake/5 ring-lake/15",
      )}
    >
      {title && <p className="font-semibold">{title}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {buttons}
    </div>
  );
}
