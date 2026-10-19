-- =================================================================================
-- Migration: 20261019130000_phone_bridge_storage_policies.sql
-- Goal: Close P0 — the `phone-bridge` storage bucket was listable/readable/writable
--       /deletable with the public anon key; the phone bridge session token was
--       the only barrier, and `object/list` disclosed it.
--
-- Design:
--   • Private bucket (`public = false`) — never publicly readable by URL.
--   • Per-user object paths: `<uid>/<sessionToken>/<file>`.
--   • The public phone page only needs INSERT (anon) to drop photos into the
--     session folder. Everything else (SELECT/DELETE) requires a signed-in user
--     JWT and is restricted to objects whose first path segment is that user's id.
--
-- Conventions honoured (see .agents/rules/database-security-authz.md):
--   • No OLD./NEW. inside CREATE POLICY (invalid in RLS → 42P01).
--   • `(select auth.uid())` wrapped for the RLS initplan advisor.
--   • ASCII policy names only (identifier truncation is silent in PostgreSQL).
--   • No UPDATE policy is defined: the bucket is insert-only + read/delete own.
-- =================================================================================

-- 1. Bucket row must exist and must be private. `public = false` rejects the
--    unauthenticated public URL access path even before policies are evaluated.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('phone-bridge', 'phone-bridge', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- 2. Drop any pre-existing (pre-migration, permissive) policies on the bucket.
--    Supabase's "public bucket" bootstrap typically creates a broad
--    `FOR ALL USING (true)` policy which would otherwise keep the bucket open.
--    NOTE: the match is deliberately restricted to policies that name the bucket
--    or are bucket-agnostic bare `true`. An INSERT-only or SELECT-only policy
--    has a NULL qual (resp. with_check), so testing for NULL would also drop
--    every unrelated bucket's policies — collateral damage outside this bucket.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (
                qual LIKE '%phone-bridge%'
             OR with_check LIKE '%phone-bridge%'
             OR qual = 'true'
             OR with_check = 'true'
          )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 3. INSERT — open to anon + authenticated only (the public phone page upload
--    with the anon key). Deliberately unscoped per-row: anon carries no auth.uid()
--    to compare against, and the desktop only ever consumes paths that already
--    embed the user's own id (session token acts as the capability in that folder).
CREATE POLICY "phone_bridge_insert_anon_authenticated"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        bucket_id = 'phone-bridge'::text
    );

-- 4. SELECT — the signed-in user only, and only inside their own `<uid>/` prefix.
--    `(storage.foldername(name))[1]` is the first path segment of the object name.
CREATE POLICY "phone_bridge_select_own_objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'phone-bridge'::text
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- 5. DELETE — the signed-in user only, only inside their own `<uid>/` prefix.
--    The desktop deletes each consumed object immediately ("instant purge").
CREATE POLICY "phone_bridge_delete_own_objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'phone-bridge'::text
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );
