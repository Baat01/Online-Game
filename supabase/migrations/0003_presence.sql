-- =============================================================================
-- Migration 0003: Presence Table
-- CardArena — Multiplayer Card Game Platform
--
-- Dedicated presence table for Supabase Realtime Presence tracking.
-- Keeps high-frequency heartbeat writes separate from the profiles table.
-- =============================================================================

-- ─────────────────────────────────────────────
-- Table: presence
-- ─────────────────────────────────────────────
create table public.presence (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  last_seen timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.presence enable row level security;

-- Anyone can read online status (needed for friend lists, lobby)
create policy "presence: public read"
  on public.presence for select using (true);

-- Only the owner can upsert their own presence row
create policy "presence: owner upsert"
  on public.presence for insert
  with check (auth.uid() = user_id);

create policy "presence: owner update"
  on public.presence for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Enable Realtime for presence
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.presence;

-- ─────────────────────────────────────────────
-- Auto-create presence row when profile is created
-- ─────────────────────────────────────────────
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.presence (user_id, is_online, last_seen)
  values (new.id, false, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();
