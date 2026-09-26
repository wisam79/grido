-- =================================================================================
-- 2026-09-26 — إصلاح تجاوز تخويل حرج (مؤكد بالاختبار على الإنتاج)
-- الجذر: is_admin() = `(auth.jwt()->'app_metadata'->>'role') = 'admin' OR EXISTS(...)`
-- يعيد NULL لا FALSE حين ينقص مفتاح role (لأن NULL OR FALSE = NULL في منطق SQL ثلاثي القيم).
-- فتقرأ دوال الأدمن `IF NOT public.is_admin()` كـ`IF NULL` (لا ترفع) ⇒ تجاوز كامل للتحقق.
-- الدليل العملي (rolling back): مستخدم مصادق غير مسؤول، ثم دور anon، استدعيا
-- admin_create_license_key(...) بنجاح وأنشآ مفاتيح ترخيص — وأيضاً check_and_record_ai_usage
-- صار قابلاً للاستدعاء نيابة عن مستخدم آخر. المفتاح anon عام ويشحن مع كل عميل.
-- الإصلاح: is_admin() يعيد boolean دائماً (COALESCE) + تقوية كل فحص إلى `IS NOT TRUE`.
-- ملاحظة: أُطبِّقت على الإنتاج عبر Supabase MCP بصيغة 20260926160117 (نفس النمط).
-- =================================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_license_key(p_plan text, p_duration_months integer, p_custom_key text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_key text;
    v_rand text;
    v_result record;
BEGIN
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات مسؤول نظام';
    END IF;

    IF p_custom_key IS NOT NULL AND length(trim(p_custom_key)) > 0 THEN
        v_key := trim(p_custom_key);
    ELSE
        v_rand := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);
        v_key := upper('GRIDO-' || p_plan || '-' || substring(v_rand from 1 for 4) || '-' || substring(v_rand from 5 for 4) || '-' || substring(v_rand from 9 for 4));
    END IF;

    INSERT INTO public.license_keys (key, plan, duration_months, status)
    VALUES (v_key, p_plan, p_duration_months, 'unused')
    RETURNING key, plan, duration_months, status INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_license(p_user_id text, p_additional_months integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
    v_user_uuid uuid;
BEGIN
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    v_user_uuid := p_user_id::uuid;

    UPDATE public.profiles
    SET expires_at = COALESCE(expires_at, timezone('utc'::text, now())) + (p_additional_months || ' months')::interval,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_uuid
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_license(p_user_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
    v_user_uuid uuid;
BEGIN
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    v_user_uuid := p_user_id::uuid;

    UPDATE public.profiles
    SET status = 'expired',
        plan = 'free',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_uuid
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(p_user_id uuid, p_daily_limit integer, p_image_bytes bigint, p_exec_seconds numeric DEFAULT 0, p_cost_usd numeric DEFAULT 0, p_check_only boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_plan text;
    v_limit integer;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND public.is_admin() IS NOT TRUE) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    -- اشتقاق الحد اليومي من خطة المستخدم المخزنة — لا تُوثق أي حصة من العميل
    SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;
    v_limit := CASE v_plan
        WHEN 'enterprise' THEN 50
        WHEN 'pro' THEN 15
        ELSE 5
    END;

    SELECT COUNT(*) INTO v_count
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND used_at >= date_trunc('day', timezone('utc'::text, now()));

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'تجاوزت الحد اليومي لاستخدام الذكاء الاصطناعي (%/% طلبات اليوم)', v_count, v_limit;
    END IF;

    IF p_check_only THEN
        RETURN json_build_object(
            'success', true,
            'used_today', v_count,
            'daily_limit', v_limit,
            'check_only', true
        );
    END IF;

    INSERT INTO public.ai_usage (user_id, image_bytes, execution_seconds, cost_usd)
    VALUES (p_user_id, p_image_bytes, p_exec_seconds, p_cost_usd);

    RETURN json_build_object(
        'success', true,
        'used_today', v_count + 1,
        'daily_limit', v_limit
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
