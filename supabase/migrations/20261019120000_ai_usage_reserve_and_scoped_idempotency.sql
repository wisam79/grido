-- =================================================================================
-- Migration: 20261019120000_ai_usage_reserve_and_scoped_idempotency.sql
-- الهدف: إغلاق ثلاث ثغرات مؤكدة في حصة الذكاء الاصطناعي دون تعديل هجرة مطبَّقة:
--   1) تجاوز الحصة (P1): البحث عن معرّف الطلب كان بلا نطاق مستخدم (`WHERE request_id = X`)
--      فأي إعادة إرسال لنفس المعرّف تُرجع نجاحاً بلا إدراج وبلا فحص حد ⇒ حصة مجانية.
--   2) سباق TOCTOU (P2): الفحص المسبق في Modal كان يعدّ فقط ⇒ كل الطلبات المتزامنة
--      تمرّ، تحرق GPU، ثم يُرفض الخاسرون بـ429 بعد عمل مدفوع. الحل: حجز صريح.
--   3) انتهاء الاستحقاق (P2): الحد كان يُشتق من `profiles.plan` فقط ⇒ مشترك منتهٍ
--      يحتفظ بحد الخطة المدفوعة. الآن: `status='active' AND (expires_at IS NULL
--      OR expires_at > now())` وإلا الحد المجاني.
--
-- تصميم الحجز:
--   * عمود `state` جديد ('pending' = حجز، 'final' = استهلاك محتسب).
--   * `p_reserve` (افتراضي false): يُدرج صفاً معلّقاً مفتاحياً بـrequest_id داخل
--     نفس المعاملة المقفلة (FOR UPDATE على صف profiles) كفحص الحد ⇒ ذرّي.
--   * نداء التسجيل (check_only=false) يحوّل الحجوز المعلّق إلى `final` بدل إدراج
--     صف ثانٍ (لا خصم مزدوج ولا 23505).
--   * الحجوزات البائتة (>1 ساعة) مستردة: تُحذف قبل فحص الحد ولا تُحجب الحصة للأبد.
--   * `p_check_only=true` يبقى فحصاً نقياً بلا أي إدراج (مسار عميل Go).
--
-- الهجرة idempotent: DROP IF EXISTS قبل الإنشاء، ADD COLUMN IF NOT EXISTS،
-- والاشتقاق الكامل للدالة عبر CREATE OR REPLACE.
-- =================================================================================

-- 1) عمود حالة الصف — الصفوف القديمة كلها 'final' (استهلاك محتسب سابقاً).
ALTER TABLE public.ai_usage
    ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'final';

-- فهرس جزئي لاسترداد الحجوزات البائتة بلا مسح كامل للجدول.
CREATE INDEX IF NOT EXISTS idx_ai_usage_pending_stale
    ON public.ai_usage(user_id, used_at)
    WHERE state = 'pending';

-- 2) إسقاط التوقيعات القديمة لتجنّب التحميل الغامض (ambiguity) في PostgREST:
--    التوقيع السباعي صار ثمانياً بإضافة p_reserve.
DROP FUNCTION IF EXISTS public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid);
DROP FUNCTION IF EXISTS public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean);

CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(
    p_user_id uuid,
    p_daily_limit integer,        -- مهمل خادمياً (محفوظ لتوافقية العميل) — الحد يُشتق من الاستحقاق
    p_image_bytes bigint,
    p_exec_seconds numeric DEFAULT 0,
    p_cost_usd numeric DEFAULT 0,
    p_check_only boolean DEFAULT false,
    p_request_id uuid DEFAULT NULL,
    p_reserve boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_plan text;
    v_status text;
    v_expires_at timestamptz;
    v_limit integer;
    v_existing_id uuid;
    v_existing_state text;
BEGIN
    -- الهوية من auth.uid() فقط؛ لا ثقة بأي وسيط عميل.
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND public.is_admin() IS NOT TRUE) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    -- 1) قفل استشاري على مستوى المستخدم ⇒ تسلسل **مضمون** لكل عمليات
    --    الحجز/التحويل لهذا المستخدم. (قفل FOR UPDATE على صف profiles مفقود
    --    لا يقفل شيئاً ⇒ ثقب سباق لمستخدمي الحسابات المعطوبة.)
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

    SELECT p.plan, p.status, p.expires_at
    INTO v_plan, v_status, v_expires_at
    FROM public.profiles p
    WHERE p.id = p_user_id
    FOR UPDATE;

    -- 2) اشتقاق الحد من الاستحقاق الفعلي: خطة مدفوعة بلا status='active' أو
    --    منتهية ⇒ الحد المجاني. (لا يكفي اسم الخطة.)
    v_limit := CASE
        WHEN v_plan = 'enterprise'
             AND COALESCE(v_status, '') = 'active'
             AND (v_expires_at IS NULL OR v_expires_at > now()) THEN 50
        WHEN v_plan = 'pro'
             AND COALESCE(v_status, '') = 'active'
             AND (v_expires_at IS NULL OR v_expires_at > now()) THEN 15
        ELSE 5
    END;

    -- 3) استرداد الحجوزات البائتة (>1 ساعة) قبل فحص الحد — فشل معالجة عابر
    --    لا يحجب حصة المستخدم إلى الأبد.
    DELETE FROM public.ai_usage
    WHERE user_id = p_user_id
      AND state = 'pending'
      AND used_at < now() - interval '1 hour';

    -- 4) العدّاد: الاستهلاك النهائي + الحجوزات الحديثة (فشل مغلق ضد السباق).
    --    صف هذا الطلب نفسه مستثنى: تحويل الحجز المعلّق إلى نهائي لا يجب أن
    --    يُرفض بـ429 بسبب الحصة التي حجزها بنفسه.
    SELECT COUNT(*) INTO v_count
    FROM public.ai_usage a
    WHERE a.user_id = p_user_id
      AND a.used_at >= date_trunc('day', timezone('utc'::text, now()))
      AND (a.state IS DISTINCT FROM 'pending' OR a.used_at >= now() - interval '1 hour')
      AND (p_request_id IS NULL OR a.request_id IS DISTINCT FROM p_request_id);

    IF v_count >= v_limit THEN
        RAISE EXCEPTION 'تجاوزت الحد اليومي لاستخدام الذكاء الاصطناعي (%/% طلبات اليوم)', v_count, v_limit;
    END IF;

    -- 5) فحص نقي: لا حجز ولا إدراج ولا تحويل (مسار عميل Go — check_only=true).
    IF p_check_only THEN
        RETURN json_build_object(
            'success', true,
            'used_today', v_count,
            'daily_limit', v_limit,
            'state', 'check_only',
            'check_only', true
        );
    END IF;

    -- 6) مسار الطلب المعرّف: بحث **منطق على user_id** (الثغرة الأصلية) داخل القفل.
    IF p_request_id IS NOT NULL THEN
        SELECT a.id, a.state
        INTO v_existing_id, v_existing_state
        FROM public.ai_usage a
        WHERE a.request_id = p_request_id
          AND a.user_id = p_user_id
        FOR UPDATE;

        IF v_existing_id IS NOT NULL THEN
            IF v_existing_state = 'final' THEN
                -- إعادة إرسال لطلب محتسب: ليست نجاحاً جديداً (تُعالَج كمكرر لا كرصيد جديد).
                RETURN json_build_object(
                    'success', false,
                    'used_today', v_count,
                    'daily_limit', v_limit,
                    'state', 'idempotent_replay',
                    'idempotent', true
                );
            END IF;

            -- تحويل الحجز المعلّق إلى تسجيل نهائي داخل نفس القفل (لا صف ثانٍ).
            UPDATE public.ai_usage
            SET state = 'final',
                image_bytes = p_image_bytes,
                execution_seconds = p_exec_seconds,
                cost_usd = p_cost_usd
            WHERE id = v_existing_id;

            RETURN json_build_object(
                'success', true,
                'used_today', v_count,
                'daily_limit', v_limit,
                'state', 'finalized'
            );
        END IF;

        -- 7) الصف المعلّق الجديد: الحجز الذرّي الذي يمنع سباق TOCTOU (p_reserve=true).
        IF p_reserve THEN
            INSERT INTO public.ai_usage (user_id, image_bytes, execution_seconds, cost_usd, request_id, state)
            VALUES (p_user_id, 0, 0, 0, p_request_id, 'pending');

            RETURN json_build_object(
                'success', true,
                'used_today', v_count + 1,
                'daily_limit', v_limit,
                'state', 'reserved',
                'request_id', p_request_id
            );
        END IF;
    END IF;

    -- 8) تسجيل مباشر بلا حجز مسبق (توافقية): فحص الحد تم أعلاه داخل القفل.
    INSERT INTO public.ai_usage (user_id, image_bytes, execution_seconds, cost_usd, request_id, state)
    VALUES (p_user_id, p_image_bytes, p_exec_seconds, p_cost_usd, p_request_id, 'final');

    RETURN json_build_object(
        'success', true,
        'used_today', v_count + 1,
        'daily_limit', v_limit,
        'state', 'recorded'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid, boolean) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
