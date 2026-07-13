-- 1. Security: Fix search_path and EXECUTE privileges for SECURITY DEFINER functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

ALTER FUNCTION public.is_admin() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER FUNCTION public.activate_license(text, text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.activate_license(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_license(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_license(text, text) TO authenticated;

-- 2. Performance: Fix unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_license_keys_user_id ON public.license_keys(user_id);

-- 3. Performance: Fix Auth RLS Initialization Plan
-- First, drop the old policies that use auth.uid() directly
DROP POLICY IF EXISTS "الجميع يقرأ حسابه فقط أو المشرف يقرأ الجميع" ON public.profiles;
DROP POLICY IF EXISTS "تحديث المستخدم لحسابه الخاص أو المشرف يعدل الجميع" ON public.profiles;

-- Remove duplicate overlapping policy on license_keys to resolve 'multiple_permissive_policies'
DROP POLICY IF EXISTS "قراءة التراخيص مقيدة للمشرفين" ON public.license_keys;
DROP POLICY IF EXISTS "قراءة التراخيص للمشرفين" ON public.license_keys;

-- Recreate is_admin function to use (select auth.uid()) for performance scaling
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.plan = 'enterprise'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate policies using (select auth.uid())
CREATE POLICY "الجميع يقرأ حسابه فقط أو المشرف يقرأ الجميع" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id OR public.is_admin());

CREATE POLICY "تحديث المستخدم لحسابه الخاص أو المشرف يعدل الجميع" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id OR public.is_admin());

CREATE POLICY "قراءة التراخيص للمشرفين" ON public.license_keys
  FOR SELECT USING (public.is_admin());
