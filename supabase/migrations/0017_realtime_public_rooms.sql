-- =============================================================================
-- Migration 0017: Realtime Reliability, Public/Private Rooms & Active Tables
-- ENGEI — Cercle Bami
--
-- 1. Adds is_public column on public.game_rooms (default true) with index
-- 2. Enables REPLICA IDENTITY FULL on lobby & game realtime tables so
--    INSERT / UPDATE / DELETE filters (e.g. room_id=eq...) always fire
-- 3. Ensures tables are registered in supabase_realtime publication
-- 4. Handles player removal in room ready-state trigger
-- 5. Ensures RLS SELECT policies allow public rooms, seated rooms, and invites
-- =============================================================================

-- 1. Public / Private room visibility
alter table public.game_rooms
  add column if not exists is_public boolean not null default true;

create index if not exists game_rooms_public_state_idx
  on public.game_rooms (is_public, state, created_at desc);

-- 2. Full replica identity for reliable Realtime filtering on UPDATE / DELETE
alter table public.game_rooms replica identity full;
alter table public.room_players replica identity full;
alter table public.game_invitations replica identity full;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'game_events'
  ) then
    execute 'alter table public.game_events replica identity full';
  end if;
end $$;

-- 3. Ensure all lobby/game tables belong to supabase_realtime publication
do $$
declare
  tbl text;
begin
  foreach tbl in array array['game_rooms', 'room_players', 'game_invitations', 'game_events'] loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- 4. Keep game_rooms.state accurate on player join, ready toggle, and leave/kick
create or replace function public.handle_player_ready_change()
returns trigger language plpgsql security definer as $$
declare
  v_room_id uuid;
  v_total   int;
  v_ready   int;
  v_state   public.room_state;
begin
  v_room_id := coalesce(new.room_id, old.room_id);
  if v_room_id is null then
    return coalesce(new, old);
  end if;

  select state into v_state from public.game_rooms where id = v_room_id;
  if v_state is null or v_state in ('playing', 'finished', 'cancelled') then
    return coalesce(new, old);
  end if;

  select count(*) into v_total from public.room_players where room_id = v_room_id;
  select count(*) into v_ready from public.room_players where room_id = v_room_id and ready = true;

  if v_total >= 2 and v_ready = v_total then
    update public.game_rooms set state = 'ready' where id = v_room_id and state <> 'ready';
  else
    update public.game_rooms set state = 'waiting' where id = v_room_id and state = 'ready';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_player_ready_change on public.room_players;
create trigger on_player_ready_change
  after insert or update of ready or delete on public.room_players
  for each row execute function public.handle_player_ready_change();

-- 5. RLS SELECT policies: public rooms, rooms where user is seated/host/invited, and room_players
drop policy if exists "game_rooms: public read" on public.game_rooms;
drop policy if exists "game_rooms: read accessible" on public.game_rooms;
create policy "game_rooms: read accessible"
  on public.game_rooms for select
  using (
    is_public = true
    or auth.uid() = host_id
    or exists (
      select 1 from public.room_players rp
      where rp.room_id = game_rooms.id
        and rp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.game_invitations gi
      where gi.room_id = game_rooms.id
        and (gi.sender_id = auth.uid() or gi.receiver_id = auth.uid())
    )
  );

drop policy if exists "room_players: public read" on public.room_players;
create policy "room_players: public read"
  on public.room_players for select
  using (true);
