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

# 2. اختبارات جودة وتوافقية واجهة React (TypeScript & Lint)
cd frontend && npm run typecheck
cd frontend && npm run lint

# 3. اختبارات React Frontend التلقائية (Vitest)
cd frontend && npm run test

# 4. فحص البناء النهائي والأنواع (TypeScript & Vite)
cd frontend && npm run build
```

### التحقق البكسلي لمخرجات الطباعة (Pixel-Level Verification)

عند تعديل هندسة الطباعة أو خطوط القص أو عناصر الشبكة، لا تكتفِ بفحص بصري يدوي. اكتب اختبار Go مؤقت يولّد ورقة طباعة (`GeneratePrintSheet`) ثم يتحقق برمجياً من وجود بكسلات الخط المتوقع عند الإحداثيات المحسوبة (`mm × DPI / 25.4`)، مع فحص الخلفية أيضاً لضمان عدم رسم أي خط خارج حدود الورقة (الإحداثيات المتجاوزة تُقصّ بصمت). هذا يكشف فوراً مشاكل مثل خطوط القص الخارجة عن حدود الورقة التي لا تظهر في الفحص البصري للمعاينة.

---

## 🚀 3. سير عمل التحديثات وإصدار التنسيقات (Release Tagging Workflow)

عند التوجيه لرفع إصدار جديد للتطبيق (`vX.Y.Z`):

1. **الفحص المسبق الصارم (Pre-flight Quality Check):** تشغيل `npm run lint` و `npm run typecheck` في مجلد `frontend`، والتأكد من عدم وجود أي خطأ أو تحذير (`0 errors, 0 warnings`) قبل الشروع في الترفيع.
2. **تحديث السكريبت المحلي:** تحديث القيمة الاحتياطية لـ `$appVersion` في `build.ps1` إلى `vX.Y.Z`.
3. **الحفظ والإيداع:** تنفيذ `git add .` ثم `git commit -m "release: vX.Y.Z - ..."`.
4. **إنشاء الوسم:** تشغيل `git tag -a vX.Y.Z -m "Release vX.Y.Z: ..."`.
5. **الدفع لبدء البناء السحابي:** تشغيل `git push origin main --tags`.
6. **النتيجة:** يقوم سيرفر GitHub Actions تلقائياً ببدء بناء النسخة وتوليد `GridoStudio-installer.exe` ونشرها في صفحة Releases على GitHub.

