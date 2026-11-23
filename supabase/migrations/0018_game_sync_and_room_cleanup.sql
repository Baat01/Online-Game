-- =============================================================================
-- Migration 0018: Authoritative Game Sync, Room Deletion & 30-Minute Expiration
-- ENGEI — Cercle Bami
--
-- 1. Adds monotonic state_version & last_activity_at on public.game_rooms
-- 2. Fixes RLS UPDATE on public.game_rooms so seated players (not only host)
--    can persist moves, and RLS DELETE so host or admins can delete rooms
-- 3. Adds activity triggers updating game_rooms.last_activity_at on every move
-- 4. Adds atomic RPC commit_game_state(p_room_id, p_new_metadata, p_expected_version, p_mark_finished)
-- 5. Adds cleanup_inactive_rooms() (30 minutes inactivity) + optional pg_cron job
-- =============================================================================

-- 1. Columns & index on public.game_rooms
alter table public.game_rooms
  add column if not exists state_version bigint not null default 0,
  add column if not exists last_activity_at timestamptz not null default now();

update public.game_rooms
set last_activity_at = coalesce(started_at, created_at, now())
where last_activity_at is null;

create index if not exists game_rooms_last_activity_idx
  on public.game_rooms (last_activity_at);

-- 2. RLS Policies on public.game_rooms, public.room_players, public.game_events
drop policy if exists "game_rooms: host update" on public.game_rooms;
drop policy if exists "game_rooms: seated players update" on public.game_rooms;
create policy "game_rooms: seated players update"
  on public.game_rooms for update
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.room_players rp
      where rp.room_id = game_rooms.id
        and rp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  )
  with check (
    auth.uid() = host_id
    or exists (
      select 1 from public.room_players rp
      where rp.room_id = game_rooms.id
        and rp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "game_rooms: host delete" on public.game_rooms;
drop policy if exists "game_rooms: host or admin delete" on public.game_rooms;
create policy "game_rooms: host or admin delete"
  on public.game_rooms for delete
  using (
    auth.uid() = host_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

drop policy if exists "room_players: self or host leave" on public.room_players;
create policy "room_players: self or host leave"
  on public.room_players for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select host_id from public.game_rooms where id = room_id)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

-- 3. Automatic last_activity_at tracking triggers
create or replace function public.touch_game_room_activity_self()
returns trigger language plpgsql as $$
begin
  if new.metadata is distinct from old.metadata
     or new.state is distinct from old.state
     or new.is_public is distinct from old.is_public
     or new.state_version is distinct from old.state_version then
    new.last_activity_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_game_rooms_touch_activity on public.game_rooms;
create trigger on_game_rooms_touch_activity
  before update on public.game_rooms
  for each row execute function public.touch_game_room_activity_self();

create or replace function public.touch_game_room_activity_from_child()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_room_id uuid;
begin
  v_room_id := coalesce(new.room_id, old.room_id);
  if v_room_id is not null then
    update public.game_rooms
    set last_activity_at = now()
    where id = v_room_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_room_players_touch_activity on public.room_players;
create trigger on_room_players_touch_activity
  after insert or update or delete on public.room_players
  for each row execute function public.touch_game_room_activity_from_child();

drop trigger if exists on_game_events_touch_activity on public.game_events;
create trigger on_game_events_touch_activity
  after insert on public.game_events
  for each row execute function public.touch_game_room_activity_from_child();

-- 4. Atomic optimistic-concurrency RPC: commit_game_state
create or replace function public.commit_game_state(
  p_room_id uuid,
  p_new_metadata jsonb,
  p_expected_version bigint default null,
  p_mark_finished boolean default false
)
returns table (
  ok boolean,
  conflict boolean,
  state_version bigint,
  metadata jsonb,
  state public.room_state,
  last_activity_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.game_rooms%rowtype;
  v_allowed boolean := false;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_room
  from public.game_rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select (
    v_room.host_id = v_uid
    or exists (
      select 1 from public.room_players rp
      where rp.room_id = p_room_id and rp.user_id = v_uid
    )
    or exists (
      select 1 from public.profiles p
      where p.id = v_uid and p.is_admin = true
    )
  ) into v_allowed;

  if not v_allowed then
    raise exception 'NOT_SEATED_IN_ROOM';
  end if;

  if p_expected_version is not null and v_room.state_version <> p_expected_version then
    return query select
      false,
      true,
      v_room.state_version,
      v_room.metadata,
      v_room.state,
      v_room.last_activity_at;
    return;
  end if;

  update public.game_rooms gr
  set
    metadata = p_new_metadata,
    state_version = gr.state_version + 1,
    last_activity_at = now(),
    state = case when p_mark_finished then 'finished'::public.room_state else gr.state end
  where gr.id = p_room_id
  returning gr.state_version, gr.metadata, gr.state, gr.last_activity_at
  into v_room.state_version, v_room.metadata, v_room.state, v_room.last_activity_at;

  return query select
    true,
    false,
    v_room.state_version,
    v_room.metadata,
    v_room.state,
    v_room.last_activity_at;
end;
$$;

grant execute on function public.commit_game_state(uuid, jsonb, bigint, boolean) to authenticated;

-- 5. Automatic cleanup of rooms inactive for more than 30 minutes
create or replace function public.cleanup_inactive_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  with removed as (
    delete from public.game_rooms
    where last_activity_at < now() - interval '30 minutes'
    returning id
  )
  select count(*) into v_deleted from removed;

  delete from public.game_invitations
  where status = 'pending'
    and (expires_at < now() or room_id is null);

  return v_deleted;
end;
$$;

grant execute on function public.cleanup_inactive_rooms() to authenticated;

-- Schedule pg_cron every 5 minutes when extension is installed
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1 from cron.job where jobname = 'engei_cleanup_inactive_rooms'
    ) then
      perform cron.schedule(
        'engei_cleanup_inactive_rooms',
        '*/5 * * * *',
        'select public.cleanup_inactive_rooms();'
      );
    end if;
  end if;
exception when others then
  -- Ignore if pg_cron schema/permissions are unavailable in this environment
  null;
end $$;
