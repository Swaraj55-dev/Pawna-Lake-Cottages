// Tests confirm_booking_payment on PGlite with Supabase stubs.
import { createTestDb, makeAsserts } from "./harness.mjs";

const db = await createTestDb(process.argv.slice(2));
const { ok, done } = makeAsserts(db);

const mk = async (ci, co, n, order) => {
  const b = (await db.query(
    `select * from create_booking('aroma',$1,$2,$3::int * 2,$3,'G','9' || lpad((floor(random()*1e9))::bigint::text, 9, '0'),'g@x.com','veg',null,4000,2000,'{}')`, [ci, co, n])).rows[0];
  await db.query(`update bookings set razorpay_order_id=$1 where id=$2`, [order, b.id]);
  return b;
};
const confirm = async (order, pay, amountPaise = 200000, currency = "INR") =>
  (await db.query(`select * from confirm_booking_payment($1,$2,$3,$4)`, [order, pay, amountPaise, currency])).rows[0];
const row = async (id) => (await db.query(`select * from bookings where id=$1`, [id])).rows[0];

console.log("normal + idempotent");
const b1 = await mk("2026-12-04", "2026-12-06", 1, "order_1");
let r = await confirm("order_1", "pay_1");
ok(r.outcome === "confirmed" && r.booking_id === b1.id, "first call confirms");
let s = await row(b1.id);
ok(s.status === "confirmed" && s.amount_paid === 2000 && s.razorpay_payment_id === "pay_1" && s.expires_at === null && s.confirmed_at, "row updated (paid, no hold)");
r = await confirm("order_1", "pay_1");
ok(r.outcome === "already_confirmed", "webhook replay -> already_confirmed (no second email)");
r = await confirm("order_1", "pay_1");
ok(r.outcome === "already_confirmed", "third replay still idempotent");

console.log("duplicate payment on same order");
r = await confirm("order_1", "pay_1b");
ok(r.outcome === "duplicate_payment", "different payment id flagged");
await confirm("order_1", "pay_1b");
s = await row(b1.id);
ok(s.razorpay_payment_id === "pay_1" && (s.status_note.match(/pay_1b/g) || []).length === 1, "original payment kept, note added once", s.status_note);

console.log("unknown order");
ok((await confirm("order_x", "pay_x")).outcome === "not_found", "not_found");

console.log("late payment after hold expiry");
const b2 = await mk("2026-12-10", "2026-12-11", 2, "order_2");
await db.query(`update bookings set expires_at = now() - interval '1 minute' where id=$1`, [b2.id]);
await db.query(`select expire_pending_bookings()`);
ok((await row(b2.id)).status === "cancelled", "hold expired -> cancelled");
r = await confirm("order_2", "pay_2");
ok(r.outcome === "late_confirmed", "still available -> late_confirmed");
s = await row(b2.id);
ok(s.status === "confirmed" && s.status_note === "confirmed after hold expired", "row confirmed with note");
ok((await confirm("order_2", "pay_2")).outcome === "already_confirmed", "replay after late confirm is idempotent");

console.log("late payment but sold out");
const b3 = await mk("2026-12-20", "2026-12-21", 3, "order_3");
await db.query(`update bookings set expires_at = now() - interval '1 minute' where id=$1`, [b3.id]);
await db.query(`select expire_pending_bookings()`);
await mk("2026-12-20", "2026-12-21", 3, "order_3b"); // someone else takes 3 of 5
r = await confirm("order_3", "pay_3");
ok(r.outcome === "refund_required", "only 2 left, needs 3 -> refund_required");
s = await row(b3.id);
ok(s.status === "cancelled" && s.amount_paid === 2000 && /refund required/.test(s.status_note), "stays cancelled, payment recorded, flagged");
ok((await confirm("order_3", "pay_3")).outcome === "refund_required", "replay -> still refund_required (no duplicate alert logic needed)");

console.log("admin-cancelled booking paid");
const b4 = await mk("2026-12-24", "2026-12-25", 1, "order_4");
await db.query(`update bookings set status='cancelled', status_note='cancelled by admin' where id=$1`, [b4.id]);
ok((await confirm("order_4", "pay_4")).outcome === "refund_required", "admin-cancelled + paid -> refund_required (not re-confirmed)");

console.log("payment amount and currency validation");
const b6 = await mk("2027-01-10", "2027-01-11", 1, "order_6");
r = await confirm("order_6", "pay_6", 199999);
ok(r.outcome === "refund_required", "wrong amount is not confirmed");
s = await row(b6.id);
ok(s.status === "pending_payment" && s.razorpay_payment_id === "pay_6" && s.status_note.startsWith("amount_mismatch"), "wrong amount is recorded for admin review");

const b7 = await mk("2027-01-15", "2027-01-16", 1, "order_7");
r = await confirm("order_7", "pay_7", 200000, "USD");
ok(r.outcome === "refund_required", "wrong currency is not confirmed");
s = await row(b7.id);
ok(s.status === "pending_payment" && s.status_note.includes("USD"), "wrong currency is recorded for admin review");

console.log("expired unswept hold cannot overbook after admin reactivation");
const b8 = await mk("2027-01-20", "2027-01-21", 4, "order_8");
await db.query(`update bookings set status='confirmed', expires_at=null, confirmed_at=now() where id=$1`, [b8.id]);
await db.query(`update bookings set status='cancelled', status_note='cancelled by admin', confirmed_at=null where id=$1`, [b8.id]);
const b9 = await mk("2027-01-20", "2027-01-21", 2, "order_9");
await db.query(`update bookings set expires_at=now() - interval '1 minute' where id=$1`, [b9.id]);
r = (await db.query(`select * from admin_set_booking_status($1,'confirmed',null)`, [b8.id])).rows[0];
ok(r.status === "confirmed", "admin can reactivate the cancelled booking after the expired hold is swept");
r = await confirm("order_9", "pay_9");
ok(r.outcome === "refund_required", "late payment for the expired unswept hold is refunded when inventory is no longer available");
s = await row(b9.id);
ok(s.status === "cancelled" && s.status_note.includes("refund required"), "expired booking stays cancelled and is flagged for refund");
ok((await row(b8.id)).status === "confirmed", "only the reactivated booking holds the inventory");

console.log("unknown amount");
const b5 = await mk("2026-12-28", "2026-12-29", 1, "order_5");
await db.query(`update bookings set advance_amount = 1234 where id=$1`, [b5.id]);
ok((await db.query(`select * from confirm_booking_payment('order_5','pay_5',null,null)`)).rows[0].outcome === "pending", "NULL payment details remain pending");
ok((await row(b5.id)).status === "pending_payment" && (await row(b5.id)).amount_paid === 0, "NULL payment details do not confirm or record payment");

console.log("grants");
await db.exec("set role anon");
try { await confirm("order_1", "pay_1"); ok(false, "anon blocked"); } catch (e) { ok(/permission denied/.test(e.message), "anon cannot call confirm_booking_payment"); }
await db.exec("reset role");

done();
