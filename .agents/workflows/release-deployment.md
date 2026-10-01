# خطة وإجراءات ترفيع وإطلاق الإصدارات (Release Deployment Workflow)

> **الهدف:** توفير مسار عمل آلي صارم وخالٍ من الأخطاء لإنشاء وترفيع إصدارات Grido Studio ونشرها على GitHub و SignPath.

---

## الخطوة 1: التحقق المسبق من صحة الفرع الرئيسي والـ CI
قبل الشروع في ترفيع أي إصدار، تأكد من أن آخر دورة CI سحابية على فرع `main` مكتملة وناجحة 100%:
```bash
gh run list --limit 3
```
إذا كانت هناك أي وظيفة فاشلة في آخر تشغيل، **يُمنع الترفيع إطلاقاً** حتى إصلاح المشكلة والتأكد من نجاح الـ CI.

---

## الخطوة 2: الفحص المحلي الصارم (Lint & Typecheck & Docs Gate)
نفّذ الفحوصات السريعة الخفيفة محلياً للتأكد من خلو المشروع من أي واردات مهملة أو أخطاء في الأنواع:
```bash
# 1. فحص بوابة التوثيق والمراجع الصارمة
node scripts/docs-gate.mjs --strict-refs

# 2. فحص الأنواع الصارم للواجهة
npm --prefix frontend run typecheck

# 3. فحص الـ Linter الصارم بدون أي تحذيرات
npm --prefix frontend run lint
```

---

## الخطوة 3: ترفيع الإصدار الآلي ومزامنة الملفات
استخدم أداة الترفيع الحاكمة `scripts/release.mjs` التي تزامن كافة ملفات التكوين (`build/config.yml`, `info.json`, `project.nsi`, `Taskfile.yml`, `package.json`, و `CHANGELOG.md`):
```bash
# لرفع إصدار ترقيعي (Bug Fixes)
node scripts/release.mjs patch

# لرفع إصدار فرعي جديد (New Features)
node scripts/release.mjs minor

# لرفع إصدار رئيسي (Major Overhaul)
node scripts/release.mjs major
```

---

## الخطوة 4: دفع الكود والوسم ومراقبة البناء السحابي
ادفع الفرع والوسم الجديد (`vX.Y.Z`) إلى السيرفر السحابي:
```bash
git push origin main --tags
```
راقب خط سير البناء فورياً حتى تمام النجاح وإنشاء حزم التثبيت والتوقيع الرقمي:
```bash
gh run watch
```
في حال فشل أي وظيفة سحابية، استخرج سجل الخطأ فوراً:
```bash
gh run view --log-failed
```
