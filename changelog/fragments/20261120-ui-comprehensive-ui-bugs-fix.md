---
type: fix
scope: ui
related_files:
  - frontend/src/hooks/use-theme.ts:1
  - frontend/src/hooks/use-workspace-panels.ts:1
  - frontend/src/components/editor/canvas/canvas-quick-bar.tsx:1
  - frontend/src/components/editor/konva/elements/image-node.tsx:1
  - frontend/src/components/editor/properties/general/grid-columns-panel.tsx:1
  - frontend/src/components/editor/document-scanner/hooks/use-scanner-detection.ts:1
  - admin-web/src/pages/PhoneCameraPage.tsx:1
---

- إصلاح شامل وعميق لعيوب واجهة المستخدم وتجربة التفاعل عبر سطح المكتب ولوحة الإدارة (`frontend` و`admin-web`): توحيد معمارية طبقات العرض (`z-index tokens`) ومزامنة السمة لحظياً دون وميض، وتحصين اختصارات لوحة المفاتيح (`react-hotkeys-hook`) وحوارات القفل والترخيص، وإصلاح حسابات وضع التركيز (`Zen Mode`) وعرض الألواح مع تدرج تكبير الواجهة (`UI Zoom`).
- إصلاح محرك الكانفاس والأدوات العائمة: تصحيح تموضع قائمة السياق والـ Quick Bar مع تكبير الواجهة وحدود المساطر، وإصلاح ظلال الصور المقصوصة بأقنعة الأشكال (`offscreen shadow caster`)، ومحاذاة تدرجات وأنماط الأشكال المتجهة وحساب صندوق التحديد المتعدد مع التدوير، وإلغاء `textTransform` عن النصوص العربية، ومطابقة حشوة محرر النص مع حدود الشارة.
- إصلاح ألواح الخصائص، الطبقات، الماسح الضوئي، الطباعة، استوديو الملصقات، والكولاج الحر: منع تعديل العناصر المقفلة عبر كافة الألواح والستور، وإضافة مسودات إدخال رقمية غير مقيدة أثناء الكتابة (`DraftNumberField` و`MmField`)، وتصحيح نصف قطر التقاط أركان الماسح الضوئي بوحدة CSS px ومزامنة الفلاتر والتدوير لكل مستند، وفصل إدراج شيت الملصقات عن `stickerSource` المفرد، ومنع التكبير المزدوج في كاميرا الهاتف (`/cam`).
