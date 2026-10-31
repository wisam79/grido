---
type: fix
scope: print
related_files:
  - frontend/src/lib/canvas/konva-export-utils.ts:139
  - frontend/src/components/editor/print/print-payload-builder.ts:217
  - frontend/src/components/editor/print/use-print-export.ts:263
  - frontend/test/canvas-rendering-core.test.ts:326
---
إصلاح جذر لبلاغ «دقة الطباعة في الوضع الحر سيئة رغم مصدر ممتاز»: ترقية دقة الملصقات كانت مسارَ التركيب السريع حصراً، وأغلب كانفسات الوضع الحر الواقعية غير مؤهلة له (نص/دوران/ظل/خلفية متدرجة/عنصر متجاوز الحدود) فتُطبع الملصقات المكبّرة من راستر إدراجها الصغير عبر مسار الالتقاط. الآن الترقية للكلا المسارين: مسار الالتقاط يستبدل صور عقد Konva مؤقتاً بالمصادر المُرقّاة (swapNodeImagesForCapture — الند التلو لعذر upgradeImagesToFullResolution) مع استعادة فورية وتخطي آمن للفاشل، وأزيلت بوابة الأهلية من executePrint فصارت إعادة الراسترة عالمية.
