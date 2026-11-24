// SEC-01: hold-flooding protection in create_booking.
import { createTestDb, makeAsserts } from "./harness.mjs";

const db = await createTestDb(process.argv.slice(2));
const { ok, expectError, done } = makeAsserts(db);

const hold = (slug, ci, co, phone, ip = null, replace = null, source = "website", status = "pending_payment") =>
  db.query(
    `select * from create_booking(
       p_slug => $1, p_check_in => $2, p_check_out => $3, p_guests => 1, p_cottages => 1,
       p_name => 'G', p_phone => $4, p_email => null, p_food_pref => null, p_notes => null,
       p_total => 1000, p_advance => 500, p_breakdown => null,
       p_source => $5::booking_source, p_status => $6::booking_status, p_hold_minutes => 15,
       p_client_ip_hash => $7, p_replace_booking_id => $8)`,
    [slug, ci, co, phone, source, status, ip, replace],
  );
const SQLHOLD = `select * from create_booking(
       p_slug => $1, p_check_in => $2, p_check_out => $3, p_guests => 1, p_cottages => 1,
       p_name => 'G', p_phone => $4, p_email => null, p_food_pref => null, p_notes => null,
       p_total => 1000, p_advance => 500, p_breakdown => null,
       p_source => 'website', p_status => 'pending_payment', p_hold_minutes => 15,
       p_client_ip_hash => $5, p_replace_booking_id => $6)`;
const status = async (id) => (await db.query(`select status, status_note from bookings where id=$1`, [id])).rows[0];

console.log("per-phone limit");
const h1 = (await hold("aroma", "2026-12-04", "2026-12-06", "9000000001", "ipA")).rows[0];
ok(h1?.status === "pending_payment" && h1.client_ip_hash === "ipA", "first hold created and stores the IP hash");
await expectError(SQLHOLD, ["bella", "2026-12-10", "2026-12-11", "9000000001", "ipZ", null], "TOO_MANY_HOLDS", "second active hold for the same phone is refused (even other cottage/IP)");

console.log("replace own hold when changing dates");
const h2 = (await hold("aroma", "2026-12-20", "2026-12-21", "9000000001", "ipA", h1.id)).rows[0];
ok(h2?.status === "pending_payment", "new hold allowed when replacing own previous hold");
ok((await status(h1.id)).status === "cancelled" && /replaced/.test((await status(h1.id)).status_note), "previous hold cancelled as 'replaced'");

console.log("can't cancel someone else's hold");
const victim = (await hold("bella", "2026-12-04", "2026-12-05", "9000000002", "ipV")).rows[0];
const attacker = (await hold("bella", "2026-12-06", "2026-12-07", "9000000003", "ipX", victim.id)).rows[0];
ok(attacker?.status === "pending_payment", "attacker's own hold created");
ok((await status(victim.id)).status === "pending_payment", "victim's hold untouched (replace requires the same phone)");

console.log("per-IP limit (2 active holds)");
await hold("aroma", "2026-12-08", "2026-12-09", "9000000011", "ipB");
await hold("aroma", "2026-12-09", "2026-12-10", "9000000012", "ipB");
await expectError(SQLHOLD, ["aroma", "2026-12-12", "2026-12-13", "9000000013", "ipB", null], "TOO_MANY_HOLDS", "third active hold from the same IP hash is refused");
ok((await hold("aroma", "2026-12-12", "2026-12-13", "9000000014", null)).rows[0], "unknown IP (null hash) isn't IP-limited (phone limit still applies)");

console.log("expired holds don't count");
await db.query(`update bookings set expires_at = now() - interval '1 minute' where phone in ('9000000011','9000000012')`);
ok((await hold("aroma", "2026-12-14", "2026-12-15", "9000000015", "ipB")).rows[0], "IP can hold again once its holds expire");
ok((await hold("aroma", "2026-12-16", "2026-12-17", "9000000011", "ipC")).rows[0], "phone can hold again once its hold expires");

console.log("admin and confirmed bookings are not limited");
await hold("bella", "2026-12-24", "2026-12-25", "9000000001", null, null, "phone", "confirmed");
await hold("bella", "2026-12-25", "2026-12-26", "9000000001", null, null, "walk_in", "confirmed");
ok(true, "admin bookings for a phone with an active online hold are allowed");

done();
