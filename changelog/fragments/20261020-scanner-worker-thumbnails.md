---
type: perf
scope: canvas
related_files:
  - internal/service/media_thumbnail.go:47
  - internal/server/asset_server.go:64
  - internal/repository/media_cleanup.go:245
  - frontend/src/components/editor/document-scanner/core/warp-pipeline.ts:1
  - frontend/src/components/editor/document-scanner/core/warp-worker-client.ts:1
  - frontend/src/workers/scanner-warp.worker.ts:1
  - frontend/src/workers/document-detector.worker.ts:1
  - frontend/src/components/editor/document-scanner/core/detector-worker-client.ts:1
  - frontend/src/components/editor/document-scanner/hooks/use-scanner-processor.ts:1
  - frontend/src/lib/canvas/thumbnail-src.ts:1
---

استعدال المنظور في الماسح الضوئي صار ينفَّذ **خارج الخيط الرئيسي** في Web Worker على `OffscreenCanvas`: يقصّ المصدر على منطقة المستند فقط، ويكتب المخرج على شرائح أفقية (256px) بدل مخزن `ImageData` كامل، ثم يعيد Blob مباشرة بلا Base64. المسار المتزامن بقي كاحتياطي للبيئات بلا Worker/OffscreenCanvas، والإلغاء صار فورياً عبر إنهاء العامل.

محرك **OpenCV (WASM)** انتقل كذلك إلى عامل الكشف: الخيط الرئيسي يرسم الصورة مصغّرة (640px) ويرسل البكسلات، والعامل ينفّذ الكفاف — فلا تُحمَّل WASM (نحو 13MB) على خيط الواجهة ولا تُجمَّد الواجهة أثناء التهيئة. أُضيف مسار احتياطي على الخيط الرئيسي حين لا يتوفّر Worker، وتهيئة OpenCV صارت تُطلب مسبقاً عند فتح الماسح، ويُنهى العامل مع إغلاق النافذة لتحرير ذاكرة WASM.

**مصغّرات الصور في Go:** مسار جديد `GET /local-image/thumb/<file>?w=128|256|512` يولّد مصغرة عند الطلب داخل `Media/.thumbs` (فحص ترويسة قبل فك الترميز، سقف 120MP، `singleflight`، سيمفور بسعة 2، كتابة ذرية، تصحيح اتجاه EXIF) ويخدمها بكاش `max-age=86400`. قوائم الطبقات وحوار الإدراج الدفعي وشريط الكولاج صارت تستخدمه مع رجوع تلقائي للأصل عند الفشل — بلا أي تغيير في مخطط المشروع أو في مسار Konva والطباعة. والمصغرات اليتيمة تُنظَّف مع الوسائط غير المستخدمة.

**القياس:** البوابات خضراء — `tsc --noEmit` و`eslint` بلا أخطاء، Vitest (141 ملفاً / 1227 ناجحة + 1 متخطاة)، `go vet` + `go test ./internal/...` (303 دالة اختبار)، وثلاثة فحوص Playwright تثبت عملياً أن OpenCV يعمل داخل العامل (`cv-worker-probe`)، وأن كشف المستند عبر العامل يعيد أركاناً صحيحة (`detector-worker-probe`)، وأن الاستعدال ينتج PNG صالحاً (`warp-worker-probe`).

**متبقٍ بتصميم منفصل:** استدلال `scanic` (DocCornerNet) ما زال على الخيط الرئيسي لأنه يحتاج الدقة الكاملة ويصعّب مقياس الأركان، وتحويل `stage.toCanvas` المتزامن في التصدير إلى مسار غير حاجب.
