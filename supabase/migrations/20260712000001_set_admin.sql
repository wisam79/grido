-- ترقية حساب المطور الأساسي إلى رتبة Enterprise بشكل آمن وصريح لإتاحة لوحة التحكم
update public.profiles 
set plan = 'enterprise', 
    status = 'active', 
    expires_at = timezone('utc'::text, now()) + interval '100 years' 
where email = 'wisamsamir78@gmail.com';
