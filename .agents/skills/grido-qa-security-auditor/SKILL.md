---
name: grido-qa-security-auditor
description: دليل الجودة والأمان والاختبار وتوليد الإصدارات السحابية والفحص الأمني الدوري (`/security-audit`)
---

# 🛡️ دليل فحص الأمان واختبارات الجودة والإصدارات (QA & Security Auditor)

استخدم هذا الدليل لضمان خلو أي تعديل من الثغرات الأمنية، التحقق عبر الاختبارات التلقائية، وإجراء الجولات الأمنية الدورية وإطلاق الإصدارات السحابية بنجاح.
> **أمر التدقيق الأمني المباشر:** يمكن استدعاء جولة التدقيق في أي وقت بكتابة `/security-audit` في صندوق المحادثة.

---

## 🔒 1. فحص قواعد الأمان والحماية الإلزامية (Security Guardrails)

عند كتابة أو تعديل أي كود في Go backend أو التعامل مع شبكة الملفات، تأكد من تطبيق المعايير التالية:

1. **الوقاية من Path Traversal وعبر الـ Symlinks:**
   - أي دالة تحول مسار ويب (مثل `/local-image/`) إلى مسار نظام ملفات، يجب إجبارياً استخدام `filepath.EvalSymlinks` والتحقق من النطاق:
     ```go
     resolved, err := filepath.EvalSymlinks(targetPath)
     if err != nil || !strings.HasPrefix(filepath.Clean(resolved), filepath.Clean(mediaDir)) {
         http.Error(w, "Access denied", http.StatusForbidden)
         return
     }
     ```

2. **تقييد القراءة القصوى للاستجابات (LimitReader for Unbounded IO):**
   - يُمنع استخدام `io.ReadAll(resp.Body)` مباشرة لحماية الذاكرة من هجمات Memory Exhaustion.
   - استخدم دائماً: `io.ReadAll(io.LimitReader(resp.Body, 50*1024*1024))`.

3. **الكتابة الذرية السليمة على القرص (Atomic Disk Writes & fsync):**
   - عند كتابة ملف مؤقت `.tmp` قبل نقله بـ `os.Rename`:
     - استدعِ `f.Sync()` وحفظ البيانات على القرص قبل `f.Close()`.
     - أضف `defer os.Remove(tmpPath)` لتنظيف الملفات في حال حدوث Panic.

4. **إدارة الأسرار والمفاتيح (Secrets Management):**
   - يُمنع تشفير مفاتيح API أو أسرار مشتركة داخل الكود أو الثنائي. المصادقة للخدمات السحابية تعتمد حصراً على توكن المستخدم الفردي (`Authorization: Bearer <JWT>`).

5. **تأمين RLS ودوال التفويض والهجرات (Supabase Authz):**
   - عند أي عمل على `supabase/migrations/` أو سياسات RLS أو دوال `SECURITY DEFINER`، طبّق إجبارياً المهارة المتخصصة `.agents/skills/supabase-security-and-migrations/SKILL.md`.

---

## 🔍 2. مسار الجولة الأمنية الدورية (Security Audit SOP — `/security-audit`)

### 2.1 فحص حظر طباعة استجابات المصادقة في السجلات (Auth Log Sanitization)
تأكد من عدم وجود أي تمرير لنصوص الاستجابات الخام في مسارات المصادقة وتدوير التوكنات (`internal/service/auth_flows.go`, `license_service.go`, `oauth_server.go`).
القاعدة: الاكتفاء بتسجيل نوع الخطأ، رمز الحالة، وطول الاستجابة بالبايتات (`bytes: len(body)`).

### 2.2 فحص تطابق سياسة كلمات المرور (Password Policy Parity)
تأكد من أن الحد الأدنى 8 أحرف واشتراط الحروف والأرقام معاً مطبق بتطابق تام في 3 مواضع:
1. الباك إند: `internal/service/auth_flows.go` (`validatePasswordStrength`).
2. الواجهة: `frontend/src/components/editor/dialogs/account/use-auth-forms.ts` (`validatePassword`).
3. تعريب الأخطاء: `internal/service/supabase_client.go` (`TranslateAuthError`).

### 2.3 فحص الجلسة الواحدة النشطة (Single Active Session Verification)
تأكد من سلامة آلية الطرد بنموذج (Last-Wins) وسماح عدم الاتصال:
- جدول `public.user_sessions` محمي بسياسة `FOR ALL USING (false)`.
- دالتا `claim_session` و `check_session` تعملان بصلاحية `SECURITY DEFINER` مع `auth.uid()`.
- انقطاع الشبكة في Go backend لا يطرد المستخدم (سماح عدم الاتصال). الطرد يحدث فقط عند إثبات استبدال الجلسة بجلسة أحدث (`ErrSessionSuperseded`).

### 2.4 فحص الأسرار المشتركة في الثنائي (No Shared Secrets Audit)
تأكد من عدم وجود أي مفاتيح أو أسرار مشتركة محقونة في الثنائي عبر `ldflags` أو الكود:
- التوثيق لخدمات الذكاء الاصطناعي (Modal) يعتمد حصراً على توكن المستخدم الفردي (`Authorization: Bearer <JWT>`).
- لا توجد متغيرات `MODAL_AI_KEY` أو دوال تجلب مفاتيح عامة مشتركة.

### 2.5 فحص الثغرات الأمنية في الاعتماديات (Dependency Security Audit)
```bash
npm --prefix frontend audit
npm --prefix admin-web audit
go vet ./internal/...
```

---

## 🧪 3. خطة الاختبار التلقائي السحابي المستمر (Continuous Cloud CI/CD Pipeline)

تطبيقاً لمعيار **الصفر إجهاد للجهاز المحلي والاعتماد الكلي على GitHub Actions** (`Pure GitHub Actions CI Invariant`):
يُمنع تشغيل اختبارات E2E (Playwright) أو الحزم الثقيلة على الجهاز المحلي. يُعتمد خط سير العمل السحابي الحصري عبر GitHub CLI:

```bash
# 1. إيداع التعديلات ودفعها
git add -A
git commit -m "feat/fix: ..."
git push origin main

# 2. مراقبة دورة الاختبارات السحابية الجارية فورياً
gh run list --limit 3
gh run watch <run-id> --interval 10

# 3. في حال حدوث أي فشل، استخراج سجلات الفشل الدقيقة
gh run view <run-id> --log-failed
```
