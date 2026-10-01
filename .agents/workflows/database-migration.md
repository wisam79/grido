# خطة وإجراءات هجرات قاعدة بيانات Supabase (Database Migration Workflow)

> **الهدف:** توفير مسار عمل آلي آمن لكتابة وفحص وتطبيق هجرات قاعدة البيانات وتأمين RLS وتفادي الفجوات الأمنية.

---

## الخطوة 1: صياغة ملف الهجرة
أنشئ ملف هجرة جديد في مجلد `supabase/migrations/` بالاسم القياسي المعتمد على التاريخ والوقت `YYYYMMDDHHMMSS_<name>.sql`:
- تأكد من تفعيل RLS على أي جدول جديد: `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`.
- تأكد من إضافة سياسة deny-all إذا كان الجدول داخلياً، أو سياسات `USING` و `WITH CHECK` صريحة للمستخدمين.
- إذا كانت الدالة `SECURITY DEFINER`، اضبط إجبارياً: `SET search_path = ''` واعتمد على `auth.uid()`.
- ألزم أي فحص دالة boolean بإعادة قيمة غير فارغة (`COALESCE(expr, false)`) واستخدم شرط `IS NOT TRUE` لا `IF NOT fn()`.

---

## الخطوة 2: الفحص والتحقق التجريبي عبر Supabase MCP
قبل تطبيق الهجرة فعلياً، اختبر الدوال والسياسات داخل معاملة تجريبية تُلغى (Rollback Transaction):
```sql
BEGIN;
-- تنفيذ أوامر الهجرة هنا
-- اختبار صلاحيات anon و authenticated
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
-- تنفيذ الاستعلام والتأكد من الحجب أو المنح
ROLLBACK;
```

---

## الخطوة 3: دفع الهجرة للسيرفر السحابي
ادفع الهجرة رسمياً إلى خادم Supabase:
```bash
supabase db push --yes
```

---

## الخطوة 4: تحديث مَانيفست الهجرات وبوابة التوثيق
حدّث ملف المانيفست `supabase/migrations.manifest.json` لمنع أخطاء الانحراف:
```bash
node scripts/migration-lint.mjs --update-manifest
```
أضف تأكيدات الكود في `scripts/docs-gate.mjs` إذا كانت الهجرة تعالج بنداً أمنياً أو ميزة حاكمة، ووثق التغييرات في `CHANGELOG.md`.
تحقق من نجاح البوابة:
```bash
node scripts/docs-gate.mjs --strict-refs
```
