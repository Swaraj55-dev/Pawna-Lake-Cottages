# Security Audit Report — Pawna Lake Cottages

**Status: Stage 3 — findings registered, no fixes applied yet.**
Audited commit `6f02adf` on 2026-11-24 against localhost only, with Razorpay in test mode and no real keys.
Supporting documents: [`security/ATTACK_SURFACE.md`](security/ATTACK_SURFACE.md) (Stage 1) · [`security/AUDIT_CHECKLIST.md`](security/AUDIT_CHECKLIST.md) (Stage 2).

> Sections A (owner summary), C (testing results), D (fixed counts), E (remaining risks and owner actions) and F (verdict) are completed in Stage 7. This version contains the **Vulnerability Register (B)** and the **decisions needed before fixing**.

---

## B. Vulnerability register

**Severity rubric (from the audit brief)**
- **Critical**: payment bypass or price tampering, booking confirmed without payment, exposed secret, anyone reading all bookings, admin access without login.
- **High**: personal data leaking through enumeration, overbooking race, hold-flooding, missing webhook check, admin XSS, unsafe uploads.
- **Medium**: missing rate limits, weak or missing CSP and headers, CSV injection, vulnerable dependencies, verbose errors.
- **Low**: hardening and tidy-ups.

**Type**: **Confirmed** = a verified gap in the code. **Conditional** = becomes exploitable only under a configuration outside the repo; the severity shown is for that case. **Unverified** = no known defect, but the property hasn't been proven by a test yet.

**No Critical findings.** The price is server-only, payment signatures are verified correctly, no secrets appear in the client bundle or git history, and RLS blocks public access to bookings.

| ID | Name | Severity | Type | Status |
|---|---|---|---|---|
| SEC-01 | Hold-flooding can block all inventory | **High** | Confirmed | Open |
| SEC-02 | Admin allow-list accepts unconfirmed email addresses | **High** | Conditional | Open |
| SEC-03 | Payment amount, currency and capture status not verified before confirming | **High** | Confirmed / Conditional impact | Fixed (Stage 4) |
| SEC-04 | Late payment on an expired, unswept hold can overbook | **High** | Confirmed (narrow) | Fixed (Stage 4) |
| SEC-05 | Rate limits missing on most endpoints and not shared across instances | **Medium** | Confirmed | Open |
| SEC-06 | No security headers (CSP, frame-ancestors, nosniff, Referrer-, Permissions-Policy) | **Medium** | Confirmed | Fixed (Stage 5) |
| SEC-07 | Booking success page shows guest PII to anyone holding the link | **Medium** | Confirmed | Open |
| SEC-08 | Admin session cookies not `HttpOnly`/`Secure`, 400-day lifetime | **Medium** | Confirmed | Open |
| SEC-09 | Concurrent `create_booking` not yet proven race-free | **Medium** | Unverified | Open |
| SEC-10 | Payment IDs and raw error objects written to logs | **Low** | Confirmed | Open |
| SEC-11 | Database doesn't enforce check-in ≥ today or a maximum stay | **Low** | Confirmed (defence-in-depth) | Open |
| SEC-12 | No app-level rate limit on admin magic-link requests | **Low** | Confirmed | Open |
| SEC-13 | `shadcn` CLI (with `minimatch` ReDoS advisory) listed as a production dependency | **Low** | Confirmed | Open |
| SEC-14 | Visitor's name placed in the contact-email Subject header | **Low** | Confirmed | Open |
| SEC-15 | A 0 % advance silently turns public bookings into confirmed-without-payment | **Low** (latent) | Conditional | Open |
| SEC-16 | Magic-link redirect URL built from the request `Origin` header | **Low** | Confirmed | Open |
| SEC-17 | Proxy lets all `/admin` requests through when Supabase env vars are missing | **Low** | Confirmed | Open |
| SEC-18 | Table privileges are Supabase defaults, so RLS is the only barrier | **Low** | Confirmed | Open |
| SEC-19 | `SECURITY DEFINER` functions use `search_path = public` instead of an empty path | **Low** | Confirmed (hardening) | Open |

---

### SEC-01 — Hold-flooding can block all inventory · **High**
- **File**: `src/app/api/bookings/route.ts:27`, `src/lib/rate-limit.ts`, `supabase/migrations/20261124000000_init.sql` (`create_booking`)
- **Root cause**: A pending booking holds units for 15 minutes with no payment. The only throttle is an in-memory 6 requests / 10 min / IP counter, which isn't shared across Vercel instances. There's no limit on **active holds** per IP or phone number, and one request may hold **every unit** of a cottage type for up to **14 nights**.
- **Impact**: One script making about one request per cottage type every 15 minutes can keep a whole fortnight showing "fully booked" to real guests, at no cost. That's direct lost revenue.
- **Proposed fix** (DB → server → UI):
  1. **DB:** new migration. `create_booking` refuses a new **website** hold when the same phone number, or the same hashed client IP, already has an active hold (`TOO_MANY_HOLDS`). Store a **salted hash** of the IP (not the raw IP, for DPDP) on pending bookings.
  2. **Server:** pass the hashed IP and use the shared limiter from SEC-05 on `/api/bookings`.
  3. **Optional:** Cloudflare Turnstile on the Pay step (see Decision 1).
- **Test that proves it**: a DB test where a second active hold for the same phone or IP hash → `TOO_MANY_HOLDS`, and a hold becomes allowed again after expiry; an API test where 50 attempts from one IP → at most N holds created.

### SEC-02 — Admin allow-list accepts unconfirmed email addresses · **High (conditional)**
- **File**: `src/lib/admin-auth.ts:19`, `src/proxy.ts:32`, `src/app/auth/callback/route.ts:36`, `src/app/admin/actions.ts` (`shouldCreateUser: true`)
- **Root cause**: Admin access is granted when `user.email` is on `ADMIN_EMAIL`, but the code never checks `user.email_confirmed_at`. Sign-ups must stay enabled because the login flow creates the user on first use.
- **Impact**: If the Supabase project ever allows sign-ups **without email confirmation**, someone could register `owner@…` with a password before the owner first logs in, pass the allow-list, and get **full admin access**: all guest data, status changes and prices. That would be Critical. With Supabase's default ("Confirm email" on) it isn't exploitable, so it's rated High.
- **Proposed fix**:
  1. **Server:** require `email_confirmed_at` in `getAdmin()`, `proxy.ts` and the auth callback.
  2. Switch `sendMagicLink` to `shouldCreateUser: false`.
  3. **Owner action:** create admin users once in the Supabase dashboard and **disable public sign-ups**.
- **Test**: a unit test where a user object with an allow-listed email but no `email_confirmed_at` → not admin; an E2E test on the fake Supabase where an unconfirmed admin-email session → redirected to `forbidden`.

### SEC-03 — Payment amount, currency and capture status not verified · **High**
- **File**: `src/app/api/payments/verify/route.ts:32-47`, `src/app/api/webhooks/razorpay/route.ts:46-51`, `supabase/migrations/20261124000100_payments.sql`
- **Root cause**:
  - The verify route records the amount Razorpay reports but never compares it with the booking's advance, never checks `currency === "INR"`, and never checks `status` is `captured` (or `authorized`).
  - If the Razorpay lookup fails, it **confirms anyway**.
  - The webhook passes the amount through without comparing it either.
- **Impact**: Razorpay enforces the order amount, so underpaying through Checkout isn't possible today. But if the Razorpay account uses **manual capture**, an authorised-but-never-captured payment produces a **confirmed booking with no money collected**; Razorpay auto-refunds uncaptured payments. Any future change that reuses or edits orders would also go undetected.
- **Proposed fix**:
  1. **DB:** new migration. `confirm_booking_payment` takes the amount in paise and the currency, and confirms only when they equal `advance_amount × 100` and `INR`. Otherwise it records the payment and flags `amount_mismatch` for the admin.
  2. **Server:** verify confirms only when the payment `status` is `captured`. If the lookup fails or the status is `authorized`, it returns "pending" and leaves confirmation to the `payment.captured` webhook. The success page already polls.
- **Test**: DB tests for wrong amount, wrong currency, and a correct payment. Route tests with a mocked Razorpay payment fetch: `authorized` → not confirmed, `captured` + right amount → confirmed, lookup failure → not confirmed.
- **Stage 4 status**: Fixed by migration `20261125000200_sec03_payment_validation.sql`; the route now waits on lookup failures and non-captured payments, while the database validates exact INR paise against the booking advance. Covered by the payment DB suite and `src/app/api/payments/verify/route.test.ts`.

### SEC-04 — Late payment on an expired, unswept hold can overbook · **High (narrow)**
- **File**: `supabase/migrations/20261124000100_payments.sql:42-48`, `supabase/migrations/20261124000200_admin.sql:44-50`
- **Root cause**: The `pending_payment` branch of `confirm_booking_payment` confirms without checking `expires_at`. Availability already ignores expired holds, and `admin_set_booking_status` re-checks availability **without sweeping expired holds first**. An admin can therefore assign that unit to another booking, and the original guest's late payment then also confirms.
- **Impact**: Two confirmed bookings for one cottage on the same night. Guest-vs-guest is safe, because `create_booking` sweeps first. The gap needs an admin re-activation or confirmation during the window between hold expiry and the late payment.
- **Proposed fix** (DB, new migration):
  1. In `confirm_booking_payment`, treat `pending_payment AND expires_at < now()` exactly like the expired path: lock, re-check availability, then `late_confirmed` or `refund_required`.
  2. Call `expire_pending_bookings()` at the start of `admin_set_booking_status`.
- **Test**: a DB test reproducing the scenario (expired unswept hold → admin re-activates a cancelled booking into the last unit → late payment arrives) → `refund_required` and no double-confirm.
- **Stage 4 status**: Fixed by migration `20261125000300_sec04_expired_payment_holds.sql`; payment confirmation and admin status changes sweep expired holds before checking availability. Covered by the payment and admin database suites.

### SEC-05 — Rate limits missing on most endpoints and not shared · **Medium**
- **File**: `src/lib/rate-limit.ts`; unprotected routes are `/api/quote`, `/api/availability`, `/api/payments/verify`, the `sendMagicLink` action, and the OG image routes.
- **Root cause**: Counters live in process memory, so on Vercel each instance and each cold start has its own; most public endpoints have no limit at all.
- **Impact**: It fuels SEC-01 and lets anyone burn database queries or CPU (the OG images run `sharp` and Satori per request), which could slow the site or exhaust free-tier quotas.
- **Proposed fix**: a free **Postgres-backed limiter**. New migration adds `rate_limits(key, window_start, count)` and a service-role-only `hit_rate_limit(key, limit, window)` function using an atomic upsert. Keys use hashed IPs. Apply it to all public POST endpoints and the login action, with lighter limits on GETs. Cache the OG images with `"use cache"` where the framework allows.
- **Test**: a DB test of the limiter boundary (N allowed, N+1 refused, and allowed again after the window); route tests that burst each endpoint → 429.

### SEC-06 — No security headers · **Medium**
- **File**: `next.config.ts` (no `headers()`), `src/proxy.ts`
- **Root cause**: No HTTP security headers are configured.
- **Impact**:
  - Pages, including the admin and booking flow, can be framed by other sites (clickjacking).
  - No CSP limits which scripts can run if an XSS bug appears later.
  - There's no `nosniff` or Referrer-Policy header.
- **Proposed fix**: `headers()` in `next.config.ts`:
  - `Content-Security-Policy` allowing only `'self'`; Razorpay (`checkout.razorpay.com` script, plus Razorpay frames and connections captured empirically); `www.google.com` maps frames; `www.youtube-nocookie.com` frames; `data:` and `blob:` for images and the 3D canvas.
  - `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy` that disables camera, microphone and geolocation and keeps `payment` for Razorpay.
  - `Strict-Transport-Security`.

  See Decision 3 on `script-src` and inline scripts.
- **Test**: a header-assertion test on all page types. A browser test confirming the 3D hero renders, the gallery and lightbox work, and Razorpay Checkout opens (the stub test plus one real test-mode load) with **zero CSP violations** in the console. A ZAP baseline scan in Stage 5.
- **Stage 5 status**: Fixed with a global header rule and a regression test. The built localhost app returned the configured headers on `/`, `/book` and `/gallery`; Playwright found a rendered 3D canvas and working gallery lightbox with no CSP errors. Razorpay Checkout was not exercised because payment credentials are not configured, and ZAP was unavailable.

### SEC-07 — Booking success page shows guest PII to anyone holding the link · **Medium**
- **File**: `src/app/(site)/book/success/[bookingId]/page.tsx:69` and the details grid; `src/lib/bookings.ts:13`
- **Root cause**: The page is protected only by the booking UUID. That isn't guessable (122 random bits), but the link is in the confirmation email and browser history and may be forwarded. The page shows the full name, **email address**, the last 4 phone digits, food preference, dates and amounts.
- **Impact**: Anyone the link reaches learns the guest's email and stay dates. That's a DPDP data-minimisation issue, not enumeration (UUIDs can't be enumerated, so it's not High).
- **Proposed fix**: Show only the first name, the booking code, the cottage, dates, guest count and amounts. Remove the email and phone digits from the page; the confirmation email already has them. Optionally add a separate random access token (see Decision 4).
- **Test**: render test where the page HTML for a booking contains no email or phone digits; an E2E test with a random UUID → "not found" and no data.

### SEC-08 — Admin session cookies not HttpOnly/Secure, 400-day lifetime · **Medium**
- **File**: `src/lib/supabase/server.ts`, `src/proxy.ts`; library defaults in `node_modules/@supabase/ssr/dist/main/utils/constants.js:4-10`
- **Root cause**: `@supabase/ssr` defaults to `httpOnly: false`, no `Secure` flag and a 400-day `maxAge`, so the browser client can read them. This app has no browser Supabase client.
- **Impact**: Any future XSS could steal an admin session; the cookie persists for over a year; and it could be sent over plain HTTP before HSTS takes effect.
- **Proposed fix**: Pass `cookieOptions: { httpOnly: true, secure: true in production, sameSite: "lax", maxAge: 7 days }` to both server clients (see Decision 5 on lifetime).
- **Test**: E2E test after login checks the `Set-Cookie` attributes (`HttpOnly; Secure; SameSite=Lax; Max-Age≤604800`) and that admin pages still work.

### SEC-09 — Concurrent `create_booking` not yet proven race-free · **Medium (unverified)**
- **File**: `supabase/migrations/20261124000000_init.sql:214-276`
- **Root cause**: No known defect. The design (row lock on `cottage_types`, then a fresh-snapshot re-check) is correct, but it hasn't been exercised under real concurrency. PGlite is single-connection.
- **Impact if wrong**: an overbooking race (High).
- **Proposed fix**: none unless the test fails.
- **Test**: run the migrations on a **real Postgres** (Decision 2) and fire 10 parallel `create_booking` calls for the last unit. Exactly 1 should succeed and 9 get `NOT_AVAILABLE`, repeated 20 times.

### SEC-10 — Payment IDs and raw error objects in logs · **Low**
- **File**: `src/lib/payments.ts:38`, `src/lib/errors.ts:48`, `src/app/api/webhooks/razorpay/route.ts:56`, `src/lib/email.ts:89`
- **Root cause**: Full Razorpay order and payment IDs and whole error objects are logged; provider errors may include recipient addresses.
- **Impact**: Vercel logs hold payment identifiers and possibly emails, which goes against the DPDP minimisation principle and the brief's rule.
- **Proposed fix**: Log the booking ID plus the last 6 characters of payment and order IDs. Log only `name`, `code` and `message` of errors. Never log email addresses.
- **Test**: unit test of the log helper: output contains no full payment or order ID and no `@` email pattern.

### SEC-11 — Database doesn't enforce check-in ≥ today or a maximum stay · **Low**
- **File**: `init.sql` (`create_booking`, `bookings` constraints)
- **Root cause**: These rules live only in the API (`quote.ts:46`, `pricing.ts`).
- **Impact**: None today; defence-in-depth if a future caller skips the API.
- **Proposed fix**: In `create_booking`, for `source = 'website'` require `check_in ≥ today (Asia/Kolkata)` and nights ≤ 30. Admin sources stay exempt for back-dated walk-ins (see Decision 6).
- **Test**: DB test where a website booking in the past → `INVALID_DATES`, a website booking of 31 nights → refused, and an admin `walk_in` booking for yesterday → allowed.

### SEC-12 — No app-level rate limit on admin magic-link requests · **Low**
- **File**: `src/app/admin/actions.ts:56` (`sendMagicLink`)
- **Root cause**: No limiter. Supabase's own OTP limits and the allow-list reduce the impact.
- **Impact**: Someone could spam the owner's inbox with login emails, up to Supabase's per-email limit.
- **Proposed fix**: The SEC-05 limiter, keyed per hashed IP and per email (for example 5 per 15 minutes); same generic response either way.
- **Test**: burst test where the sixth request in the window sends no OTP (checked on the fake Supabase) and the response stays identical.

### SEC-13 — `shadcn` CLI (minimatch ReDoS advisory) in production dependencies · **Low**
- **File**: `package.json` (`dependencies.shadcn`)
- **Root cause**: Added by `shadcn init`; it's only needed for the `shadcn/tailwind.css` import at build time.
- **Impact**: Four moderate advisories (GHSA-g3hv-75wg-m249) appear in `npm audit --omit=dev`. The vulnerable code is CLI-only and never runs on the site.
- **Proposed fix**: Move `shadcn` to `devDependencies`; Vercel installs dev dependencies for the build.
- **Test**: `npm audit --omit=dev` shows 0 vulnerabilities, and the build plus the visual check of styles still pass.

### SEC-14 — Visitor's name in the contact-email Subject header · **Low**
- **File**: `src/lib/email.ts:96`, `src/lib/validation.ts:52`
- **Root cause**: `Website message from ${name}`, where `name` may contain line breaks.
- **Impact**: Header-injection attempts depend on how Resend encodes headers; it breaks the rule that user input stays out of headers.
- **Proposed fix**: Use a fixed subject ("New website message") with the name only in the body; reject control characters in `name` fields (contact and booking).
- **Test**: unit tests where a schema rejects `"A\r\nBcc: x@y"` and the subject is constant.

### SEC-15 — 0 % advance turns public bookings into confirmed-without-payment · **Low (latent)**
- **File**: `src/app/api/bookings/route.ts:48,64,70`
- **Root cause**: If the computed advance is ₹0 (from `advancePercent: 0`, or a ₹0 price override), the API creates a **confirmed** booking with no payment.
- **Impact**: Today `advancePercent` is 50, so it isn't exploitable. A config change would allow unlimited free confirmed bookings, which would be **Critical** in that state.
- **Proposed fix**: The public API never confirms without payment. If the advance is ₹0, refuse with "please book on WhatsApp", or require an explicit `site.allowPayAtCheckin` flag that is off by default.
- **Test**: route test with the advance mocked to 0 → no confirmed booking created.

### SEC-16 — Magic-link redirect built from the request `Origin` · **Low**
- **File**: `src/app/admin/actions.ts:65`
- **Root cause**: `emailRedirectTo` = `${Origin}/auth/callback`. Next's Server Action origin check and Supabase's redirect allow-list contain it.
- **Impact**: Depends on Supabase's redirect allow-list being strict; a wildcard there would allow redirecting the login link elsewhere.
- **Proposed fix**: Build it from `NEXT_PUBLIC_SITE_URL` (with localhost in development).
- **Test**: unit test where a forged `Origin: https://evil.example` → redirect still uses the configured site URL.

### SEC-17 — Proxy lets all `/admin` traffic through when Supabase env vars are missing · **Low**
- **File**: `src/proxy.ts:15`
- **Root cause**: An early `return NextResponse.next()` for the "not configured" case.
- **Impact**: None today, because every handler still calls `requireAdmin()`. It only removes one layer.
- **Proposed fix**: When not configured, redirect `/admin/*` (except login) to `/admin/login?error=not_configured` and return 503 for `/api/admin/*`.
- **Test**: E2E test with no Supabase env: `/admin` → login, CSV → 503.

### SEC-18 — Table privileges are Supabase defaults; RLS is the only barrier · **Low**
- **File**: `supabase/migrations/*` (no GRANT/REVOKE on tables)
- **Root cause**: Default privileges give `anon`/`authenticated` broad table rights, which RLS then filters.
- **Impact**: A future policy mistake would expose data immediately; `TRUNCATE` isn't governed by RLS. PostgREST doesn't expose it, so there's no current path.
- **Proposed fix**: New migration that revokes everything on the six tables from `anon` and `authenticated`, then grants back only `SELECT` on `cottage_types` and `price_overrides` to `anon`, plus whatever the admin RLS policies need for `authenticated`. The app itself uses the service role, so it's unaffected.
- **Test**: DB test where anon `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` on every table → permission denied, and the public reads still work.

### SEC-19 — `SECURITY DEFINER` functions use `search_path = public` · **Low**
- **File**: all definer functions in the 3 migrations
- **Root cause**: Supabase's linter recommends `search_path = ''` with fully qualified names. Ours already qualify table names, so this is hardening only.
- **Impact**: Minimal, because no untrusted role can create objects in `public`.
- **Proposed fix**: New migration that re-creates the functions with `set search_path = ''` and qualifies remaining references (for example `extensions.gen_random_bytes`).
- **Test**: The existing 62 DB tests plus the new ones still pass.

---

## Decisions needed before Stage 4 (fixing)

1. **Bot protection on the Pay step (SEC-01)**: add free **Cloudflare Turnstile**? It needs a free Cloudflare account and site key, and adds a small widget on step 5. *Recommendation: yes, but the per-phone and per-IP hold limits alone already fix SEC-01; Turnstile can come later.*
2. **Real Postgres for the concurrency proof (SEC-09)**: OK to add the free `embedded-postgres` npm package (downloads a local Postgres binary; dev-only), or would you rather run it against a free Supabase **preview/branch** project you create?
3. **CSP strictness (SEC-06)**: Next.js injects inline scripts, so a strict CSP needs per-request **nonces**, which would make every page dynamic and lose the static pages and their Lighthouse scores. *Recommendation:* `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com`, plus everything else locked down and `frame-ancestors 'none'`. This is a documented, common trade-off. Strict nonces are possible if you prefer maximum protection over speed.
4. **Success page (SEC-07)**: minimal details only (*recommended*), or also add a separate secret token to the link?
5. **Admin session lifetime (SEC-08)**: 7 days (*recommended*), 1 day, or 30 days?
6. **Hold limits (SEC-01) and stay rules (SEC-11)**: *recommended* 1 active online hold per phone number and 2 per IP, 30-night maximum for online bookings, admin bookings exempt. OK?
7. **SEC-02 owner step**: once the fix lands you'll need to create your admin user(s) in the Supabase dashboard and switch off public sign-ups. I'll write the exact steps.

## Fix plan (Stage 4 order)
High: SEC-01, 02, 03, 04 → Medium: SEC-05, 06, 07, 08, 09 → Low: SEC-10 to SEC-19. Each fix gets its own commit (`security: SEC-xx <title>`) and a test that fails before the fix and passes after it. Database changes go in **new** migration files only.
