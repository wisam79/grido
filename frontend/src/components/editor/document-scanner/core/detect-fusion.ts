import {
  DetectionMode,
  DetectionResult,
  DetectedDocument,
} from "./types";
import { computeQuadOverlapStats, getDocumentAspectLabel } from "./quad-geometry";

/**
 * دمج النموذج العصبي (DocCornerNet) مع المسار الكلاسيكي (OpenCV / JS) —
 * ML يعمل هنا كمُدقّق (verifier) لا كمسار منفصل متسلسل:
 *
 * 1. تأكيد (confirm): IoU ≥ ML_CONFIRM_IOU ⇒ ثقة المرشح المطابق تُرفع،
 *    والهندسة تبقى الكلاسيكية المصقولة subpixel.
 * 2. استرداد (rescue): IoU < ML_MISS_IOU و ثقة ML ≥ ML_ADD_MIN_SCORE
 *    ومضلع ML ليس محصوراً داخل مرشح موجود ⇒ يُضاف كمستند جديد
 *    (رأيته ML ولم يره المسار الكلاسيكي).
 * 3. استبدال (replace): الكلاسيكي افتراضي (default inset) و ML واثق
 *    ⇒ ML يحل محله بالكامل.
 *
 * دالة نقية بالكامل (لا canvas ولا async) لقابلية الاختبار المباشرة.
 */

/** IoU ≥ هذا ⇒ النموذج العصبي يؤكد مرشح الكشف الكلاسيكي */
export const ML_CONFIRM_IOU = 0.55;
/** IoU < هذا ⇒ حالتان: استرداد (عند ثقة ML عالية) أو لا تغيير (تشويش) */
export const ML_MISS_IOU = 0.35;
/** أدنى ثقة ML لاسترداد مستند تخطّاه المسار الكلاسيكي */
export const ML_ADD_MIN_SCORE = 0.6;
/** أدنى ثقة ML للاعتماد عليه منفرداً فوق الافتراضي (مطابقة لعتبة المسار القديمة) */
export const ML_STANDALONE_MIN = 0.55;
/** تداخل ML داخل مرشح أكبر ≥ هذه النسبة ⇒ نفس المستند بحدود أضيق (لا يُضاف) */
export const ML_CONTAINMENT_BLOCK = 0.75;
/** أقصى انتظار لـ ML بعد انتهاء المسار الكلاسيكي (ms) */
export const ML_GRACE_MS = 1500;

export function fuseDetections(
  ml: DetectionResult | null,
  classical: DetectionResult,
  mode: DetectionMode
): DetectionResult {
  const mlDocs = ml?.documents ?? [];
  const mlQuad = ml?.corners;
  const mlScore =
    ml && typeof ml.confidence === "number" && Number.isFinite(ml.confidence)
      ? Math.min(1, Math.max(0, ml.confidence))
      : 0;

  if (!ml || !mlQuad || mlQuad.length !== 4 || mlDocs.length === 0) {
    return classical;
  }

  const classicalDocs = classical.documents ?? [];
  if (classicalDocs.length === 0) {
    return mlScore >= ML_STANDALONE_MIN
      ? { corners: mlQuad, confidence: mlScore, method: ml.method, documents: mlDocs }
      : classical;
  }

  // (3) استبدال: الكلاسيكي افتراضي (default inset) و ML واثق وأفضل منه
  const classicalBest = classicalDocs.reduce((best, d) => Math.max(best, d.confidence), 0);
  if (
    classical.method === "default" &&
    mlScore >= ML_STANDALONE_MIN &&
    mlScore > classicalBest
  ) {
    return {
      corners: mlQuad,
      confidence: mlScore,
      method: ml.method,
      documents: mlDocs,
    };
  }

  // أفضل تطابق (IoU) بين ML وكل مرشح كلاسيكي
  let bestIdx = -1;
  let bestIou = 0;
  for (let i = 0; i < classicalDocs.length; i++) {
    const { iou } = computeQuadOverlapStats(classicalDocs[i].corners, mlQuad);
    if (iou > bestIou) {
      bestIou = iou;
      bestIdx = i;
    }
  }

  let changed = false;
  let pushedFromMl: DetectedDocument | null = null;
  let docs: DetectedDocument[] = classicalDocs.map((d) => ({ ...d }));

  if (bestIou >= ML_CONFIRM_IOU && bestIdx >= 0) {
    // (1) تأكيد — رفع الثقة دون المساس بالهندسة الكلاسيكية المصقولة
    const target = docs[bestIdx];
    const blended = target.confidence * 0.4 + mlScore * 0.6;
    if (blended > target.confidence) {
      target.confidence = Math.min(0.99, blended);
      changed = true;
    }
  } else if (bestIou < ML_MISS_IOU && mlScore >= ML_ADD_MIN_SCORE) {
    // (2) استرداد — منع الإضافة إذا كان ML quad محصوراً داخل مرشح موجود
    const contained = classicalDocs.some(
      (d) => computeQuadOverlapStats(mlQuad, d.corners).overlapRatio1 >= ML_CONTAINMENT_BLOCK
    );
    if (!contained) {
      pushedFromMl = { ...mlDocs[0], corners: mlQuad, confidence: mlScore };
      docs.push(pushedFromMl);
      changed = true;
    }
  }

  if (!changed) {
    return classical;
  }

  docs.sort((a, b) => b.confidence - a.confidence);
  if (mode === "single" && docs.length > 1) {
    docs = docs.slice(0, 1);
  }

  // إعادة الترقيم والتسمية الموحدة بعد أي تغيير بنية (مراجع داخلية مُستنسَخة أعلاه)
  docs.forEach((d, i) => {
    d.id = `doc-${i + 1}`;
    d.label = getDocumentAspectLabel(d.aspectType, i + 1);
  });

  return {
    corners: docs[0].corners,
    confidence: docs[0].confidence,
    method: pushedFromMl !== null && docs[0] === pushedFromMl ? ml.method : classical.method,
    documents: docs,
  };
}
