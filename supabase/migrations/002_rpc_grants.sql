-- ============================================================================
-- 002_rpc_grants.sql — atomic token credit/revoke RPCs
-- ============================================================================
-- The Stripe webhook Edge Function calls these to apply purchase outcomes.
-- Both are SECURITY DEFINER so they run as the schema owner (bypass RLS),
-- but they still validate the caller has the right purpose (via a service
-- role key on the Edge Function side).
--
-- Idempotency is enforced by UNIQUE constraints on stripe_event_id at the
-- purchases table level — the webhook pre-checks for event_id existence
-- before calling these.
-- ============================================================================

-- Atomically credit tokens from a completed purchase.
-- Marks the purchase row as 'completed' and increments profiles.tokens.
-- Returns the new balance, or null if the purchase was already processed.
create or replace function public.grant_tokens(
  p_user_id uuid,
  p_purchase_id uuid,
  p_tokens int,
  p_stripe_event_id text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_new_balance int;
begin
  -- Short-circuit if already processed (idempotency backstop).
  select status into v_current_status
  from public.purchases
  where id = p_purchase_id and user_id = p_user_id
  for update;

  if v_current_status is null then
    raise exception 'purchase % not found for user %', p_purchase_id, p_user_id;
  end if;
  if v_current_status = 'completed' then
    return null;  -- already credited
  end if;

  update public.purchases
  set status = 'completed',
      stripe_event_id = p_stripe_event_id
  where id = p_purchase_id;

  update public.profiles
  set tokens = tokens + p_tokens
  where user_id = p_user_id
  returning tokens into v_new_balance;

  return v_new_balance;
end;
$$;

-- Reverse a completed purchase (Stripe refund or chargeback).
-- Debits tokens and marks the purchase 'refunded'. Clamps at 0 — we never
-- go negative even if the player already spent the granted tokens; that's
-- a cost of doing business, not an exploit.
create or replace function public.revoke_tokens(
  p_user_id uuid,
  p_purchase_id uuid,
  p_tokens int,
  p_stripe_event_id text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
  v_new_balance int;
begin
  select status into v_current_status
  from public.purchases
  where id = p_purchase_id and user_id = p_user_id
  for update;

  if v_current_status is null then
    raise exception 'purchase % not found for user %', p_purchase_id, p_user_id;
  end if;
  if v_current_status = 'refunded' then
    return null;  -- already reversed
  end if;

  update public.purchases
  set status = 'refunded',
      stripe_event_id = coalesce(stripe_event_id, p_stripe_event_id)
  where id = p_purchase_id;

  update public.profiles
  set tokens = greatest(0, tokens - p_tokens)
  where user_id = p_user_id
  returning tokens into v_new_balance;

  return v_new_balance;
end;
$$;

-- Edge Functions authenticate as service_role; clients never call these.
revoke execute on function public.grant_tokens(uuid, uuid, int, text) from anon, authenticated;
revoke execute on function public.revoke_tokens(uuid, uuid, int, text) from anon, authenticated;
grant execute on function public.grant_tokens(uuid, uuid, int, text) to service_role;
grant execute on function public.revoke_tokens(uuid, uuid, int, text) to service_role;
