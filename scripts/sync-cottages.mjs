/**
 * Upserts cottage types from src/config/site.ts into Supabase `cottage_types`,
 * so database availability (units) matches the config.
 *
 *   npm run db:sync-cottages            # uses .env.local
 *   npm run db:sync-cottages -- --dry   # print what would be written
 *
 * Requires Node 22.18+ (imports the .ts config directly via type stripping).
 */
import { createClient } from "@supabase/supabase-js";
import { cottages } from "../src/config/site.ts";

const rows = cottages.map((c) => ({
  slug: c.slug,
  name: c.name,
  units_available: c.unitsAvailable,
  max_guests: c.maxGuests,
  base_guests: c.baseGuests,
  weekday_price: c.pricePerPerson.weekday,
  weekend_price: c.pricePerPerson.weekend,
  extra_person_price: c.extraPersonPrice,
}));

if (process.argv.includes("--dry")) {
  console.table(rows);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.from("cottage_types").upsert(rows, { onConflict: "slug" });
if (error) {
  console.error("Sync failed:", error.message);
  process.exit(1);
}
console.table(rows);
console.log("cottage_types synced.");
