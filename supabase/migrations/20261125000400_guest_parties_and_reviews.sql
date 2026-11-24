-- Store each booking's guest ages and per-person meal counts.
alter table public.bookings
  add column if not exists adult_count int,
  add column if not exists child_half_count int,
  add column if not exists child_free_count int,
  add column if not exists food_veg_count int,
  add column if not exists food_non_veg_count int,
  add column if not exists food_jain_count int;

update public.bookings
set adult_count = guests,
    child_half_count = 0,
    child_free_count = 0,
    food_veg_count = case when food_pref = 'veg' then guests else 0 end,
    food_non_veg_count = case when food_pref = 'non_veg' then guests else 0 end,
    food_jain_count = case when food_pref = 'jain' then guests else 0 end
where adult_count is null;

alter table public.bookings
  alter column adult_count set not null,
  alter column child_half_count set default 0,
  alter column child_half_count set not null,
  alter column child_free_count set default 0,
  alter column child_free_count set not null,
  alter column food_veg_count set default 0,
  alter column food_veg_count set not null,
  alter column food_non_veg_count set default 0,
  alter column food_non_veg_count set not null,
  alter column food_jain_count set default 0,
  alter column food_jain_count set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_guest_counts_chk') then
    alter table public.bookings add constraint bookings_guest_counts_chk
      check (
        adult_count >= cottages_count
        and child_half_count >= 0
        and child_free_count >= 0
        and adult_count + child_half_count + child_free_count = guests
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bookings_food_counts_chk') then
    alter table public.bookings add constraint bookings_food_counts_chk
      check (
        food_veg_count >= 0
        and food_non_veg_count >= 0
        and food_jain_count >= 0
        and food_veg_count + food_non_veg_count + food_jain_count in (0, guests)
      );
  end if;
end $$;

-- Replace the booking RPC with one that atomically stores age and food counts.
drop function if exists public.create_booking(
  text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb,
  public.booking_source, public.booking_status, int, text, uuid
);

create or replace function public.create_booking(
  p_slug               text,
  p_check_in           date,
  p_check_out          date,
  p_guests             int,
  p_cottages           int,
  p_name               text,
  p_phone              text,
  p_email              text,
  p_food_pref          public.food_pref,
  p_notes              text,
  p_total              int,
  p_advance            int,
  p_breakdown          jsonb,
  p_source             public.booking_source default 'website',
  p_status             public.booking_status default 'pending_payment',
  p_hold_minutes       int default 15,
  p_client_ip_hash     text default null,
  p_replace_booking_id uuid default null,
  p_adults             int default null,
  p_children_half      int default 0,
  p_children_free      int default 0,
  p_food_veg           int default null,
  p_food_non_veg       int default null,
  p_food_jain          int default null
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_ct          public.cottage_types;
  v_min         int;
  v_row         public.bookings;
  v_public_hold boolean := (p_source = 'website' and p_status = 'pending_payment');
  v_adults      int := coalesce(p_adults, p_guests);
  v_half        int := coalesce(p_children_half, 0);
  v_free        int := coalesce(p_children_free, 0);
  v_food_veg    int := coalesce(p_food_veg, case when p_food_pref = 'veg' then p_guests else 0 end);
  v_food_non_veg int := coalesce(p_food_non_veg, case when p_food_pref = 'non_veg' then p_guests else 0 end);
  v_food_jain   int := coalesce(p_food_jain, case when p_food_pref = 'jain' then p_guests else 0 end);
begin
  if p_check_out <= p_check_in then
    raise exception 'INVALID_DATES';
  end if;
  if p_status not in ('pending_payment', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;
  if v_adults < p_cottages or v_half < 0 or v_free < 0 or v_adults + v_half + v_free <> p_guests then
    raise exception 'INVALID_GUESTS';
  end if;
  if v_food_veg < 0 or v_food_non_veg < 0 or v_food_jain < 0
     or v_food_veg + v_food_non_veg + v_food_jain not in (0, p_guests) then
    raise exception 'INVALID_FOOD_COUNTS';
  end if;

  if v_public_hold then
    perform pg_advisory_xact_lock(hashtextextended('hold-phone:' || p_phone, 0));
    if p_client_ip_hash is not null then
      perform pg_advisory_xact_lock(hashtextextended('hold-ip:' || p_client_ip_hash, 0));
    end if;
  end if;

  select * into v_ct from public.cottage_types where slug = p_slug for update;
  if not found then
    raise exception 'UNKNOWN_COTTAGE';
  end if;
  if p_guests > v_ct.max_guests * p_cottages or p_guests < p_cottages then
    raise exception 'INVALID_GUESTS';
  end if;

  perform public.expire_pending_bookings();

  if v_public_hold then
    if p_replace_booking_id is not null then
      update public.bookings
         set status = 'cancelled', status_note = 'replaced by a new booking attempt'
       where id = p_replace_booking_id
         and phone = p_phone
         and source = 'website'
         and status = 'pending_payment';
    end if;

    if exists (
      select 1 from public.bookings
       where status = 'pending_payment' and source = 'website' and phone = p_phone
         and (expires_at is null or expires_at > now())
    ) then
      raise exception 'TOO_MANY_HOLDS';
    end if;

    if p_client_ip_hash is not null and (
      select count(*) from public.bookings
       where status = 'pending_payment' and source = 'website' and client_ip_hash = p_client_ip_hash
         and (expires_at is null or expires_at > now())
    ) >= 2 then
      raise exception 'TOO_MANY_HOLDS';
    end if;
  end if;

  select min(a.available) into v_min
  from public.get_availability(p_slug, p_check_in, p_check_out) a;

  if v_min is null or v_min < p_cottages then
    raise exception 'NOT_AVAILABLE';
  end if;

  insert into public.bookings (
    booking_code, cottage_slug, check_in, check_out, guests, cottages_count,
    name, phone, email, food_pref, notes, total_amount, advance_amount,
    price_breakdown, status, source, expires_at, confirmed_at, client_ip_hash,
    adult_count, child_half_count, child_free_count,
    food_veg_count, food_non_veg_count, food_jain_count
  ) values (
    public.generate_booking_code(), p_slug, p_check_in, p_check_out, p_guests, p_cottages,
    p_name, p_phone, nullif(p_email, ''), p_food_pref, nullif(p_notes, ''), p_total, p_advance,
    p_breakdown, p_status, p_source,
    case when p_status = 'pending_payment' then now() + make_interval(mins => p_hold_minutes) end,
    case when p_status = 'confirmed' then now() end,
    case when v_public_hold then p_client_ip_hash end,
    v_adults, v_half, v_free,
    v_food_veg, v_food_non_veg, v_food_jain
  )
  returning * into v_row;

  return v_row;
end $$;

revoke all on function public.create_booking(
  text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb,
  public.booking_source, public.booking_status, int, text, uuid, int, int, int, int, int, int
) from public, anon, authenticated;
grant execute on function public.create_booking(
  text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb,
  public.booking_source, public.booking_status, int, text, uuid, int, int, int, int, int, int
) to service_role;

create table if not exists public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  cottage_slug text not null references public.cottage_types (slug),
  rating smallint not null check (rating between 1 and 5),
  review text not null check (char_length(review) between 1 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists guest_reviews_public_idx
  on public.guest_reviews (created_at desc) where status = 'approved';
create index if not exists guest_reviews_moderation_idx
  on public.guest_reviews (status, created_at desc);

alter table public.guest_reviews enable row level security;
drop policy if exists "guest reviews public approved read" on public.guest_reviews;
create policy "guest reviews public approved read" on public.guest_reviews
  for select using (status = 'approved');
drop policy if exists "guest reviews admin all" on public.guest_reviews;
create policy "guest reviews admin all" on public.guest_reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, update, delete on public.guest_reviews from anon, authenticated;
grant select on public.guest_reviews to anon, authenticated, service_role;
grant all on public.guest_reviews to service_role;
