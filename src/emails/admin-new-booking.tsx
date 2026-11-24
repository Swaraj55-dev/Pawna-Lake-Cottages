import { Btn, CodeBox, colors, Details, EmailLayout, H1, P } from "./layout";
import type { EmailBooking, EmailSite } from "./types";

/** Sent to ADMIN_EMAIL for every newly confirmed booking. */
export default function AdminNewBookingEmail({ b, site }: { b: EmailBooking; site: EmailSite }) {
  return (
    <EmailLayout brand={site.name} preview={`New booking ${b.code}: ${b.cottageName}, ${b.checkIn} — ${b.paid} paid`}>
      <H1>New booking 🎉</H1>
      <CodeBox code={b.code} />
      {b.statusNote && (
        <P>
          <strong style={{ color: colors.forest }}>Note:</strong> {b.statusNote}
        </P>
      )}
      <Details
        rows={[
          ["Cottage", `${b.cottageName} × ${b.cottagesCount}`],
          ["Check-in", b.checkIn],
          ["Check-out", b.checkOut],
          ["Nights / guests", `${b.nights} / ${b.guests} (${b.partySummary})`],
          ["Food preferences", b.foodSummary ?? "Not specified"],
          ["Guest", b.name],
          ["Phone", b.phone],
          ["Email", b.email ?? "—"],
          ["Total", b.total],
          ["Paid", b.paid],
          ["Balance due", b.balance],
          ["Source", b.source],
        ]}
      />
      {b.notes && (
        <P>
          <strong>Special requests:</strong> {b.notes}
        </P>
      )}
      <Btn href={site.adminUrl} color={colors.lake} text={colors.sand}>
        Open admin
      </Btn>
    </EmailLayout>
  );
}
