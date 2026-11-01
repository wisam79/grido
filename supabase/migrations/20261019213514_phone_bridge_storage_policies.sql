-- 🔁 ملف ظلي مُسترجَع من تاريخ الإنتاج (schema_migrations) — مطابقة 1:1 مع الإنتاج
-- Recovery date: 2026-11-01 · طُبّقت في الإنتاج قبل وجود ملفها محلياً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('phone-bridge', 'phone-bridge', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

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

CREATE POLICY "phone_bridge_insert_anon_authenticated"
    ON storage.objects
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        bucket_id = 'phone-bridge'::text
    );

CREATE POLICY "phone_bridge_select_own_objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'phone-bridge'::text
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );

CREATE POLICY "phone_bridge_delete_own_objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'phone-bridge'::text
        AND (storage.foldername(name))[1] = (select auth.uid())::text
    );