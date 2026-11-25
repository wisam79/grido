---
name: grido-qa-and-release
description: دليل الجولة الأمنية الدورية (`/security-audit`) وإجراءات ترفيع وإطلاق الإصدارات (`/release-deployment`)
---

# 🛡️🚀 الجودة والأمان وإطلاق الإصدارات (QA, Security & Release)

يوحّد هذا الدليل مساري `/security-audit` و`/release-deployment` وضوابط الأمان الأساسية في Go والواجهة.

---

## 1. مسار الجولة الأمنية الدورية (`/security-audit`)

1. **تعقيم سجلات المصادقة:** لا طباعة لنصوص الاستجابات الخام (`string(body)`) في `internal/service/auth_flows.go` أو `license_service.go` أو `oauth_server.go` — يُسجّل نوع الخطأ وحالة HTTP وطول البايتات فقط.
2. **تطابق سياسة كلمات المرور:** حدّ أدنى 8 أحرف + حروف وأرقام متطابق في `internal/service/auth_flows.go` (`validatePasswordStrength`)، و`frontend/src/components/editor/dialogs/account/use-auth-forms.ts`، و`internal/service/supabase_client.go`.
3. **الجلسة الواحدة النشطة:** جدول `public.user_sessions` (سياسة deny-all)، ودالتا `claim_session`/`check_session` بصلاحية `SECURITY DEFINER`؛ انقطاع الشبكة في `session_manager.go` لا يطرد المستخدم (Offline Grace)، والطرد محصور في `ErrSessionSuperseded`.
4. **أمان الملفات والذاكرة والأسرار:**
   - التحقق من المسارات عبر `filepath.EvalSymlinks`، وتقييد استجابات HTTP عبر `io.LimitReader`.
   - الكتابة الذرية عبر `.tmp` + `defer os.Remove(tmp)` + `f.Sync()` قبل `os.Rename`.
   - خلو الثنائي والـ `ldflags` من أي مفاتيح AI مشتركة (`Authorization: Bearer <JWT>` فقط).
   - للتحقق من RLS والهجرات راجع مهارة `supabase-security-and-migrations`.
5. **فحص الاعتماديات:** `npm --prefix frontend audit` · `npm --prefix admin-web audit` · `go vet ./...`. سجّل أي جولة تدقيق في `docs/reviews/` وأي ثغرة حيّة في `SECURITY_NOTICE.md`.

---

## 2. مسار ترفيع وإطلاق الإصدارات (`/release-deployment`)

1. **سلامة CI المسبقة:** تأكد عبر `gh run list --limit 3` أن آخر دورة CI على `main` نجحت بنسبة 100%؛ يُمنع الترفيع مع فشل معلّق.
2. **الفحوص المحلية الخفيفة:**
   ```bash
   node scripts/docs-gate.mjs --strict-refs
   npm --prefix frontend run format:check
   npm --prefix frontend run lint
   npm --prefix frontend run typecheck
   ```
   وتحقق من `gofmt -l` على ملفات Go.
3. **الترفيع الآلي (`scripts/release.mjs`):**
   - استعمل `node scripts/release.mjs patch` (أو `minor` / `major`).
   - الأداة تزامن الإصدار عبر `build/config.yml` و`build/windows/info.json` و`build/windows/installer/project.nsi` و`build/windows/Taskfile.yml` و`frontend/package.json`، وتجمع `changelog/fragments/*.md` لبناء `CHANGELOG.md` وأرشفة الزائد في `CHANGELOG_ARCHIVE.md`.
   - يُمنع تعديل `CHANGELOG.md` يدوياً أو تشغيل `wails3 update build-assets` أثناء الترفيع (يعيد `info.json` للقالب المحايد `0000` ويكسر فحص بيانات EXE).
4. **الدفع والمراقبة الإلزامية:**
   - بعد إذن المالك: `git push origin main --tags` ثم `gh run watch` حتى اكتمال `release.yml` بنسبة 100% (مع التحقق عبر `gh run view --log-failed` عند أي عطل).
   - ملاحظة التوقيع: يُرفق إثبات المنشأ (`gh attestation verify <exe> -R wisam79/grido`) وخطوة SignPath (`continue-on-error: true` إذا لم تتوفر أسرار التوقيع التجاري).
