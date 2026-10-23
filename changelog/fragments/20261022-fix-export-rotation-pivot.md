---
type: fix
scope: canvas
related_files:
  - frontend/src/lib/export/export-canvas-fitted.ts:66
  - frontend/e2e/export-transform.spec.ts:1
---

صُحّح محور دوران العناصر في مسار التصدير اليدوي (`renderFittedBranch`): كان يدوّر حول مركز الصندوق بينما عقد Konva (text/image/shape) تدوّر حول **أصل العنصر (x,y)**، فينزاح كل عنصر مدوّر بمئات البكسلات بين المعاينة والتصدير البديل (النص المدوّر كان يخرج كلياً خارج موضعه). صار التحويل مطابقاً حرفياً لبنية العقدة: `translate(x,y) → rotate → flip حول مركز الصندوق`، مع الحفاظ على سلوك القلب كما هو.
أُضيف حرس E2E يقارن موضع الحبر (Centroid + Bounding Box) بين لقطة Konva Stage والمسار اليدوي لنص مدوّر 90° وصورة مدوّرة 35°؛ النتيجتان متطابقتان بكسل-بكسل بعد الإصلاح، وكان فرق الصورة 196px قبل الإصلاح.
