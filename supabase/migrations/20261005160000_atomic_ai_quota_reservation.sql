-- =================================================================================
-- Migration: 20261005160000_atomic_ai_quota_reservation.sql
-- Goal: Atomic serialization of AI quota checks (FOR UPDATE) to prevent
--       concurrent overshoot, and idempotent request recording via request_id.
-- =================================================================================

ALTER TABLE public.ai_usage
    ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_usage_request_id
    ON public.ai_usage(request_id)
    WHERE request_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean);

CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(
    p_user_id uuid,
    p_daily_limit integer,
    p_image_bytes bigint,
    p_exec_seconds numeric DEFAULT 0,
    p_cost_usd numeric DEFAULT 0,
    p_check_only boolean DEFAULT false,
    p_request_id uuid DEFAULT NULL
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
    v_existing_id uuid;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND public.is_admin() IS NOT TRUE) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    -- 1. Idempotency: إذا كان معرّف الطلب مسجلاً مسبقاً، نرجع النجاح دون تكرار الإدراج
    IF p_request_id IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM public.ai_usage
        WHERE request_id = p_request_id;

        IF v_existing_id IS NOT NULL THEN
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

            RETURN json_build_object(
                'success', true,
                'used_today', v_count,
                'daily_limit', v_limit,
                'idempotent', true
            );
        END IF;
    END IF;

    -- 2. قفل صفي حصري على المستخدم لضمان ذرية الفحص ومنع سباق التجاوز المتزامن
    SELECT plan INTO v_plan
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

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

    INSERT INTO public.ai_usage (user_id, image_bytes, execution_seconds, cost_usd, request_id)
    VALUES (p_user_id, p_image_bytes, p_exec_seconds, p_cost_usd, p_request_id);

    RETURN json_build_object(
        'success', true,
        'used_today', v_count + 1,
        'daily_limit', v_limit
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
