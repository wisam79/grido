-- 🔁 ملف ظلي مُسترجَع من تاريخ الإنتاج (schema_migrations) — مطابقة 1:1 مع الإنتاج
-- Recovery date: 2026-11-01 · طُبّقت في الإنتاج قبل وجود ملفها محلياً
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- المسارات الموثوقة (SECURITY DEFINER مثل activate_license، أو service_role،
  -- أو صيانة مباشرة) تمرّ عبر فحص الإذن الداخلي لمساراتها.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- فحص التخويل بـ IS NOT TRUE لا NOT: NOT NULL = NULL لا يُرفع استثناء.
  IF public.is_admin() IS NOT TRUE THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.license_key IS DISTINCT FROM OLD.license_key THEN
      RAISE EXCEPTION 'غير مصرح بتعديل حقول الهوية أو الاشتراك المباشرة (id/email/plan/status/expires_at/license_key)'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_privilege_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS guard_profile_privilege_columns ON public.profiles;
CREATE TRIGGER guard_profile_privilege_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_columns();

NOTIFY pgrst, 'reload schema';