-- =============================================================================
-- Migration 0010: Phase 6 Production Features
-- Adds match history, rankings (ELO), and notifications.
-- =============================================================================

-- ─────────────────────────────────────────────
-- Table: game_history
-- ─────────────────────────────────────────────
create table public.game_history (
  id          uuid primary key default uuid_generate_v4(),
  room_id     uuid not null references public.game_rooms(id) on delete cascade,
  game_slug   text not null,
  players     jsonb not null, -- Array of user IDs
  winner_id   uuid references public.profiles(id) on delete set null, -- null = draw or no winner
  duration    integer, -- duration in seconds
  started_at  timestamptz,
  ended_at    timestamptz not null default now()
);

create index game_history_room_id_idx on public.game_history (room_id);
create index game_history_game_slug_idx on public.game_history (game_slug);
create index game_history_ended_at_idx on public.game_history (ended_at desc);

-- ─────────────────────────────────────────────
-- Table: rankings
-- ─────────────────────────────────────────────
create table public.rankings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  game_slug   text not null,
  rating      integer not null default 1200,
  wins        integer not null default 0,
  losses      integer not null default 0,
  draws       integer not null default 0,
  
  constraint unique_ranking unique (user_id, game_slug)
);

create index rankings_user_game_idx on public.rankings (user_id, game_slug);
create index rankings_rating_idx on public.rankings (game_slug, rating desc);

-- ─────────────────────────────────────────────
-- Table: notifications
-- ─────────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}',
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_unread_idx on public.notifications (user_id) where not read;

-- ─────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────
alter table public.game_history enable row level security;
create policy "game_history: public read" on public.game_history for select using (true);
create policy "game_history: system insert" on public.game_history for insert with check (true);

alter table public.rankings enable row level security;
create policy "rankings: public read" on public.rankings for select using (true);
create policy "rankings: system update" on public.rankings for update using (true);

alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications: system insert" on public.notifications for insert with check (true);
create policy "notifications: update own" on public.notifications for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Trigger: Record Game History & Update ELO
-- ─────────────────────────────────────────────
create or replace function public.handle_game_finished()
returns trigger language plpgsql security definer as $$
declare
  player_record record;
  player_arr jsonb;
  p_winner_id uuid := null;
  p_start timestamptz;
  p_end timestamptz := now();
  p_duration integer;
  
  rating_winner integer;
  rating_loser integer;
  expected_w numeric;
  expected_l numeric;
  k_factor integer := 32;
  new_rating_w integer;
  new_rating_l integer;
begin
  -- Only act when state transitions to finished
  if new.state = 'finished' and (old.state is null or old.state != 'finished') then
    
    -- Try to extract winner from metadata if present
    begin
      p_winner_id := (new.metadata->>'winnerId')::uuid;
      -- Alternatively check gameWinnerId (Saving Throw)
      if p_winner_id is null then
        p_winner_id := (new.metadata->>'gameWinnerId')::uuid;
      end if;
    exception when others then
      p_winner_id := null;
    end;

    -- Handle draws: if winner_id is 'draw', casting to UUID fails. It's safer to check for draw explicitly.
    if new.metadata->>'winnerId' = 'draw' then
      p_winner_id := null;
    end if;

    p_start := new.started_at;
    if p_start is not null then
      p_duration := extract(epoch from (p_end - p_start))::integer;
    end if;

    -- Gather players from room_players
    select jsonb_agg(user_id) into player_arr from public.room_players where room_id = new.id;
    
    -- 1. Insert History
    insert into public.game_history (room_id, game_slug, players, winner_id, duration, started_at, ended_at)
    values (new.id, new.game_slug, coalesce(player_arr, '[]'::jsonb), p_winner_id, p_duration, p_start, p_end);

    -- 2. Update Rankings for all players
    for player_record in select user_id from public.room_players where room_id = new.id loop
      
      -- Ensure ranking row exists
      insert into public.rankings (user_id, game_slug)
      values (player_record.user_id, new.game_slug)
      on conflict (user_id, game_slug) do nothing;
      
      -- If there is a clear winner and this is 2 player game, compute ELO.
      -- For simplicity, if they won, +win, if lost +loss, if draw +draw
      if p_winner_id is not null then
        if player_record.user_id = p_winner_id then
          update public.rankings set wins = wins + 1 where user_id = player_record.user_id and game_slug = new.game_slug;
        else
          update public.rankings set losses = losses + 1 where user_id = player_record.user_id and game_slug = new.game_slug;
        end if;
      else
        update public.rankings set draws = draws + 1 where user_id = player_record.user_id and game_slug = new.game_slug;
      end if;

    end loop;

    -- Simple ELO adjustment for 2 players if there is exactly 1 winner and 1 loser
    if p_winner_id is not null and jsonb_array_length(player_arr) = 2 then
      declare
        loser_id uuid;
      begin
        select user_id into loser_id from public.room_players where room_id = new.id and user_id != p_winner_id limit 1;
        
        select rating into rating_winner from public.rankings where user_id = p_winner_id and game_slug = new.game_slug;
        select rating into rating_loser from public.rankings where user_id = loser_id and game_slug = new.game_slug;
        
        expected_w := 1.0 / (1.0 + power(10, (rating_loser - rating_winner) / 400.0));
        expected_l := 1.0 / (1.0 + power(10, (rating_winner - rating_loser) / 400.0));
        
        new_rating_w := rating_winner + round(k_factor * (1.0 - expected_w));
        new_rating_l := rating_loser + round(k_factor * (0.0 - expected_l));
        
        update public.rankings set rating = new_rating_w where user_id = p_winner_id and game_slug = new.game_slug;
        update public.rankings set rating = new_rating_l where user_id = loser_id and game_slug = new.game_slug;
      end;
    end if;

    -- ELO for Draws
    if p_winner_id is null and jsonb_array_length(player_arr) = 2 then
      declare
        p1_id uuid;
        p2_id uuid;
        r1 integer;
        r2 integer;
        e1 numeric;
        e2 numeric;
        n1 integer;
        n2 integer;
      begin
        p1_id := player_arr->>0;
        p2_id := player_arr->>1;
        
        select rating into r1 from public.rankings where user_id = p1_id and game_slug = new.game_slug;
        select rating into r2 from public.rankings where user_id = p2_id and game_slug = new.game_slug;
        
        e1 := 1.0 / (1.0 + power(10, (r2 - r1) / 400.0));
        e2 := 1.0 / (1.0 + power(10, (r1 - r2) / 400.0));
        
        n1 := r1 + round(k_factor * (0.5 - e1));
        n2 := r2 + round(k_factor * (0.5 - e2));
        
        update public.rankings set rating = n1 where user_id = p1_id and game_slug = new.game_slug;
        update public.rankings set rating = n2 where user_id = p2_id and game_slug = new.game_slug;
      end;
    end if;

  end if;

  return new;
end;
$$;

create trigger on_game_rooms_finished
  after update on public.game_rooms
  for each row execute function public.handle_game_finished();
