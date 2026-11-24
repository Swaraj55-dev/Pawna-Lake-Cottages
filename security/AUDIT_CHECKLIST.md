# Security Audit — Stage 2 checklist results

*Audited 2026-11-24 against commit `6f02adf` (plus `security/ATTACK_SURFACE.md`). Read-only: no source, config or database was changed.*

**Status key**
- **Confirmed** — a real gap or weakness, verified in the code or by a tool run.
- **Possible risk** — depends on configuration outside the repo (Supabase/Razorpay dashboard settings), or needs a test that hasn't been run yet.
- **Not an issue** — checked; the protection is in place (evidence given).

Severities are assigned in Stage 3, not here.

### Tools actually run in this stage
| Tool / check | Result |
|---|---|
| Client-bundle secret search: production build with **fake sentinel values** for all 10 env vars, then searched all 50 files in `.next/static` | **0 hits** for every variable (incl. service role key, Razorpay secret, webhook secret, Resend key, admin email). 0 source maps published. |
| `npm audit --omit=dev` | 4 **moderate** (one chain: `shadcn` CLI → `ts-morph` → `minimatch` ReDoS, GHSA-g3hv-75wg-m249). No high/critical. No advisories for `next`. |
| Gitleaks 8.30.1 — `gitleaks git` over full history (10 commits, ~986 KB) + `gitleaks dir` on `src/`, `supabase/`, `scripts/`, `.env.local` | **No leaks found.** `git ls-files` tracks only `.env.example`. |
| Existing suites as evidence: `npm test` (64), `npm run test:db` (62, PGlite) | passing at `6f02adf` |

### Not run in this stage (and why)
- **Concurrency proof for `create_booking`** (B1) — needs a real multi-connection Postgres; PGlite is single-connection. Planned for Stage 5.
- **Supabase Security Advisor / `supabase db lint`** (D7) — needs the live project (or Docker). Owner action or Stage 5.
- **Live Supabase table grants & Auth settings** (D1/D5) — not visible from the repo.

---

## A. Payments and price integrity

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| A1 | Price computed only on the server; browser amounts ignored | **Not an issue** | `createBookingSchema` (`src/lib/validation.ts`) accepts only `{stay, details}`; Zod strips unknown keys. Totals come from `getServerQuote()` (`src/lib/quote.ts:34`) → `calculateQuote` with `site.ts` + `price_overrides`. Payment-API test sent `total`/`price` fields — ignored. |
| A2 | Razorpay order amount = booking `advance_amount`, in paise, created on the server | **Not an issue** | Same server-computed `quote.advance` is passed to `create_booking` as `p_advance` and to `createOrder({ amountPaise: quote.advance * 100 })` (`src/app/api/bookings/route.ts:60,85`). Equal by construction (not re-read from the DB row). |
| A3 | Verify: HMAC-SHA256(`order_id|payment_id`), timing-safe, order belongs to booking | **Not an issue** | `verifyPaymentSignature` uses `createHmac` + `timingSafeEqual` with hex/length guards (`src/lib/razorpay-signature.ts`); 11 unit tests. Booking is located **by `razorpay_order_id`** inside `confirm_booking_payment` (`payments.sql:22`), and `fetchPayment` checks `payment.order_id === order_id` (`verify/route.ts:35`). |
| A4 | Webhook verifies signature on the **raw body**, rejects bad/missing | **Not an issue** | `request.text()` then HMAC with `RAZORPAY_WEBHOOK_SECRET` before parsing (`webhooks/razorpay/route.ts:25-29`). Tests: missing sig → 400, modified bytes → 400, re-serialised JSON → rejected. |
| A5 | Idempotent: no double-confirm, double-email, or one payment on two bookings; unique `razorpay_payment_id` | **Not an issue** | Row lock `FOR UPDATE` + outcome codes (`payments.sql:22-49`); emails only for `confirmed`/`late_confirmed` (`src/lib/payments.ts:40`) plus Resend idempotency keys; `razorpay_payment_id text unique` (`init.sql`, bookings table). DB tests: replays → `already_confirmed`, different payment on same order → `duplicate_payment`. |
| A6 | Paid amount **and currency** (and capture status) checked before confirming | **Confirmed** | `verify/route.ts:32-47` records `p.amount` but never compares it with the booking's `advance_amount`, never checks `currency === "INR"`, and never checks `p.status` is `captured`/`authorized`. If `fetchPayment` fails (network), it confirms anyway with `amountPaise = null` (`:37-40`). The webhook path (`webhooks/razorpay/route.ts:46-51`) also passes `amount` through without comparing. Razorpay enforces the order amount, so this is defence-in-depth — but if the Razorpay account uses **manual capture**, an authorised-but-never-captured payment would still produce a confirmed booking (Razorpay auto-refunds uncaptured payments). |
| A7 | No confirmation after the hold expired and the cottage was resold; behaviour documented | **Confirmed** (narrow gap) | The `cancelled` + `expired` path re-checks availability and flags `refund_required` (`payments.sql:57-76`) ✔. **But** the `pending_payment` branch (`payments.sql:42-48`) confirms **without checking `expires_at`**. An expired hold that hasn't been swept yet is ignored by `get_availability`, so its unit can be taken by a path that **doesn't sweep first** — `admin_set_booking_status` (re-activate / confirm, `admin.sql:44-50`) — and a late payment on the old hold then confirms it too → **overbooking**. `create_booking` *does* sweep first (`init.sql`, `perform expire_pending_bookings()`), so guest-vs-guest is safe; the gap needs an admin action in the window. |
| A8 | Confirmation emails only after verified payment | **Not an issue** | Guest emails sent only from `confirmPayment` outcomes (after HMAC), the **zero-advance** path (`bookings/route.ts:48,70`) and admin manual bookings — both intentional. See H-extra-1 for the zero-advance configuration caveat. |
| A9 | Card data never touches our servers | **Not an issue** | No card/UPI fields in our forms; Razorpay Standard Checkout iframe only (`src/components/booking/checkout.ts`). |

## B. Inventory and booking logic

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| B1 | `create_booking` locks and re-checks inside one transaction; proven by concurrency test | **Possible risk** (unproven) | Design is correct: `SELECT … FROM cottage_types … FOR UPDATE` (`init.sql:246`), then `expire_pending_bookings()` and `min(available)` in new READ COMMITTED snapshots (`:255-261`). **Not yet proven** with 10 parallel requests — PGlite can't run concurrent transactions. Stage 5. |
| B2 | Input rules on server (Zod **and** DB) | **Possible risk** (defence-in-depth gaps) | Server (public flow) ✔: dates valid, `checkOut > checkIn`, check-in ≥ today in **IST** (`quote.ts:46`, `todayIST`), ≤ `bookingWindowDays`, ≤ `maxNights` (14), guests ≤ `maxGuests × cottages` and ≥ cottages, cottages ≤ units left, slug enum, Indian mobile, email, length caps (`validation.ts`). DB ✔: `check_out > check_in`, guests/cottages > 0, length checks, advance ≤ total, guest capacity in `create_booking`. **Gaps:** DB has no `check_in ≥ today` or max-nights rule; `stayRequestSchema` allows `guests ≤ 60`, `cottages ≤ 20` (narrowed later by quote/availability); admin manual booking accepts past dates and up to 60 nights (`admin/actions.ts` `manualSchema`) — may be intentional for record-keeping. |
| B3 | **Hold-flooding**: per-IP / per-phone limits on active holds; rate limit; Turnstile | **Confirmed** | Only an **in-memory** 6 req / 10 min / IP limiter (`bookings/route.ts:27`, `src/lib/rate-limit.ts`) — per serverless instance, resets on cold start. **No cap on active holds** per IP or per phone, and **one request can hold every unit** of a cottage type (`cottages` up to units left) **for up to 14 nights** for 15 minutes. One script making ~1 request per cottage type per 15 min could keep a whole fortnight unbookable while staying under the rate limit. No Turnstile/CAPTCHA. |
| B4 | Expired holds really release (availability **and** `create_booking`) | **Not an issue** | `get_availability` counts `pending_payment` only while `expires_at > now()` (`init.sql:173-174`); `create_booking` calls `expire_pending_bookings()` first. DB tests: expired hold ignored before cron; freed units bookable. |
| B5 | Blocked dates & price overrides respected everywhere | **Not an issue** | Blocks are inside `get_availability` (used by public API, quote, `create_booking`, admin calendar, `admin_set_booking_status`). Overrides applied in `getServerQuote` (`quote.ts:52`); admin manual totals are admin-entered by design. |
| B6 | Status changes only from valid states, only by server/admin | **Not an issue** | Transition table enforced in SQL (`admin.sql:32-38`, `INVALID_TRANSITION`); all status RPCs granted to `service_role` only; the one direct UPDATE (`bookings/route.ts:90-93`) is conditional on `status = 'pending_payment'`. DB tests: 13 transition cases. |

## C. Guest data exposure

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| C1 | Success page not enumerable; unguessable token or minimal PII | **Possible risk** | Lookup is by **UUID v4** only (`gen_random_uuid`, 122 random bits; `src/lib/bookings.ts:13`); booking codes are never used for lookup → not enumerable ✔. But anyone holding the link sees the guest's **name, email** (in "confirmation sent to …", `success/[bookingId]/page.tsx:69`), last 4 phone digits, dates, amounts and food preference. The link appears in the confirmation email and browser history and may be shared. Recommend showing less (no email; first name only). |
| C2 | API responses return only needed fields | **Not an issue** | `/api/bookings` returns `bookingId, bookingCode, expiresAt, testMode, checkout{key, orderId, amount, currency, prefill (the guest's own details), description}`; `/api/payments/verify` returns `bookingId, outcome`; errors are generic codes + messages (`src/lib/errors.ts`). No full rows. |
| C3 | Availability API returns counts only | **Not an issue** | `/api/availability` returns `{date, available, status}` per night (`src/lib/availability.ts`). The RPC itself returns `booked/blocked` counts but no identities or reasons. |
| C4 | Logs contain no phone/email/payment IDs in plain form | **Confirmed** (minor) | `src/lib/payments.ts:38` logs `order` and `payment` IDs on every confirmation. `src/lib/errors.ts:48` and `webhooks/razorpay/route.ts:56` log full error objects, and `src/lib/email.ts:89` logs Resend error objects — these could include addresses or provider details. No phone numbers are logged directly. |
| C5 | Privacy policy exists and matches what's collected | **Not an issue** (owner review) | `/policies#privacy` lists the collected fields, processors (Razorpay, Supabase, Resend, Vercel), sessionStorage use and no tracking cookies — matches the code. DPDP items for the owner: no named grievance contact or specific retention period yet. |

## D. Supabase

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| D1 | RLS on every `public` table; anon can't read/write bookings, contact messages, blocked dates, price overrides | **Not an issue** in the repo; **Possible risk** on the live project | RLS enabled on 6/6 tables (`init.sql:289-294`). anon has **no** policy on `bookings`, `contact_messages`, `blocked_dates`, `admin_emails`. `price_overrides` is **readable by anon by design** (`init.sql:304`, prices are public), not writable. Migrations contain **no table-level GRANT/REVOKE**, so the anon/authenticated privileges are Supabase defaults and RLS is the only barrier. Verified only on PGlite — check the live project. |
| D2 | Service role key server-only; not in client bundle; no secret with `NEXT_PUBLIC_` | **Not an issue** | Used only in `src/lib/supabase/admin.ts` (imports `server-only`). Sentinel bundle search: **absent**. No secret uses the `NEXT_PUBLIC_` prefix. |
| D3 | `SECURITY DEFINER` functions set `search_path`, validate inputs, minimal grants | **Not an issue** | All 6 definer functions `set search_path = public` and use schema-qualified tables; `create_booking`, `confirm_booking_payment`, `admin_set_booking_status`, `expire_pending_bookings` are **service_role only**; `get_availability` (anon) caps ranges at 62 nights; `is_admin` returns a boolean only. (`set search_path = ''` would be stricter still — hardening.) |
| D4 | RLS admin check via `is_admin()`, not client-settable | **Not an issue** | `is_admin()` compares `auth.jwt()->>'email'` (signed by Supabase) with the `admin_emails` table (`init.sql:128-134`). |
| D5 | Public sign-ups off / no rights; allow-list on server; secure session cookies | **Possible risk** | Server allow-list ✔ (`src/lib/admin-auth.ts:19`, `proxy.ts:32`, `auth/callback/route.ts:36`). **But (1)** no check that the email is **confirmed** (`email_confirmed_at`): if the Supabase project allows sign-ups *without* email confirmation, someone could register the owner's address before the owner does and pass the allow-list check. `sendMagicLink` also needs `shouldCreateUser: true` (`admin/actions.ts`), so sign-ups must currently stay enabled. **(2)** `@supabase/ssr` defaults are `httpOnly: false`, **no `Secure` flag**, `sameSite: lax`, **400-day** max-age (`node_modules/@supabase/ssr/dist/main/utils/constants.js:4-10`). This app has no browser Supabase client, so the cookies could be `httpOnly` + `Secure`. |
| D6 | Storage buckets: public-read, admin-only write, type/size checks, no SVG | **Not applicable** | Supabase Storage isn't used; there's no upload feature (images are static files in `public/`). Re-audit if uploads are added. |
| D7 | Supabase Security Advisor / `supabase db lint` | **Not run** | Needs the live project or Docker. Owner/Stage 5. |

## E. Admin panel

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| E1 | Every admin page, handler and Server Action checks auth on the server | **Not an issue** | `requireAdmin()` in all 4 data pages and 7 mutating/reading actions (`admin/actions.ts:91,125,181,214,250,259,279`); CSV route `getAdmin()` → 401 (`bookings.csv/route.ts:7`) plus `queryBookings` re-check. Public by design: `sendMagicLink` (only emails allow-listed addresses) and `signOut` (affects the caller only). E2E: logged-out → login, non-admin → `forbidden`, CSV → 401. |
| E2 | Not relying on middleware/proxy alone; Next.js patched vs middleware-bypass advisories | **Not an issue** | Each handler checks itself (E1). Next **16.4.6** is far past the fixed versions of the `x-middleware-subrequest` bypass (CVE-2025-29927, fixed 15.2.3 / 14.2.25); `npm audit` lists no `next` advisories. Note: `proxy.ts:15` passes all requests through if Supabase env vars are missing — handlers still deny. |
| E3 | Admin inputs validated | **Not an issue** (minor gaps) | Zod on every action: prices integer 0–1,000,000, ranges ≤ 120 days, ids are UUID arrays ≤ 500, text caps. Past dates are accepted for blocks/overrides/manual bookings (harmless/intentional). |
| E4 | CSV export neutralises formula injection | **Not an issue** | `csvCell` prefixes `'` to cells starting with `= + - @ \t \r` and quotes everything (`src/lib/admin/bookings.ts`); unit test with `=HYPERLINK(...)`. |
| E5 | CSRF protection on mutations | **Not an issue** | All admin mutations are **Server Actions** (Next.js compares `Origin` with `Host`; left on). The only admin route handler is a **GET** CSV download (no state change; cross-site pages can't read it). Cookies are `SameSite=Lax`. |
| E6 | Admin login rate limit / lockout | **Possible risk** (low) | No app-level limit on `sendMagicLink`. Mitigations: links are sent only to allow-listed addresses, the response is identical for any email, and Supabase Auth applies its own per-email/IP OTP rate limits (dashboard-configurable). |

## F. Frontend and browser

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| F1 | No `dangerouslySetInnerHTML` with user data; JSON-LD escapes `<` | **Not an issue** | Single use in `src/components/json-ld.tsx:5`, content from `site.ts` only, serialised with `<` → `<` (`src/lib/seo.ts` `ldJson`). |
| F2 | User text escaped in admin UI and emails | **Not an issue** | React escapes all text and attributes (admin table, calendar `title`); react-email escapes (unit test: `<script>` in notes → `&lt;script&gt;`). |
| F3 | `encodeURIComponent` for WhatsApp/maps/calendar; no open redirects | **Not an issue** | `whatsapp.ts` and `links.ts` use `encodeURIComponent`; `calendar.ts` uses `URLSearchParams`. No `?next=`/`?redirect=` parameters; the auth callback redirects to fixed paths. Note: `sendMagicLink` builds `emailRedirectTo` from the request `Origin` header (`admin/actions.ts:65`). Next's Server Action origin check plus Supabase's redirect allow-list contain this, but using `NEXT_PUBLIC_SITE_URL` would be simpler. |
| F4 | No secrets/admin emails/internal URLs in client code; no prod source maps | **Not an issue** | Sentinel bundle search: none. `productionBrowserSourceMaps` not enabled; 0 `.map` files in `.next/static`. |
| F5 | Nothing sensitive in `localStorage` | **Not an issue** (note) | No `localStorage`. The booking draft (name, phone, email, notes) is kept in **sessionStorage** for the current tab and cleared on the success page (`booking-flow.tsx:28,97`; `auto-refresh.tsx:24`). |

## G. Headers, config and dependencies

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| G1 | CSP, frame-ancestors / X-Frame-Options, HSTS, nosniff, Referrer-Policy, Permissions-Policy | **Confirmed** | `next.config.ts` sets **no security headers** and there is no header logic in `proxy.ts`. The site can be framed (clickjacking of the booking/admin UI), and there's no CSP to limit script sources. (Vercel adds HSTS on its own domains by default — verify on the final custom domain.) |
| G2 | No permissive CORS on API routes | **Not an issue** | No `Access-Control-*` headers anywhere → same-origin only. |
| G3 | Generic error responses in production | **Not an issue** | Unknown errors → `{error:"SERVER_ERROR"}` (`src/lib/errors.ts`); Next internal errors rethrown; no stack traces in responses. |
| G4 | `.env*` gitignored except `.env.example`; Gitleaks over history | **Not an issue** | `.gitignore:34-35`; only `.env.example` tracked; Gitleaks: no leaks in 10 commits. |
| G5 | `npm audit --omit=dev` clean of high/critical; lockfile committed | **Possible risk** (low) | 0 high/critical; 4 moderate, all via the `shadcn` CLI (`minimatch` ReDoS). `shadcn` is listed in `dependencies` because `globals.css` imports `shadcn/tailwind.css`; the vulnerable code is CLI-only and never runs in the deployed app. Fix: move to `devDependencies`. `package-lock.json` is committed. |
| G6 | No debug/test/seed endpoints in production | **Not an issue** | None under `src/app`. Test helpers (fake Supabase, stubs) live outside the repo; `scripts/db-tests` aren't routes. |

## H. Abuse and email

| # | Check | Status | Evidence / notes |
|---|---|---|---|
| H1 | Rate limits on bookings, quote, contact, admin login, payment verify — reliable on Vercel | **Confirmed** | Only `/api/bookings` (6/10 min) and `/api/contact` (5/10 min) are limited, and both use an **in-memory** map (`src/lib/rate-limit.ts`) that isn't shared between serverless instances and resets on cold starts. **None** on `/api/quote`, `/api/availability`, `/api/payments/verify`, `sendMagicLink` or the OG image routes (which run `sharp` per request). IP comes from `x-forwarded-for` (`rate-limit.ts:26`) — reliable on Vercel, spoofable on other hosts. |
| H2 | Contact form: honeypot/Turnstile, length cap, fixed recipient, no user input in email headers | **Possible risk** (low) | Honeypot ✔, length caps ✔, recipient fixed to `ADMIN_EMAIL` ✔, `replyTo` = a Zod-validated email ✔. **But** the visitor's **name goes into the Subject header** (`src/lib/email.ts:96`), and `contactSchema.name` allows embedded line breaks (only trimmed, `validation.ts:52`). Resend's JSON API should encode it, but the checklist rule is that user input stays out of headers. |

### Extra findings outside the checklist
| # | Finding | Status | Evidence |
|---|---|---|---|
| X1 | **Zero-advance configuration creates confirmed bookings without payment.** If `advancePercent` is ever set to `0` (or a price override makes the advance ₹0), anyone can create *confirmed* bookings and trigger emails with no payment and only the IP rate limit in the way. | **Possible risk** (config-gated; currently `advancePercent: 50`) | `bookings/route.ts:48,64,70` |
| X2 | Admin session cookie lives **400 days** (library default). | **Possible risk** (low) | see D5 |
| X3 | `price_overrides` and `cottage_types` are publicly readable via the anon key (by design); `get_availability` is callable directly by anyone who has the anon key. Acceptable, but documented. | **Not an issue** | `init.sql:285,298,304` |

---

## Summary

| Status | Count | Items |
|---|---|---|
| **Confirmed** | 6 | A6 amount/currency/capture not checked · A7 expired-hold confirm path can overbook (admin window) · B3 hold-flooding · C4 IDs/error objects in logs · G1 no security headers · H1 rate limits missing/in-memory |
| **Possible risk** | 10 | B1 concurrency (unproven) · B2 DB-level date/nights rules · C1 success page PII · D1 live grants · D5 unconfirmed-email + cookie flags · E6 login rate limit · G5 shadcn CLI advisory · H2 name in Subject · X1 zero-advance · X2 400-day session |
| **Not an issue** | 31 | A1–A5, A8, A9 · B4–B6 · C2, C3, C5 · D2–D4 · E1–E5 · F1–F5 · G2–G4, G6 · X3 |
| **Not applicable / not run** | 2 / 1 | D6 Storage (not used) · D7 Security Advisor (not run) |

Next: **Stage 3** assigns severities and writes the Vulnerability Register in `SECURITY_AUDIT_REPORT.md`, then stops before any code changes.
