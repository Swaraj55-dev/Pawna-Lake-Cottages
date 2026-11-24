-- =============================================================================
-- Admin: safe manual status changes.
--   pending_payment -> confirmed | cancelled
--   confirmed       -> completed | cancelled
--   completed       -> confirmed   (undo)
--   cancelled       -> confirmed   (re-activate; availability re-checked)
-- Any move into 'confirmed' from a state that isn't currently holding a cottage
-- (cancelled, or a pending hold that already expired) re-checks availability
-- under the same cottage_types row lock that create_booking uses.
-- =============================================================================

create or replace function public.admin_set_booking_status(
  p_id     uuid,
  p_status public.booking_status,
  p_note   text default null
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b         public.bookings;
  holding   boolean;
  v_min     int;
begin
  select * into b from public.bookings where id = p_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if b.status = p_status then
    return b;
  end if;

  if not (
       (b.status = 'pending_payment' and p_status in ('confirmed', 'cancelled'))
    or (b.status = 'confirmed'       and p_status in ('completed', 'cancelled'))
    or (b.status = 'completed'       and p_status = 'confirmed')
    or (b.status = 'cancelled'       and p_status = 'confirmed')
  ) then
    raise exception 'INVALID_TRANSITION';
  end if;

  holding := b.status in ('confirmed', 'completed')
          or (b.status = 'pending_payment' and (b.expires_at is null or b.expires_at > now()));

  if p_status = 'confirmed' and not holding then
    perform 1 from public.cottage_types where slug = b.cottage_slug for update;
    select min(a.available) into v_min
      from public.get_availability(b.cottage_slug, b.check_in, b.check_out) a;
    if coalesce(v_min, 0) < b.cottages_count then
      raise exception 'NOT_AVAILABLE';
    end if;
  end if;

  update public.bookings
     set status       = p_status,
         confirmed_at = case when p_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
         expires_at   = case when p_status = 'pending_payment' then expires_at else null end,
         status_note  = case when p_note is null or p_note = '' then status_note
                             else concat_ws('; ', status_note, p_note) end
   where id = b.id
  returning * into b;
  return b;
end $$;

revoke all on function public.admin_set_booking_status(uuid, public.booking_status, text) from public, anon, authenticated;
grant execute on function public.admin_set_booking_status(uuid, public.booking_status, text) to service_role;
