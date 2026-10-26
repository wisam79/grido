---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/templates/grid-utils.ts:31
  - frontend/src/lib/templates/grid-utils.ts:366
  - frontend/src/lib/store/slices/collage-slice.ts:438
  - frontend/src/lib/store/slices/collage-slice.ts:941
  - frontend/src/lib/store/slices/collage-slice.ts:983
  - frontend/src/lib/io/project-hydrator.ts:253
  - frontend/src/lib/canvas/collage-grid.ts:8
  - frontend/src/components/editor/panels/collage/collage-custom-grid-tab.tsx:200
  - frontend/src/components/editor/properties/slot-properties.tsx:66
  - frontend/src/components/editor/properties/slot-properties.tsx:801
  - frontend/test/grid-utils.test.ts:66
  - frontend/test/collage-slice.test.ts:302
  - frontend/test/collage-custom-grid-tab.test.tsx:196
  - frontend/test/project-serializer.test.ts:398
  - frontend/test/collage-grid.test.ts:59
---

إصلاحات مراجعة الكود قبل الالتزام: قيّد هامش التخطيط الفيزيائي مثل اليدوي بأصغر خلية 1 مم عبر `getPhysicalMaxMarginMM` الجديدة (كان هامش 100 مم على ورقة 4×6 يولّد خلايا بأبعاد سالبة تُحفظ مع المشروع وتصل إلى حِزمة الطباعة)، وأعاد `computeDynamicCollageCells` قيمة null بدل خلايا سالبة عندما يبتلع الهامش الورقة فيحتفظ كل المستدعين بالخلايا السابقة، واستعاد منزلق «التشبع» وزر «إعادة تعيين الألوان» للخلايا التي حُذفا في جلسة التبسيط فصار التشبع المحفوظ غير قابل للإصلاح، وقيّد تعديل مقاس الخلية بلا قفل نسبة لكل بُعد مستقلاً بدل تصغير المحور الآخر خفيةً، وجعل زر «تطبيق الشبكة» يراعي تغيّر نوع المقاس والمحاذاة في النموذج قبل الشعور بالتطابق، وصحّح قراءة `brightness/contrast/saturation` بـ `?? 100` بدل `|| 100` في التحميل والقوالب حتى لا تُمحى القيمة الصفرية المشروعة عند إعادة فتح المشروع.
