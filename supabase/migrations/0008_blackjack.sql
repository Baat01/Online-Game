-- =============================================================================
-- Migration 0008: Blackjack Game Tables (Phase 4)
-- CardArena — Multiplayer Card Game Platform
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. Enums
-- ─────────────────────────────────────────────
create type public.blackjack_status as enum (
  'waiting',
  'dealing',
  'player_turn',
  'dealer_turn',
  'settlement',
  'finished'
);

create type public.blackjack_player_state as enum (
  'waiting',
  'playing',
  'done'
);

create type public.blackjack_action_type as enum (
  'deal',
  'hit',
  'stand',
  'reset'
);

-- ─────────────────────────────────────────────
-- 2. Tables
-- ─────────────────────────────────────────────

-- blackjack_games
create table public.blackjack_games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.game_rooms(id) on delete cascade unique,
  status public.blackjack_status not null default 'waiting',
  deck jsonb not null default '[]'::jsonb,
  dealer_hand jsonb not null default '[]'::jsonb,
  dealer_score int not null default 0,
  current_turn uuid references public.profiles(id) on delete set null,
  round int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- blackjack_players
create table public.blackjack_players (
  game_id uuid not null references public.blackjack_games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat int not null,
  hand jsonb not null default '[]'::jsonb,
  score int not null default 0,
  state public.blackjack_player_state not null default 'waiting',
  blackjack boolean not null default false,
  busted boolean not null default false,
  standing boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

-- blackjack_actions
create table public.blackjack_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.blackjack_games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.blackjack_action_type not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3. Triggers & Indexes
-- ─────────────────────────────────────────────

create trigger on_blackjack_games_updated
  before update on public.blackjack_games
  for each row execute function public.update_updated_at();

create index blackjack_players_game_id_idx on public.blackjack_players(game_id);
create index blackjack_actions_game_id_idx on public.blackjack_actions(game_id);

-- ─────────────────────────────────────────────
-- 4. Realtime Publication
-- ─────────────────────────────────────────────

alter publication supabase_realtime add table public.blackjack_games;
alter publication supabase_realtime add table public.blackjack_players;
alter publication supabase_realtime add table public.blackjack_actions;

-- ─────────────────────────────────────────────
-- 5. Row Level Security (RLS)
-- ─────────────────────────────────────────────

alter table public.blackjack_games enable row level security;
alter table public.blackjack_players enable row level security;
alter table public.blackjack_actions enable row level security;

-- Games: anyone in the room can read and update.
create policy "Anyone can read blackjack_games"
  on public.blackjack_games for select using (true);
create policy "Authenticated can insert blackjack_games"
  on public.blackjack_games for insert to authenticated with check (true);
create policy "Authenticated can update blackjack_games"
  on public.blackjack_games for update to authenticated using (true) with check (true);

-- Players: anyone can read, authenticated can insert/update/delete.
create policy "Anyone can read blackjack_players"
  on public.blackjack_players for select using (true);
create policy "Authenticated can insert blackjack_players"
  on public.blackjack_players for insert to authenticated with check (true);
create policy "Authenticated can update blackjack_players"
  on public.blackjack_players for update to authenticated using (true) with check (true);
create policy "Authenticated can delete blackjack_players"
  on public.blackjack_players for delete to authenticated using (true);

-- Actions: anyone can read, players can insert their own actions.
create policy "Anyone can read blackjack_actions"
  on public.blackjack_actions for select using (true);
create policy "Players can insert their own actions"
  on public.blackjack_actions for insert to authenticated with check (auth.uid() = user_id);
