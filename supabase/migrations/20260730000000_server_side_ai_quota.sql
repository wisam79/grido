-- =================================================================================
-- Migration: 20260730000000_server_side_ai_quota.sql
-- Goal: إغلاق ثغرة ثقة الحصة — اشتقاق الحد اليومي من خطة المستخدم في قاعدة البيانات
--       بدلاً من القيمة المرسلة من العميل، وإضافة وضع فحص مسبق (p_check_only) يسمح
--       لخادم Modal بفحص الرصيد قبل حرق أي ثانية GPU مكلفة.
--
-- متوافق رجعياً: المعامل p_daily_limit يبقى في التوقيع لكنه يُتجاهل تماماً،
-- والمعامل الجديد p_check_only له قيمة افتراضية فلا يكسر أي متصل قديم.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(
    p_user_id uuid,
    p_daily_limit integer,          -- مهمل (ignored): لم يعد موثوقاً — يُشتق الحد من الخطة
    p_image_bytes bigint,
    p_exec_seconds numeric DEFAULT 0,
    p_cost_usd numeric DEFAULT 0,
    p_check_only boolean DEFAULT false
)
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
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    -- 🛡️ اشتقاق الحد اليومي من خطة المستخدم المخزنة — no client-supplied quota is trusted
    SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;
    v_limit := CASE v_plan
        WHEN 'enterprise' THEN 50
        WHEN 'pro' THEN 15
        ELSE 5  -- free / trial / بلا ملف شخصي
    END;

    SELECT COUNT(*) INTO v_count
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND used_at >= date_trunc('day', timezone('utc'::text, now()));

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'تجاوزت الحد اليومي لاستخدام الذكاء الاصطناعي (%/% طلبات اليوم)', v_count, v_limit;
    END IF;

    -- وضع الفحص المسبق: يجيب عن "هل يوجد رصيد؟" دون تسجيل استهلاك — يُستخدم قبل بدء المعالجة المكلفة
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

GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage TO authenticated, anon, service_role;

-- Reload PostgREST schema cache لالتقاط التوقيع الجديد فوراً
NOTIFY pgrst, 'reload schema';
