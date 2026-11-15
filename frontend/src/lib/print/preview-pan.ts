/**
 * بدائية معاينة الطباعة — حساب `object-position` وإزاحة التحويم (`panX`/`panY`).
 *
 * مشتركة بين فرعي الاتجاه العادي وربع الدوران في `SheetPreview` لضمان مطابقة
 * قصّ المعاينة السريعة في CSS لمسار الكانفاس (`KonvaCollageImage`) والطباعة
 * الفعلية (`computeCropFromSlot`):
 * 1) عند `zoom = 1` أو أي تحويم ضمن فائض الـ cover تُطبَّق الإزاحة عبر
 *    `objectPositionX/Y` [0..100%] في فضاء الصورة الأصلي قبل التدوير والقلب،
 *    بلا شرائح فارغة وبلا انعكاس إشارة.
 * 2) ما يتبقى بعد استهلاك فائض الـ cover عند `zoom > 1` يُحوَّل إلى `panX/panY`
 *    مقيساً بنسب عنصر الصورة بعد قلب وتدوير المتجه ليعمل داخل
 *    `translate(panX%, panY%) scale(zoom) rotate(...) scaleX(...) scaleY(...)`.
 */

import {
  clampSlotZoom,
  resolveSlotCropMode,
  type SlotCropMode,
} from '@/lib/export/export-primitives';

export interface SlotPreviewPanSource {
  zoom?: number;
  dragX?: number;
  dragY?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  cropMode?: SlotCropMode;
}

export interface SlotPreviewPanResult {
  objectPositionX: number;
  objectPositionY: number;
  panX: number;
  panY: number;
}

const cleanZero = (n: number): number => (Math.abs(n) < 1e-9 ? 0 : n);

export function computeSlotPreviewPan(
  slot: SlotPreviewPanSource,
  naturalSize: { w: number; h: number } | null | undefined,
  boxAspect: number,
): SlotPreviewPanResult {
  const zoomVal = clampSlotZoom(slot.zoom);
  let objectPositionX = 50;
  let objectPositionY = 50;
  let panX = 0;
  let panY = 0;

  if (naturalSize && naturalSize.w > 0 && naturalSize.h > 0 && boxAspect > 0) {
    const imgW = naturalSize.w;
    const imgH = naturalSize.h;
    const imgAspect = imgW / imgH;
    const coverW = imgAspect > boxAspect ? imgH * boxAspect : imgW;
    const coverH = imgAspect > boxAspect ? imgH : imgW / boxAspect;
    const sw = coverW / zoomVal;
    const sh = coverH / zoomVal;

    const centerSx = (imgW - sw) / 2;
    const centerSy = (imgH - sh) / 2;
    const cropMode = resolveSlotCropMode(slot.cropMode);
    const defaultSx = cropMode === 'centered' || imgAspect > boxAspect ? centerSx : 0;
    const defaultSy = cropMode === 'centered' || imgAspect <= boxAspect ? centerSy : 0;

    const sx = Math.max(0, Math.min(Math.max(0, imgW - sw), defaultSx + (slot.dragX || 0)));
    const sy = Math.max(0, Math.min(Math.max(0, imgH - sh), defaultSy + (slot.dragY || 0)));
    const dx = sx - centerSx;
    const dy = sy - centerSy;

    // استهلاك فائض التغطية (cover overflow) عبر CSS object-position قبل التحويلات
    const excessX = Math.max(0, imgW - coverW);
    const excessY = Math.max(0, imgH - coverH);
    const coverDragX = Math.max(-excessX / 2, Math.min(excessX / 2, dx));
    const coverDragY = Math.max(-excessY / 2, Math.min(excessY / 2, dy));
    if (excessX > 0 && coverDragX !== 0) {
      objectPositionX = 50 + (coverDragX / excessX) * 100;
    }
    if (excessY > 0 && coverDragY !== 0) {
      objectPositionY = 50 + (coverDragY / excessY) * 100;
    }

    // تحويل الإزاحة المتبقية (عند zoom > 1) من فضاء الصورة المعاكس (crop = -imageMove)
    // إلى فضاء CSS element box بعد تطبيق القلب ثم الدوران.
    const remX = dx - coverDragX;
    const remY = dy - coverDragY;
    if (Math.abs(remX) >= 1e-9 || Math.abs(remY) >= 1e-9) {
      const u = -(remX * zoomVal) / coverW;
      const v = -(remY * zoomVal) / coverH;
      const fx = slot.flipX ? -1 : 1;
      const fy = slot.flipY ? -1 : 1;
      const rad = ((slot.rotation || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const dxBox = fx * u * boxAspect;
      const dyBox = fy * v;
      const sxBox = cos * dxBox - sin * dyBox;
      const syBox = sin * dxBox + cos * dyBox;

      panX = cleanZero((sxBox / boxAspect) * 100);
      panY = cleanZero(syBox * 100);
    }
  }

  return { objectPositionX, objectPositionY, panX, panY };
}
