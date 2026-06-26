-- =============================================================================
-- Migration 0005: Avatars Storage Bucket + RLS
-- CardArena — Multiplayer Card Game Platform
--
-- NOTE: Storage buckets can also be created via the Supabase Dashboard:
--   Storage → New bucket → Name: "avatars" → Public: true
--
-- This migration handles it programmatically for reproducibility.
-- =============================================================================

-- ─────────────────────────────────────────────
-- Create avatars bucket (public read)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,               -- public: anyone can read avatar URLs
  3145728,            -- 3 MB in bytes
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ─────────────────────────────────────────────
-- Storage RLS Policies
-- ─────────────────────────────────────────────

-- Public read: anyone can view avatars
create policy "avatars: public read"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Authenticated users can upload to their own folder
create policy "avatars: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can update (overwrite) their avatar
create policy "avatars: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owners can delete their avatar
create policy "avatars: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
