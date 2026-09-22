import type { CanvasSlot } from "@/lib/store/types";

/**
 * Collage Geometry – Single Source of Truth
 * ========================================
 * هندسة شبكة الكولاج بالبكسل الكانفسي. يستهلكها مرسم Konva (`konva-collage-layer`)
 * والشريط السريع العائم (`canvas-quick-bar`) معاً، فلا تنحرف مواضع الخلايا
 * المعروضة عن الخلايا المرسومة فعلاً عند أي تغيير مستقبلي في قواعد الشبكة.
 */

export interface CollageGeometry {
  /** الهامش الداخلي */
  margin: number;
  /** الفجوة بين الخلايا */
  gap: number;
  /** عرض المساحة المتاحة للخلايا بعد الهوامش */
  availW: number;
  /** ارتفاع المساحة المتاحة للخلايا بعد الهوامش */
  availH: number;
}

export function getCollageGeometry(
  canvasWidth: number,
  canvasHeight: number,
  collageMargin: number,
  collageGap: number,
  hasPhysicalLayout: boolean
): CollageGeometry {
  // 📐 التخطيط الفيزيائي (قوالب جاهزة) يحدّد مواضع الخلايا بنفسه: لا هوامش ولا فجوات
  const margin = hasPhysicalLayout ? 0 : collageMargin;
  const gap = hasPhysicalLayout ? 0 : collageGap;
  return {
    margin,
    gap,
    availW: canvasWidth - 2 * margin,
    availH: canvasHeight - 2 * margin,
  };
}

export interface SlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** مستطيل الخلية بالبكسل الكانفسي — المعادلة الحاكمة لكل من الرسم والتقاط الموضع */
export function getSlotRect(
  slot: Pick<CanvasSlot, "x" | "y" | "w" | "h">,
  geo: CollageGeometry
): SlotRect {
  return {
    left: geo.margin + slot.x * geo.availW + geo.gap / 2,
    top: geo.margin + slot.y * geo.availH + geo.gap / 2,
    width: slot.w * geo.availW - geo.gap,
    height: slot.h * geo.availH - geo.gap,
  };
}
