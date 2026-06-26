-- =============================================================================
-- Migration 0001: Initial Schema
-- CardArena — Multiplayer Card Game Platform
--
-- Run this in the Supabase SQL editor or via:
--   supabase db push
-- =============================================================================

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- Custom Types / Enums
-- ─────────────────────────────────────────────
create type public.friend_status as enum ('pending', 'accepted', 'blocked');

create type public.game_status as enum (
  'waiting',
  'ready',
  'dealing',
  'player_turns',
  'dealer_turn',
  'result',
  'reset'
);

-- ─────────────────────────────────────────────
-- Table: profiles
-- One row per auth.users entry — auto-created via trigger.
-- ─────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  is_online   boolean not null default false,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for username lookups (friend search)
create index profiles_username_idx on public.profiles (username);

-- Trigger: update updated_at on every change
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- Trigger: auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- Table: friend_requests
-- ─────────────────────────────────────────────
create table public.friend_requests (
  id          uuid primary key default uuid_generate_v4(),
  from_id     uuid not null references public.profiles(id) on delete cascade,
  to_id       uuid not null references public.profiles(id) on delete cascade,
  status      public.friend_status not null default 'pending',
  created_at  timestamptz not null default now(),

  constraint no_self_request check (from_id <> to_id),
  constraint unique_request unique (from_id, to_id)
);

create index friend_requests_to_id_idx on public.friend_requests (to_id);

-- ─────────────────────────────────────────────
-- Table: friends
-- Materialised friendship (both directions stored for O(1) lookups)
-- ─────────────────────────────────────────────
create table public.friends (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  friend_id   uuid not null references public.profiles(id) on delete cascade,
  status      public.friend_status not null default 'accepted',
  created_at  timestamptz not null default now(),

  constraint no_self_friend check (user_id <> friend_id),
  constraint unique_friendship unique (user_id, friend_id)
);

create index friends_user_id_idx on public.friends (user_id);

-- ─────────────────────────────────────────────
-- Table: game_rooms
-- ─────────────────────────────────────────────
create table public.game_rooms (
  id               uuid primary key default uuid_generate_v4(),
  game_type        text not null,              -- matches IGamePlugin.id (e.g. 'blackjack')
  status           public.game_status not null default 'waiting',
  host_id          uuid not null references public.profiles(id) on delete cascade,
  max_players      smallint not null default 4 check (max_players between 1 and 8),
  current_players  smallint not null default 1 check (current_players >= 0),
  metadata         jsonb not null default '{}', -- game-specific state (engine state)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index game_rooms_host_id_idx  on public.game_rooms (host_id);
create index game_rooms_status_idx   on public.game_rooms (status);
create index game_rooms_game_type_idx on public.game_rooms (game_type);

create trigger game_rooms_updated_at
  before update on public.game_rooms
  for each row execute function public.update_updated_at();

-- ─────────────────────────────────────────────
-- Table: game_events
-- Append-only event log — never updated or deleted.
-- ─────────────────────────────────────────────
create table public.game_events (
  id          uuid primary key default uuid_generate_v4(),
  room_id     uuid not null references public.game_rooms(id) on delete cascade,
  type        text not null,        -- 'player_joined', 'card_drawn', 'turn_changed', etc.
  payload     jsonb not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index game_events_room_id_idx on public.game_events (room_id);
create index game_events_created_at_idx on public.game_events (room_id, created_at desc);

-- ─────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────

-- profiles: anyone can read, only owner can update
alter table public.profiles enable row level security;

create policy "profiles: public read"
  on public.profiles for select using (true);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- friend_requests: only involved users can read/write
alter table public.friend_requests enable row level security;

create policy "friend_requests: read own"
  on public.friend_requests for select
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "friend_requests: send"
  on public.friend_requests for insert
  with check (auth.uid() = from_id);

create policy "friend_requests: respond"
  on public.friend_requests for update
  using (auth.uid() = to_id);

-- friends: only the user can see their friendships
alter table public.friends enable row level security;

create policy "friends: read own"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friends: insert by system only"
  on public.friends for insert
  with check (auth.uid() = user_id);

-- game_rooms: anyone can read open rooms; only host can update
alter table public.game_rooms enable row level security;

create policy "game_rooms: public read"
  on public.game_rooms for select using (true);

create policy "game_rooms: authenticated create"
  on public.game_rooms for insert
  with check (auth.uid() = host_id);

create policy "game_rooms: host update"
  on public.game_rooms for update
  using (auth.uid() = host_id);

-- game_events: anyone in a room can read; authenticated users can insert
alter table public.game_events enable row level security;

create policy "game_events: public read"
  on public.game_events for select using (true);

create policy "game_events: authenticated insert"
  on public.game_events for insert
  with check (auth.uid() is not null);
