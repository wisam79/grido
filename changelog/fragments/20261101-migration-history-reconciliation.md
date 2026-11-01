---
type: refactor
scope: infra
related_files:
  - supabase/migrations/20261005201810_add_request_id_to_ai_usage.sql:1
  - supabase/migrations/20261019213652_reclaim_orphan_email_revoke_anon.sql:1
  - supabase/migrations.manifest.json:1
---
مصالحة تاريخ هجرات Supabase مع الإنتاج: استخراج نصوص 9 هجرات كانت مطبقة في `schema_migrations` بلا ملفات محلية (طُبّقت من لوحة SQL، بينها 6 نسخة ثانية من هجرات محلية بنفس الاسم بتاريخ مختلف) وإنشاء ملفاتها الظلية بعناوين توثيقية — التطابق الآن 41=41 في الاتجاهين (فحص comm بالمishmarين) وmanifest محدّث ببصماتها، فأصبح `supabase db push` والاستنساخ من المستودع صامتين وآمنين.
