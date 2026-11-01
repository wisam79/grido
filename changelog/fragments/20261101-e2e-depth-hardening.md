---
type: fix
scope: infra
related_files:
  - frontend/e2e/helpers/collage-presets.ts:1
  - frontend/e2e/helpers/konva-probes.ts:1
  - frontend/e2e/helpers/wails-v3-bridge.ts:211
  - frontend/e2e/collage-mode.spec.ts:10
  - frontend/e2e/grid-collage.spec.ts:12
  - frontend/e2e/workflows.spec.ts:32
  - frontend/e2e/ai-tools.spec.ts:12
  - frontend/e2e/bg-removal.spec.ts:10
  - frontend/e2e/sticker-studio.spec.ts:17
  - frontend/e2e/user-journeys.spec.ts:53
  - frontend/e2e/studio-panels.spec.ts:58
  - frontend/e2e/collage-panels.spec.ts:47
  - frontend/e2e/workspace-layout.spec.ts:81
  - frontend/e2e/account-license.spec.ts:26
  - frontend/e2e/phone-bridge.spec.ts:28
  - frontend/e2e/freeform-collage.spec.ts:26
  - frontend/e2e/command-palette-commands.spec.ts:45
  - frontend/e2e/document-scanner.spec.ts:12
  - frontend/e2e/single-photo.spec.ts:12
  - frontend/e2e/batch-insert.spec.ts:12
  - frontend/e2e/app.spec.ts:10
---
دفعة عمق E2E (المحور الأضعف في التقييم): قتل نمط التخطي الصامت `if (await x.isVisible()) { click }` في 14 مواصفة (30 موضعاً) — استبداله بتوقعات `toBeVisible()` إلزامية ونقرات تفشل صريحاً، مع الاحتفاظ بمنطق «الفتح بنقرتين» القائم على قراءة الحالة في المحددات المشروعة فقط. رفع 10 مواصفات smoke من توقع ظهور واحد إلى سلوك فعلي مدفوع: عزل الخلفية وترميم الوجه يفحصان وصول النتيجة الموكولة إلى عقدة Konva عبر مجسّات `window.__gridoStage` الجديدة (helpers/konva-probes.ts)، إدراج النص والتراجع يفحصان عدّ عقد Text فعلياً، تطبيق قوالب الكولاج عبر مساعد مشترك `applyCollagePreset` (helpers/collage-presets.ts) يبدّل المحدد الميت `[data-tab="presets"]` (صفر مطابقات في المصدر) بوجهة الشبكة وتبويب `segmented-presets` وتأكيد `aria-pressed` على البطاقة، استوديو الملصقات يفتح بالحدث الموثق ويختار قالباً فعلياً حتى مرحلة التخصيص والباركود عبر فئة «رموز وتواصل» (الحوار المستقل القديم غير موجود أصلاً)، تبويبات حوار الحساب عبر role="tab" الحقيقية بـaria-selected، زوم السحج يفحص تغيّر النسبة الرقمية، الإدراج الدفعي يملأ القائمة عبر النداء الموكول، والحفظ يقرأ المشروع من المكتبة. رفع تخطي document-scanner المسجل (فرضيته — غياب الصورة — لم تعد قائمة). إصلاح عقد موك `EnhanceImageWithAI` في جسر E2E ليعيد JSON بنفس شكل الخادم الحقيقي ({image, execution_seconds, total_cost_usd} — مرآة ai_service_test.go) بدل سلسلة خام كانت تُسقط الترميم في JSON.parse فلا تُطبَّق نتيجة قط. «تأطير الوجه» (Web Worker محلي لكشف الوجه) يستحيل اختباره بنتيجة على صورة mock بمقاس 1×1 بلا وجه — بقيت تغطيته على مستوى الظهور الحتمي في single-photo. لم يتغير عدد الحالات (75 حالة chromium — تحقق بالعدّ بعد التعديل) ولا بلوك docs-metrics (تعديل ملفات قائمة + مساعد جديد وجسر داخل e2e/helpers خارج العدّاد المحدد بمواصفات *.spec.ts).
