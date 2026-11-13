---
type: fix
scope: ui
related_files:
  - frontend/src/lib/export/export-bleed.ts:130
  - frontend/src/components/editor/canvas/text-editing-overlay.tsx:381
  - frontend/src/components/editor/dialogs/projects-dialog.tsx:210
  - frontend/src/hooks/use-face-frame.ts:327
  - admin-web/src/pages/PhoneCameraPage.tsx:242
---
إصلاح كافة العيوب الحرجة (P0) الناتجة عن التدقيق الشامل: تصحيح هندسة مرايا نزيف التصدير للخارج، وتزامن محرر النص مع Konva، وحظر العمليات على العناصر المقفلة، وتحصين استيراد وتفكيك عناصر الحافظة، وفصل مؤشرات الحفظ والجلب في المشاريع مع أمان الجلسات، وحل سباقات كشف الماسح وتأطير الوجه واصطدام اختصار Ctrl+Alt+0، وتصحيح مصافحة الهاتف وجلسات الإدارة وبوابات التصدير والحفظ في الكولاج والوضع الحر.
