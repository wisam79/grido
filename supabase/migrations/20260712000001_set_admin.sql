-- ترقية حساب الأدمن الأساسي إلى رتبة Enterprise
-- يستخدم UUID بدلاً من البريد الإلكتروني لحماية البيانات الشخصية
-- تم التحقق من UUID عبر Supabase MCP بتاريخ 2026-07-13
update public.profiles
set plan       = 'enterprise',
    status     = 'active',
    expires_at = timezone('utc'::text, now()) + interval '10 years'
where id = 'b2943199-cb11-4adc-9275-5a746aab879c';
