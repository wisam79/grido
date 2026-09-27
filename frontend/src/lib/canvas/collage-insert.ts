import type { CanvasSlot } from '@/lib/store/types';

export interface CollageInsertAssignment {
  slotId: string;
  src: string;
}

/**
 * يبني توزيع الصور المُدرَجة على خانات الكولاج.
 *
 * منطق واحد مشترك بين مسارين كانا سيفترقان:
 * - إسقاط ملفات الصور على الكانفس (`use-image-drop`).
 * - نقل التصميم من الوضع الحر إلى الكولاج (زر التكرار في الكولاج)، حيث
 *   تُعامَل لقطة الكانفس كصورة عادية تُدرَج في الخانات.
 *
 * الترتيب المتبع:
 * 1. صورة أُسقطت فوق خانة محددة → تلك الخانة أولاً، ثم الخانات الفارغة بالباقي.
 * 2. قالب طباعة فيزيائي (ورقة صور هوية) بصورة واحدة دون استهداف → كل الخانات.
 * 3. غير ذلك → الخانات الفارغة، وإن لم توجد خانة فارغة فالصورة في أول خانة.
 */
export function buildCollageInsertAssignments(
  slots: CanvasSlot[],
  srcs: string[],
  targetSlotId: string | null,
  hasPhysicalLayout: boolean,
): CollageInsertAssignment[] {
  const assignments: CollageInsertAssignment[] = [];
  const firstSrc = srcs[0];

  if (targetSlotId && firstSrc) {
    assignments.push({ slotId: targetSlotId, src: firstSrc });
    let srcIdx = 1;
    for (const slot of slots) {
      if (slot.id !== targetSlotId && !slot.imageSrc && srcIdx < srcs.length) {
        assignments.push({ slotId: slot.id, src: srcs[srcIdx++] });
      }
    }
    return assignments;
  }

  // قوالب طباعة صور الهوية (مثل 8 صور في ورقة واحدة): الصورة الواحدة تُعبّئ الشيت
  if (hasPhysicalLayout && srcs.length === 1 && firstSrc) {
    for (const slot of slots) {
      assignments.push({ slotId: slot.id, src: firstSrc });
    }
    return assignments;
  }

  let srcIdx = 0;
  for (const slot of slots) {
    if (!slot.imageSrc && srcIdx < srcs.length) {
      assignments.push({ slotId: slot.id, src: srcs[srcIdx++] });
    }
  }
  if (srcIdx === 0 && slots[0] && firstSrc) {
    assignments.push({ slotId: slots[0].id, src: firstSrc });
  }

  return assignments;
}
