-- الحارس كان SECURITY DEFINER ⇒ current_user يساوي مالك الدالة (postgres) فيتجاوز الفحص دائماً.
-- الإصلاح: SECURITY INVOKER حتى يعكس current_user الدور الحقيقي للطلب (authenticated/anon).
-- ملاحظة: EXECUTE على دالة المشغّل غير مطلوب للتنفيذ عبر المشغّل، وإبطال المنح يمنع الاستدعاء المباشر.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- الطلبات المباشرة فقط (PostgREST: authenticated/anon) تخضع للحماية؛
  -- أما مسارات SECURITY DEFINER (activate_license …) و service_role فتمرّ من فحص الإذن الداخلي.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.license_key IS DISTINCT FROM OLD.license_key THEN
    RAISE EXCEPTION 'غير مصرح بتعديل حقول الاشتراك المباشرة (plan/status/expires_at/license_key)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
