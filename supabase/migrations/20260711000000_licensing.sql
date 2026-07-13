-- 1. إنشاء جدول الملفات الشخصية للمستخدمين المرتبط بنظام الهوية (Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text unique not null,
  plan text not null default 'free', -- 'free', 'trial', 'pro', 'enterprise'
  expires_at timestamp with time zone,
  license_key text,
  status text not null default 'none', -- 'active', 'expired', 'none'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- تفعيل ميزة الأمن على مستوى السطر (RLS)
alter table public.profiles enable row level security;

-- دالة مساعدة للتحقق من صلاحية المشرف وتفادي التكرار اللانهائي (RLS Recursion)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.plan = 'enterprise'
  );
end;
$$ language plpgsql security definer;

-- سياسات الأمان لجداول الملفات الشخصية
create policy "الجميع يقرأ حسابه فقط أو المشرف يقرأ الجميع" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "تحديث المستخدم لحسابه الخاص أو المشرف يعدل الجميع" on public.profiles
  for update using (auth.uid() = id or public.is_admin());


-- 2. إنشاء جدول مفاتيح التراخيص المولدة
create table if not exists public.license_keys (
  key text primary key,
  plan text not null default 'pro',
  duration_months integer not null default 12,
  status text not null default 'unused', -- 'unused', 'used', 'revoked'
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  activated_at timestamp with time zone
);

alter table public.license_keys enable row level security;

-- سياسات الأمان لمفاتيح الترخيص (المشرف فقط يستطيع التحكم فيها بالكامل سحابياً)
create policy "قراءة التراخيص للمشرفين" on public.license_keys
  for select using (public.is_admin());

create policy "توليد مفاتيح تراخيص للمشرفين" on public.license_keys
  for insert with check (public.is_admin());

create policy "تعديل مفاتيح التراخيص للمشرفين" on public.license_keys
  for update using (public.is_admin()) with check (public.is_admin());

create policy "حذف مفاتيح التراخيص للمشرفين" on public.license_keys
  for delete using (public.is_admin());


-- 3. تفعيل آلية الإنشاء التلقائي للحساب مع 7 أيام تجريبية عند التسجيل (Postgres Trigger)
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

-- ربط الـ Trigger بجدول التسجيل auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

