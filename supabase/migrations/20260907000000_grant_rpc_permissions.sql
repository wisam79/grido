-- إصلاح صلاحيات EXECUTE المفقودة على دوال RPC المستخدمة من التطبيق
-- وتحديث كاش PostgREST لتفادي أخطاء PGRST202 بعد استبدال الدوال.

-- ⚠️ تصحيح 2026-09-26: النسخة السابقة منحت EXECUTE لتوقيع سباعي
-- `check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, text)` **لا ينشئه أي ملف هجرة**
-- (التوقيع الوحيد الموجود هو السداسي بعمود p_check_only) ⇒ الهجرة كانت تفشل بـ 42883 ولا يمكن تطبيقها إطلاقاً.
-- النسخة التالية تمنح الصلاحيات لكل التوقيعات الموجودة فعلاً فقط.

-- 1) الدور المصادق عليه + خدمة السحابة (Edge Functions / Modal AI بسرّ الخدمة)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'activate_license', 'check_and_record_ai_usage', 'ensure_profile_exists',
        'admin_create_license_key', 'admin_extend_license', 'admin_revoke_license', 'is_admin'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    -- قواعد المستودع توجب منح anon لدوال الأدمن و is_admin (وهي محميّة داخلياً بفحص is_admin)
    IF r.proname = 'is_admin' OR r.proname LIKE 'admin\_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
    END IF;
  END LOOP;
END $$;

-- 2) تحديث كاش مخطط PostgREST فوراً (يمنع PGRST202 بعد REPLACE)
NOTIFY pgrst, 'reload schema';
