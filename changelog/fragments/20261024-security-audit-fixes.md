---
type: fix
scope: canvas
related_files:
  - frontend/package-lock.json:1
  - frontend/src/features/stickers/lib/barcode-svg.ts:164
  - frontend/src/features/stickers/components/sticker-studio-dialog.tsx:253
  - frontend/src/hooks/use-bg-removal.ts:147
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx:177
  - frontend/src/lib/io/project-serializer.ts:172
  - internal/server/asset_server.go:587
  - internal/server/asset_server_test.go:254
---
إغلاق ثغرات التدقيق الأمني للواجهة والباك إند: ترقية zod إلى 4.6.7 لسد ثغرة استنزاف الذاكرة، وتهريب نصوص XML في قوالب QR SVG عبر escapeXml، واستئصال مسارات الالتفاف على تعقيم SVG وإلزام تعقيمها عند استيراد المشاريع، ومنع سرد محتويات مجلد الوسائط (Directory Listing) وحظر المسارات الفارغة والمجلدات في نقطة /local-image/.
