/**
 * Database tests: runs the real Supabase migrations on PGlite (Postgres in
 * WASM, no Docker/Supabase needed) with stubbed auth roles, then checks
 * availability, overbooking protection, hold expiry, payments, admin status
 * changes and RLS.   npm run test:db
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, "../../supabase/migrations");
const migs = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort().map((f) => path.join(migDir, f));

const suites = [
  ["schema.test.mjs", migs.slice(0, 1)],
  ["payments.test.mjs", migs.slice(0, 2)],
  ["admin.test.mjs", migs],
];

let failed = 0;
for (const [file, args] of suites) {
  console.log(`\n▶ ${file}`);
  const r = spawnSync(process.execPath, [path.join(here, file), ...args], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} suite(s) failed` : "\nAll database suites passed");
process.exit(failed ? 1 : 0);
