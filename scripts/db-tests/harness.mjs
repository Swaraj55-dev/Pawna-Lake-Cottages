/**
 * Shared PGlite harness for the database tests.
 *  - Stubs the Supabase roles (anon / authenticated / service_role), the
 *    `auth.jwt()` function and Supabase's default table grants.
 *  - Installs pgcrypto in the `extensions` schema, as on Supabase.
 *  - Applies the given migrations twice (they must be re-runnable).
 *  - Rebases the fixed test dates (Dec 2026 – Feb 2027) to "today + 30 days",
 *    so the suites keep passing as time moves on (bookings must start today or later).
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";

const ANCHOR = Date.UTC(2026, 11, 1); // 2026-12-01 in the test sources
const BASE = (() => {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 30);
})();
const DATE_RE = /\b(2026-12-\d{2}|2027-0[1-2]-\d{2})\b/g;

/** Maps a fixed test date to the same offset from (today + 30 days). */
export function rebaseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const offsetDays = Math.round((Date.UTC(y, m - 1, d) - ANCHOR) / 86_400_000);
  return new Date(BASE + offsetDays * 86_400_000).toISOString().slice(0, 10);
}
const rebase = (v) => (typeof v === "string" ? v.replace(DATE_RE, (s) => rebaseDate(s)) : v);

export const SUPABASE_STUBS = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.jwt() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  create schema if not exists extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
  create extension if not exists pgcrypto with schema extensions;
  -- Supabase grants table privileges to these roles by default; RLS does the filtering
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

export async function createTestDb(migrationPaths) {
  const raw = new PGlite({ extensions: { pgcrypto } });
  await raw.exec(SUPABASE_STUBS);
  for (const f of migrationPaths) await raw.exec(readFileSync(f, "utf8"));
  for (const f of migrationPaths) await raw.exec(readFileSync(f, "utf8")); // re-runnable
  console.log(`${migrationPaths.length} migration(s) applied twice`);
  return {
    raw,
    query: (sql, params) => raw.query(rebase(sql), params?.map(rebase)),
    exec: (sql) => raw.exec(rebase(sql)),
  };
}

/** Tiny assertion helpers shared by the suites. */
export function makeAsserts(db) {
  const state = { pass: 0, fail: 0 };
  const ok = (cond, msg, extra = "") => {
    if (cond) state.pass++;
    else state.fail++;
    console.log(`  ${cond ? "✓" : "✗"} ${msg}`, cond ? "" : extra);
  };
  const expectError = async (sql, params, match, msg) => {
    try {
      await db.query(sql, params);
      ok(false, msg, "(no error raised)");
    } catch (e) {
      ok(String(e.message).includes(match), msg, `(got: ${e.message})`);
    }
  };
  const done = () => {
    console.log(`\n${state.pass} passed, ${state.fail} failed`);
    process.exit(state.fail ? 1 : 0);
  };
  return { ok, expectError, done, state };
}
