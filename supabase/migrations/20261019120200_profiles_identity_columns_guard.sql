-- =================================================================================
-- Migration: 20261019120200_profiles_identity_columns_guard.sql
-- الهدف: تمدين حارس الحقول ليشمل أعمدة الهوية (P2).
--   `guard_profile_privilege_columns` يحمي plan/status/expires_at/license_key فقط،
--   ما يترك `email` و`id` مكشوفين: يمكن لمستخدم تغيير بريده إلى بريد حساب آخر
--   (اختطاف مراسلات/استرجاع) أو هوية الصف عبر `update_own_profile` المتبقية.
--   سياسة `profiles_select_own_or_admin` تمنح المشرف، ويبقى التحديث الذاتي
--   لـ name وغيّره الشرعية مسموحاً كما هو.
-- الهجرة idempotent: CREATE OR REPLACE + إعادة تأكيد المشغّل + سحب المنح.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER   -- يعكس current_user الحقيقي (authenticated/anon) — لا تجاوز عبر DEFINER
SET search_path = public
AS $$
BEGIN
  -- المسارات الموثوقة (SECURITY DEFINER مثل activate_license، أو service_role،
  -- أو صيانة مباشرة) تمرّ عبر فحص الإذن الداخلي لمساراتها.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- فحص التخويل بـ IS NOT TRUE لا NOT: NOT NULL = NULL لا يُرفع استثناء
  -- ⇒ تجاوز صامت للتحقق (فخ المنطق ثلاثي القيم).
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

-- إعادة تأكيد الربط بين المشغّل والدالة (idempotent).
DROP TRIGGER IF EXISTS guard_profile_privilege_columns ON public.profiles;
CREATE TRIGGER guard_profile_privilege_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_privilege_columns();

NOTIFY pgrst, 'reload schema';
