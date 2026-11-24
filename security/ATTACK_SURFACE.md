# Attack Surface — Pawna Lake Cottages

*Stage 1 of the security audit (read-only mapping). Generated 2026-11-24 from commit `6f02adf`.*
*No code, config or database was changed to produce this document.*

## 0. Stack check — prompt assumptions vs. the actual code

| Assumed in the audit prompt | Actual | Notes |
|---|---|---|
| Next.js App Router + TS, Route Handlers in `src/app/api/*`, Server Actions | ✅ **Next.js 16.4.6**, React 19.3, Cache Components on | Route protection lives in **`src/proxy.ts`** (Next 16 renamed `middleware.ts` → `proxy.ts`). There is no `middleware.ts`. |
| Supabase Postgres + RLS + Auth (admin) + `create_booking` RPC | ✅ | Plus RPCs `get_availability`, `confirm_booking_payment`, `admin_set_booking_status`, `expire_pending_bookings`, `is_admin`, `generate_booking_code`. |
| Supabase **Storage** for images | ❌ **Not used** | Photos are static files in `public/images/**`, committed to git and served by Next/Vercel. There is **no upload feature** anywhere (no `.storage` calls), so audit item D-Storage / test 10 don't apply unless you plan uploads. |
| Razorpay Standard Checkout, signature verification, webhook | ✅ | REST via `fetch` (no SDK). |
| Resend + react-email | ✅ | |
| Vercel, wa.me links, Google Maps embed, R3F | ✅ | R3F scene is procedural (no remote 3D assets). |
| Guest accounts | ❌ none | Confirms "user-to-user access" is out of scope. Only admins log in. |
| Analytics | ❌ none installed | |

---

## 1. Entry points

**Who may call it** legend: 🌐 anyone on the internet · 🔐 allow-listed admin (session + `ADMIN_EMAIL`) · 💳 Razorpay (HMAC signature) · 🔁 Supabase Auth redirect.

### 1.1 Route Handlers (`src/app/**/route.ts` and metadata routes)

| Endpoint | Caller | Accepts | Reads | Writes / side effects | Guards in code |
|---|---|---|---|---|---|
| `GET /api/availability?type&month` — `src/app/api/availability/route.ts:11` | 🌐 | `type` ∈ {aroma,bella}, `month` YYYY-MM (Zod) | RPC `get_availability` via **anon key** (`lib/availability.ts:18`) | — | Zod; month must overlap booking window (`lib/availability.ts:43`). Returns per-night `{date, available, status}` only. `no-store`. **No rate limit.** |
| `POST /api/quote` — `src/app/api/quote/route.ts:11` | 🌐 | `{type, checkIn, checkOut, guests, cottages}` (Zod `stayRequestSchema`) | `site.ts` prices; `price_overrides` (anon key, `lib/quote.ts:12`); `get_availability` | — | Zod + `calculateQuote` validation; past-date / window checks (`lib/quote.ts:46`). **No rate limit.** |
| `POST /api/bookings` — `src/app/api/bookings/route.ts:25` | 🌐 | `{stay, details}` (Zod `createBookingSchema`); **no amounts accepted** | server quote + availability | RPC `create_booking` (**service role**) → 15-min hold; Razorpay `POST /v1/orders`; `bookings.razorpay_order_id` update (`:98`); on order failure releases hold (`:90`). If advance = 0 → confirmed + emails. | In-memory rate limit **6 / 10 min / IP** (`:27`, `lib/rate-limit.ts`). Returns `bookingId`, `bookingCode`, `expiresAt`, checkout `{key, orderId, amount, currency, prefill}`. |
| `POST /api/payments/verify` — `src/app/api/payments/verify/route.ts:18` | 🌐 (holds Razorpay success payload) | `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` (Zod) | Razorpay `GET /v1/payments/:id` (checks `order_id` match, `:35`) | RPC `confirm_booking_payment` (service role); emails via `after()` | HMAC `order|payment` with key secret, constant-time (`lib/razorpay-signature.ts`). **No rate limit.** |
| `POST /api/webhooks/razorpay` — `src/app/api/webhooks/razorpay/route.ts:21` | 💳 | raw JSON body + `x-razorpay-signature` | — | RPC `confirm_booking_payment`; emails via `after()` | HMAC over **raw body** with `RAZORPAY_WEBHOOK_SECRET`, checked **before** config is revealed (`:26`). Acts on `payment.captured`, `order.paid` only. |
| `POST /api/contact` — `src/app/api/contact/route.ts:12` | 🌐 | `{name, email, phone?, message, website(honeypot)}` (Zod `contactSchema`) | — | insert `contact_messages` (service role); email to `ADMIN_EMAIL` with `replyTo` = visitor email | In-memory rate limit **5 / 10 min / IP** (`:14`); honeypot; length caps. |
| `GET /api/admin/bookings.csv` — `src/app/api/admin/bookings.csv/route.ts:6` | 🔐 | same filters as `/admin` | **all booking columns** incl. phone, email, notes, Razorpay IDs (service role) | file download | `getAdmin()` → 401 (`:7`), plus `queryBookings()` calls `requireAdmin()` again; Proxy also returns 401. CSV cells formula-neutralised (`lib/admin/bookings.ts`). |
| `GET /auth/callback` — `src/app/auth/callback/route.ts:11` | 🔁 / 🌐 | `code` (PKCE) or `token_hash` + `type` | Supabase Auth | sets session cookies; signs out non-allow-listed users | Redirect target is fixed (`${origin}/admin` / `/admin/login?error=…`) — no `next=` parameter. |
| `GET /sitemap.xml`, `/robots.txt` | 🌐 | — | config | — | static |
| `GET /opengraph-image…`, `/cottages/[slug]/opengraph-image…` | 🌐 | `slug` (falls back to first cottage) | `public/images` via `sharp` | — | rendered per request (CPU: `sharp` + Satori). |

### 1.2 Server Actions — `src/app/admin/actions.ts` (all are public POST endpoints by design of Next.js)

| Action | Line | Who may call | Accepts | Reads / writes | Auth check |
|---|---|---|---|---|---|
| `sendMagicLink` | 56 | 🌐 (login form) | `email` | Supabase `signInWithOtp` — **only if** email ∈ `ADMIN_EMAIL` (`:63`); identical response either way | none needed (public by design). **No rate limit.** Uses `Origin` header for redirect URL (`:65`). |
| `signOut` | 76 | 🌐 | — | signs out the **caller's own** session | none (only affects caller) |
| `updateBookingStatus` | 90 | 🔐 | `{id: uuid, status, note≤300}` (Zod) | RPC `admin_set_booking_status` | `requireAdmin()` `:91` |
| `createManualBooking` | 124 | 🔐 | form: stay, guest, source, total, paid, sendEmail (Zod) | RPC `create_booking` (status confirmed) `:146`; `bookings.amount_paid` update `:167`; optional guest email | `requireAdmin()` `:125` |
| `checkStay` | 180 | 🔐 | `{type, checkIn, checkOut, guests, cottages}` | availability + quote | `requireAdmin()` `:181` |
| `addBlockedDates` | 213 | 🔐 | type/all, from, to (≤120 days), units?, reason≤200 | upsert `blocked_dates` `:228`; counts overlapping bookings | `requireAdmin()` `:214` |
| `deleteBlockedDates` | 249 | 🔐 | `ids: uuid[] ≤500` | delete `blocked_dates` | `requireAdmin()` `:250` |
| `addPriceOverrides` | 258 | 🔐 | type/all, from, to, price 0–1,000,000, label≤80 | upsert `price_overrides` `:272` | `requireAdmin()` `:259` |
| `deletePriceOverrides` | 278 | 🔐 | `ids: uuid[] ≤500` | delete `price_overrides` | `requireAdmin()` `:279` |

`requireAdmin()` (`src/lib/admin-auth.ts`) = `supabase.auth.getUser()` (JWT validated by Supabase) + email ∈ `ADMIN_EMAIL` list, else `redirect('/admin/login')`.

### 1.3 Proxy — `src/proxy.ts`
Matcher `/admin/:path*`, `/api/admin/:path*`. Refreshes the Supabase session cookie, redirects non-admins to `/admin/login` (`?error=forbidden` if signed in), returns 401 JSON for `/api/admin/*`. If Supabase env vars are missing it **passes everything through** (`:15`) — pages then rely on `requireAdmin()` alone (which returns null → redirect). It is an early filter only; every handler re-checks.

### 1.4 Pages that read data

| Page | Caller | Data source | Personal data shown |
|---|---|---|---|
| `/`, `/cottages/[slug]`, `/gallery`, `/about`, `/book`, `/contact`, `/policies`, `/not-found` | 🌐 | `site.ts` + files in `public/images` only (no DB) | none |
| **`/book/success/[bookingId]`** — `src/app/(site)/book/success/[bookingId]/page.tsx` | 🌐 **anyone holding the URL** | `getBookingById` → `bookings` row by UUID via **service role** (`lib/bookings.ts:13`) | booking code, guest **name**, phone **last 4 digits**, **email** (in "confirmation sent to …" text when confirmed), dates, guests, food preference, amounts, status. No other auth or token. `noindex`. |
| `/admin` (bookings) — `admin/(panel)/page.tsx:83` | 🔐 | `queryBookings` (service role, all columns) | full name, phone, email, notes, Razorpay payment ID, status notes |
| `/admin/new` | 🔐 | — (form only) | — |
| `/admin/availability` | 🔐 | `blocked_dates`, `price_overrides` (service role) | block reasons (private) |
| `/admin/calendar` | 🔐 | `get_availability` + bookings (code, name, dates, guests, status) | name in `title` tooltip |
| `/admin/login` | 🌐 | — | — |

### 1.5 Database functions (RPCs)

| Function | Migration:line | `SECURITY DEFINER` | `search_path` set | EXECUTE granted to | Called by |
|---|---|---|---|---|---|
| `get_availability(slug, from, to)` | init:153 | yes | `public` | **anon**, authenticated, service_role (`init:285`) | `/api/availability`, `/api/quote`, admin calendar. Returns per-night counts `units_total, booked, blocked, available` (no identities, no reasons). Range capped at 62 nights. |
| `create_booking(…16 args)` | init:214 | yes | `public` | **service_role only** (revoked from public/anon/authenticated, `init:280-283`) | `/api/bookings`, `createManualBooking`. Locks `cottage_types` row `FOR UPDATE` (`:246`), expires stale holds, re-checks every night, inserts. Validates dates, status ∈ {pending_payment, confirmed}, guests vs capacity. **Does not** validate check-in ≥ today, max nights, or amounts (caller's job). |
| `confirm_booking_payment(order, payment, amount)` | payments:10 | yes | `public` | service_role only (`payments:79-80`) | verify route, webhook. Locks booking row `FOR UPDATE` (`:22`). Idempotent outcomes. |
| `admin_set_booking_status(id, status, note)` | admin:12 | yes | `public` | service_role only (`admin:64-65`) | `updateBookingStatus` |
| `expire_pending_bookings()` | init:138 | yes | `public` | service_role only | `create_booking`, optional pg_cron |
| `generate_booking_code()` | init:191 | no (invoker) | `public, extensions` | revoked from public/anon/authenticated | `create_booking` (as definer) |
| `is_admin()` | init:128 | yes | `public` | anon, authenticated, service_role | RLS policies. Reads `auth.jwt()->>'email'` (server-signed JWT — not client-settable) vs `admin_emails`. |
| `set_updated_at()` | init:23 | no | — | Supabase default (PUBLIC) | triggers only (cannot be meaningfully invoked directly) |

---

## 2. Supabase tables

All six tables in `public` have **RLS enabled** (`init:289-294`). The migrations contain **no table-level `GRANT`/`REVOKE`**, so table privileges are Supabase's project defaults (normally *all* privileges on `public` tables to `anon` and `authenticated`), and **RLS policies are the only thing restricting the anon key**. Verify the live project's grants in Stage 2.

| Table | RLS | Policies | anon via anon key | authenticated (non-admin) | Admin (`is_admin()`) | App access path |
|---|---|---|---|---|---|---|
| `cottage_types` | on | `public read` (select, all roles) `:298`; `admin write` (all, authenticated + is_admin) `:300` | **read** | read | read/write | sync script (service role); `create_booking` |
| `bookings` | on | `admin all` (authenticated + is_admin) `:313` | none (0 rows; writes filtered) | none | all | service role only (API, actions, success page) |
| `blocked_dates` | on | `admin all` `:317` | none | none | all | service role (admin actions); via `get_availability` (definer) |
| `price_overrides` | on | `public read` `:304`; `admin write` `:306` | **read** (date, price, label) | read | read/write | anon key in `lib/quote.ts`; service role in admin |
| `contact_messages` | on | `admin all` `:321` | none (insert blocked — tested) | none | all | service role (`/api/contact`) |
| `admin_emails` | on | `admin read` `:325` | none | none | read | not used by the app (optional, for direct Supabase access) |

Constraints of note: `bookings.booking_code UNIQUE`, `razorpay_order_id UNIQUE`, `razorpay_payment_id UNIQUE`, `check_out > check_in`, `guests > 0`, `cottages_count > 0`, `advance_amount ≤ total_amount`, length checks on `name` (1–120), `phone` (7–20), `email` (≤200), `notes` (≤1000). No DB constraint on `check_in ≥ today` or maximum stay length (enforced in app code).

Verified by `npm run test:db` (PGlite with stubbed roles): anon sees no bookings/blocks, can read cottage types, can call `get_availability`, cannot call `create_booking` / `expire_pending_bookings` / `confirm_booking_payment` / `admin_set_booking_status`, cannot insert contact messages, anon UPDATE on `cottage_types` affects 0 rows; non-admin authenticated sees no bookings; admin (case-insensitive email) does. *Not yet verified against a real Supabase project.*

---

## 3. Environment variables

| Variable | Browser-exposed? | Read in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prefix = **yes if imported client-side**; currently only server code reads it | `lib/supabase/admin.ts:10,24,34`, `lib/supabase/server.ts:15`, `proxy.ts:12` | inlined at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as above; designed to be public | `lib/supabase/admin.ts:11,24`, `lib/supabase/server.ts:16`, `proxy.ts:13` | |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | `lib/supabase/admin.ts:12,34` (`server-only` module) | bypasses RLS |
| `RAZORPAY_KEY_ID` | no (but sent to browser per order, by design — it's a public key id) | `lib/razorpay.ts:13,17,21` | |
| `RAZORPAY_KEY_SECRET` | **no** | `lib/razorpay.ts:13,21`, `api/payments/verify/route.ts:27` | HMAC + Basic auth |
| `RAZORPAY_WEBHOOK_SECRET` | **no** | `api/webhooks/razorpay/route.ts:22` | |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | yes (prefix) | **unused in code** | kept for spec compatibility |
| `RESEND_API_KEY` | **no** | `lib/email.ts:20,24` | |
| `EMAIL_FROM` | no | `lib/email.ts:29` | optional |
| `ADMIN_EMAIL` | **no** | `lib/admin-emails.ts:3` (used by `proxy.ts`, `admin-auth.ts`, `email.ts`, `actions.ts`) | admin allow-list |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | **yes** (used in client components via `lib/whatsapp.ts:7`) | public by design | |
| `NEXT_PUBLIC_SITE_URL` | yes | `app/layout.tsx:19`, `lib/links.ts:10`, `admin/actions.ts:65` | public by design |

Client components import server modules only as **types** (`components/booking/api.ts:3-4`, `components/admin/*`), which are erased at build. No browser Supabase client exists. Secret files: `.env*` is gitignored except `.env.example` (`.gitignore:34-35`); `git ls-files` shows only `.env.example`. Git history: 10 commits (not yet scanned with Gitleaks).

---

## 4. Third-party code and domains

### 4.1 Loaded by the browser
| What | Domain | When | Where in code |
|---|---|---|---|
| Razorpay Checkout script | `checkout.razorpay.com/v1/checkout.js` | only when the guest clicks **Pay** | `components/booking/checkout.ts:46` |
| Razorpay Checkout frames/APIs | Razorpay-controlled domains loaded *by* checkout.js (e.g. `api.razorpay.com`, `checkout.razorpay.com`, others) | during payment | third-party; exact list to capture empirically when writing the CSP |
| Google Maps embed iframe | `www.google.com/maps/embed…` (+ Google assets inside the iframe) | only if `site.mapsEmbedUrl` is set | `components/sections/location.tsx` |
| YouTube player iframe | `www.youtube-nocookie.com/embed/…` | only after a visitor taps a video (and only if `videos` configured) | `components/gallery/video-embed.tsx:17` |
| YouTube thumbnails | `i.ytimg.com` — **fetched by the server** through `/_next/image` (allow-listed in `next.config.ts:8`); browser loads same-origin | gallery videos | `video-embed.tsx:31` |
| Fonts (Fraunces, Inter) | **self-hosted** by `next/font` at build time — no runtime request to Google | always | `app/layout.tsx` |
| 3D (three.js / R3F / drei) | bundled; no remote models/HDRIs; panorama is same-origin | desktop hero, 360° tab | `components/three/*` |
| Analytics / tag managers | **none** | — | — |

Outbound **links** only (navigation, nothing loaded): `wa.me`, `google.com/maps/dir`, `calendar.google.com`, social profile URLs from config, `tel:`, `mailto:`; emails link to `dashboard.razorpay.com`.

### 4.2 Called by the server
Supabase project URL (REST/RPC/Auth), `api.razorpay.com` (orders, payments), Resend API (`resend` SDK), `i.ytimg.com` (image optimiser, path-restricted).

### 4.3 Browser storage
`sessionStorage["pwn-booking-draft-v1"]` holds the in-progress booking draft incl. **name, phone, email, notes** for the current tab (`components/booking/booking-flow.tsx:28,97`); cleared on the success page (`auto-refresh.tsx:24`). No `localStorage`. Admin session = Supabase cookies set by `@supabase/ssr`.

### 4.4 Response headers
`next.config.ts` sets **no security headers** (no CSP, HSTS, frame-ancestors, etc.). `productionBrowserSourceMaps` is not enabled (Next default: off). API routes send no CORS headers.

---

## 5. Booking state machine

```
                       create_booking(p_status)                    expire_pending_bookings()
  (new) ──────────────────────────────────────► pending_payment ─────────────────────────────► cancelled
     │       /api/bookings (advance > 0)              │  │  ▲                                    │   ▲  │
     │                                                │  │  └─ hold still counts until expires_at│   │  │
     │  create_booking(p_status='confirmed')           │  │                                       │   │  │
     ├─ /api/bookings when advance = 0                 │  └─ /api/bookings: Razorpay order failed ─┘   │  │
     └─ admin createManualBooking ─────┐               │      (direct UPDATE, route.ts:90)             │  │
                                       ▼               ▼                                               │  │
                                   confirmed ◄── confirm_booking_payment ('confirmed')                 │  │
                                     │  ▲  ▲         (verify route / webhook)                          │  │
                                     │  │  └──────── confirm_booking_payment ('late_confirmed') ◄──────┘  │
                                     │  │             only if cancelled-as-expired AND still available    │
                                     │  └── admin: completed → confirmed (undo)                           │
                                     ├──► completed  (admin)                                              │
                                     └──► cancelled  (admin) ─── admin re-activate (availability re-checked)┘
```

| Transition | Code | Conditions |
|---|---|---|
| → `pending_payment` (15-min hold) | `create_booking` `init:214`, called from `api/bookings/route.ts:49` (`p_status` `:64`) | row lock + availability re-check; `expires_at = now() + hold` |
| → `confirmed` (no payment) | `create_booking` from `api/bookings/route.ts:64` **only when computed advance = 0**; from `admin/actions.ts:161` (manual) | server-computed amount / admin only |
| `pending_payment` → `cancelled` | `expire_pending_bookings` `init:138` (on every `create_booking`, optional cron); `api/bookings/route.ts:90-93` when the Razorpay order fails | conditional on `status = 'pending_payment'` |
| `pending_payment` → `confirmed` | `confirm_booking_payment` `payments:42-48` | caller already verified HMAC; booking found by `razorpay_order_id` |
| `cancelled` (expired) → `confirmed` | `confirm_booking_payment` `payments:57-68` (`late_confirmed`) | `status_note LIKE 'expired%'` **and** units still free (locked re-check) |
| `cancelled` (+ payment) stays `cancelled`, flagged `refund_required` | `payments:71-76` | sold out or cancelled by admin |
| `confirmed` + different payment → flagged `duplicate_payment` | `payments:30-37` | status unchanged |
| admin transitions | `admin_set_booking_status` `admin:32-38` via `admin/actions.ts:96` | pending→confirmed/cancelled; confirmed→completed/cancelled; completed→confirmed; cancelled→confirmed (availability re-checked when the booking isn't currently holding a unit, `admin:44-50`) |
| Non-status writes | `razorpay_order_id` set `api/bookings/route.ts:98`; `amount_paid` set `admin/actions.ts:167` (manual) and by `confirm_booking_payment` | |

Emails are sent only from: `confirmPayment()` for outcomes `confirmed`/`late_confirmed` (guest + admin) or `refund_required`/`duplicate_payment` (admin) — `lib/payments.ts:40`; `/api/bookings` zero-advance path; manual booking with "email guest" ticked; contact form (admin only).

---

## 6. Notes to carry into Stage 2 (observations, not yet assessed)

These are things the mapping surfaced that the Stage 2 checklist should examine; no severity is assigned yet.

1. **Success page by UUID alone** shows guest name, email and partial phone to anyone with the link (item C).
2. **Rate limiting is in-memory per instance** (`lib/rate-limit.ts`) and absent on `/api/quote`, `/api/availability`, `/api/payments/verify`, and the magic-link action (items B-hold-flooding, H).
3. **No per-phone / per-IP cap on concurrent pending holds**; `create_booking` has no `check_in ≥ today` or max-nights check of its own (relies on API code) (item B).
4. **No security headers / CSP** configured (item G).
5. **Table privileges are Supabase defaults**; RLS is the only barrier for the anon key — verify live grants and the Security Advisor (item D).
6. **Server logs include order/payment IDs** (`lib/payments.ts:38`) and full error objects (`lib/errors.ts:48`, webhook `:56`) (item C-logs).
7. **`sendMagicLink` builds the redirect from the request `Origin` header** (`admin/actions.ts:65`); Supabase's redirect allow-list is the backstop (item F-open-redirect).
8. **Proxy passes everything through when Supabase env vars are missing** (`proxy.ts:15`) — handlers still deny via `requireAdmin()` (item E).
9. **Supabase Storage not used**: Storage items (D, test 10) are not applicable unless uploads are added.
10. **Unused `NEXT_PUBLIC_RAZORPAY_KEY_ID`** variable (hygiene).
11. **Next.js 16.4.6**: check against current advisories, including the known middleware/proxy bypass class (item E).
12. **OG image routes render per request** with `sharp` — potential CPU cost under abuse (item H).
