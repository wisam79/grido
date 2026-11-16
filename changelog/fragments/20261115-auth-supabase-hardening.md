---
type: security
scope: auth
related_files:
  - supabase/migrations/20261113171327_phone_bridge_handshake_json_mime.sql:1
  - supabase/migrations/20261115221300_security_hardening_anon_revokes_rls_and_extend_fix.sql:1
  - supabase/migrations.manifest.json:44
  - SECURITY_NOTICE.md:3
  - .agents/skills/supabase-security-and-migrations/SKILL.md:51
  - .agents/rules/database-security-authz.md:15
  - .agents/rules/backend-wails-runtime.md:48
---

تحييد دالتَي Edge Functions اليتيمتين (`license` و`ai-enhance` ← `410 Gone` مع `verify_jwt: true` ونزع `SUPABASE_SERVICE_ROLE_KEY`)، ومواءمة هجرة `20261113171327_phone_bridge_handshake_json_mime.sql` وتطبيق `20261115221300_security_hardening_anon_revokes_rls_and_extend_fix.sql` (`43 = 43`) لسحب `anon`/`PUBLIC` عن دوال `SECURITY DEFINER` وتقليص منح الجداول الخمسة ودمج سياسات `profiles` وتحصين `admin_extend_license`.
