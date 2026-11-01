---
type: perf
scope: print
related_files:
  - frontend/src/components/editor/print/print-payload-builder.ts:60
  - frontend/src/components/editor/print/use-print-export.ts:168
  - frontend/test/print-payload-builder.test.ts:96
---
الدفعة 6 بند 2 — «احسب مرة واحدة، مرّر البيانات»: باني حزم الكولاج يحسب نافذة القصّة النهائية لكل خانة مصورة عبر `computeSlotCrop` (بنفس معاملات preflight والتصدير اليدوي حرفياً — أبعاد المصدر عبر `resolveImageDimensions`، والناتج بإحداثيات بكسل الصورة المصدر المطابقة لما يستهلكه `computeCropFromSlot` في Go) ويرسلها في `CropX/Y/W/H` دائماً — Go يفضّل الحقول المرسلة حين `cropW/cropH > 0` فيُلغى فئة إعادة الاشتقاق المزدوجة بين TS وGo (النافذة الواحدة تُحسب مرة في الواجهة وتُستهلك في الطباعة كما رُسمت). تدهور آمن محفوظ: تعذر قراءة الأبعاد أو مهلة 2ث (🛡️ حماية من مصدر صامت يعلّق مسار الطباعة — المسار الاحتياطي بلا onload/onerror) تعيد الأصفار فيسقط الاشتقاق إلى فرع Go القديم المطبق للسلوك السابق حرفياً؛ لا تغيير في Go ولا في الربطات، ومسار الوضع الحر (CanvasComposition بـslotAspect=0 لعقد H2) لم يُمس. اختبار عقد جديد بأرقام ذهبية مشتقة يدوياً (800×600، خانة 45×48مم بروت 90، زوم 1.25، إزاحة 0.1 → cropX=144.1/cropY=0/cropW=512/cropH=480) — **مطابقة من أول تشغيل** تؤكد صحة الوحدات والدلالات. تحقق: 95/95 حزمة الطباعة (payload-builder + export-payload + physical-parity)، tsc، ESLint، format، docs-gate.
