-- =============================================================================
-- Migration 0006: Friends System v2
-- CardArena — Multiplayer Card Game Platform
--
-- Drops and recreates friend_requests + friends with the clean Phase 2.3 schema.
-- Run this in the Supabase SQL editor AFTER 0005_avatars_bucket.sql.
--
-- WARNING: This drops existing friend_requests and friends tables.
--          All existing friendship data will be lost (expected in dev).
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. Drop old tables (cascade removes old RLS / triggers / indexes)
-- ─────────────────────────────────────────────
drop table if exists public.friends cascade;
drop table if exists public.friend_requests cascade;

-- ─────────────────────────────────────────────
-- 2. Drop old enum (was 'pending' | 'accepted' | 'blocked')
--    Recreate with full Phase 2.3 statuses
-- ─────────────────────────────────────────────
drop type if exists public.friend_status cascade;

create type public.friend_status as enum (
  'pending',
  'accepted',
  'rejected',
  'cancelled'
);

-- ─────────────────────────────────────────────
-- 3. Table: friend_requests
-- One row per request; sender → receiver.
-- ─────────────────────────────────────────────
create table public.friend_requests (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status      public.friend_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Prevent self-requests
  constraint no_self_request check (sender_id <> receiver_id),
  -- Only one active (pending) request between any pair at a time
  constraint unique_active_request unique (sender_id, receiver_id)
);

-- Performance indexes
create index friend_requests_sender_idx   on public.friend_requests (sender_id);
create index friend_requests_receiver_idx on public.friend_requests (receiver_id);
create index friend_requests_status_idx   on public.friend_requests (status);

-- Auto-update updated_at
create trigger friend_requests_updated_at
  before update on public.friend_requests
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────
-- 4. Table: friends
-- Materialised symmetric friendship.
-- Both directions stored: (A→B) and (B→A).
-- ─────────────────────────────────────────────
create table public.friends (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  friend_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),

  constraint no_self_friend   check (user_id <> friend_id),
  constraint unique_friendship unique (user_id, friend_id)
);

-- Performance indexes
create index friends_user_id_idx   on public.friends (user_id);
create index friends_friend_id_idx on public.friends (friend_id);

-- ─────────────────────────────────────────────
-- 5. Function: create symmetric friendship on accept
-- Called when a friend_request is updated to 'accepted'.
-- ─────────────────────────────────────────────
create or replace function public.handle_friend_request_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    -- Insert both directions (ignore if already exists)
    insert into public.friends (user_id, friend_id)
    values (new.sender_id, new.receiver_id)
    on conflict (user_id, friend_id) do nothing;

    insert into public.friends (user_id, friend_id)
    values (new.receiver_id, new.sender_id)
    on conflict (user_id, friend_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_friend_request_accepted
  after update on public.friend_requests
  for each row execute function public.handle_friend_request_accepted();

-- ─────────────────────────────────────────────
-- 6. Function: remove both directions on unfriend
-- Called when a row is deleted from friends.
-- ─────────────────────────────────────────────
create or replace function public.handle_friend_removed()
returns trigger language plpgsql security definer as $$
begin
  -- Delete the reverse direction (this direction already being deleted)
  delete from public.friends
  where user_id = old.friend_id and friend_id = old.user_id;
  return old;
end;
$$;

create trigger on_friend_removed
  after delete on public.friends
  for each row execute function public.handle_friend_removed();

-- ─────────────────────────────────────────────
-- 7. Row Level Security — friend_requests
-- ─────────────────────────────────────────────
alter table public.friend_requests enable row level security;

-- Both sender and receiver can read the request
create policy "friend_requests: read own"
  on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Only the sender can create a request
create policy "friend_requests: send"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

-- Receiver can accept/reject; sender can cancel
create policy "friend_requests: respond or cancel"
  on public.friend_requests for update
  using (auth.uid() = receiver_id or auth.uid() = sender_id);

-- Sender can delete a pending request (hard cancel)
create policy "friend_requests: delete own"
  on public.friend_requests for delete
  using (auth.uid() = sender_id);

-- ─────────────────────────────────────────────
-- 8. Row Level Security — friends
-- ─────────────────────────────────────────────
alter table public.friends enable row level security;

-- User can read their own friendship rows
create policy "friends: read own"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Inserted by trigger (security definer) — no direct user insert
-- We allow authenticated users to delete their own row to trigger unfriend
create policy "friends: delete own"
  on public.friends for delete
  using (auth.uid() = user_id);
