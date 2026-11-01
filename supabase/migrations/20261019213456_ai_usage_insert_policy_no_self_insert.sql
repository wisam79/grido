-- 🔁 ملف ظلي مُسترجَع من تاريخ الإنتاج (schema_migrations) — مطابقة 1:1 مع الإنتاج
-- Recovery date: 2026-11-01 · طُبّقت في الإنتاج قبل وجود ملفها محلياً
-- Migration: 20261019120100_ai_usage_insert_policy_no_self_insert.sql
-- سحب بند الإدراج الذاتي من سياسة ai_usage: الاحتساب الشرعي يمر حصراً عبر RPC
-- check_and_record_ai_usage (SECURITY DEFINER) أو service_role أو مشرف صريح.

DROP POLICY IF EXISTS "ai_usage_insert_service" ON public.ai_usage;

CREATE POLICY "ai_usage_insert_service" ON public.ai_usage
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'service_role'
    OR public.is_admin()
  );

NOTIFY pgrst, 'reload schema';