import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
const db = new PGlite({ extensions: { pgcrypto } });
let pass = 0, fail = 0;
const ok = (c, m, x = "") => { if (c) pass++; else fail++; console.log(`  ${c ? "✓" : "✗"} ${m}`, c ? "" : x); };
const err = async (sql, params, match, m) => { try { await db.query(sql, params); ok(false, m, "(no error)"); } catch (e) { ok(e.message.includes(match), m, e.message); } };

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`);
for (const f of files) await db.exec(readFileSync(f, "utf8"));
for (const f of files) await db.exec(readFileSync(f, "utf8")); // all idempotent
console.log("3 migrations applied twice");

const mk = async (ci, co, n, status = "pending_payment") =>
  (await db.query(`select * from create_booking('bella',$1,$2,$3,$3,'G','9876543210',null,null,null,1000,500,null,'phone',$4)`, [ci, co, n, status])).rows[0];
const set = async (id, s, note = null) => (await db.query(`select * from admin_set_booking_status($1,$2,$3)`, [id, s, note])).rows[0];
const SQL = `select * from admin_set_booking_status($1,$2,$3)`;

const b = await mk("2026-12-04", "2026-12-06", 2);
let r = await set(b.id, "confirmed", "paid by UPI to owner");
ok(r.status === "confirmed" && r.expires_at === null && r.confirmed_at && r.status_note === "paid by UPI to owner", "pending -> confirmed clears hold, stamps confirmed_at, adds note");
r = await set(b.id, "completed");
ok(r.status === "completed", "confirmed -> completed");
r = await set(b.id, "confirmed");
ok(r.status === "confirmed", "completed -> confirmed (undo)");
r = await set(b.id, "confirmed");
ok(r.status === "confirmed", "same status is a no-op");
await err(SQL, [b.id, "pending_payment", null], "INVALID_TRANSITION", "confirmed -> pending_payment rejected");
r = await set(b.id, "cancelled", "guest cancelled");
ok(r.status === "cancelled" && /guest cancelled/.test(r.status_note), "confirmed -> cancelled with note appended");
ok((await db.query(`select available from get_availability('bella','2026-12-04','2026-12-05')`)).rows[0].available === 5, "cancel frees units");

// fill the dates, then try to re-activate the cancelled one
await mk("2026-12-04", "2026-12-05", 4, "confirmed");
await err(SQL, [b.id, "confirmed", null], "NOT_AVAILABLE", "re-activating when only 1 unit left (needs 2) is refused");
await err(SQL, [b.id, "completed", null], "INVALID_TRANSITION", "cancelled -> completed rejected");

const c = await mk("2026-12-15", "2026-12-16", 1);
await set(c.id, "cancelled");
ok((await set(c.id, "confirmed")).status === "confirmed", "cancelled -> confirmed when free");

// expired-but-not-yet-swept hold must re-check availability
const e = await mk("2026-12-20", "2026-12-21", 3);
await db.query(`update bookings set expires_at = now() - interval '1 minute' where id=$1`, [e.id]);
await mk("2026-12-20", "2026-12-21", 3, "confirmed"); // takes 3 of 5 (expired hold not counted)
await err(SQL, [e.id, "confirmed", null], "NOT_AVAILABLE", "expired pending hold re-checks availability before confirming");

await err(SQL, ["00000000-0000-4000-8000-000000000000", "confirmed", null], "NOT_FOUND", "unknown id");

await db.exec("set role anon");
await err(SQL, [c.id, "cancelled", null], "permission denied", "anon cannot change status");
await db.exec("reset role");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
