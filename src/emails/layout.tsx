import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export const colors = {
  lake: "#0E3B43",
  sunset: "#F2A65A",
  sand: "#F5EFE6",
  forest: "#2F4F3A",
  ink: "#14201F",
  muted: "#4A5856",
};

const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const serif = "Georgia, 'Times New Roman', serif";

export function EmailLayout({ preview, brand, children }: { preview: string; brand: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.sand, fontFamily: font, color: colors.ink, margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#FBF8F3", borderRadius: 16, overflow: "hidden" }}>
          <Section style={{ backgroundColor: colors.lake, padding: "28px 32px" }}>
            <Text style={{ margin: 0, fontFamily: serif, fontSize: 22, color: colors.sand }}>{brand}</Text>
            <Text style={{ margin: "4px 0 0", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: colors.sunset }}>
              Pawna Lake · Maval
            </Text>
          </Section>
          <Section style={{ padding: "28px 32px" }}>{children}</Section>
        </Container>
      </Body>
    </Html>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Heading style={{ fontFamily: serif, fontWeight: 400, fontSize: 28, margin: "0 0 12px", color: colors.ink }}>{children}</Heading>;
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={{ fontSize: 15, lineHeight: "24px", margin: "0 0 12px", color: muted ? colors.muted : colors.ink }}>{children}</Text>;
}

export function CodeBox({ code }: { code: string }) {
  return (
    <Section style={{ backgroundColor: colors.lake, borderRadius: 12, padding: "16px", textAlign: "center", margin: "16px 0 20px" }}>
      <Text style={{ margin: 0, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#C9D3D1" }}>Booking code</Text>
      <Text style={{ margin: "4px 0 0", fontFamily: serif, fontSize: 30, letterSpacing: 3, color: colors.sand }}>{code}</Text>
    </Section>
  );
}

export function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <Section style={{ border: "1px solid #DDD3C4", borderRadius: 12, padding: "4px 16px", margin: "0 0 20px" }}>
      {rows.map(([k, v], i) => (
        <Row key={k} style={{ borderTop: i ? "1px solid #EBE3D7" : undefined }}>
          <Column style={{ padding: "10px 0", fontSize: 13, color: colors.muted, width: "42%", verticalAlign: "top" }}>{k}</Column>
          <Column style={{ padding: "10px 0", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{v}</Column>
        </Row>
      ))}
    </Section>
  );
}

export function Btn({ href, children, color = colors.sunset, text = colors.ink }: { href: string; children: ReactNode; color?: string; text?: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: color,
        color: text,
        padding: "12px 20px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        textDecoration: "none",
        margin: "0 8px 8px 0",
      }}
    >
      {children}
    </a>
  );
}

export const Divider = () => <Hr style={{ borderColor: "#DDD3C4", margin: "20px 0" }} />;
