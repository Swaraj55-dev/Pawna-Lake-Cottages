import type { Metadata } from "next";
import Link from "next/link";
import { cottages, policies, site } from "@/config/site";
import { PageHeader } from "@/components/sections/page-header";

export const metadata: Metadata = {
  title: "Policies — cancellation, terms & privacy",
  description: `Cancellation policy, booking terms and privacy policy for ${site.name}, Pawna Lake.`,
  alternates: { canonical: "/policies" },
};

/*
 * NOTE FOR THE OWNER: the terms and privacy text below describe how this
 * website actually works (payments, data, cookies). Have them reviewed for your
 * business before launch, and fill `policies` in src/config/site.ts.
 */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-ink/10 py-10">
      <h2 id={`${id}-title`} className="mb-4 text-3xl">
        {title}
      </h2>
      <div className="max-w-prose space-y-4 leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export default function PoliciesPage() {
  const contact = [site.email && `email ${site.email}`, site.phone && `call ${site.phone}`].filter(Boolean).join(" or ");
  return (
    <>
      <PageHeader eyebrow="Policies" title="Cancellation, terms & privacy" />
      <div className="container-page pb-20">
        <nav aria-label="On this page" className="mb-2 flex flex-wrap gap-2">
          {[
            ["#cancellation", "Cancellation"],
            ["#terms", "Booking terms"],
            ["#privacy", "Privacy"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-ink/10 hover:bg-muted">
              {label}
            </a>
          ))}
        </nav>

        <Section id="cancellation" title="Cancellation policy">
          {cottages.map((c) => (
            <div key={c.slug} className="space-y-3">
              <h3 className="text-xl font-semibold text-ink">{c.name}</h3>
              {c.cancellationPolicy ? (
                c.cancellationPolicy.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>
                  Please{" "}
                  <Link href="/contact" className="font-semibold text-lake underline underline-offset-4">contact us</Link> to confirm
                  the cancellation terms for {c.name} before booking.
                </p>
              )}
            </div>
          ))}
        </Section>

        <Section id="terms" title="Booking terms">
          <ul className="space-y-2">
            <li>
              Online bookings are confirmed once the cottage-specific advance is paid. The balance is payable at check-in:{" "}
              {cottages.map((c) => `${c.name} — ${c.advancePercent}%`).join("; ")}.
            </li>
            <li>
              While you complete payment, your cottage is held for {site.holdMinutes} minutes. If payment isn&apos;t completed in that time,
              the hold is released.
            </li>
            <li>
              Check-in is from <strong>{site.checkIn}</strong> and check-out is by <strong>{site.checkOut}</strong>.
            </li>
            <li>
              Maximum occupancy: {cottages.map((c) => `${c.name} — ${c.maxGuests} guests per cottage`).join("; ")}.
            </li>
            <li>
              Guest ages are counted on check-in. Guests aged 11 and above pay the adult rate; children aged 5–10 pay half the adult rate, rounded to the nearest rupee; children under 5 are free. All children count toward the cottage occupancy limit, and at least one adult is required per cottage.
            </li>
            <li>The price you pay is the one shown before payment, calculated for your exact dates, guests and cottages.</li>
            {policies.checkInNote && <li>{policies.checkInNote}</li>}
            {cottages.filter((c) => c.houseRules?.length).map((c) => (
              <li key={c.slug}>
                <strong>{c.name} house rules:</strong>
                <ul className="mt-2 space-y-1">
                  {c.houseRules?.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="privacy" title="Privacy policy">
          <p>
            <strong>What we collect.</strong> When you book or contact us we collect your name, phone number, optional email, stay dates, number of
            guest age groups, food preference counts and any requests you share. We use this only to manage your booking, contact you about your stay and send
            your confirmation.
          </p>
          <p>
            <strong>Payments.</strong> Online payments are processed by Razorpay. Your card, UPI or bank details go directly to Razorpay — we
            never see or store them. We keep the payment reference and amount paid.
          </p>
          <p>
            <strong>Service providers.</strong> Booking data is stored securely with Supabase (our database), confirmation emails are sent via
            Resend, the website is hosted on Vercel, and the location map is provided by Google Maps. These providers process data to provide
            their services; Google Maps may receive your device and connection information when the embedded map loads.
          </p>
          <p>
            <strong>Cookies & storage.</strong> We don&apos;t use advertising or tracking cookies. While you book, your choices are kept in
            your browser tab&apos;s session storage so a refresh doesn&apos;t lose them; it clears when you close the tab.
          </p>
          <p>
            <strong>Your choices.</strong> You can ask us to access, correct or delete your personal data{contact ? ` — ${contact}` : ""}{" "}
            or use our <Link href="/contact" className="font-semibold text-lake underline underline-offset-4">contact form</Link>. We keep
            booking records only as long as needed for your stay and our legal and accounting obligations.
          </p>
          {policies.lastUpdated && <p className="text-sm">Last updated: {policies.lastUpdated}</p>}
        </Section>
      </div>
    </>
  );
}
