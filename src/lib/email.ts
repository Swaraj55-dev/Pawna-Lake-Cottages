import "server-only";
import { Resend } from "resend";
import { format } from "date-fns";
import { getCottage, policies, site } from "@/config/site";
import type { BookingRow } from "@/lib/supabase/types";
import BookingConfirmationEmail from "@/emails/booking-confirmation";
import AdminNewBookingEmail from "@/emails/admin-new-booking";
import AdminPaymentIssueEmail from "@/emails/admin-payment-issue";
import type { EmailBooking, EmailSite } from "@/emails/types";
import { adminEmails } from "./admin-emails";
import { isoToDate } from "./dates";
import { formatINR } from "./format";
import { directionsUrl, siteUrl } from "./links";
import { whatsappLink } from "./whatsapp";

let client: Resend | null = null;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function resend() {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** Use a verified domain in production, e.g. "Pawna Lake Cottages <bookings@yourdomain.com>". */
const fromAddress = () => process.env.EMAIL_FROM || `${site.name} <onboarding@resend.dev>`;


const FOOD = { veg: "Veg", non_veg: "Non-veg", jain: "Jain" } as const;

export function toEmailBooking(b: BookingRow): EmailBooking {
  const cottage = getCottage(b.cottage_slug);
  const fmt = (iso: string, time: string) => `${format(isoToDate(iso), "EEE, d MMM yyyy")}, ${time}`;
  return {
    id: b.id,
    code: b.booking_code,
    cottageName: cottage?.name ?? b.cottage_slug,
    cottagesCount: b.cottages_count,
    checkIn: fmt(b.check_in, site.checkIn),
    checkOut: fmt(b.check_out, site.checkOut),
    nights: b.nights,
    guests: b.guests,
    name: b.name,
    phone: b.phone,
    email: b.email,
    foodPref: b.food_pref ? FOOD[b.food_pref] : null,
    notes: b.notes,
    total: formatINR(b.total_amount),
    paid: formatINR(b.amount_paid),
    balance: formatINR(Math.max(b.total_amount - b.amount_paid, 0)),
    source: b.source,
    statusNote: b.status_note,
  };
}

export function emailSite(bookingId: string, cottageName?: string): EmailSite {
  return {
    name: site.name,
    address: site.address,
    phone: site.phone,
    whatsappUrl: whatsappLink({ cottageName }),
    directionsUrl: directionsUrl(),
    siteUrl: siteUrl(),
    bookingUrl: siteUrl(`/book/success/${bookingId}`),
    adminUrl: siteUrl("/admin"),
    cancellationPolicy: policies.cancellation,
  };
}

async function send(opts: { to: string[]; subject: string; react: React.ReactElement; idempotencyKey: string }) {
  if (!isEmailConfigured() || opts.to.length === 0) {
    console.warn(`[email] skipped "${opts.subject}" — ${!isEmailConfigured() ? "RESEND_API_KEY not set" : "no recipient"}`);
    return;
  }
  const { error } = await resend().emails.send(
    { from: fromAddress(), to: opts.to, subject: opts.subject, react: opts.react },
    { idempotencyKey: opts.idempotencyKey },
  );
  if (error) console.error(`[email] "${opts.subject}" failed:`, error);
}

/**
 * Guest confirmation + admin alert. Call only when the booking was *just* confirmed.
 * `notifyAdmin: false` for bookings the admin entered themselves.
 */
export async function sendBookingConfirmedEmails(b: BookingRow, opts: { notifyAdmin?: boolean } = {}) {
  const { notifyAdmin = true } = opts;
  const eb = toEmailBooking(b);
  const s = emailSite(b.id, eb.cottageName);
  await Promise.allSettled([
    b.email
      ? send({
          to: [b.email],
          subject: `Booking confirmed — ${eb.code} · ${eb.cottageName}`,
          react: BookingConfirmationEmail({ b: eb, site: s }),
          idempotencyKey: `guest-confirmed/${b.id}`,
        })
      : Promise.resolve(),
    send({
      to: notifyAdmin ? adminEmails() : [],
      subject: `New booking ${eb.code}: ${eb.cottageName}, ${format(isoToDate(b.check_in), "d MMM")} (${eb.guests} guests)`,
      react: AdminNewBookingEmail({ b: eb, site: s }),
      idempotencyKey: `admin-new/${b.id}`,
    }),
  ]);
}

export async function sendPaymentIssueEmail(b: BookingRow, issue: "refund_required" | "duplicate_payment", paymentId: string) {
  const eb = { ...toEmailBooking(b), paid: formatINR(b.amount_paid || b.advance_amount) };
  await send({
    to: adminEmails(),
    subject: `⚠️ Payment needs attention — ${eb.code} (${issue === "duplicate_payment" ? "duplicate" : "refund required"})`,
    react: AdminPaymentIssueEmail({ b: eb, site: emailSite(b.id, eb.cottageName), issue, paymentId }),
    idempotencyKey: `issue/${b.id}/${paymentId}`,
  });
}
