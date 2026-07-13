-- 1. تحديث دالة handle_new_user لضمان عدم وجود أي ثغرة خلفية (Backdoor)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_plan text := 'trial';
  user_status text := 'active';
  user_expiry timestamp with time zone := timezone('utc'::text, now()) + interval '7 days';
begin
  insert into public.profiles (id, name, email, plan, expires_at, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    user_plan,
    user_expiry,
    user_status
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. إعادة ضبط أي حساب تمت ترقيته بشكل غير مصرح به (ثغرة قديمة)
-- تنبيه: لا تُضمِّن عناوين بريد إلكتروني في ملفات المهاجرة — استخدم UUID
update public.profiles
set plan = 'free',
    status = 'expired',
    expires_at = timezone('utc'::text, now())
where plan = 'enterprise'
  and id != 'b2943199-cb11-4adc-9275-5a746aab879c'; -- استثناء حساب الأدمن الفعلي
