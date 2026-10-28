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
 * 1. الاستبدال يستهدف الخانة المقصودة وحدها ثم الخانات الفارغة لبقية الدفعة.
 * 2. الإدراج دون استهداف يملأ الفارغ ولا يستبدل شبكة ممتلئة بصمت.
 * 3. التكرار قرار صريح من المستدعي (ويُستخدم لورقة الهوية الفيزيائية).
 */
export type CollageInsertScope = 'empty' | 'all' | 'target';

export interface CollageInsertPlan {
  assignments: CollageInsertAssignment[];
  remaining: string[];
  replaced: number;
  preserved: number;
}

export interface CollageInsertOptions {
  targetSlotId?: string | null;
  scope?: CollageInsertScope;
  repeat?: boolean;
}

export function buildCollageInsertPlan(
  slots: CanvasSlot[],
  srcs: string[],
  options: CollageInsertOptions = {},
): CollageInsertPlan {
  const {
    targetSlotId = null,
    scope = targetSlotId ? 'target' : 'empty',
    repeat = false,
  } = options;
  const orderedTargets =
    scope === 'target' && targetSlotId
      ? [
          ...slots.filter((slot) => slot.id === targetSlotId),
          // بعد الخانة المستهدفة: كل الخانات (الممتلئة تُستبدل صراحة ضمن النطاق)
          ...slots.filter((slot) => slot.id !== targetSlotId),
        ]
      : scope === 'all'
        ? [...slots]
        : slots.filter((slot) => !slot.imageSrc);
  if (orderedTargets.length === 0 || srcs.length === 0) {
    return {
      assignments: [],
      remaining: [...srcs],
      replaced: 0,
      preserved: slots.filter((s) => s.imageSrc).length,
    };
  }
  const limit = repeat ? orderedTargets.length : Math.min(orderedTargets.length, srcs.length);
  const assignments = Array.from({ length: limit }, (_, index) => ({
    slotId: orderedTargets[index].id,
    src: srcs[index % srcs.length],
  }));
  const assignedIds = new Set(assignments.map((assignment) => assignment.slotId));
  return {
    assignments,
    remaining: repeat ? [] : srcs.slice(limit),
    replaced: orderedTargets.filter((slot) => assignedIds.has(slot.id) && Boolean(slot.imageSrc))
      .length,
    preserved: slots.filter((slot) => slot.imageSrc && !assignedIds.has(slot.id)).length,
  };
}

export function buildCollageInsertAssignments(
  slots: CanvasSlot[],
  srcs: string[],
  targetSlotId: string | null,
  hasPhysicalLayout: boolean,
): CollageInsertAssignment[] {
  // قالب الهوية الفيزيائي بصورة واحدة دون استهداف = تكرار صريح على كل الخانات
  // (ورقة الهوية)، أو الإدراج العام على القوالب الفيزيائية يملأ الكل بما أن
  // الأصل كان يعامله كشيت هوية. غير ذلك: الفارغ فقط.
  return buildCollageInsertPlan(slots, srcs, {
    targetSlotId,
    scope: targetSlotId ? 'target' : hasPhysicalLayout ? 'all' : 'empty',
    repeat: hasPhysicalLayout && srcs.length === 1 && !targetSlotId,
  }).assignments;
}
