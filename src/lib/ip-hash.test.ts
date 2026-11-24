import { describe, expect, it } from "vitest";
import { hashClientIp } from "./ip-hash";

describe("hashClientIp (SEC-01)", () => {
  it("never returns the raw IP and is stable", () => {
    const h = hashClientIp("203.0.113.7");
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(h).not.toContain("203.0.113.7");
    expect(hashClientIp("203.0.113.7")).toBe(h);
    expect(hashClientIp("203.0.113.8")).not.toBe(h);
  });
  it("returns null for unknown IPs (so they aren't lumped together)", () => {
    expect(hashClientIp("unknown")).toBeNull();
    expect(hashClientIp(null)).toBeNull();
  });
});
