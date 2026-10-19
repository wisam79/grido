-- =================================================================================
-- Migration: 20261019120100_ai_usage_insert_policy_no_self_insert.sql
-- الهدف: سحب بند الإدراج الذاتي من سياسة ai_usage (P2 — منح زائد).
--   السياسة الحالية (20260926154229) تسمح بـ`OR user_id = (select auth.uid())`
--   مما يتيح لأي مستخدم مصادق إدراج صفوف استهلاك خاصة به مباشرة عبر PostgREST:
--   تزوير العدّاد/التكلفة، وحجز الحصة يدوياً، وحشو الجدول. الاحتساب الشرعي يمر
--   حصراً عبر RPC `check_and_record_ai_usage` (SECURITY DEFINER — يتجاوز RLS
--   لأن المالك لا يخضع لها) أو service_role أو مشرف صريح.
-- الهجرة idempotent: DROP POLICY IF EXISTS قبل CREATE.
-- =================================================================================

DROP POLICY IF EXISTS "ai_usage_insert_service" ON public.ai_usage;

CREATE POLICY "ai_usage_insert_service" ON public.ai_usage
  FOR INSERT WITH CHECK (
    (select auth.role()) = 'service_role'
    OR public.is_admin()
  );

NOTIFY pgrst, 'reload schema';
