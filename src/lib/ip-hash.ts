import "server-only";
import { createHmac } from "node:crypto";

/**
 * Salted, one-way hash of a client IP (SEC-01). Used only to limit active
 * booking holds per visitor; the raw IP is never stored (DPDP minimisation).
 * The salt is derived from a server secret, so hashes can't be reversed by
 * brute-forcing the IPv4 space without that secret.
 */
export function hashClientIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RAZORPAY_KEY_SECRET || "local-dev-only";
  return createHmac("sha256", `ip-hash:${secret}`).update(ip.trim()).digest("hex").slice(0, 32);
}
