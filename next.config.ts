import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const scriptSources = ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://vercel.live"];
const connectionSources = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com",
  "https://vercel.live",
];

if (isDevelopment) {
  scriptSources.push("'unsafe-eval'");
  connectionSources.push("ws://localhost:*", "http://localhost:*");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src ${scriptSources.join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://i.ytimg.com",
      "font-src 'self' data:",
      `connect-src ${connectionSources.join(" ")}`,
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://www.google.com https://maps.google.com https://www.youtube-nocookie.com https://vercel.live",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://api.razorpay.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75],
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  serverExternalPackages: ["sharp"],
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
