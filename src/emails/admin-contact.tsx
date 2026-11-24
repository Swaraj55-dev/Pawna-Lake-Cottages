import { Details, EmailLayout, H1, P } from "./layout";

/** Sent to ADMIN_EMAIL for every contact-form message. Reply-To is the visitor. */
export default function AdminContactEmail({
  brand,
  m,
}: {
  brand: string;
  m: { name: string; email: string | null; phone: string; message: string };
}) {
  return (
    <EmailLayout brand={brand} preview={`New message from ${m.name}: ${m.message.slice(0, 80)}`}>
      <H1>New website message</H1>
      <Details
        rows={[
          ["Name", m.name],
          ["Email", m.email ?? "Not provided"],
          ["Phone", m.phone || "—"],
        ]}
      />
      <P>
        <span style={{ whiteSpace: "pre-wrap" }}>{m.message}</span>
      </P>
      <P muted>
        {m.email ? `Reply to this email to answer ${m.name} directly.` : `Call ${m.name} at ${m.phone} to follow up.`}
      </P>
    </EmailLayout>
  );
}
