---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/io/project-hydrator.ts:129
  - frontend/src/lib/store/slices/collage-slice.ts:295
  - frontend/test/project-serializer.test.ts:359
  - frontend/test/collage-slice.test.ts:174
---

يحفظ فتح المشروع هندسة الكولاج اليدوية بعد تحويل القالب الفيزيائي، ويمنع تغيير المقاس من الالتزام بخانات متداخلة عندما تكون الفجوة الأصلية سالبة على محور الإزاحة.
