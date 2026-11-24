// Tests admin_set_booking_status on PGlite with Supabase stubs.
import { createTestDb, makeAsserts } from "./harness.mjs";

const db = await createTestDb(process.argv.slice(2));
const { ok, expectError, done } = makeAsserts(db);
const err = (sql, params, match, m) => expectError(sql, params, match, m);

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

done();
