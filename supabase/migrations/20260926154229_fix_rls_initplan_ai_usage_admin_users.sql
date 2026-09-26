-- 2026-09-26 — إصلاح مستشار الأداء `auth_rls_initplan` على جدولي ai_usage و admin_users.
-- كان `auth.role()` / `auth.jwt()` يُقيَّمان مرة لكل صف داخل السياسة؛ لفّهما بـ`(select ...)`
-- يجعلهما تُقيَّمان مرة واحدة لكل استعلام. الدلالة محفوظة حرفياً (نفس العبارات ونفس الأدوار).
--
-- هذا الملف يُطابق الهجرة المُطبَّقة على الإنتاج بصيغة 20260926125510/20260926125727
-- (نفس نمط: ملفان يعطيان الحالة النهائية الصحيحة، والتطبيق تم عبر Supabase MCP).

DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
CREATE POLICY "admin_users_select_policy" ON public.admin_users
  FOR SELECT USING (
    (select auth.role()) = 'service_role'
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    OR user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "ai_usage_insert_service" ON public.ai_usage;
CREATE POLICY "ai_usage_insert_service" ON public.ai_usage
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'service_role'
    OR public.is_admin()
    OR user_id = (select auth.uid())
  );

NOTIFY pgrst, 'reload schema';
