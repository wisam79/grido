---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/print/single-print-composition.ts:137
  - frontend/src/hooks/use-konva-drag.ts:233
  - frontend/src/components/editor/konva/layers/konva-single-layer.tsx:132
  - frontend/src/lib/canvas/canvas-interaction-store.ts:19
  - frontend/src/components/editor/canvas/use-canvas-viewport.ts:55
  - frontend/src/components/editor/canvas/use-stable-viewport-size.ts:15
  - frontend/src/components/editor/canvas/use-ruler-metrics.ts:108
  - frontend/src/components/editor/canvas/use-user-guides.ts:133
  - frontend/src/components/editor/canvas/editor-canvas.tsx:303
  - frontend/src/components/editor/konva/konva-canvas.tsx:670
  - frontend/src/components/editor/canvas/canvas-viewport-deck.tsx:142
  - frontend/src/components/editor/workspace/workspace-layout.tsx:57
  - frontend/src/index.css:1061
  - frontend/src/lib/templates/constants.ts:31
  - frontend/src/components/editor/panels/freeform/freeform-panel-constants.ts:230
  - frontend/src/components/editor/panels/freeform/freeform-presets-tab.tsx:35
  - frontend/src/components/editor/properties/general/canvas-dimensions-panel.tsx:44
  - frontend/src/hooks/use-konva-drag.test.ts:293
  - frontend/test/single-print-composition.test.ts:102
  - frontend/test/canvas-viewport-bounds.test.ts:91
  - docs/features-tracker.md:13
  - docs/developer_guide.md:74
---
حرية تأطير وسحب الصور المكبرة وقَص الطباعة فائق الدقة واستقرار تحريك الكانفاس وتطهير مقاسات الورق: القضاء على رفض الطباعة عند خروج أطراف الصورة خارج الكانفاس لتأطير الوجه عبر تحويل مسار التصدير تلقائياً إلى التقاط المسرح عالي الدقة (300+ DPI) بقَص آلي نظيف على حدود الكانفاس، إزالة قفل السحب وانعكاس حدود Math.min/max في useKonvaDrag للصور المكبرة عن مقاس الكانفاس، رفع عتبة استبعاد عناصر لوح اللصق في KonvaSingleLayer، القضاء التام على ارتعاش التاتش باد باصبعين عبر التحريك الفوري للمسرح وتأجيل الالتزام، عزل خطوط المحاذاة الذكية activeGuides في مخزن التفاعل اللحظي لمنع إعادة رندر شجرة الكانفاس، منع اختفاء شريط الأدوات السفلي أسفل الكانفاس، وتثبيت مقاس المسرح أثناء حركة الألواح. كما شمل التحديث تطهير مقاسات الورق واعتماد مقاسات الطباعة الفعلية فقط (ورق صور، ورق قياسي، كروت) وإلغاء مقاسات الورق الوهمية غير الفيزيائية، وتأكيد حظر ازدواجية الميزات بحصر تخصيص الأبعاد الحرة (W × H ملم/بكسل وقفل النسبة) في لوحة إعدادات مساحة العمل بالجانب الأيمن (CanvasDimensionsPanel) كمصدر وحيد للحقيقة وإبقاء تبويب المقاسات بالجانب الأيسر لقوالب الورق الجاهزة.
