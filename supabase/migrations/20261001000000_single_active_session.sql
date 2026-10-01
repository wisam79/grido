-- =================================================================================
-- Migration: single active session (Last-Wins) — جلسة واحدة نشطة لكل مستخدم
-- Goal: منع مشاركة الحساب الواحد بين أجهزة متعددة دون أي ربط بالعتاد.
--   القاعدة: آخر دخول ناجح يفوز، وأي جلسة أقدم تُطرد برسالة صريحة عند
--   أول تحقق شبكي ناجح. الأوفلاين لا يطرد أبداً (الطرد فقط عند إثبات شبكي).
-- متوافق رجعياً: لا يمس أي جدول/دالة قائمة؛ سطر واحد لكل مستخدم.
-- =================================================================================

-- 1. جدول الجلسة النشطة: سطر واحد لكل مستخدم (user_id مفتاح أساسي).
CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  session_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  app_version text
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- لا قراءة/كتابة مباشرة من العميل — عبر الدالتين أدناه فقط.
DROP POLICY IF EXISTS "no_direct_session_access" ON public.user_sessions;
CREATE POLICY "no_direct_session_access" ON public.user_sessions
  FOR ALL USING (false) WITH CHECK (false);

-- 2. حجز الجلسة: الكاتب الأخير يفوز دائماً (UPSERT غير مشروط).
CREATE OR REPLACE FUNCTION public.claim_session(
  p_session_id uuid,
  p_app_version text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  INSERT INTO public.user_sessions (user_id, session_id, last_seen_at, app_version)
  VALUES (v_user_id, p_session_id, timezone('utc'::text, now()), p_app_version)
  ON CONFLICT (user_id) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    last_seen_at = timezone('utc'::text, now()),
    app_version = EXCLUDED.app_version;

  RETURN json_build_object('success', true, 'session_id', p_session_id);
END;
$$;

-- 3. فحص الجلسة: true فقط إن كانت المحلية هي النشطة خادمياً.
--    لا جلسة مخزنة بعد = أول دخول قديم قبل الميزة => يُقبل ويُحجز لاحقاً.
CREATE OR REPLACE FUNCTION public.check_session(p_session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_active uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT session_id INTO v_active
  FROM public.user_sessions
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', true, 'active', true, 'superseded', false);
  END IF;

  IF v_active = p_session_id THEN
    UPDATE public.user_sessions
    SET last_seen_at = timezone('utc'::text, now())
    WHERE user_id = v_user_id;
    RETURN json_build_object('success', true, 'active', true, 'superseded', false);
  END IF;

  RETURN json_build_object('success', true, 'active', false, 'superseded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_session(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_session(uuid) TO authenticated;

-- Reload PostgREST schema cache لالتقاط الدالتين فوراً
NOTIFY pgrst, 'reload schema';
