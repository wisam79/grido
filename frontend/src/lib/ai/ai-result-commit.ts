import { useEditorStore } from '@/lib/editor-store';

/**
 * حارس الطزاثة الموحّد لنتائج عمليات الذكاء الاصطناعي (عزل الخلفية، الترميم...).
 *
 * المشكلة التي يحلها: عمليات الذكاء الاصطناعي تستغرق ثوانيَ أو دقائق، وقد
 * يستبدل المستخدم الصورة أو يحذف الهدف أو يتراجع أثناءها. لذلك يجب التحقق من
 * «طزاجة» الهدف قبل الكتابة، وإلا كُتبت لقطة قديمة فوق الحالة الحيّة.
 *
 * وكان كل خطاف ينفّذ هذا الحارس بنفسه باحثاً في `elements` وحده، فكانت نتائج
 * وضع الكولاج (الخانة محفوظة في `slots`) تُسقَط دائماً بصمت رغم نجاح المعالجة.
 * هذا المساعد يوحّد البحث في المجموعتين والتطبيق في مكان واحد.
 */

/** الحقول المشتركة بين العنصر الحر وخانة الكولاج اللازمة لتطبيق نتيجة AI. */
export interface AiImageTarget {
  id: string;
  imageSrc?: string;
}

interface LiveAiTarget {
  id: string;
  imageSrc?: string;
  originalImageSrc?: string;
}

/** نتيجة محاولة تطبيق نتيجة AI على الهدف. */
export type AiImageCommitStatus =
  /** طُبِّقت النتيجة ودُفعت خطوة تراجع واحدة. */
  | 'ok'
  /** لم يعد الهدف موجوداً (حُذف أثناء المعالجة). */
  | 'not-found'
  /** تغيّرت صورة الهدف أثناء المعالجة (استبدال/تراجع). */
  | 'changed';

/**
 * يقرأ الهدف الحيّ من الستور باحثاً في العناصر الحرة (`elements`) وخانات
 * الكولاج (`slots`) معاً — الأولوية للعناصر عند تطابق المعرّف (المعرّفات فريدة).
 */
export function findLiveAiTarget(id: string): LiveAiTarget | undefined {
  const state = useEditorStore.getState();
  return (
    (state.elements.find((el) => el.id === id) as LiveAiTarget | undefined) ??
    (state.slots.find((slot) => slot.id === id) as LiveAiTarget | undefined)
  );
}

/**
 * يتحقق من طزاجة الهدف ثم يطبّق صورة الناتج في خطوة واحدة:
 * - `imageSrc` = الصورة الجديدة.
 * - `originalImageSrc` = الصورة قبل أول تعديل فقط (حتى لا تُفقد الصورة الأصلية).
 * - دفع خطوة تراجع واحدة بعد التطبيق.
 *
 * @param target اللقطة الملتقطة عند إطلاق العملية (المعرّف + الصورة آنذاك).
 * @param newImageSrc مسار الصورة الناتجة.
 * @param onUpdate مُطبّق الرقعة (يميّز العنصر عن الخانة عند المستدعي).
 * @returns حالة التطبيق ليتولّى كل خطاف رسالة المستخدم المناسبة.
 */
export function commitAiImageResult(
  target: AiImageTarget,
  newImageSrc: string,
  onUpdate: (id: string, patch: { imageSrc: string; originalImageSrc?: string }) => void,
): AiImageCommitStatus {
  const live = findLiveAiTarget(target.id);
  if (!live) return 'not-found';
  if (live.imageSrc !== target.imageSrc) return 'changed';

  const patch: { imageSrc: string; originalImageSrc?: string } = { imageSrc: newImageSrc };
  // 🔒 تعيين originalImageSrc في المرّة الأولى فقط لمنع فقدان الصورة الأصلية
  if (!live.originalImageSrc) patch.originalImageSrc = live.imageSrc;

  onUpdate(target.id, patch);
  useEditorStore.getState().pushHistory();
  return 'ok';
}
