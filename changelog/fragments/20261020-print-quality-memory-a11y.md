---
type: perf
scope: print + frontend + a11y
related_files:
  - internal/service/print_service.go
  - main.go
  - frontend/src/lib/canvas/display-image.ts
  - frontend/src/lib/canvas/konva-export-utils.ts
  - frontend/src/lib/export/export-canvas.ts
  - frontend/src/components/editor/print/print-payload-builder.ts
  - frontend/src/hooks/use-filter-cache.ts
  - frontend/src/components/editor/toolbar/toolbar-file-ops.tsx
  - frontend/src/components/editor/panels/freeform/freeform-elements-tab.tsx
  - frontend/src/components/editor/properties/layers-list.tsx
  - frontend/src/components/ui/blocks/fluent-filter-chips.tsx
  - frontend/src/components/ui/switch.tsx
---

دقة الطباعة والتصدير صارت تستخدم الصورة الأصلية بدل تكبير نسخة العرض 2048px: `captureStageBlob` بوضع `useFullResolution` يستبدل عقد Konva مؤقتاً ثم يعيدها، عبر `WeakMap` (نسخة العرض ← الأصل). هذا يرفع جودة A4/A3 الفعلية إلى ما فوق 300DPI في المسار الاحتياطي.

في Go: طلبات الطباعة صارت متسلسلة (`printJobSem`)، والصور تُعالَج في دفعات بميزانية 512 MiB (`printBatchSize`) بدل إبقاء كل الصور المعالَجة حيّة حتى نهاية الرسم، مع `debug.SetMemoryLimit(3 GiB)` في `main.go`.

في الواجهة: كاش نسخ العرض صار بسقف 128 MiB، وكاش الفلاتر بسقف 24 ميغابكسل للعقدة مع منع إعادة الخبز عند تكبير أقل من 5%، والحوارات الثقيلة (`projects`, `batch-insert`, `phone-bridge`) وقوالب SVG للملصقات (~149KB) تُحمَّل عند الطلب فقط.

الوصولية: `FluentFilterChips` صار `role=group` + `aria-pressed`، وقائمة الطبقات `list/listitem` مع زر تحديد داخلي بدل `option` يحتوي أزراراً، وكتالوج الملصقات `role=group`، ومفتاح التبديل غير المحدد صار مرئياً، وأُضيفت أسماء وصول لأربعة combobox في حوار الطباعة وثلاثة منتقيات أخرى.

القياس: الحزمة الرئيسية **1,568.71 kB (444.96 kB gzip)** مقابل 1,851.16 kB (504.53 gzip) — ‑282.45 kB خام / ‑59.57 gzip. البوابات: `tsc` و`eslint` وVitest (138 ملفاً / 1216 ناجحة + 1 متخطاة) و`go build` + `go test ./internal/service` خضراء.

**متبقٍ بتصميم منفصل:** نقل كشف OpenCV خارج الخيط الرئيسي، توليد مصغّرات Go، تحرير WASM بعد المسح، وتحويل `stage.toCanvas` المتزامن إلى مسار غير حاجب.
