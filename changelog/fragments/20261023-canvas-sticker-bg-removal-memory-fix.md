---
type: fix
scope: canvas
related_files:
  - frontend/src/hooks/use-bg-removal.ts:88
  - frontend/src/lib/ui/operation-status.ts:74
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:161
  - frontend/src/components/editor/properties/panels/image-properties.tsx:599
  - frontend/src/components/editor/document-scanner/core/detector-worker-client.ts:92
  - frontend/src/components/editor/document-scanner/core/document-detector.ts:701
  - frontend/src/components/editor/document-scanner/core/opencv-detector.ts:271
  - frontend/test/sticker-studio.test.tsx:195
---
إصلاح تضخم ذاكرة WebView2 (4 GB) وانهيار المكدس عند عزل خلفية الملصق على الكانفاس: عزل خلفية الملصقات متجهياً وبشكل لحظي (`isTransparent: true`) بدلاً من تمريرها لنموذج عزل بورتريه البشر، ومنع التكرار اللانهائي `Maximum call stack size exceeded` في `cancelActiveOperation`، واستبدال Base64 بـ `Blob` عند إدراج الملصق من التبويب، وقتل عامل OpenCV فور تجاوز المهلة مع تحرير مصفوفات `approxTight` داخل كل كنتور.
