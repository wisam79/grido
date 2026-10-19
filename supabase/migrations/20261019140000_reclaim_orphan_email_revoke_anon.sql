-- =================================================================================
-- Migration: 20261019140000_reclaim_orphan_email_revoke_anon.sql
-- الهدف: إغلاق منح زائد فتحته هجرة 20261019120300.
--
-- `REVOKE ALL ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) FROM PUBLIC`
-- لم يكن كافياً: Supabase يمنح EXECUTE افتراضياً لأدوار anon/authenticated على كل
-- دالة جديدة في مخطط public (ALTER DEFAULT PRIVILEGES)، فالنداء عبر
-- POST /rest/v1/rpc/reclaim_orphan_profile_email ظلّ ممكناً — وهي دالة
-- SECURITY DEFINER تحذف صفوف profiles. الإذن الشرعي الوحيد لها هو مشغّل التسجيل
-- والمسار الاحتياطي (كلاهما داخل قاعدة البيانات / service_role)، فلا حاجة لأي
-- دور عميل.
--
-- الهجرة idempotent: REVOKE/GRANT قابلان للتكرار، ثم إعادة تحميل مخطط PostgREST.
-- =================================================================================

REVOKE EXECUTE ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
