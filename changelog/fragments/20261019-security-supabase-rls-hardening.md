---
type: security
scope: infra
related_files:
  - supabase/migrations/20261019120000_ai_usage_reserve_and_scoped_idempotency.sql
  - supabase/migrations/20261019120100_ai_usage_insert_policy_no_self_insert.sql
  - supabase/migrations/20261019120200_profiles_identity_columns_guard.sql
  - supabase/migrations/20261019120300_profile_repair_email_conflict_selfheal.sql
  - supabase/migrations/20261019130000_phone_bridge_storage_policies.sql
  - supabase/migrations/20261019140000_reclaim_orphan_email_revoke_anon.sql
---

تطبيق خمس هجرات على قاعدة الإنتاج لإغلاق تسريب باكت `phone-bridge` العام (صار خاصاً وبسياسات `<uid>/` للمستخدم وحده)، وسحب الإدراج الذاتي من `ai_usage`، وحجز حصة ذكاء اصطناعي ذرّي بقفل استشاري مع استرداد الحجوزات البائتة واشتقاق الحد من الاستحقاق، وحارس أعمدة الهوية في `profiles`، وترميم ذاتي لتعارض بريد الملف الشخصي.

ثم أُغلقت ثغرة فرعية كشفها مستشار الأمان: `reclaim_orphan_profile_email` بقيت قابلة للنداء من `anon` لأن Supabase يمنح EXECUTE افتراضياً للدوال الجديدة — سُحبت في هجرة لاحقة وقُصر الإذن على `service_role`.
