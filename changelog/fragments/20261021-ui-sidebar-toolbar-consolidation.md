---
type: refactor
scope: ui
related_files:
  - frontend/src/lib/workspace-tools.ts:43
  - frontend/src/lib/workspace-tools.ts:228
  - frontend/src/components/editor/workspace/workspace-panel-rail.tsx:486
  - frontend/src/components/editor/panels/freeform/freeform-studio-panel.tsx:20
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:497
  - frontend/src/components/editor/dialogs/sticker-studio-host.tsx:1
  - frontend/src/components/editor/workspace/app-dialogs-host.tsx:84
  - frontend/src/components/editor/toolbar/toolbar.tsx:1
  - frontend/src/lib/templates/constants.ts:29
  - frontend/test/workspace-tools.test.ts:1
  - frontend/test/App.test.tsx:258
  - frontend/e2e/helpers/studio-elements.ts:11
  - frontend/e2e/panel-geometry.spec.ts:85
---

حُذفت وجهة «مقاسات الورق» من الشريط الجانبي (المقاسات في لوحة الخصائص) وضُمّ المقاسان الفريدان اللذان كانا فيها إلى كتالوج الورق، ونُقلت أدوات الإضافة إلى شريط الأيقونات كأربعة أزرار مستقلة: الطبقات أولاً بأيقونة `Layer` الشبحية نفسها المستخدمة داخل اللوح، ثم الملصقات والأشكال والنصوص. كل زر وجهة كاملة بلوحها المباشر، فحُذف سطح «العناصر» الموحّد وشريط التبويبات الداخلي، وصار عنوان اللوح يتبع الأداة. أُزيلت أسماء الأشكال من الكتالوج وأبقيت الرموز وحدها على ثلاثة أعمدة برموز أكبر مع `title` و`aria-label`. وُضبطت معاينات الأنماط النصية بحيث تلتف نصوصها بدل اقتطاعها أفقياً، وحُدّث اختبار `App` ليتحقق من لوح «الملصقات» الافتراضي. صار استوديو الملصقات حواراً دائماً يملكه `StickerStudioHost`، حُذفت مجموعة الإضافة من شريط الأدوات مع ملفاتها الثلاثة وتبويب القوالب، وأُتيح الإدراج في المسار السريع كاملاً مع جعل «الطبقات» الافتراضي. الاختبارات وE2E حُدّثت لمسار الإدراج الجديد.
