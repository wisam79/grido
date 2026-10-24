/**
 * سطح المعايرة الموحّد لمقياس تداخل المضلعات وعتباته في NMS والدمج.
 *
 * ## لماذا هذا الملف
 * كل الأرقام أدناه تُفسّر ناتج دالة واحدة: `computeQuadOverlapStats`
 * (`iou` · `overlapRatio1/2` · `maxOverlapRatio`). كانت موزّعة على ثلاثة ملفات
 * (NMS في `multi-doc-segmenter`، والدمج العصبي في `detect-fusion`، وفحص الثنوية
 * في `document-detector`)، بعضها كثوابت وبعضها كأرقام سحرية داخل الشروط. أي
 * تغيير في دلالة المقياس — كهذا الذي استبدل تقدير المستطيل المحيط (AABB) بتقاطع
 * هندسي حقيقي — كان يغيّر معنى كل عتبة **بصمت** دون أن يظهر ذلك في مكان واحد.
 * الآن هي هنا، مُعلَنة ومُوثّقة ومربوطة باختبار تثبيت واحد:
 * `__tests__/overlap-tuning.test.ts`.
 *
 * ## إطار المعايرة (لا يُخلَط بالتنفيذ)
 * القيم مُعايَرة على المستندات **المحاذية للمحاور**، وهو الإطار الوحيد الذي
 * كان فيه تقدير AABB مطابقاً للتقاطع الحقيقي بالضبط. لذلك لم تتغيّر قيمة واحدة
 * عند اعتماد القاطع الهندسي (Sutherland–Hodgman)؛ الأثر الوحيد أن المستندات
 * المائلة لم تعد تُخمَد بفعل تضخّم AABB. أي أن هذا الملف يوثّق **العتبات**
 * ودلالتها، ولا يعيد تعريف `computeQuadOverlapStats` نفسه.
 *
 * ## قبل تغيير أي رقم هنا
 * 1. تأكّد أن التغيير مقصود وليس ارتداداً غير مقصود من تغيير في المقياس.
 * 2. شغّل `overlap-tuning.test.ts` (يثبّت الأرقام والعلاقات بینها وبين سلوك NMS).
 * 3. شغّل اختبارات الماسح كاملة — هذه الأرقام تُغذّي قرار كل محرّك كشف.
 */

export const OVERLAP_TUNING = Object.freeze({
  // ───────────────────────── NMS (multi-doc-segmenter.applyNMS) ─────────────────────────
  /** (أ) نسبة تغطية المرشح الحالي (overlapRatio1) التي تعني «تفصيل داخلي» ⇒ إخماد */
  nmsDetailOverlapMax: 0.38,
  /** (ب) نسبة تغطية المرشح المعتمد (overlapRatio2) لاعتبار الحالي كتلة حاوية تلتفّ حوله */
  nmsContainerOverlap: 0.6,
  /** (ب) أدنى نسبة مساحة (candArea / selArea) مع الشرط أعلاه ⇒ إخماد */
  nmsContainerAreaRatio: 1.3,
  /** (ج) أقصى تداخل متبادل (maxOverlapRatio) مسموح به ⇒ إخماد */
  nmsMutualOverlapMax: 0.45,
  /** (ج) عتبة IoU الافتراضية في `applyNMS` */
  nmsIouThreshold: 0.3,

  // ── أقسام الدمج (fusionConfirmIou…) والثنوية (disjointPair…) أُزيلت مع
  // ── detect-fusion وdocument-detector في المرحلة 3 من ترحيل الماسح —
  // ── التاريخ في git والخطة docs/plans/neural-scanner-warp-migration-spec.md.
});

/** نوع للقراءة فقط لسطح المعايرة — القيم أعلاه هي المصدر الوحيد للحقيقة. */
export type OverlapTuning = typeof OVERLAP_TUNING;

/**
 * إعادة تصدير المقياس الذي تُفسّره هذه العتبات، ليكون «المقياس + عتباته» سطحاً
 * واحداً يُستورَد من مكان واحد.
 */
export { computeQuadOverlapStats } from './quad-geometry';
export type { QuadOverlapStats } from './types';
