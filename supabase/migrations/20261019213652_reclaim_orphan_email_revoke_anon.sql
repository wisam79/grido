-- 🔁 ملف ظلي مُسترجَع من تاريخ الإنتاج (schema_migrations) — مطابقة 1:1 مع الإنتاج
-- Recovery date: 2026-11-01 · طُبّقت في الإنتاج قبل وجود ملفها محلياً
REVOKE EXECUTE ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_orphan_profile_email(text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';