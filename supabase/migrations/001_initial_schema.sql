-- ============================================================================
-- 001_initial_schema.sql — Production Sprint 3
-- ============================================================================
-- Three tables + owner-only RLS + auto-profile trigger + JSONB brain storage.
--
-- Principles:
--   • Local-first: the app functions fully offline. The server is a mirror
--     for persistence + anti-cheat on tokens, not an authority for UI reads.
--   • Owner-only RLS: every row is scoped to its auth.users.id.
--   • JSONB for trained_brains (small nets, ~24KB/user total in v1).
--   • Anonymous Supabase users are first-class — no "confirmed email" gate.
--
-- See production-plan.md Subsystem 3.3.
-- ============================================================================

-- ── profiles ────────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tokens int not null default 200 check (tokens >= 0),
  unlocked_weapons text[] not null default array['rifle'],
  unlocked_slots int not null default 1 check (unlocked_slots between 1 and 3),
  battles_completed jsonb not null default '{}'::jsonb,
  tutorial_completed boolean not null default false,
  last_daily_claim_ms bigint not null default 0,
  muted boolean not null default false,
  updated_at timestamptz not null default now()
);

create index profiles_updated_at_idx on public.profiles(updated_at desc);

-- ── soldiers ────────────────────────────────────────────────────────────
create table public.soldiers (
  id text primary key,  -- e.g. 'soldier-1739382938421' from client
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  weapon text not null default 'rifle',
  trained boolean not null default false,
  trained_brains jsonb not null default '{}'::jsonb,        -- { weapon: number[] }
  legacy_brains jsonb,                                       -- pre-Sprint-7 brains (optional)
  weapon_manuals_purchased text[] not null default '{}',     -- one-time rare-weapon fees
  fitness_score real,
  generations_trained int not null default 0,
  xp int not null default 0 check (xp >= 0),
  injured_until_ms bigint,
  updated_at timestamptz not null default now()
);

create index soldiers_user_id_idx on public.soldiers(user_id);
create index soldiers_user_updated_idx on public.soldiers(user_id, updated_at desc);

-- ── purchases ───────────────────────────────────────────────────────────
-- Stripe payment tracking. Idempotency is enforced at TWO levels:
--   • stripe_session_id unique → prevents double-creation of a checkout row
--   • stripe_event_id unique → prevents double-processing of a webhook event
-- Refund events have a different stripe_event_id than the completion event.
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_session_id text unique not null,
  stripe_event_id text unique,       -- set by webhook; nullable until completed
  pack_id text not null,
  tokens_granted int not null check (tokens_granted >= 0),
  status text not null check (status in ('pending', 'completed', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_user_id_idx on public.purchases(user_id);
create index purchases_status_idx on public.purchases(status);

-- ── Auto-create profile on new auth.users row ───────────────────────────
-- Fires for BOTH anonymous signups and authenticated signups.
-- Default tokens = 200 (v14 starter balance).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Touch updated_at on any row change ──────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create trigger soldiers_touch_updated_at
  before update on public.soldiers
  for each row execute procedure public.touch_updated_at();

create trigger purchases_touch_updated_at
  before update on public.purchases
  for each row execute procedure public.touch_updated_at();

-- ── Row-Level Security: owner-only on everything ────────────────────────
alter table public.profiles enable row level security;
alter table public.soldiers enable row level security;
alter table public.purchases enable row level security;

-- profiles: owner read/write.
create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = user_id);
-- No explicit insert policy needed — the trigger handles creation.

-- soldiers: owner full CRUD on their own rows.
create policy "soldiers_owner_select" on public.soldiers
  for select using (auth.uid() = user_id);
create policy "soldiers_owner_insert" on public.soldiers
  for insert with check (auth.uid() = user_id);
create policy "soldiers_owner_update" on public.soldiers
  for update using (auth.uid() = user_id);
create policy "soldiers_owner_delete" on public.soldiers
  for delete using (auth.uid() = user_id);

-- purchases: owner can SELECT (to show purchase history), but inserts and
-- updates happen only via Edge Functions using the service-role key.
-- Clients should never write to this table directly.
create policy "purchases_owner_select" on public.purchases
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies → denied to clients by default.

-- ── Grants: anon + authenticated get identical privileges ──────────────
-- (RLS policies above narrow row visibility; grants enable the verbs.)
grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.soldiers to anon, authenticated;
grant select on public.purchases to anon, authenticated;
