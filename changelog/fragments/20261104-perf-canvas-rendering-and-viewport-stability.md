---
type: perf
scope: canvas
related_files:
  - frontend/src/components/editor/canvas/use-stable-viewport-size.ts:25
  - frontend/src/components/editor/canvas/editor-canvas.tsx:346
  - frontend/src/components/editor/canvas/canvas-quick-bar.tsx:249
  - frontend/src/components/editor/canvas/canvas-bleed-guides.tsx:142
  - frontend/src/components/editor/konva/layers/konva-background-layer.tsx:83
  - frontend/src/App.tsx:270
  - frontend/test/use-stable-viewport-size.test.tsx:79
---
القضاء الجذري على ثقل الواجهة ومحاكاة سلاسة برامج التصميم الاحترافية (Affinity): إلغاء حلقة طلب الإطارات (RAF) المستمرة لـ 320ms أثناء انزلاق الألواح وتأجيل تحديث مقاس مسرح Konva حتى استقرار الحركة مع مهلة أمان 220ms لمنع إعادة تخصيص مخازن الـ GPU Buffers لـ 8 طبقات في كل إطار، وعزل اشتراك التحديد عن رندر الكانفاس الأب (`EditorCanvas`) وحذف المحدِّدات غير المستهلكة، وتثبيت ظل الورقة في كانفاس Konva عند 12px مانعاً انفجار حسابات الـ Gaussian Convolution عند التكبير والتصغير، وتحويل خلفية النافذة وشريط العنوان إلى أسطح صلبة 100% لإتاحة تقنية العرض المباشر (Direct Scanout) في WebView2 وإلغاء طبقات الضبابية المتراكبة (`backdrop-blur`).

