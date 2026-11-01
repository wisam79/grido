# برومت استكمال خطة Grido Studio — انسخه في محادثة جديدة

> انسخ كل ما يلي (من الخط الفاصل التالي حتى نهاية الملف) والصقه كأول رسالة في محادثة جديدة.

---

# استكمال خطة إصلاحات وتطوير Grido Studio

أنت تكمل عملاً في مشروع `C:\projects\grido` (Grido Studio — تطبيق سطح مكتب Wails v3.0.0 GA / Go 1.26.10: Go backend + React 19/TS/Konva frontend + صفحة هبوط ولوحة إدارة admin-web منشورة على **GitHub Pages** عبر `deploy-pages.yml`).

اقرأ أولاً هذه الملفات قبل أي كود: `.agents/AGENTS.md` (قواعد إلزامية)، `docs/DOCUMENTATION_MAP.md` (**خريطة التوثيق الإلزامية — الجرد + مصفوفة المزامنة + الأرقام المرجعية + البوابات**)، `docs/features-tracker.md` (**الجلسات 1.70–1.74 في رأسه = حالة يوم 2026-11-01**)، و`SECURITY_NOTICE.md` (إدخال 2026-11-01).

> 🔒 **إلزام:** قبل بدء العمل أعلن المستندات التي سيتغيّرها العمل، وقبل أي كومت/دفع شغّل `node scripts/docs-gate.mjs --strict-refs` (مفروض آلياً عبر husky وخطوة Documentation Gate في CI). **لا رقم من الذاكرة.** رسائل الالتزام `type(scope): وصف` — النطاق كلمة واحدة (رفض hook صيغة `fix(ai,auth)`).

## ما أُنجز في الجلسات 1.70–1.74 (2026-11-01 — 12 التزاماً على main، آخرها 8a0547c9، CI أخضر)

1. **إصلاحات مراجعة هندسة الكولاج والطباعة (1.70 + b6fe589f/c9011fdf):** عكس إزاحة الجيران على المسار الكامل (avail+gap)؛ حارس 1مم لمولّدات الشبكة الفيزيائية (`resolveFixedGapScale`)؛ تقييد نافذة القصّة داخل حدود الصورة في المسارات الثلاثة (Konva/تصدير يدوي/Go `computeCropFromSlot`)؛ تحويم ربع الدوران في SheetPreview عبر مساعد مشترك `computeSlotPreviewPan` (lib/print/preview-pan.ts) مع إبقاء نص التحويل الربعي بلا translate عند صفر التحويم (عقد print-preview-transform-order)؛ خطوط القص فوق المحتوى؛ إطار التحديد داخل قصّ الورقة.
2. **ميزات (1.71/1.72 + 15991707):** `removeCollageSlot` (حارس آخر خانة، خبز يدوي، ترقيم، نقل تحديد) + زر حذف بالشريط السريع؛ نقل التدوير/القلب لصف تحويلات في لوح خصائص الخلية؛ أيقونات تعبئة الصف/العمود `TableInsertRow/Column` مولّدة على شبكة 16.
3. **الدفعة الأمنية (1.73 + d8b696a9/b58d1f02):** حذف سقوط مفتاح anon المخبوز من PhoneCameraPage — القيم تُخبز في deploy-pages.yml من `secrets.SUPABASE_URL/ANON_KEY` وبوابة «إعداد ناقص»؛ **govulncheck v1.1.4** في مهمة Backend + **npm audit --audit-level=high** في Frontend/Admin (فشل صارم) — البوابة أمسكت GO-2026-6809/6617 فور أول تشغيل فرفعت **Go إلى 1.26.10** في ci.yml وrelease.yml؛ MCP الرسمي `@supabase/mcp-server-supabase`.
4. **الدفعة الثانية (1.74 + 2d0f6a61):** هجرة `20261101120000` تمدد الاشتراك من نهايته السارية (`GREATEST(COALESCE(...))`)؛ `upscaler.py` يحرر الحجز المعلق عبر `cancel_ai_quota_reservation` عند فشل التسجيل؛ كاش خطة Go لا يخزن فشلاً عابراً؛ `generateUUID` يفشل الطلب عند تعذر crypto/rand؛ letterSpacing صراحةً لكل عنصر نص؛ fallback مسجّل للقص المستدير؛ إعادة قياس النص عبر الواجهة العامة؛ `canvasZoom: 1` في reset.
5. **النشر والمصالحة (d0e667c7/8a0547c9 — Management API بموافقة المالك وتوكنه):** هجرتا 20261029220000 (cancel RPC — كانت غير منشورة منذ 29 أكتوبر!) و20261101120000 طُبّقتا في الإنتاج داخل معاملات مسجّلة، والتحقق: `pg_get_functiondef` يحقق `GREATEST(COALESCE(...))` + مصفوفة ساري/منتهي/NULL كلها true؛ **مصالحة التاريخ:** 9 ملفات ظلية مسترجعة من `schema_migrations` (لوحة SQL) → **التطابق 41=41 في الاتجاهين** وmanifest بكل البصمات.

## قرارات محمية وأوضاع خاصة (لا تنقضها بلا موافقة المالك)

- حدود الحصة 5/15/50 متكررة عمداً في 3 مواضع متزامنة؛ B-7 (لا استدلال cutShape من بنية العمل)؛ تعديل القرار 4 (PNG في الطباعة) موثّق بقرار المالك.
- ملفات `frontend/wailsjs/` **جسور يدوية مُتتبَّعة** تعيد التصدير من `frontend/bindings/` المولّدة — **لا `wails generate module` (v2) ولا تعديل يدوي**؛ التوليد: `wails3 generate bindings -ts -clean=true` + تسجيل Mock في جسر E2E.
- **سحب `anon EXECUTE` من دوال admin** قرار معلّق بيد المالك (نقاش 2026-11-01: المالك يرى مفتاح anon عام بلا خطر؛ البديل المتفق عليه عند البقاء: نار Canary في CI تستدعي دوال الأدمن بدور anon وتفشل عند النجاح).
- **`GRIDO_AI_SECRET_KEY`** يبقى في أسرار المستودع **بقرار المالك** (مقبول المخاطرة، موثق في SECURITY_NOTICE 2026-11-01) — يُمنع استهلاكه في البناء (قاعدة C-02).
- ملفات `netlify/functions/` ومراجع netlify التاريخية بقايا عصر ما قبل Pages — مسارات `/api/version` و`/api/download` تُخبز **ساكنة** في `deploy-pages.yml`؛ لا تُعدّل منطق الخبز دون فهم الم Consumers في سطح المكتب.
- القيم العامة (URL/anon) تُخبز وقت البناء من أسرار المستودع — لا مفتاح مخبوز في أي كود مصدري إطلاقاً (بوابة 2026-11-01).

## المهام المتبقية (نفّذها بالترتيب — الدفعتان 4 و5 ثم 6)

### الدفعة 4 — عمق E2E (الأضعف في التقييم: 6/10)
1. قتل نمط التخطي الفارغ `if (await x.isVisible()) { click }` في 14 مواصفة (مثال: `e2e/collage-mode.spec.ts:21,28,36`) — استبدله بـ `await expect(x).toBeVisible()` + نقرات إلزامية تفشل صريحاً.
2. رفع ~10 مواصفات smoke بحالة واحدة وتوقع واحد (مثال `bg-removal.spec.ts:25` يفحص ظهور الزر فقط ولا يجرب العزل) إلى سلوك فعلي.
3. تصحيح أي تعليق أعداد قديم في ci.yml (نمط: «41 tests» صُحح إلى 75 — راجع البقية).

### الدفعة 5 — الدين الهيكلي
1. تفكيك `freeform-collage-modal.tsx` (1191 سطراً) و`sticker-studio-dialog.tsx` (929) و`sticker-properties.tsx` (718) إلى شرائح/hooks بنمط المشروع.
2. غلاف موحد لإجراءات المصادقة الستة المتشابهة في `license-slice.ts:242-356`.
3. `isDirty` بمقارنة اللقطة مع آخر حفظ بدل `true` الأعمى في undo/redo (`history-slice.ts:241,255`).
4. توحيد 3 ازدواجيات محتوى في `.agents` (workflows/security-audit ≈ مهارة qa-security-auditor §2، workflows/canvas-export-qa ≈ مهارتها، workflows/release-deployment ≈ مهارتها) بالإحالة لا النسخ + بند قاعدة `anon EXECUTE` عند حسم القرار.

### الدفعة 6 — الحماية المستقبلية (توصيات نقاش 2026-11-01 الصباحي — لم تُنفذ بعد)
1. **fast-check** قوانين الخصائص في ملفات الاختبارات القائمة (لا ملفات جديدة حفاظاً على عدّاد docs-metrics): عكس getSlotRect round-trip · كل مخرجات buildPhysicalGridCellsMM ≥ 1مم وداخل الورقة · نافذة computeSlotCrop داخل الصورة دائماً · بعد أي إزاحة لا تداخل وفجوات محفوظة.
2. **«احسب مرة واحدة، مرّر البيانات»**: إرسال القصّة النهائية (CropX/Y/W/H) محسوبة من الواجهة في PrintItem دائماً — Go يستخدمها مباشرة (الحقول موجودة والمنطق يفضّلها) فتُلغى فئة إعادة الاشتقاق المزدوج.
3. **fixtures تطابق TS/Go**: بصمات ذهبية مشتركة تُشغّل في Vitest واختبارات Go — مع إصلاح اختبار «bit-identical» ذاتي المرجع في print-layout-math.test.ts:163 (يقارن صيغة بنسخة منها).

### أعمال مكتملة الحالة تنتظر قرار/إجراء المالك
- **إصدار v1.28.1** عبر `node scripts/release.mjs patch` (كل إصلاحات اليوم على main بعد v1.28.0؛ آخر CI أخضر) — ثم مراقبة release.yml وتوقيع SignPath.
- **إبطال توكن الإدارة** الذي شاركه المالك في المحادثة (2026-11-01) إن لم يُبطل بعد.
- سحب `anon EXECUTE` أو نار Canary (أعلاه).
- مراجعة PRs Dependabot المفتوحة.
- 9 هجرات إنتاج بلا تاريخ محلي كانت فجوة — **أُغلقت** بالملفات الظلية (لا تعيد فتحها).

## أوامر التحقق (المسموح محلياً حصراً + البوابات)

```bash
npm --prefix frontend run typecheck        # سريع مسموح
npm --prefix frontend run lint             # سريع مسموح
node scripts/docs-gate.mjs --strict-refs   # إلزامي قبل أي كومت
node scripts/migration-lint.mjs            # بعد أي هجرة (--update-manifest)
# الاختبارات المستهدفة الخفيفة متاحة بقياس (نمط الجلسات 1.67/1.74):
npm --prefix frontend run test -- test/<ملفات مستهدفة>
go test ./internal/service/ -run '<Targeted>' -count=1
# الكامل (Vitest/E2E/Build) سحابي حصراً: git push ثم gh run watch
```

**الحالة المرجعية للنشر (2026-11-01):** الإنتاج `mvovehnyvoiawvwaurav` (Postgres 17.6) — schema_migrations = 41 إدخالاً مطابقة 1:1 للمستودع؛ آخر CI أخضر كامل 12/12؛ الشجرة نظيفة بلا معلق.
