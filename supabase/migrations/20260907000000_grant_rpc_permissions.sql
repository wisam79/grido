-- إصلاح صلاحيات EXECUTE المفقودة على دوال RPC المستخدمة من التطبيق
-- وتحديث كاش PostgREST لتفادي أخطاء PGRST202 بعد استبدال الدوال.

-- 1) منح التنفيذ للدور المصادق عليه (anon موروث من authenticated)
GRANT EXECUTE ON FUNCTION public.activate_license(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(
    uuid, integer, bigint, numeric, numeric, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(
    uuid, integer, bigint, numeric, numeric, boolean, text
) TO authenticated;

-- 2) منح التنفيذ لخدمة السحابة (Edge Functions / Modal AI بسرّ الخدمة)
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(
    uuid, integer, bigint, numeric, numeric, boolean
) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(
    uuid, integer, bigint, numeric, numeric, boolean, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_license(text, text) TO service_role;

-- 3) تحديث كاش مخطط PostgREST فوراً (يمنع PGRST202 بعد REPLACE)
NOTIFY pgrst, 'reload schema';
