/**
 * بدائية معاينة الطباعة — إزاحة التحويم (pan) كنسب مئوية لعنصر الصورة.
 *
 * مشتركة بين فرعي الاتجاه العادي وربع الدوران في `SheetPreview` حتى لا
 * يتفاوتا في احترام `dragX/dragY`: كان فرع 90/270 يتجاهل الإزاحة كلياً
 * فيعرض قصّة ممركزة بينما المحرر والطباعة يحترمان pan المستخدم المحفوظ
 * بعد `rotateSlot`. في فرع ربع الدوران تُمرَّر نسبة المقاس المحلي
 * (المتبدلة بعد التدوير) بدل نسبة الخانة النهائية.
 */

export interface SlotPreviewPanSource {
  zoom?: number;
  dragX?: number;
  dragY?: number;
}

export function computeSlotPreviewPan(
  slot: SlotPreviewPanSource,
  naturalSize: { w: number; h: number } | null | undefined,
  boxAspect: number,
): { panX: number; panY: number } {
  const zoomVal = slot.zoom && slot.zoom > 0 ? slot.zoom : 1;
  let panX = 0;
  let panY = 0;
  if (naturalSize && naturalSize.w > 0 && naturalSize.h > 0 && zoomVal > 1 && boxAspect > 0) {
    const imgAspect = naturalSize.w / naturalSize.h;
    const coverW = imgAspect > boxAspect ? naturalSize.h * boxAspect : naturalSize.w;
    const coverH = imgAspect > boxAspect ? naturalSize.h : naturalSize.w / boxAspect;
    const sw = coverW / zoomVal;
    const sh = coverH / zoomVal;
    const maxDragX = Math.max(0, (naturalSize.w - sw) / 2);
    const maxDragY = Math.max(0, (naturalSize.h - sh) / 2);
    const dx = Math.max(-maxDragX, Math.min(maxDragX, slot.dragX || 0));
    const dy = Math.max(-maxDragY, Math.min(maxDragY, slot.dragY || 0));
    panX = (100 * zoomVal * dx) / coverW;
    panY = (100 * zoomVal * dy) / coverH;
  }
  return { panX, panY };
}
