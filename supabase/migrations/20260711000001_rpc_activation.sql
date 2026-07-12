-- دالة تفعيل الترخيص (RPC) مع منع التزامن المتضارب (Race Condition)
-- تستقبل المفتاح ومعرّف الجهاز، وتتأكد من أن الكود صالح ثم تفعله لحساب المستخدم الحالي
CREATE OR REPLACE FUNCTION public.activate_license(p_key text, p_device_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- للعمل بصلاحيات المشرف لتجاوز RLS وتعديل الجداول
AS $$
DECLARE
    v_plan text;
    v_duration integer;
    v_user_id uuid;
    v_profile record;
BEGIN
    -- 1. التأكد من هوية المستخدم
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً لتفعيل الترخيص';
    END IF;

    -- 2. التحقق من كود الترخيص وقفل السطر أثناء العملية (FOR UPDATE SKIP LOCKED) لمنع السباق
    SELECT plan, duration_months INTO v_plan, v_duration
    FROM public.license_keys
    WHERE key = p_key AND status = 'unused'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'مفتاح الترخيص غير صالح أو تم استخدامه مسبقاً';
    END IF;

    -- 3. حرق كود الترخيص وربطه بالمستخدم
    UPDATE public.license_keys
    SET status = 'used',
        user_id = v_user_id,
        activated_at = timezone('utc'::text, now())
    WHERE key = p_key;

    -- 4. ترقية باقة المستخدم
    UPDATE public.profiles
    SET plan = v_plan,
        status = 'active',
        license_key = p_key,
        expires_at = timezone('utc'::text, now()) + (v_duration || ' months')::interval,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id
    RETURNING * INTO v_profile;

    -- 5. إرجاع بيانات الحساب المحدثة ليتم تشفيرها وحفظها محلياً
    RETURN row_to_json(v_profile);
END;
$$;
