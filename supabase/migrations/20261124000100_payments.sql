-- =============================================================================
-- Payments: atomic, idempotent confirmation used by BOTH the client-side
-- verify endpoint and the Razorpay webhook. Whichever arrives first wins; the
-- other gets 'already_confirmed'. Only 'confirmed' / 'late_confirmed' should
-- trigger confirmation emails, so emails are sent exactly once.
-- =============================================================================

create index if not exists bookings_order_idx on public.bookings (razorpay_order_id);

create or replace function public.confirm_booking_payment(
  p_order_id   text,
  p_payment_id text,
  p_amount     int      -- rupees actually paid
)
returns table (outcome text, booking_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  b     public.bookings;
  v_min int;
begin
  -- Lock the booking so verify + webhook can't both confirm it.
  select * into b from public.bookings where razorpay_order_id = p_order_id for update;
  if not found then
    return query select 'not_found'::text, null::uuid;
    return;
  end if;

  -- Already confirmed: same payment = replay (idempotent); different payment = double charge.
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

  -- Normal path: still holding.
  if b.status = 'pending_payment' then
    update public.bookings
       set status = 'confirmed', razorpay_payment_id = p_payment_id, amount_paid = coalesce(p_amount, b.advance_amount),
           confirmed_at = now(), expires_at = null, status_note = null
     where id = b.id;
    return query select 'confirmed'::text, b.id;
    return;
  end if;

  -- Cancelled. Replay of a payment we already handled?
  if b.razorpay_payment_id = p_payment_id then
    return query select (case when b.status = 'confirmed' then 'already_confirmed' else 'refund_required' end)::text, b.id;
    return;
  end if;

  -- Hold expired before the payment landed: confirm only if the cottage is still free.
  if coalesce(b.status_note, '') like 'expired%' then
    perform 1 from public.cottage_types where slug = b.cottage_slug for update;
    select min(a.available) into v_min from public.get_availability(b.cottage_slug, b.check_in, b.check_out) a;
    if coalesce(v_min, 0) >= b.cottages_count then
      update public.bookings
         set status = 'confirmed', razorpay_payment_id = p_payment_id, amount_paid = coalesce(p_amount, b.advance_amount),
             confirmed_at = now(), expires_at = null, status_note = 'confirmed after hold expired'
       where id = b.id;
      return query select 'late_confirmed'::text, b.id;
      return;
    end if;
  end if;

  -- Paid, but the booking can't be honoured (sold out / cancelled by admin).
  update public.bookings
     set razorpay_payment_id = p_payment_id, amount_paid = coalesce(p_amount, b.advance_amount),
         status_note = 'PAID but booking not active — refund required'
   where id = b.id;
  return query select 'refund_required'::text, b.id;
end $$;

revoke all on function public.confirm_booking_payment(text, text, int) from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(text, text, int) to service_role;
