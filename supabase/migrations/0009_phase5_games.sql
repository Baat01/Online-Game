-- =============================================================================
-- Migration 0009: Phase 5 Multi-Game Support
-- CardArena — Multiplayer Card Game Platform
--
-- Adds generic metadata to game_rooms for arbitrary game states,
-- and a game_events table for realtime game updates.
-- =============================================================================

-- 1. Add metadata to game_rooms
ALTER TABLE public.game_rooms
ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Create game_events table
CREATE TABLE public.game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_events_room_idx ON public.game_events(room_id);
CREATE INDEX game_events_created_idx ON public.game_events(created_at);

-- 3. Enable RLS
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_events: read own room"
  ON public.game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = game_events.room_id
      AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "game_events: insert own room"
  ON public.game_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = game_events.room_id
      AND rp.user_id = auth.uid()
    )
  );

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;
