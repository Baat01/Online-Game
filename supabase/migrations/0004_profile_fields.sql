-- =============================================================================
-- Migration 0004: Extend profiles table with display_name and bio
-- CardArena — Multiplayer Card Game Platform
-- =============================================================================

-- ─────────────────────────────────────────────
-- Add new columns to profiles
-- ─────────────────────────────────────────────

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text;

-- ─────────────────────────────────────────────
-- Constraints
-- ─────────────────────────────────────────────

-- Username: 3-20 chars, lowercase letters/digits/underscore only
alter table public.profiles
  add constraint username_format
    check (username ~ '^[a-z0-9_]{3,20}$');

-- display_name: optional, max 40 chars
alter table public.profiles
  add constraint display_name_length
    check (display_name is null or (char_length(display_name) >= 1 and char_length(display_name) <= 40));

-- bio: optional, max 250 chars
alter table public.profiles
  add constraint bio_length
    check (bio is null or (char_length(bio) >= 1 and char_length(bio) <= 250));

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

-- Username uniqueness is already enforced by the UNIQUE constraint from migration 0001.
-- Add a partial index for fast uniqueness checks in the service layer.
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ─────────────────────────────────────────────
-- RLS — no changes needed, existing policies cover the new columns
-- ─────────────────────────────────────────────
-- profiles: public read, owner update — already applied in migration 0001.
-- The new columns are automatically covered.
