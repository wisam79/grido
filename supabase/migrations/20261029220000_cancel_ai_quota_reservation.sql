-- =================================================================================
-- Migration: 20261029220000_cancel_ai_quota_reservation.sql
-- الهدف: إتاحة تحرير الحجز الذرّي المعلّق (pending) في حال فشل المعالجة بالذكاء
--       الاصطناعي (مثل انقطاع الاتصال أو خطأ الترميز)، لمنع حجب حصة المستخدم
--       اليومية حتى انتهاء مهلة الساعة التلقائية.
--
-- الضوابط الأمنية:
--   * الهوية من auth.uid() فقط (أو مشرف عبر public.is_admin() IS NOT TRUE).
--   * لا يمكن تحرير إلا الصفوف ذات الحالة 'pending' فقط — الصفوف النهائية 'final'
--     محمية تماماً ولا يمكن إلغاؤها أو التلاعب بها.
--   * قفل استشاري pg_advisory_xact_lock لمنع أي سباق تزامني.
-- =================================================================================

CREATE OR REPLACE FUNCTION public.cancel_ai_quota_reservation(
    p_user_id uuid,
    p_request_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted boolean := false;
BEGIN
    -- التحقق الصارم من الهوية
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND public.is_admin() IS NOT TRUE) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    IF p_request_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'request_id_required'
        );
    END IF;

    -- قفل استشاري يضمن تسلسل عمليات المستخدم
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

    -- حذف صف الحجز المعلّق فقط (state = 'pending')
    DELETE FROM public.ai_usage
    WHERE user_id = p_user_id
      AND request_id = p_request_id
      AND state = 'pending';

    IF FOUND THEN
        v_deleted := true;
    END IF;

    RETURN json_build_object(
        'success', true,
        'released', v_deleted,
        'request_id', p_request_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_ai_quota_reservation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_ai_quota_reservation(uuid, uuid) TO authenticated, service_role;
