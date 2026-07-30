-- =================================================================================
-- Migration: 20260730000000_ensure_admin_users_table.sql
-- Goal: Ensure admin_users table exists and is_admin() checks enterprise profiles + admin_users
--       Fixes "relation public.admin_users does not exist" error.
-- =================================================================================

-- 1. Ensure admin_users table exists
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
CREATE POLICY "admin_users_select_policy" ON public.admin_users
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR user_id = (select auth.uid())
    );

-- 2. Update is_admin() to check JWT app_metadata, enterprise plan in profiles, or admin_users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND plan = 'enterprise'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
