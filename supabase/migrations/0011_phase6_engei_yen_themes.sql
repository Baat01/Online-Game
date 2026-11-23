-- =============================================================================
-- Migration 0011: Phase 6 — ENGEI Yen Economy & Player-Bound Card Themes
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS yen_balance integer NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clan_title text,
  ADD COLUMN IF NOT EXISTS card_back_theme text NOT NULL DEFAULT 'engei-crimson',
  ADD COLUMN IF NOT EXISTS card_front_theme text NOT NULL DEFAULT 'classic';
