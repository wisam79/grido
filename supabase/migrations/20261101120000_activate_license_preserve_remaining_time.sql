-- =================================================================================
-- Migration: 20261101120000_activate_license_preserve_remaining_time.sql
-- الهدف: منع activate_license من محو الوقت المدفوع المتبقي عند تفعيل مفتاح جديد
--       قبل انتهاء الاشتراك الحالي. الصيغة القديمة (`now() + duration`) تبدأ العدّ
--       من لحظة التفعيل فتُهدر كامل المدة غير المستهلكة (بلاغ تدقيق 2026-11-01).
-- الصيغة الجديدة: الامتداد من نهاية الاشتراك الساري إن وُجد (`GREATEST(COALESCE(
--       expires_at, now()), now()) + duration`)، ومن الآن إن كان منتهياً أو NULL.
-- الضوابط: نفس توقيع الدالة وصلاحياتها (SECURITY DEFINER + search_path = public)
--       — التغيير حسابي واحد داخل UPDATE profiles، ولا يُمس أي سطر آخر.
-- التحقق المطلوب قبل النشر: مصفوفة T عبر MCP — (اشتراك ساري + مفتاح جديد ⇒
--       expires_at = القديم + المدة) و (منتهي ⇒ الآن + المدة) و (NULL ⇒ الآن + المدة).
-- =================================================================================

CREATE OR REPLACE FUNCTION public.activate_license(p_key text, p_device_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan text;
    v_duration integer;
    v_user_id uuid;
    v_profile record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً لتفعيل الترخيص';
    END IF;

    SELECT plan, duration_months INTO v_plan, v_duration
    FROM public.license_keys
    WHERE key = p_key AND status = 'unused'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'مفتاح الترخيص غير صالح أو تم استخدامه مسبقاً';
    END IF;

    UPDATE public.license_keys
    SET status = 'used',
        user_id = v_user_id,
        activated_at = timezone('utc'::text, now())
    WHERE key = p_key;

    UPDATE public.profiles
    SET plan = v_plan,
        status = 'active',
        license_key = p_key,
        -- ⏳ إبقاء الوقت المدفوع المتبقي: الامتداد من نهاية الاشتراك الساري لا من الآن
        expires_at = GREATEST(COALESCE(expires_at, timezone('utc'::text, now())), timezone('utc'::text, now()))
                     + (v_duration || ' months')::interval,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id
    RETURNING plan, status, expires_at INTO v_profile;

    -- Return only the safe subset of data, not the full row
    RETURN row_to_json(v_profile);
END;
$$;
