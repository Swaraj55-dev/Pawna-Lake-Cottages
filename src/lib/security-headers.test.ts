import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security response headers", () => {
  it("applies the security policy site-wide", async () => {
    const rules = await nextConfig.headers?.() ?? [];
    const globalRule = rules.find((rule) => rule.source === "/:path*");

    expect(globalRule).toBeDefined();
    const headers = new Map(globalRule?.headers.map(({ key, value }) => [key, value]));
    const csp = headers.get("Content-Security-Policy") ?? "";

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://checkout.razorpay.com");
    expect(csp).toContain("https://api.razorpay.com");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("https://www.google.com");
    expect(csp).toContain("https://www.youtube-nocookie.com");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain('payment=(self "https://checkout.razorpay.com")');
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
