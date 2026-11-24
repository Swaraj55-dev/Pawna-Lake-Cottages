import { Link } from "@react-email/components";
import { Btn, CodeBox, colors, Details, Divider, EmailLayout, H1, P } from "./layout";
import type { EmailBooking, EmailSite } from "./types";

/** Sent to the guest when their advance payment is confirmed. */
export default function BookingConfirmationEmail({ b, site }: { b: EmailBooking; site: EmailSite }) {
  const first = b.name.split(" ")[0];
  return (
    <EmailLayout brand={site.name} preview={`Booking ${b.code} confirmed — ${b.cottageName}, ${b.checkIn}`}>
      <H1>{`You're booked, ${first}!`}</H1>
      <P muted>{`Your stay at ${site.name} is confirmed. We can't wait to welcome you to the lake.`}</P>
      <CodeBox code={b.code} />
      <Details
        rows={[
          ["Cottage", `${b.cottageName}${b.cottagesCount > 1 ? ` × ${b.cottagesCount}` : ""}`],
          ["Check-in", b.checkIn],
          ["Check-out", b.checkOut],
          ["Guests", `${b.guests}${b.foodPref ? ` · ${b.foodPref}` : ""}`],
          ["Nights", String(b.nights)],
          ["Total", b.total],
          ["Paid now", b.paid],
          ["Balance at check-in", b.balance],
        ]}
      />
      <Btn href={site.directionsUrl}>Get directions</Btn>
      {site.whatsappUrl && (
        <Btn href={site.whatsappUrl} color="#1F7A4D" text="#FFFFFF">
          WhatsApp us
        </Btn>
      )}
      <Btn href={site.bookingUrl} color={colors.lake} text={colors.sand}>
        View booking
      </Btn>
      <Divider />
      {site.address && <P muted>📍 {site.address}</P>}
      {site.phone && <P muted>📞 {site.phone}</P>}
      <P muted>Please carry a photo ID for every guest. Share your booking code when you arrive.</P>
      {site.cancellationPolicy && (
        <P muted>
          <strong>Cancellation policy:</strong> {site.cancellationPolicy}
        </P>
      )}
      <P muted>
        <Link href={site.siteUrl} style={{ color: colors.lake }}>
          {site.siteUrl.replace(/^https?:\/\//, "")}
        </Link>
      </P>
    </EmailLayout>
  );
}
