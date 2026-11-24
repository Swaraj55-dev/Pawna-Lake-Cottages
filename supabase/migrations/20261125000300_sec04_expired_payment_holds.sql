-- SEC-04: sweep expired holds before a payment confirmation or admin status change.
create or replace function public.confirm_booking_payment(
  p_order_id      text,
  p_payment_id    text,
  p_amount_paise  bigint,
  p_currency      text
)
returns table (outcome text, booking_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  b     public.bookings;
  v_min int;
begin
  perform public.expire_pending_bookings();

  select * into b from public.bookings where razorpay_order_id = p_order_id for update;
  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  if b.status in ('confirmed', 'completed') then
    if b.razorpay_payment_id is null or b.razorpay_payment_id = p_payment_id then
      return query select 'already_confirmed'::text, b.id;
    else
      update public.bookings
         set status_note = concat_ws('; ', status_note, 'duplicate payment ' || p_payment_id || ' — refund required')
       where id = b.id and coalesce(status_note, '') not like '%' || p_payment_id || '%';
      return query select 'duplicate_payment'::text, b.id;
    end if;
    return;
  end if;

  if p_amount_paise is null or p_currency is null then
    return query select 'pending'::text, b.id;
    return;
  end if;

  if p_currency <> 'INR' or p_amount_paise <> b.advance_amount::bigint * 100 then
    update public.bookings
       set razorpay_payment_id = p_payment_id,
           status_note = format(
             'amount_mismatch: expected %s paise INR, received %s paise %s; refund required',
             b.advance_amount::bigint * 100, p_amount_paise, p_currency
           )
     where id = b.id;
    return query select 'refund_required'::text, b.id;
    return;
  end if;

  if b.status = 'pending_payment' then
    update public.bookings
       set status = 'confirmed', razorpay_payment_id = p_payment_id, amount_paid = b.advance_amount,
           confirmed_at = now(), expires_at = null, status_note = null
     where id = b.id;
    return query select 'confirmed'::text, b.id;
    return;
  end if;

  if b.razorpay_payment_id = p_payment_id then
    return query select (case when b.status = 'confirmed' then 'already_confirmed' else 'refund_required' end)::text, b.id;
    return;
  end if;

  if coalesce(b.status_note, '') like 'expired%' then
    perform 1 from public.cottage_types where slug = b.cottage_slug for update;
    select min(a.available) into v_min from public.get_availability(b.cottage_slug, b.check_in, b.check_out) a;
    if coalesce(v_min, 0) >= b.cottages_count then
      update public.bookings
         set status = 'confirmed', razorpay_payment_id = p_payment_id, amount_paid = b.advance_amount,
             confirmed_at = now(), expires_at = null, status_note = 'confirmed after hold expired'
       where id = b.id;
      return query select 'late_confirmed'::text, b.id;
      return;
    end if;
  end if;

  update public.bookings
     set razorpay_payment_id = p_payment_id, amount_paid = b.advance_amount,
         status_note = 'PAID but booking not active — refund required'
   where id = b.id;
  return query select 'refund_required'::text, b.id;
end $$;

revoke all on function public.confirm_booking_payment(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(text, text, bigint, text) to service_role;

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
  perform public.expire_pending_bookings();

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
