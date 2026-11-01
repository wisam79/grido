---
type: changed
scope: print
related_files:
  - test-fixtures/print-crop-golden.json:1
  - frontend/test/collage-image-crop.test.tsx:520
  - internal/service/print_rotation_test.go:191
---
الدفعة 6 بند 3 (الجزء الأخير) — الحاضنة الذهبية المشتركة TS/Go مكتملة، وبها **تُغلق الخطة الإصلاحية الشاملة (الدفعات 1–6) 100%**: `test-fixtures/print-crop-golden.json` يحمل 8 حالات نافذة قصّ متنوعة (cover أساسي، انعكاس نسبة مع إزاحات، ربعا الدوران 90/270 بزوم وإزاحات، صورة 1×1 الحدية، صورة عملاقة 500×5000 بزوم 2 ودوران 180، زوم 0.5 الأصغر من الواحد الذي يفيض عن حدود الصورة، مربع بإزاحات كبيرة) وُلدت من `computeSlotCrop` الواجهي بمولّد لمرة واحدة **حُذف فور الالتقاط** — الحاضنة ملتزمة ولا تُعاد توليدها أبداً وتحديثها قرار مالك (تعليق داخل الملف). الوجهتان: Vitest في collage-image-crop.test.tsx يقارن مخرجات computeSlotCrop بالقيم الذهبية، وGo في print_rotation_test.go (`TestComputeCropFromSlot_GoldenFixtures`) يقرأ نفس الـJSON ويقارن `computeCropFromSlot` — **تطابق كامل من أول تشغيل في الاتجاهين** (شاملاً فرع ربع الدوران وتفرع التعادل 1:1 وتقييد الحواف) فيثبت أن اشتقاق Go البديل يطابق الواجهة حرفياً لكل المدخلات المصنونة. الأثر: أي تعديل مستقبلي على رياضيات القصّة في أي من اللغتين بلا مزامنة الآخر يفشل فوراً. عدّادات docs-metrics بلا تغيير (إلحاق بملفات قائمة، المولد حُذف). تحقق: 14/14 و8/8 حالات Golden، tsc، ESLint، format، gofmt، go vet، docs-gate.
