import { Btn, CodeBox, colors, Details, EmailLayout, H1, P } from "./layout";
import type { EmailBooking, EmailSite } from "./types";

/** Sent to ADMIN_EMAIL when money arrived but the booking can't be honoured. */
export default function AdminPaymentIssueEmail({
  b,
  site,
  issue,
  paymentId,
}: {
  b: EmailBooking;
  site: EmailSite;
  issue: "refund_required" | "duplicate_payment";
  paymentId: string;
}) {
  const title = issue === "duplicate_payment" ? "Duplicate payment received" : "Payment received — refund needed";
  return (
    <EmailLayout brand={site.name} preview={`${title}: ${b.code} (${paymentId})`}>
      <H1>⚠️ {title}</H1>
      <P>
        {issue === "duplicate_payment"
          ? "This booking was already paid and confirmed, but a second payment arrived for the same order."
          : "The guest paid after their 15-minute hold expired and the cottage is no longer available (or the booking was cancelled)."}{" "}
        Please refund payment <strong>{paymentId}</strong> from the Razorpay dashboard, or contact the guest to offer other dates.
      </P>
      <CodeBox code={b.code} />
      <Details
        rows={[
          ["Guest", b.name],
          ["Phone", b.phone],
          ["Email", b.email ?? "—"],
          ["Cottage", `${b.cottageName} × ${b.cottagesCount}`],
          ["Dates", `${b.checkIn} → ${b.checkOut}`],
          ["Amount", b.paid],
          ["Payment ID", paymentId],
        ]}
      />
      <Btn href="https://dashboard.razorpay.com/app/payments" color={colors.lake} text={colors.sand}>
        Open Razorpay
      </Btn>
      <Btn href={site.adminUrl}>Open admin</Btn>
    </EmailLayout>
  );
}
