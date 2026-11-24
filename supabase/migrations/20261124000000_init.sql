-- =============================================================================
-- Pawna Lake Cottages — initial schema
-- Tables, availability + booking functions, pending-hold expiry, RLS.
-- Run with:  supabase db push   (or paste into the Supabase SQL editor)
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
do $$ begin
  create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_source as enum ('website', 'whatsapp', 'phone', 'walk_in');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.food_pref as enum ('veg', 'non_veg', 'jain');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- tables

-- One row per stay type. Prices mirror src/config/site.ts (sync with
-- `npm run db:sync-cottages`); units_available is what availability uses.
create table if not exists public.cottage_types (
  slug               text primary key check (slug ~ '^[a-z0-9-]+$'),
  name               text not null,
  units_available    int  not null check (units_available >= 0),
  max_guests         int  not null check (max_guests > 0),
  base_guests        int  not null check (base_guests > 0),
  weekday_price      int  check (weekday_price  is null or weekday_price  >= 0),
  weekend_price      int  check (weekend_price  is null or weekend_price  >= 0),
  extra_person_price int  check (extra_person_price is null or extra_person_price >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
drop trigger if exists trg_cottage_types_updated on public.cottage_types;
create trigger trg_cottage_types_updated before update on public.cottage_types
  for each row execute function public.set_updated_at();

create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  booking_code        text not null unique,
  cottage_slug        text not null references public.cottage_types (slug) on update cascade,
  check_in            date not null,
  check_out           date not null,
  nights              int  generated always as (check_out - check_in) stored,
  guests              int  not null check (guests > 0),
  cottages_count      int  not null check (cottages_count > 0),
  name                text not null check (char_length(name) between 1 and 120),
  phone               text not null check (char_length(phone) between 7 and 20),
  email               text check (email is null or char_length(email) <= 200),
  food_pref           public.food_pref,
  notes               text check (notes is null or char_length(notes) <= 1000),
  total_amount        int  not null check (total_amount >= 0),     -- INR (rupees)
  advance_amount      int  not null check (advance_amount >= 0 and advance_amount <= total_amount),
  amount_paid         int  not null default 0 check (amount_paid >= 0),
  price_breakdown     jsonb,
  status              public.booking_status not null default 'pending_payment',
  status_note         text,
  source              public.booking_source not null default 'website',
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  expires_at          timestamptz,                                -- hold expiry for pending_payment
  confirmed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint bookings_dates_chk check (check_out > check_in)
);
create index if not exists bookings_active_range_idx
  on public.bookings (cottage_slug, check_in, check_out)
  where status in ('pending_payment', 'confirmed');
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists bookings_status_idx on public.bookings (status);
drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

-- Maintenance / private events. units_blocked NULL = the whole cottage type.
create table if not exists public.blocked_dates (
  id            uuid primary key default gen_random_uuid(),
  cottage_slug  text not null references public.cottage_types (slug) on update cascade on delete cascade,
  date          date not null,
  units_blocked int  check (units_blocked is null or units_blocked > 0),
  reason        text,
  created_at    timestamptz not null default now(),
  unique (cottage_slug, date)
);

-- Festival / long-weekend pricing: replaces the per-person rate for that night.
create table if not exists public.price_overrides (
  id               uuid primary key default gen_random_uuid(),
  cottage_slug     text not null references public.cottage_types (slug) on update cascade on delete cascade,
  date             date not null,
  price_per_person int  not null check (price_per_person >= 0),
  label            text,
  created_at       timestamptz not null default now(),
  unique (cottage_slug, date)
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  email      text check (email is null or char_length(email) <= 200),
  phone      text check (phone is null or char_length(phone) <= 20),
  message    text not null check (char_length(message) between 1 and 4000),
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

-- Admin allow-list used by RLS (mirrors the ADMIN_EMAIL env var; the app also
-- checks ADMIN_EMAIL server-side before every admin action).
create table if not exists public.admin_emails (
  email text primary key check (email = lower(email))
);

-- ---------------------------------------------------------------- functions

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_emails a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Releases pending holds whose 15-minute window has passed.
create or replace function public.expire_pending_bookings()
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.bookings
     set status = 'cancelled', status_note = 'expired: payment not completed in time'
   where status = 'pending_payment' and expires_at is not null and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- Per-night availability for [p_from, p_to). Expired holds are ignored at
-- query time, so availability is correct even if the cron job hasn't run.
-- Blocked-date reasons are never exposed.
create or replace function public.get_availability(p_slug text, p_from date, p_to date)
returns table (night date, units_total int, booked int, blocked int, available int)
language sql stable security definer set search_path = public as $$
  with ct as (
    select units_available from public.cottage_types where slug = p_slug
  ),
  nights as (
    select d::date as night
    from generate_series(p_from, p_to - 1, interval '1 day') as d
    where p_to > p_from and p_to - p_from <= 62
  ),
  calc as (
    select
      n.night,
      ct.units_available as units_total,
      coalesce((
        select sum(b.cottages_count)
        from public.bookings b
        where b.cottage_slug = p_slug
          and b.check_in <= n.night and b.check_out > n.night
          and (b.status = 'confirmed'
               or (b.status = 'pending_payment' and (b.expires_at is null or b.expires_at > now())))
      ), 0)::int as booked,
      coalesce((
        select case when bool_or(bd.units_blocked is null) then ct.units_available
                    else sum(bd.units_blocked) end
        from public.blocked_dates bd
        where bd.cottage_slug = p_slug and bd.date = n.night
      ), 0)::int as blocked
    from nights n cross join ct
  )
  select night, units_total, booked, blocked,
         greatest(units_total - booked - blocked, 0) as available
  from calc
  order by night;
$$;

-- Readable booking code, e.g. PWN-8F3K2 (no 0/O/1/I to avoid confusion).
create or replace function public.generate_booking_code()
returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  bytes bytea;
  code text;
  i int;
begin
  loop
    bytes := gen_random_bytes(5);
    code := 'PWN-';
    for i in 0..4 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where booking_code = code);
  end loop;
  return code;
end $$;

-- Creates a booking atomically. Locks the cottage_types row so concurrent
-- bookings for the same type are serialised, then re-checks every night.
-- Raises: INVALID_DATES, UNKNOWN_COTTAGE, NOT_AVAILABLE (all SQLSTATE P0001).
create or replace function public.create_booking(
  p_slug            text,
  p_check_in        date,
  p_check_out       date,
  p_guests          int,
  p_cottages        int,
  p_name            text,
  p_phone           text,
  p_email           text,
  p_food_pref       public.food_pref,
  p_notes           text,
  p_total           int,
  p_advance         int,
  p_breakdown       jsonb,
  p_source          public.booking_source default 'website',
  p_status          public.booking_status default 'pending_payment',
  p_hold_minutes    int default 15
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_ct  public.cottage_types;
  v_min int;
  v_row public.bookings;
begin
  if p_check_out <= p_check_in then
    raise exception 'INVALID_DATES';
  end if;
  if p_status not in ('pending_payment', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_ct from public.cottage_types where slug = p_slug for update;
  if not found then
    raise exception 'UNKNOWN_COTTAGE';
  end if;
  if p_guests > v_ct.max_guests * p_cottages or p_guests < p_cottages then
    raise exception 'INVALID_GUESTS';
  end if;

  perform public.expire_pending_bookings();

  select min(a.available) into v_min
  from public.get_availability(p_slug, p_check_in, p_check_out) a;

  if v_min is null or v_min < p_cottages then
    raise exception 'NOT_AVAILABLE';
  end if;

  insert into public.bookings (
    booking_code, cottage_slug, check_in, check_out, guests, cottages_count,
    name, phone, email, food_pref, notes, total_amount, advance_amount,
    price_breakdown, status, source, expires_at, confirmed_at
  ) values (
    public.generate_booking_code(), p_slug, p_check_in, p_check_out, p_guests, p_cottages,
    p_name, p_phone, nullif(p_email, ''), p_food_pref, nullif(p_notes, ''), p_total, p_advance,
    p_breakdown, p_status, p_source,
    case when p_status = 'pending_payment' then now() + make_interval(mins => p_hold_minutes) end,
    case when p_status = 'confirmed' then now() end
  )
  returning * into v_row;

  return v_row;
end $$;

-- ---------------------------------------------------------------- grants
revoke all on function public.create_booking(text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb, public.booking_source, public.booking_status, int) from public, anon, authenticated;
revoke all on function public.expire_pending_bookings() from public, anon, authenticated;
revoke all on function public.generate_booking_code() from public, anon, authenticated;
grant execute on function public.create_booking(text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb, public.booking_source, public.booking_status, int) to service_role;
grant execute on function public.expire_pending_bookings() to service_role;
grant execute on function public.get_availability(text, date, date) to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------- RLS
alter table public.cottage_types    enable row level security;
alter table public.bookings         enable row level security;
alter table public.blocked_dates    enable row level security;
alter table public.price_overrides  enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_emails     enable row level security;

-- Public: read cottage types and price overrides (prices are public anyway).
drop policy if exists "cottage_types public read" on public.cottage_types;
create policy "cottage_types public read" on public.cottage_types for select using (true);
drop policy if exists "cottage_types admin write" on public.cottage_types;
create policy "cottage_types admin write" on public.cottage_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "price_overrides public read" on public.price_overrides;
create policy "price_overrides public read" on public.price_overrides for select using (true);
drop policy if exists "price_overrides admin write" on public.price_overrides;
create policy "price_overrides admin write" on public.price_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin only: bookings, blocked dates, contact messages, admin list.
-- (Public booking creation goes through the server API -> create_booking with
--  the service role, which bypasses RLS.)
drop policy if exists "bookings admin all" on public.bookings;
create policy "bookings admin all" on public.bookings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blocked_dates admin all" on public.blocked_dates;
create policy "blocked_dates admin all" on public.blocked_dates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contact_messages admin all" on public.contact_messages;
create policy "contact_messages admin all" on public.contact_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_emails admin read" on public.admin_emails;
create policy "admin_emails admin read" on public.admin_emails for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- seed
-- Defaults for a fresh database. Re-sync existing databases after editing
-- src/config/site.ts with `npm run db:sync-cottages`.
insert into public.cottage_types
  (slug, name, units_available, max_guests, base_guests, weekday_price, weekend_price, extra_person_price)
values ('aroma', 'Aroma Cottage', 20, 2, 2, 1299, 1299, null),
       ('bella', 'Bella Cottage', 5, 4, 2, null, null, null)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- optional cron
-- Holds are already ignored at query time once expired. To also flip their
-- status to 'cancelled' every 5 minutes, enable the pg_cron extension
-- (Dashboard -> Database -> Extensions) and run:
--
--   select cron.schedule('expire-pending-bookings', '*/5 * * * *',
--                        $$select public.expire_pending_bookings()$$);
