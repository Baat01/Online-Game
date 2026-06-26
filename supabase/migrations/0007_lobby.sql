-- =============================================================================
-- Migration 0007: Lobby System (Phase 3)
-- CardArena — Multiplayer Card Game Platform
--
-- Adds the full multiplayer lobby infrastructure:
--   game_catalog      — available games (seeded with blackjack)
--   game_rooms        — rooms (replaces old game_rooms)
--   room_players      — players seated in a room
--   game_invitations  — friend invitations to join rooms
--
-- WARNING: Drops the old game_rooms and game_events tables.
--          Run AFTER all Phase 2 migrations.
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. Drop old tables and types
-- ─────────────────────────────────────────────
drop table if exists public.game_events  cascade;
drop table if exists public.game_rooms   cascade;
drop type  if exists public.game_status  cascade;
drop type  if exists public.room_state   cascade;
drop type  if exists public.invitation_status cascade;

-- ─────────────────────────────────────────────
-- 2. New enums
-- ─────────────────────────────────────────────
create type public.room_state as enum (
  'waiting',    -- room open, not enough ready players
  'ready',      -- all players ready, host can launch
  'playing',    -- game in progress
  'finished',   -- game over
  'cancelled'   -- host dissolved the room
);

create type public.invitation_status as enum (
  'pending',
  'accepted',
  'declined',
  'expired',
  'cancelled'
);

-- ─────────────────────────────────────────────
-- 3. Table: game_catalog
-- Single source of truth for available games.
-- ─────────────────────────────────────────────
create table public.game_catalog (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text not null default '',
  min_players int  not null default 2,
  max_players int  not null default 6,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed: Blackjack
insert into public.game_catalog (slug, name, description, min_players, max_players, enabled)
values ('blackjack', 'Blackjack', 'Classic card game — beat the dealer without going over 21.', 2, 6, true);

-- RLS: game catalog is public
alter table public.game_catalog enable row level security;
create policy "game_catalog: public read"
  on public.game_catalog for select using (true);

-- ─────────────────────────────────────────────
-- 4. Table: game_rooms
-- One row per active or finished room.
-- ─────────────────────────────────────────────
create table public.game_rooms (
  id          uuid primary key default gen_random_uuid(),
  game_slug   text not null references public.game_catalog(slug) on delete cascade,
  host_id     uuid not null references public.profiles(id) on delete cascade,
  state       public.room_state not null default 'waiting',
  max_players int not null default 6 check (max_players >= 2 and max_players <= 10),
  created_at  timestamptz not null default now(),
  started_at  timestamptz
);

create index game_rooms_host_idx  on public.game_rooms (host_id);
create index game_rooms_state_idx on public.game_rooms (state);
create index game_rooms_slug_idx  on public.game_rooms (game_slug);

-- Auto-update started_at when state transitions to playing
create or replace function public.handle_room_state_change()
returns trigger language plpgsql security definer as $$
begin
  if new.state = 'playing' and old.state <> 'playing' then
    new.started_at = now();
  end if;
  return new;
end;
$$;

create trigger on_room_state_change
  before update on public.game_rooms
  for each row execute function public.handle_room_state_change();

-- RLS
alter table public.game_rooms enable row level security;

create policy "game_rooms: public read"
  on public.game_rooms for select using (true);

create policy "game_rooms: authenticated create"
  on public.game_rooms for insert
  with check (auth.uid() = host_id);

create policy "game_rooms: host update"
  on public.game_rooms for update
  using (auth.uid() = host_id);

create policy "game_rooms: host delete"
  on public.game_rooms for delete
  using (auth.uid() = host_id);

-- ─────────────────────────────────────────────
-- 5. Table: room_players
-- Tracks who is currently seated in a room.
-- ─────────────────────────────────────────────
create table public.room_players (
  room_id   uuid not null references public.game_rooms(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  ready     boolean not null default false,
  primary key (room_id, user_id)
);

create index room_players_room_idx on public.room_players (room_id);
create index room_players_user_idx on public.room_players (user_id);

-- Trigger: auto-add host as first player when room created
create or replace function public.handle_new_room()
returns trigger language plpgsql security definer as $$
begin
  insert into public.room_players (room_id, user_id, ready)
  values (new.id, new.host_id, false)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_room_created
  after insert on public.game_rooms
  for each row execute function public.handle_new_room();

-- Trigger: recalculate room state when player ready status changes
create or replace function public.handle_player_ready_change()
returns trigger language plpgsql security definer as $$
declare
  v_total  int;
  v_ready  int;
  v_state  public.room_state;
begin
  -- Don't touch rooms that are past the lobby phase
  select state into v_state from public.game_rooms where id = new.room_id;
  if v_state in ('playing', 'finished', 'cancelled') then
    return new;
  end if;

  select count(*) into v_total from public.room_players where room_id = new.room_id;
  select count(*) into v_ready from public.room_players where room_id = new.room_id and ready = true;

  if v_total >= 2 and v_ready = v_total then
    update public.game_rooms set state = 'ready'   where id = new.room_id;
  else
    update public.game_rooms set state = 'waiting' where id = new.room_id and state = 'ready';
  end if;

  return new;
end;
$$;

create trigger on_player_ready_change
  after insert or update of ready on public.room_players
  for each row execute function public.handle_player_ready_change();

-- RLS
alter table public.room_players enable row level security;

create policy "room_players: public read"
  on public.room_players for select using (true);

create policy "room_players: self join"
  on public.room_players for insert
  with check (auth.uid() = user_id);

create policy "room_players: self update"
  on public.room_players for update
  using (auth.uid() = user_id);

-- Self OR host can delete (leave / kick)
create policy "room_players: self or host leave"
  on public.room_players for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select host_id from public.game_rooms where id = room_id)
  );

-- ─────────────────────────────────────────────
-- 6. Table: game_invitations
-- Friend-to-friend invitations to join a specific room.
-- ─────────────────────────────────────────────
create table public.game_invitations (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  game_slug   text not null references public.game_catalog(slug) on delete cascade,
  room_id     uuid references public.game_rooms(id) on delete set null,
  status      public.invitation_status not null default 'pending',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '5 minutes'),

  constraint no_self_invite check (sender_id <> receiver_id)
);

-- Only one active pending invite per sender+receiver+room
create unique index unique_pending_invite
  on public.game_invitations (sender_id, receiver_id, room_id)
  where status = 'pending';

create index game_invitations_receiver_idx on public.game_invitations (receiver_id);
create index game_invitations_sender_idx   on public.game_invitations (sender_id);
create index game_invitations_status_idx   on public.game_invitations (status);
create index game_invitations_room_idx     on public.game_invitations (room_id);
create index game_invitations_expires_idx  on public.game_invitations (expires_at)
  where status = 'pending';

-- RLS
alter table public.game_invitations enable row level security;

create policy "invitations: read own"
  on public.game_invitations for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "invitations: send"
  on public.game_invitations for insert
  with check (auth.uid() = sender_id);

create policy "invitations: respond or cancel"
  on public.game_invitations for update
  using (auth.uid() = receiver_id or auth.uid() = sender_id);

-- ─────────────────────────────────────────────
-- 7. Enable Realtime for new tables
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.game_invitations;
