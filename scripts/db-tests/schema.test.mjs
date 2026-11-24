// Exercises availability, booking, expiry and RLS on PGlite with Supabase stubs.
import { createTestDb, makeAsserts } from "./harness.mjs";

const db = await createTestDb(process.argv.slice(2));
const { ok, expectError, done } = makeAsserts(db);

const avail = async (slug, from, to) =>
  (await db.query("select night::text, available, booked, blocked from get_availability($1,$2,$3)", [slug, from, to])).rows;
const book = (slug, ci, co, guests, cottages, extra = {}) =>
  db.query(
    `select * from create_booking($1,$2,$3,$4,$5,'Test Guest','9876543210','t@example.com','veg',null,1000,500,'{}'::jsonb${extra.status ? ",'phone','" + extra.status + "'" : ""})`,
    [slug, ci, co, guests, cottages],
  );

console.log("\navailability");
let a = await avail("aroma", "2026-12-01", "2027-01-01");
ok(a.length === 31 && a.every((r) => r.available === 5), "December: 31 nights, 5 units each");
ok((await avail("aroma", "2026-12-05", "2026-12-05")).length === 0, "empty range returns no rows");
ok((await avail("nope", "2026-12-01", "2026-12-03")).length === 0, "unknown cottage returns no rows");

console.log("\ncreate_booking");
const b1 = (await book("aroma", "2026-12-04", "2026-12-06", 6, 3)).rows[0];
ok(/^PWN-[2-9A-HJ-NP-Z]{5}$/.test(b1.booking_code), `readable booking code ${b1.booking_code}`);
ok(b1.status === "pending_payment" && b1.nights === 2, "pending_payment, nights generated = 2");
const holdMin = (new Date(b1.expires_at) - new Date(b1.created_at)) / 60000;
ok(Math.abs(holdMin - 15) < 0.1, "15-minute hold set", holdMin);
a = await avail("aroma", "2026-12-03", "2026-12-07");
ok(JSON.stringify(a.map((r) => r.available)) === "[5,2,2,5]", "only nights 4 & 5 reduced (check-out night free)", JSON.stringify(a));
await expectError(`select create_booking('aroma','2026-12-05','2026-12-06',6,3,'x','9876543210',null,null,null,1,0,null)`, [], "NOT_AVAILABLE", "overbooking rejected (needs 3, 2 left)");
await book("aroma", "2026-12-05", "2026-12-06", 4, 2);
ok((await avail("aroma", "2026-12-05", "2026-12-06"))[0].available === 0, "fills to exactly 0");
ok((await avail("bella", "2026-12-05", "2026-12-06"))[0].available === 5, "other cottage type unaffected");
await expectError(`select create_booking('aroma','2026-12-06','2026-12-05',2,1,'x','9876543210',null,null,null,1,0,null)`, [], "INVALID_DATES", "reversed dates rejected");
await expectError(`select create_booking('zzz','2026-12-06','2026-12-07',2,1,'x','9876543210',null,null,null,1,0,null)`, [], "UNKNOWN_COTTAGE", "unknown cottage rejected");
await expectError(`select create_booking('bella','2026-12-06','2026-12-07',9,2,'x','9876543210',null,null,null,1,0,null)`, [], "INVALID_GUESTS", "too many guests for cottages rejected");

const conf = (await book("bella", "2026-12-20", "2026-12-21", 2, 1, { status: "confirmed" })).rows[0];
ok(conf.status === "confirmed" && conf.expires_at === null && conf.confirmed_at !== null && conf.source === "phone", "manual confirmed booking (no hold, source=phone)");

console.log("\nblocked dates");
await db.query(`insert into blocked_dates (cottage_slug, date, reason) values ('bella','2026-12-10','private event')`);
await db.query(`insert into blocked_dates (cottage_slug, date, units_blocked, reason) values ('bella','2026-12-11',2,'maintenance')`);
a = await avail("bella", "2026-12-09", "2026-12-12");
ok(JSON.stringify(a.map((r) => r.available)) === "[5,0,3]", "whole-type block -> 0, partial block -> 3", JSON.stringify(a));
await expectError(`select create_booking('bella','2026-12-09','2026-12-11',2,1,'x','9876543210',null,null,null,1,0,null)`, [], "NOT_AVAILABLE", "booking across a blocked night rejected");

console.log("\nexpiry");
await db.query(`update bookings set expires_at = now() - interval '1 minute' where id = $1`, [b1.id]);
a = await avail("aroma", "2026-12-04", "2026-12-05");
ok(a[0].available === 5, "expired hold ignored at query time (before cron)", JSON.stringify(a));
const n = (await db.query("select expire_pending_bookings() as n")).rows[0].n;
const st = (await db.query("select status, status_note from bookings where id=$1", [b1.id])).rows[0];
ok(n === 1 && st.status === "cancelled" && st.status_note.startsWith("expired"), "expire_pending_bookings cancels it");
await book("aroma", "2026-12-04", "2026-12-06", 3, 3);
ok(true, "freed units are bookable again");

console.log("\nRLS / grants");
await db.exec("set role anon");
ok((await db.query("select * from bookings")).rows.length === 0, "anon sees no bookings");
ok((await db.query("select * from blocked_dates")).rows.length === 0, "anon sees no blocked dates (reasons private)");
ok((await db.query("select * from cottage_types")).rows.length === 2, "anon can read cottage types");
ok((await db.query("select * from get_availability('bella','2026-12-09','2026-12-12')")).rows.length === 3, "anon can call get_availability");
await expectError(`select create_booking('bella','2026-12-25','2026-12-26',2,1,'x','9876543210',null,null,null,1,0,null)`, [], "permission denied", "anon cannot call create_booking");
await expectError(`select expire_pending_bookings()`, [], "permission denied", "anon cannot call expire_pending_bookings");
await expectError(`insert into contact_messages (name, message) values ('a','b')`, [], "row-level security", "anon cannot insert contact messages directly");
const upd = await db.query(`update cottage_types set units_available = 99`);
ok(upd.affectedRows === 0, "anon update of cottage types affects 0 rows (RLS filters silently)", upd.affectedRows);
const cnt = (await db.query("select units_available from cottage_types where slug='aroma'")).rows[0].units_available;
ok(cnt === 5, "cottage units unchanged after anon update attempt");
await db.exec("reset role");

await db.query(`insert into admin_emails values ('owner@example.com')`);
await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"email":"someone@example.com"}', false);`);
ok((await db.query("select * from bookings")).rows.length === 0, "non-admin authenticated user sees no bookings");
await db.exec(`select set_config('request.jwt.claims', '{"email":"Owner@Example.com"}', false);`);
ok((await db.query("select * from bookings")).rows.length > 0, "admin (case-insensitive email) sees bookings");
ok((await db.query("select * from blocked_dates")).rows.length === 2, "admin sees blocked dates");
await db.exec("reset role");

done();
