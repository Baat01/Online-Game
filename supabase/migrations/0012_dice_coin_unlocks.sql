-- =============================================================================
-- Migration 0012: Phase 7 — Dice & Coin Themes + Unlockable Cosmetics
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dice_theme text NOT NULL DEFAULT 'obsidian-gold',
  ADD COLUMN IF NOT EXISTS coin_theme text NOT NULL DEFAULT 'classic-yen',
  ADD COLUMN IF NOT EXISTS unlocked_themes jsonb NOT NULL DEFAULT '["classic","royal-fantasy","minimalist","engei-crimson","bami-gold","obsidian-minimalist","obsidian-gold","crimson-engei","ivory-academy","classic-yen","momobami-seal"]'::jsonb;
