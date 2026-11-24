import "server-only";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Public image -> 1200×630 JPEG data URI (Satori can't read WebP/AVIF). */
async function background(publicPath: string | undefined) {
  if (!publicPath) return null;
  try {
    const buf = await sharp(path.join(process.cwd(), "public", publicPath))
      .resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover" })
      .jpeg({ quality: 78 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Branded share card: photo, dark gradient, serif-style title, amber eyebrow. */
export async function renderOg(opts: { eyebrow: string; title: string; subtitle?: string; image?: string; footer: string }) {
  const bg = await background(opts.image);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0a2a30" }}>
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={bg} width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} />
        )}
        {/* Satori doesn't support `inset` — use explicit box properties */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_SIZE.width,
            height: OG_SIZE.height,
            background: "linear-gradient(90deg, rgba(10,42,48,0.95) 0%, rgba(10,42,48,0.75) 45%, rgba(10,42,48,0.1) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 72, width: "100%" }}>
          <div style={{ color: "#F2A65A", fontSize: 26, letterSpacing: 8, textTransform: "uppercase" }}>{opts.eyebrow}</div>
          <div style={{ color: "#F5EFE6", fontSize: 84, lineHeight: 1.05, marginTop: 16, maxWidth: 820, fontFamily: "serif" }}>{opts.title}</div>
          {opts.subtitle && <div style={{ color: "rgba(245,239,230,0.85)", fontSize: 34, marginTop: 20, maxWidth: 760 }}>{opts.subtitle}</div>}
          <div style={{ display: "flex", alignItems: "center", marginTop: 40, color: "#F5EFE6", fontSize: 26 }}>
            <div style={{ width: 48, height: 4, background: "#F2A65A", marginRight: 16 }} />
            {opts.footer}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
