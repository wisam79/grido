---
name: grido-qa-security-auditor
description: دليل الجودة والأمان والاختبار وتوليد الإصدارات السحابية (QA, Security Audit, Automated Tests & Release Pipeline)
---

# 🛡️ دليل فحص الأمان واختبارات الجودة والإصدارات (QA & Security Auditor)

استخدم هذا الدليل لضمان خلو أي تعديل من الثغرات الأمنية، التحقق عبر الاختبارات التلقائية، وإطلاق الإصدارات السحابية بنجاح.

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
   - يُمنع تشفير مفاتيح API داخل الكود. يتم قراءتها كمتغيرات بيئة وحقنها بـ `-ldflags` أثناء البناء.

---

## 🧪 2. خطة الاختبار التلقائي (Automated Verification Pipeline)

قبل إعلان إنجاز أي مهمة أو إصلاح bug، ينبغي تشغيل أوامر الاختبار التالية والتحقق من خلوها من الأخطاء:

```bash
# 1. اختبارات Go Backend
go test ./internal/...

# 2. اختبارات React Frontend (Vitest)
cd frontend && npm run test

# 3. فحص البناء النهائي والأنواع (TypeScript & Vite)
cd frontend && npm run build
```

---

## 🚀 3. سير عمل التحديثات وإصدار التنسيقات (Release Tagging Workflow)

عند التوجيه لرفع إصدار جديد للتطبيق (`vX.Y.Z`):

1. **تحديث السكريبت المحلي:** تحديث القيمة الاحتياطية لـ `$appVersion` في `build.ps1` إلى `vX.Y.Z`.
2. **الحفظ والإيداع:** تنفيذ `git add .` ثم `git commit -m "release: vX.Y.Z - ..."`.
3. **إنشاء الوسم:** تشغيل `git tag -a vX.Y.Z -m "Release vX.Y.Z: ..."`.
4. **الدفع لبدء البناء السحابي:** تشغيل `git push origin main --tags`.
5. **النتيجة:** يقوم سيرفر GitHub Actions تلقائياً ببدء بناء النسخة وتوليد `GridoStudio-installer.exe` ونشرها في صفحة Releases على GitHub.
