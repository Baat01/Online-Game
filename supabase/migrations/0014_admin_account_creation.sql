-- Admin Account Creation with Granular Permissions
-- Adds jsonb permissions map to public.profiles

alter table public.profiles
  add column if not exists permissions jsonb not null default '{"can_create_accounts":false,"can_grant_themes":false,"can_set_custom_stakes":false,"unlimited_yen":false}'::jsonb;
