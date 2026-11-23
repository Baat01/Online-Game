-- =============================================================================
-- Migration 0015: Complete Game Catalog & Admin Account (bami@gmail.fr)
-- =============================================================================

-- 1. Ensure all available games are registered in public.game_catalog
insert into public.game_catalog (slug, name, description, min_players, max_players, enabled)
values
  ('saving-throw', 'Saving Throw', 'Best of 5 rounds. First rolls 2d10, second must roll lower.', 2, 2, true),
  ('blackjack-twist', 'Blackjack Twist', 'Blackjack with a shared hidden card and face-card sabotage.', 2, 2, true),
  ('four-seasons', 'Four Seasons', 'First to empty their hand wins. Follow the seasonal order.', 2, 2, true),
  ('23e-arcane', 'Le 23e Arcane', 'Duel asymétrique en 5 manches : 52 cartes, 22 Arcanes du Tarot et anomalie 1/666 Gaster.', 2, 2, true)
on conflict (slug) do nothing;

-- 2. Create Admin account bami@gmail.fr (username: bami, password: admin) if it does not exist
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'bami@gmail.fr'
  limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'bami@gmail.fr',
      extensions.crypt('admin', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"bami"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'bami@gmail.fr', 'email_verified', true, 'phone_verified', false),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  -- Ensure profile exists and has full Admin privileges + unlocked themes
  insert into public.profiles (id, username)
  values (v_user_id, 'bami')
  on conflict (id) do update set username = 'bami';

  update public.profiles
  set
    display_name = 'Bami',
    bio = 'Administrateur — Cercle Bami',
    clan_title = 'Clan Momobami',
    yen_balance = 500000,
    is_admin = true,
    permissions = '{"can_create_accounts":true,"can_grant_themes":true,"can_set_custom_stakes":true,"unlimited_yen":true}'::jsonb,
    unlocked_themes = to_jsonb(array[
      'classic', 'royal-fantasy', 'minimalist', 'midnight-neon', 'undertale-tarot', 'kinto-pay-to-win',
      'engei-crimson', 'bami-gold', 'obsidian-minimalist', 'kinto-sovereign-back',
      'obsidian-gold', 'crimson-engei', 'ivory-academy', 'cyber-tokyo', 'astral-crystal', 'kinto-gacha-dice',
      'classic-yen', 'momobami-seal', 'engei-scarlet', 'railgun-coin', 'eclipse-medal', 'kinto-railgun-coin'
    ])
  where id = v_user_id;
end $$;
