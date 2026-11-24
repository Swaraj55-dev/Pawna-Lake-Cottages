-- =============================================================================
-- SEC-01: hold-flooding protection.
-- Online (source = 'website') pending holds are limited to:
--   * 1 active hold per phone number, and
--   * 2 active holds per client IP (stored only as a salted hash, never raw).
-- A guest who changes their dates can replace their OWN previous hold by
-- passing its id; the replaced hold must belong to the same phone number.
-- Admin bookings (phone / whatsapp / walk_in) and confirmed bookings are not limited.
-- =============================================================================

alter table public.bookings add column if not exists client_ip_hash text
  check (client_ip_hash is null or char_length(client_ip_hash) <= 128);

create index if not exists bookings_active_hold_phone_idx
  on public.bookings (phone) where status = 'pending_payment';
create index if not exists bookings_active_hold_ip_idx
  on public.bookings (client_ip_hash) where status = 'pending_payment' and client_ip_hash is not null;

-- The signature changes (two new trailing parameters), so drop the old one first.
drop function if exists public.create_booking(
  text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb,
  public.booking_source, public.booking_status, int);

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
  p_replace_booking_id uuid default null
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_ct          public.cottage_types;
  v_min         int;
  v_row         public.bookings;
  v_public_hold boolean := (p_source = 'website' and p_status = 'pending_payment');
begin
  if p_check_out <= p_check_in then
    raise exception 'INVALID_DATES';
  end if;
  if p_status not in ('pending_payment', 'confirmed') then
    raise exception 'INVALID_STATUS';
  end if;

  -- Serialise holds per phone / per IP so parallel requests can't slip past the limits.
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
    -- Release the caller's own earlier hold (same phone) when they change their stay.
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
    price_breakdown, status, source, expires_at, confirmed_at, client_ip_hash
  ) values (
    public.generate_booking_code(), p_slug, p_check_in, p_check_out, p_guests, p_cottages,
    p_name, p_phone, nullif(p_email, ''), p_food_pref, nullif(p_notes, ''), p_total, p_advance,
    p_breakdown, p_status, p_source,
    case when p_status = 'pending_payment' then now() + make_interval(mins => p_hold_minutes) end,
    case when p_status = 'confirmed' then now() end,
    case when v_public_hold then p_client_ip_hash end
  )
  returning * into v_row;

  return v_row;
end $$;

revoke all on function public.create_booking(text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb, public.booking_source, public.booking_status, int, text, uuid) from public, anon, authenticated;
grant execute on function public.create_booking(text, date, date, int, int, text, text, text, public.food_pref, text, int, int, jsonb, public.booking_source, public.booking_status, int, text, uuid) to service_role;
