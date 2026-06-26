-- =============================================================================
-- Migration 0002: Enable Supabase Realtime
--
-- Adds game_rooms and game_events to the Supabase Realtime publication
-- so clients can subscribe to row-level change events.
-- =============================================================================

-- Add tables to the supabase_realtime publication
-- (Supabase creates this publication automatically for new projects)
alter publication supabase_realtime add table public.game_rooms;
alter publication supabase_realtime add table public.game_events;

-- Note: Realtime RLS enforcement is opt-in per Supabase version.
-- Ensure "Enable Row Level Security" is active in the Supabase dashboard
-- under Database → Replication → Tables for each table above.
