# Pawna Lake Cottages — website & booking engine

A production-ready website for a lakeside property at Pawna Lake (Maval, Pune) with two stay types — **Aroma** and **Bella** cottages. Visitors explore an immersive site (3D hero, galleries, 360° views) and book online with a **live availability check** and a **Razorpay advance payment**. The owner manages everything from a private **admin dashboard**.

| | |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript |
| UI | Tailwind CSS 4 · shadcn/ui (Base UI) · Framer Motion · Lenis · React Three Fiber + drei |
| Data & auth | Supabase (Postgres + Row Level Security + Auth magic links) |
| Payments | Razorpay Standard Checkout (orders, signature verification, webhook) |
| Email | Resend + react-email |
| Forms & dates | react-hook-form · Zod · react-day-picker · date-fns |
| Tests | Vitest (unit) · PGlite (database) |
| Hosting | Vercel |

---

## Contents

1. [Quick start (local)](#1-quick-start-local)
2. [Fill in your business details (`site.ts`)](#2-fill-in-your-business-details)
3. [Supabase: project, migrations, auth](#3-supabase)
4. [Razorpay (test mode first)](#4-razorpay)
5. [Resend: confirmation emails](#5-resend-emails)
6. [Deploy to Vercel](#6-deploy-to-vercel)
7. [Adding photos, 360° panoramas & videos](#7-adding-photos-panoramas--videos)
8. [Using the admin dashboard](#8-using-the-admin-dashboard)
9. [How booking & payment work](#9-how-booking--payment-work)
10. [Tests & scripts](#10-tests--scripts)
11. [Project structure](#11-project-structure)
12. [Launch checklist](#12-launch-checklist)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Quick start (local)

Requirements: **Node.js 22.18+** and npm.

```bash
npm install
cp .env.example .env.local      # then fill in values (see sections 3–5)
npm run dev                      # http://localhost:3000
```

The site runs **without any keys**: pages, galleries and the 3D hero work, and booking falls back to "Book on WhatsApp" until Supabase/Razorpay are configured. Nothing breaks — each missing service shows a friendly fallback.

### Environment variables

| Variable | Where it's used | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | availability, bookings, admin |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | availability (public, RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | creating bookings, payments, admin |
| `RAZORPAY_KEY_ID` | server (sent to Checkout per order) | online payment |
| `RAZORPAY_KEY_SECRET` | **server only** | orders + signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | **server only** | webhook verification |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | — | set to the same value as `RAZORPAY_KEY_ID` (kept for compatibility; the app reads the server variable) |
| `RESEND_API_KEY` | **server only** | emails |
| `EMAIL_FROM` *(optional)* | server | sender, e.g. `Pawna Lake Cottages <bookings@yourdomain.com>` |
| `ADMIN_EMAIL` | server | admin login allow-list + alert emails (comma-separate several) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | browser | WhatsApp buttons if `site.whatsapp` is empty (digits only, e.g. `919876543210`) |
| `NEXT_PUBLIC_SITE_URL` | browser + server | canonical URLs, sitemap, email links (e.g. `https://yourdomain.com`) |

> **`NEXT_PUBLIC_*` values are baked in at build time.** After changing one, rebuild/redeploy. Secrets (no prefix) are read at runtime and never reach the browser.

---

## 2. Fill in your business details

**`src/config/site.ts` is the single source of truth.** Every placeholder is marked `TODO`. Empty values are intentional: the UI **hides** a section (reviews, FAQ, inclusions, socials, map…) until it has real data, so nothing invented is ever shown.

What to fill in:

- **Brand** — `name`, `tagline`, `description` (used for SEO; mention your real inclusions).
- **Contact** — `address`, `phone` (`+91…`), `whatsapp` (digits only), `email`, `socials`.
- **Map** — `mapsEmbedUrl` (Google Maps → Share → *Embed a map* → copy the `src` URL) and `mapsDirectionsUrl` (Share → *Copy link*).
- **Stay rules** — `checkIn`, `checkOut`, `convenienceFee`, `weekendNights` (default Fri + Sat nights), `maxNights`, `bookingWindowDays`, `holdMinutes`.
- **Cottages** — for each of Aroma and Bella: descriptions, `maxGuests`, `baseGuests`, `unitsAvailable`, `pricePerPerson.weekday/weekend`, `extraPersonPrice`, `advancePercent`, `cancellationPolicy`, `houseRules`, `mealPlan`, `amenities`.
  - While prices are `null` the site shows **"Price on request"** and online booking routes guests to WhatsApp.
- **Content** — `inclusions`, `experience` (shared stay highlights), `faqs`, `reviews` (**real reviews only**), `googleRating` (real figure or `null`), `videos` (YouTube IDs), `about.story`.
- **Shared policy note** — `policies.checkInNote`, `policies.lastUpdated`; cancellation terms and house rules belong to each cottage.

**Pricing model** (`src/lib/pricing.ts`): each night uses the weekday or weekend per-person rate, or a **price override** set in the admin. Guests up to `baseGuests × cottages` pay the per-person rate; extra guests pay `extraPersonPrice`. A flat `convenienceFee` is added once. The guest pays the selected cottage's `advancePercent` online; the rest at check-in.

After changing **`unitsAvailable`, `maxGuests` or `baseGuests`**, sync them to the database (availability is calculated there):

```bash
npm run db:sync-cottages            # uses .env.local
npm run db:sync-cottages -- --dry   # preview only
```

> The terms & privacy text on `/policies` describe how this website works. Have them reviewed for your business before launch.

---

## 3. Supabase

### 3.1 Create the project
1. Create a project at [supabase.com](https://supabase.com) — choose the **Mumbai (ap-south-1)** region for low latency in India.
2. **Project Settings → API**: copy the *Project URL*, *anon* key and *service_role* key into `.env.local`.
   Never expose the service_role key in the browser or commit it.

### 3.2 Run the migrations (in order)

| File | What it adds |
|---|---|
| `supabase/migrations/20261124000000_init.sql` | tables, `get_availability`, `create_booking` (overbooking-safe), hold expiry, RLS, seed cottage types |
| `supabase/migrations/20261124000100_payments.sql` | `confirm_booking_payment` — atomic, idempotent payment confirmation |
| `supabase/migrations/20261124000200_admin.sql` | `admin_set_booking_status` — safe manual status changes |
| `supabase/migrations/20261125000100_sec01_hold_limits.sql` | Limits active booking holds per phone number and IP |
| `supabase/migrations/20261125000200_sec03_payment_validation.sql` | Validates payment amount and currency before confirmation |
| `supabase/migrations/20261125000300_sec04_expired_payment_holds.sql` | Safely handles late payments for expired booking holds |
| `supabase/migrations/20261125000400_guest_parties_and_reviews.sql` | Age-based guest counts, dietary breakdowns, and moderated guest reviews |

**Option A — Supabase CLI**
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

**Option B — SQL editor**: open each file in order, paste into *SQL Editor*, run. All migrations are safe to re-run.

Then run `npm run db:sync-cottages` so `cottage_types` matches `site.ts`.

### 3.3 Optional: auto-expire unpaid holds
Unpaid bookings stop holding a cottage after `holdMinutes` (15) automatically — availability ignores expired holds at query time. To also flip their status to `cancelled` for tidy reporting, enable **Database → Extensions → pg_cron**, then run:

```sql
select cron.schedule('expire-pending-bookings', '*/5 * * * *',
                     $$select public.expire_pending_bookings()$$);
```

### 3.4 Admin login (magic links)
1. **Authentication → URL Configuration**
   - *Site URL*: `https://yourdomain.com`
   - *Redirect URLs*: add `https://yourdomain.com/auth/callback` and `http://localhost:3000/auth/callback`
2. Set `ADMIN_EMAIL` (e.g. `owner@gmail.com,manager@gmail.com`). Only these addresses can sign in; links are never sent to anyone else.
3. Recommended: **Authentication → Emails → SMTP Settings** → use Resend's SMTP so login emails aren't limited by Supabase's built-in sender (it allows only a few emails per hour).
4. Open the sign-in link **in the same browser** you requested it from (the PKCE login is tied to that browser).

*(Optional)* The `admin_emails` table lets admins query bookings directly with their own Supabase login under RLS. The dashboard doesn't need it — it checks `ADMIN_EMAIL` on the server for every request.

### Security model
- RLS is on for every table. The public (anon key) can only read cottage types and price overrides, and call `get_availability` (which never exposes booking details or block reasons).
- Bookings are created only by the server through `create_booking`, which locks the cottage type and re-checks every night inside a transaction — two guests can't book the last cottage.
- Every admin page, Server Action and admin API route re-checks the signed-in email against `ADMIN_EMAIL` (the `src/proxy.ts` check is an early redirect, not the only guard).

---

## 4. Razorpay

### 4.1 Test mode first
1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → switch to **Test Mode** → *Account & Settings → API Keys* → generate keys.
2. Put them in `.env.local`: `RAZORPAY_KEY_ID=rzp_test_…`, `RAZORPAY_KEY_SECRET=…` (and the same key ID in `NEXT_PUBLIC_RAZORPAY_KEY_ID`).
3. Set real prices in `site.ts`, then book on `/book`. The review step shows a **Test mode** notice. Pay with UPI ID `success@razorpay` (or `failure@razorpay` to test failures) or Razorpay's [test cards](https://razorpay.com/docs/payments/payments/test-card-details/).

### 4.2 Webhook (backup confirmation)
If a guest closes the browser right after paying, the webhook still confirms the booking.

1. *Account & Settings → Webhooks → Add New Webhook*
   - URL: `https://yourdomain.com/api/webhooks/razorpay`
   - Secret: any strong random string → also set as `RAZORPAY_WEBHOOK_SECRET`
   - Events: **`payment.captured`** and **`order.paid`**
2. For local testing, expose your dev server with a tunnel (e.g. `ngrok http 3000` or `cloudflared tunnel`) and use that URL.

Payment confirmation is **idempotent**: whichever arrives first (the browser's verify call or the webhook) confirms the booking and sends emails; the other is a no-op. Late or duplicate payments are flagged *"refund required"* in the admin and emailed to you.

### 4.3 Going live
Complete Razorpay KYC, generate **Live** keys, create the same webhook in Live mode, swap the env vars in Vercel and redeploy. The "Test mode" notice disappears automatically.

---

## 5. Resend (emails)

Emails sent: guest **booking confirmation**, admin **new-booking alert**, admin **payment needs attention**, and **contact-form messages** (reply goes straight to the guest).

1. Create an API key at [resend.com](https://resend.com) → `RESEND_API_KEY`.
2. **Domains → Add domain** → add the DNS records (SPF/DKIM) at your domain registrar → wait for *Verified*.
3. Set `EMAIL_FROM="Your Brand <bookings@yourdomain.com>"`.

Until a domain is verified, Resend's test sender only delivers to your own Resend account email. If `RESEND_API_KEY` is missing, emails are skipped and logged — bookings still work.

---

## 6. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework auto-detected; Node version comes from `engines`).
3. **Settings → Environment Variables**: add every variable from section 1 for *Production* (and *Preview* with test keys). Set `NEXT_PUBLIC_SITE_URL` to your real domain.
4. Deploy. Then **Settings → Domains** → add your domain.
5. Recommended: **Settings → Functions → Region** → *Mumbai (bom1)*, close to your Supabase region.
6. Update the Supabase redirect URLs (3.4) and the Razorpay webhook URL (4.2) to the production domain.

> Remember: changing a `NEXT_PUBLIC_*` variable requires a **redeploy**.

After deploying, submit `https://yourdomain.com/sitemap.xml` in Google Search Console.

---

## 7. Adding photos, panoramas & videos

Photos live in `public/images/<category>/` and are picked up automatically at build time:

| Folder | Used on |
|---|---|
| `aroma/`, `bella/` | cottage cards, cottage pages, gallery |
| `lake/`, `food/`, `activities/`, `night/` | gallery, home teaser, about page |

- **Formats**: JPG, PNG, WebP or AVIF. Export around **2000–2400 px** on the long edge; Next.js serves optimised AVIF/WebP at the right size with blur placeholders.
- **Order** follows file names — prefix with numbers: `01-deck-at-sunset.jpg`, `02-interior.jpg`.
- **Alt text** comes from the file name (`aroma/02-lake-view-bedroom.jpg` → "Aroma Cottage — lake view bedroom"). For better descriptions add `_alt.json` in the folder:
  ```json
  { "02-lake-view-bedroom.jpg": "Queen bed facing the lake through glass doors" }
  ```
- **Placeholders**: the generated `placeholder-*.webp` images disappear from a folder as soon as it contains one real photo. Remove all of them with `npm run placeholders -- --clean`.
- **Hero**: replace `public/images/hero-poster.webp` (1920×1080, desktop) and `hero-poster-mobile.webp` (900×1600, phones). The 3D scene appears over the poster on capable desktops only.
- **360° view**: add `public/images/aroma/panorama.jpg` (or `bella/`) — an **equirectangular 2:1** photo (most phones' panorama/360 modes, or any 360 camera). The "360° / 3D view" tab appears automatically.
- **Videos**: add YouTube IDs to `videos` in `site.ts` — `{ title: "Sunset at the lake", youtubeId: "abc123XYZ" }`. They load only when tapped.
- **Share images** for social media are generated automatically from your first lake/cottage photo.

Photos are part of the deploy, so **commit and redeploy** after adding them.

---

## 8. Using the admin dashboard

Go to `/admin` → enter an `ADMIN_EMAIL` address → click the emailed link.

- **Bookings** — search by code/name/phone/email; filter by status, cottage and stay dates; **Export CSV** (opens in Excel). Highlights payments needing a refund.
  - Status changes: *Confirm* (e.g. paid by UPI directly), *Cancel* (frees the cottage — issue refunds from Razorpay), *Complete*, *Re-activate*. Availability is re-checked whenever a booking becomes active again, and every change is logged on the booking with your email and the date.
- **New booking** — record WhatsApp, phone or walk-in bookings. Shows live availability and the standard price; you can enter an agreed total and the amount already paid, and optionally email the guest.
- **Occupancy** — month calendar per cottage type: free/total per night, blocked units, special prices and check-ins.
- **Blocks & prices** — block dates (all units or some) for maintenance/private events, and set special per-person prices for festivals or long weekends. Blocking doesn't cancel existing bookings — you'll be warned about overlaps.

---

## 9. How booking & payment work

```
Guest on /book
  1 cottage → 2 dates (live availability) → 3 guests & cottages → 4 details → 5 review & pay
                                                     │
POST /api/quote ─────────── price computed on the server (site.ts + price overrides)
POST /api/bookings ──────── validate → server quote → create_booking() holds the cottage 15 min
                            → Razorpay order for the advance → Checkout opens
Checkout success ─────────► POST /api/payments/verify (HMAC signature) ┐
Razorpay webhook ─────────► POST /api/webhooks/razorpay (signature)    ├─► confirm_booking_payment()
                                                                        ┘   first one wins → emails sent once
/book/success/[id] ──────── shows code, Google Calendar link, WhatsApp share, directions
```

- Prices are **never** taken from the browser.
- If the guest closes Checkout, retrying reuses the same hold and order.
- Everything falls back to **"Book on WhatsApp"** (prefilled with cottage, dates and guests) if a service is unavailable. The floating WhatsApp and call buttons on every page use the same prefill.

---

## 10. Tests & scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | develop / production build / serve the build |
| `npm run lint` | ESLint (incl. React Compiler rules) |
| `npm run typecheck` | generate route types + `tsc` |
| `npm test` | Vitest unit tests — pricing, dates, calendar links, phone validation, Razorpay signatures, emails, CSV, ranges |
| `npm run test:db` | Database tests — runs the real migrations on PGlite (Postgres in WASM, no setup) and checks availability, overbooking, hold expiry, payments, admin status changes and RLS |
| `npm run db:sync-cottages` | push cottage units/capacity/prices from `site.ts` to Supabase |
| `npm run placeholders` | (re)generate placeholder photos; `-- --clean` removes them |

---

## 11. Project structure

```
src/
  app/
    (site)/            public pages — home, cottages/[slug], gallery, book, about, policies, contact
    admin/             dashboard (login, bookings, new, calendar, availability) + Server Actions
    api/               availability, quote, bookings, payments/verify, webhooks/razorpay, contact, admin CSV
    auth/callback/     magic-link landing
    sitemap.ts, robots.ts, not-found.tsx
  components/          ui/ (shadcn), sections/, booking/, admin/, gallery/, cottage/, three/, motion/, contact/
  config/site.ts       ← all business data
  emails/              react-email templates
  lib/                 pricing, dates, availability, quote, razorpay, payments, email, whatsapp, seo, supabase/, admin/
  proxy.ts             admin session refresh + early redirect
supabase/migrations/   SQL schema, functions and RLS
scripts/               placeholder generator, cottage sync, db-tests/
public/images/         photos by category
```

> This project uses **Next.js 16**: `proxy.ts` replaces `middleware.ts`, and Cache Components are on (request-time data such as cookies and search params is read inside `<Suspense>`). Version-matched docs live in `node_modules/next/dist/docs/`.

---

## 12. Launch checklist

- [ ] Every `TODO` in `src/config/site.ts` filled in (brand, contact, prices, units, descriptions, policies)
- [ ] Real photos added; placeholders removed (`npm run placeholders -- --clean`); hero posters replaced
- [ ] Supabase: all migrations run, cottage data synced, auth redirect URLs set, SMTP configured
- [ ] `ADMIN_EMAIL` set; admin login tested
- [ ] Submit a guest review and approve it from `/admin/reviews`
- [ ] Resend domain verified; `EMAIL_FROM` set; confirmation email received in a test booking
- [ ] Razorpay test booking end-to-end (pay, cancel, failed payment) and webhook delivery OK in the dashboard
- [ ] Policies reviewed; `policies.lastUpdated` set
- [ ] Vercel env vars set for Production; `NEXT_PUBLIC_SITE_URL` = real domain; redeployed
- [ ] Razorpay **Live** keys + live webhook; one small real payment tested and refunded
- [ ] Sitemap submitted to Google Search Console; Google Business Profile links to the site

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| Booking shows "Live availability isn't available" | Supabase env vars missing or migrations not run. |
| "Online booking opens soon" | Prices in `site.ts` are `null` for that cottage. |
| "Online payment isn't set up yet" | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` missing. |
| Admin link says *expired* or loops to login | Open the link in the same browser; check Supabase redirect URLs; make sure the email is in `ADMIN_EMAIL`. |
| Paid but booking still "Confirming…" | Check the webhook delivery log in Razorpay and the `RAZORPAY_WEBHOOK_SECRET`. The admin can also *Confirm* the booking manually. |
| No emails | `RESEND_API_KEY` / domain verification / `EMAIL_FROM`; check Resend → Logs. |
| Changed an env var but nothing changed | `NEXT_PUBLIC_*` needs a rebuild/redeploy. |
| A style or CSS change doesn't show after `npm run build` | Delete the `.next` folder and rebuild (stale build cache). |
| New photos don't appear | Rebuild/redeploy — images are read at build time. |
