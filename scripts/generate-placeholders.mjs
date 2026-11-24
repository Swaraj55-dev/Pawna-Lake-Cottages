/**
 * Generates tasteful golden-hour gradient placeholder photos into
 * public/images/<category>/ using sharp. Safe to re-run: it only writes
 * files named `placeholder-*.webp` and never touches your real photos.
 *
 *   node scripts/generate-placeholders.mjs          # create missing
 *   node scripts/generate-placeholders.mjs --clean  # delete all placeholders
 */
import sharp from "sharp";
import { mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public", "images");
const clean = process.argv.includes("--clean");

// Seeded RNG so output is stable between runs.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const palettes = {
  dusk: ["#0a2a30", "#0e3b43", "#6b4a52", "#f2a65a"],
  golden: ["#2b3f4a", "#7a5a4a", "#e08a4a", "#f7c98b"],
  morning: ["#cfe0dc", "#e9d9c0", "#f5efe6", "#f2a65a"],
  night: ["#05080c", "#0a1a22", "#0e3b43", "#1d4b50"],
};

function scene({ w, h, kind, palette, seed, label }) {
  const r = rng(seed);
  const [c0, c1, c2, c3] = palettes[palette];
  const horizon = h * (0.5 + r() * 0.12);
  const sunX = w * (0.25 + r() * 0.5);
  const sunY = horizon - h * (0.05 + r() * 0.12);

  const hill = (base, amp, color, opacity) => {
    let d = `M0 ${h} L0 ${base}`;
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const x = (w / steps) * i;
      const y = base - amp * (0.3 + r());
      d += ` Q ${x - w / steps / 2} ${y} ${x} ${base - amp * r() * 0.4}`;
    }
    return `<path d="${d} L${w} ${h} Z" fill="${color}" opacity="${opacity}"/>`;
  };

  const stars =
    palette === "night"
      ? Array.from({ length: 140 }, () => {
          const x = r() * w;
          const y = r() * horizon * 0.95;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r() * 1.6 + 0.3).toFixed(2)}" fill="#fff" opacity="${(r() * 0.7 + 0.2).toFixed(2)}"/>`;
        }).join("")
      : "";

  const ripples = Array.from({ length: 26 }, (_, i) => {
    const y = horizon + 8 + i * ((h - horizon) / 26);
    const len = w * (0.08 + r() * 0.25);
    const x = sunX - len / 2 + (r() - 0.5) * 120;
    return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${len.toFixed(0)}" height="${(2 + r() * 3).toFixed(1)}" rx="2" fill="${palette === "night" ? "#9fd3d6" : c3}" opacity="${(0.12 + r() * 0.25).toFixed(2)}"/>`;
  }).join("");

  // Small A-frame cottage silhouette with a glowing window.
  const cottage = (cx, base, s) => `
    <g transform="translate(${cx} ${base}) scale(${s})">
      <path d="M-60 0 L0 -80 L60 0 Z" fill="#14201f"/>
      <rect x="-46" y="-4" width="92" height="8" fill="#14201f"/>
      <path d="M-14 0 L0 -26 L14 0 Z" fill="#f2a65a"/>
      <circle cx="0" cy="-10" r="70" fill="url(#glow)"/>
    </g>`;

  const extras = {
    cottage: cottage(w * (0.3 + r() * 0.4), horizon + 2, 1.4 + r()),
    lake: "",
    food: Array.from({ length: 22 }, () => `<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(20 + r() * 70).toFixed(0)}" fill="#f2a65a" opacity="${(0.08 + r() * 0.18).toFixed(2)}"/>`).join(""),
    fire: `<g transform="translate(${w / 2} ${h * 0.82})">
        <circle r="${h * 0.35}" fill="url(#glow)"/>
        <path d="M-40 0 Q-30 -90 0 -150 Q30 -90 40 0 Z" fill="#f2a65a" opacity="0.9"/>
        <path d="M-20 0 Q-10 -60 0 -95 Q14 -60 20 0 Z" fill="#ffe0a8"/>
      </g>`,
  }[kind];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c0}"/><stop offset="0.55" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c0}"/>
    </linearGradient>
    <radialGradient id="sun"><stop offset="0" stop-color="${c3}" stop-opacity="1"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#f2a65a" stop-opacity="0.55"/><stop offset="1" stop-color="#f2a65a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  ${stars}
  <circle cx="${sunX}" cy="${sunY}" r="${h * 0.32}" fill="url(#sun)" opacity="0.8"/>
  <circle cx="${sunX}" cy="${sunY}" r="${h * 0.05}" fill="${palette === "night" ? "#f5efe6" : c3}"/>
  ${hill(horizon - h * 0.02, h * 0.16, "#2f4f3a", 0.55)}
  ${hill(horizon + 4, h * 0.1, "#14201f", 0.75)}
  <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#water)"/>
  ${ripples}
  ${extras}
  <text x="32" y="${h - 32}" font-family="Georgia, serif" font-size="${Math.round(h * 0.03)}" fill="#f5efe6" opacity="0.75">${label}</text>
</svg>`;
}

const plan = {
  aroma: { count: 4, kind: "cottage", palettes: ["golden", "dusk", "morning", "dusk"] },
  bella: { count: 4, kind: "cottage", palettes: ["dusk", "golden", "night", "morning"] },
  lake: { count: 3, kind: "lake", palettes: ["morning", "golden", "dusk"] },
  food: { count: 3, kind: "food", palettes: ["dusk", "golden", "night"] },
  activities: { count: 3, kind: "fire", palettes: ["night", "dusk", "golden"] },
  night: { count: 3, kind: "lake", palettes: ["night", "night", "night"] },
};

const sizes = [
  [1600, 1067], // landscape 3:2
  [1067, 1600], // portrait 2:3
  [1600, 1200], // 4:3
];

async function main() {
  for (const [cat, cfg] of Object.entries(plan)) {
    const dir = path.join(ROOT, cat);
    await mkdir(dir, { recursive: true });
    if (clean) {
      for (const f of await readdir(dir)) if (f.startsWith("placeholder-")) await unlink(path.join(dir, f));
      continue;
    }
    for (let i = 0; i < cfg.count; i++) {
      const [w, h] = sizes[i % sizes.length];
      const label = `Placeholder · ${cat[0].toUpperCase()}${cat.slice(1)} ${i + 1}`;
      const svg = scene({ w, h, kind: cfg.kind, palette: cfg.palettes[i], seed: cat.length * 97 + i * 13, label });
      const out = path.join(dir, `placeholder-${String(i + 1).padStart(2, "0")}.webp`);
      await sharp(Buffer.from(svg)).webp({ quality: 72 }).toFile(out);
      console.log("wrote", path.relative(process.cwd(), out));
    }
  }
  if (!clean) {
    const svg = scene({ w: 1920, h: 1080, kind: "cottage", palette: "dusk", seed: 7, label: "" });
    await sharp(Buffer.from(svg)).webp({ quality: 70 }).toFile(path.join(ROOT, "hero-poster.webp"));
    const mobile = scene({ w: 900, h: 1600, kind: "cottage", palette: "dusk", seed: 7, label: "" });
    await sharp(Buffer.from(mobile)).webp({ quality: 70 }).toFile(path.join(ROOT, "hero-poster-mobile.webp"));
    console.log("wrote hero posters");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
