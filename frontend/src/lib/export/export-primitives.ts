/**
 * بدائيات رسم Canvas 2D — دوال نقية بلا اعتماد على المتجر.
 * مستخرجة من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */

/** وضع حساب نقطة الأساس عند zoom > 1: legacy للمشاريع القديمة بلا حقل، centered للخانات الجديدة */
export type SlotCropMode = 'legacy' | 'centered';

export const SLOT_MIN_ZOOM = 1;
export const SLOT_MAX_ZOOM = 3;

export const IMAGE_CROP_MIN_ZOOM = 1;
export const IMAGE_CROP_MAX_ZOOM = 4;

/** حقول ضبط الكادر غير الهدّام لعنصر الصورة الحر في الوضع الحر */
export interface ImageCropFraming {
  cropZoom?: number;
  cropPanX?: number;
  cropPanY?: number;
}

/** يطبّع تكبير الكادر للوضع الحر إلى النطاق الآمن [1..4] */
export function clampImageCropZoom(zoom: number | undefined): number {
  if (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom <= IMAGE_CROP_MIN_ZOOM) {
    return IMAGE_CROP_MIN_ZOOM;
  }
  return Math.min(IMAGE_CROP_MAX_ZOOM, zoom);
}

/** يطبّع إزاحة الكادر إلى النطاق [-1..1] */
export function clampImageCropPan(pan: number | undefined): number {
  if (typeof pan !== 'number' || !Number.isFinite(pan)) return 0;
  return Math.max(-1, Math.min(1, pan));
}

/** يتحقق من وجود ضبط كادر فعلي غير افتراضي */
export function hasCustomImageCrop(framing: ImageCropFraming | undefined): boolean {
  if (!framing) return false;
  return (
    clampImageCropZoom(framing.cropZoom) > 1 + 1e-4 ||
    Math.abs(clampImageCropPan(framing.cropPanX)) > 1e-4 ||
    Math.abs(clampImageCropPan(framing.cropPanY)) > 1e-4
  );
}

/** يزيل الحقول الافتراضية ويقرّب القيم لأربع خانات عشرية لمنع تلوث المشاريع */
export function normalizeImageCropFraming(framing: ImageCropFraming): {
  cropZoom: number | undefined;
  cropPanX: number | undefined;
  cropPanY: number | undefined;
} {
  const round4 = (v: number) => Math.round(v * 10000) / 10000;
  const z = round4(clampImageCropZoom(framing.cropZoom));
  const px = round4(clampImageCropPan(framing.cropPanX));
  const py = round4(clampImageCropPan(framing.cropPanY));
  if (!hasCustomImageCrop({ cropZoom: z, cropPanX: px, cropPanY: py })) {
    return { cropZoom: undefined, cropPanX: undefined, cropPanY: undefined };
  }
  return {
    cropZoom: z > 1 + 1e-4 ? z : undefined,
    cropPanX: Math.abs(px) > 1e-4 ? px : undefined,
    cropPanY: Math.abs(py) > 1e-4 ? py : undefined,
  };
}

/** يطبّع قيمة التكبير إلى النطاق المدعوم [1..3] (القيم الفارغة أو ≤ 0 تعود إلى 1). */
export function clampSlotZoom(zoom: number | undefined): number {
  if (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom <= 0) return SLOT_MIN_ZOOM;
  return Math.max(SLOT_MIN_ZOOM, Math.min(SLOT_MAX_ZOOM, zoom));
}

/** يحسم وضع القصّ الفعلي: غياب الحقل في المشاريع القديمة يظل legacy. */
export function resolveSlotCropMode(cropMode: SlotCropMode | undefined): SlotCropMode {
  return cropMode === 'centered' ? 'centered' : 'legacy';
}

/** حقول التحويل التي يفهمها drawSlotImage — كلها اختيارية، تطابق عقدة KonvaCollageImage */
export interface SlotTransform {
  zoom?: number;
  dragX?: number;
  dragY?: number;
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
  cropMode?: SlotCropMode;
}

/** أبعاد الصورة قبل التدوير؛ يبقى مستطيل الخانة النهائي دون تبديل. */
export function getSlotLocalSize(width: number, height: number, rotation = 0) {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized === 90 || normalized === 270
    ? { width: height, height: width }
    : { width, height };
}

// تحميل صورة من رابط أو DataURL
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// حساب نافذة القصّ (object-fit: cover + cropZoom/cropPanX/cropPanY) لعناصر الصور الحرة
export function computeImageCrop(
  img: Pick<HTMLImageElement, 'width' | 'height'>,
  boxW: number,
  boxH: number,
  framing?: ImageCropFraming,
): SlotCrop {
  if (!(img.width > 0) || !(img.height > 0) || !(boxW > 0) || !(boxH > 0)) {
    return {
      sx: 0,
      sy: 0,
      sw: Math.max(0, img.width || 0),
      sh: Math.max(0, img.height || 0),
    };
  }
  const imgAspect = img.width / img.height;
  const boxAspect = boxW / boxH;
  let sw = img.width;
  let sh = img.height;
  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
  } else {
    sh = img.width / boxAspect;
  }
  const zoom = clampImageCropZoom(framing?.cropZoom);
  sw /= zoom;
  sh /= zoom;
  const slackX = Math.max(0, img.width - sw);
  const slackY = Math.max(0, img.height - sh);
  const sx = (slackX / 2) * (1 + clampImageCropPan(framing?.cropPanX));
  const sy = (slackY / 2) * (1 + clampImageCropPan(framing?.cropPanY));
  return { sx, sy, sw, sh };
}

// تحويل سحب المؤشر على الورقة إلى إزاحة كادر مطبَّعة [-1..1] مع احترام الدوران والقلب
export function panImageCropByDelta(params: {
  img: Pick<HTMLImageElement, 'width' | 'height'>;
  boxW: number;
  boxH: number;
  framing: ImageCropFraming;
  dxPaper: number;
  dyPaper: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
}): { cropPanX: number; cropPanY: number } {
  const { img, boxW, boxH, framing, dxPaper, dyPaper, rotation = 0, flipX, flipY } = params;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let dxLocal = cos * dxPaper + sin * dyPaper;
  let dyLocal = -sin * dxPaper + cos * dyPaper;
  if (flipX) dxLocal = -dxLocal;
  if (flipY) dyLocal = -dyLocal;

  const { sw, sh } = computeImageCrop(img, boxW, boxH, framing);
  const slackX = Math.max(0, img.width - sw);
  const slackY = Math.max(0, img.height - sh);
  const startPanX = clampImageCropPan(framing.cropPanX);
  const startPanY = clampImageCropPan(framing.cropPanY);

  const nextPanX =
    slackX > 1e-6 && boxW > 0
      ? clampImageCropPan(startPanX + (-2 * dxLocal * (sw / boxW)) / slackX)
      : 0;
  const nextPanY =
    slackY > 1e-6 && boxH > 0
      ? clampImageCropPan(startPanY + (-2 * dyLocal * (sh / boxH)) / slackY)
      : 0;
  return { cropPanX: nextPanX, cropPanY: nextPanY };
}

// رسم صورة مع object-fit: cover + إزاحة وتكبير الكادر الاختياري
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  framing?: ImageCropFraming,
) {
  const { sx, sy, sw, sh } = computeImageCrop(img, w, h, framing);
  if (!(sw > 0) || !(sh > 0)) return;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// مستطيل القص داخل الصورة بعد zoom/drag وبلا قلب/دوران (المحور المحلي للخانة)
export interface SlotCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// حساب مستطيل القص فقط — منفصل عن التحويل حتى يمكن تطبيق مرشّح البكسل
// في الفضاء المحلي قبل القلب/الدوران (وهو ترتيب Konva: الفلاتر تُطبَّق على
// صورة العقدة ثم يُطبَّق تحويل العقدة).
export function computeSlotCrop(
  img: Pick<HTMLImageElement, 'width' | 'height'>,
  w: number,
  h: number,
  slot: SlotTransform,
): SlotCrop {
  const localSize = getSlotLocalSize(w, h, slot.rotation);
  const imgAspect = img.width / img.height;
  const slotAspect = localSize.width / localSize.height;
  let sw = img.width;
  let sh = img.height;
  if (imgAspect > slotAspect) {
    sw = img.height * slotAspect;
  } else {
    sh = img.width / slotAspect;
  }
  const zoom = clampSlotZoom(slot.zoom);
  sw /= zoom;
  sh /= zoom;
  // وضع centered: يتمركز التكبير في المحورين؛ وضع legacy (مشاريع قديمة بلا cropMode):
  // يحافظ على نقطة البدء السابقة عند الحافة للمحور غير الفائض منعاً لكسر القصّ القديم.
  const cropMode = resolveSlotCropMode(slot.cropMode);
  const defaultSx = cropMode === 'centered' || imgAspect > slotAspect ? (img.width - sw) / 2 : 0;
  const defaultSy = cropMode === 'centered' || imgAspect <= slotAspect ? (img.height - sh) / 2 : 0;
  // نافذة القصّة النهائية تُقيَّد بحدود الصورة نفسها لا بإزاحة متماثلة حول
  // نقطة البدء: بعد تدوير 90/270 يتبدل موضع البدء (حافة بدل مركز) فكانت
  // القيود المتماثلة تسمح بمصدر سالب يرسم شريطاً فارغاً في التصدير اليدوي،
  // بينما تقصم Go النافذة وتمدّدها — المساران الآن يقيّدان الموضع النهائي ذاته.
  const maxSx = Math.max(0, img.width - sw);
  const maxSy = Math.max(0, img.height - sh);
  return {
    sx: Math.max(0, Math.min(maxSx, defaultSx + (slot.dragX || 0))),
    sy: Math.max(0, Math.min(maxSy, defaultSy + (slot.dragY || 0))),
    sw,
    sh,
  };
}

// قلب/دوران حول مركز المستطيل — يُطبَّق على أي drew content في الفضاء المحلي
export function applySlotTransform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  slot: SlotTransform,
): void {
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
  if (slot.flipX) ctx.scale(-1, 1);
  if (slot.flipY) ctx.scale(1, -1);
  const localSize = getSlotLocalSize(w, h, slot.rotation);
  ctx.translate(-localSize.width / 2, -localSize.height / 2);
}

// رسم الصورة المقصوصة في الفضاء المحلي (بلا قلب/دوران) — يُستخدم كطبقة
// وسيطة قبل مرشّحات البكسل، وبالأساس داخل drawSlotImage
export function drawSlotImageLocal(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  slot: SlotTransform,
): void {
  const { sx, sy, sw, sh } = computeSlotCrop(img, w, h, slot);
  const localSize = getSlotLocalSize(w, h, slot.rotation);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, localSize.width, localSize.height);
}

// رسم صورة الخانة مع القص (zoom/drag) والقلب والدوران —
// يطابق منطق KonvaCollageImage في كل من التصدير اليدوي وتصدير الخانات المفردة
export function drawSlotImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  slot: SlotTransform,
) {
  ctx.save();
  applySlotTransform(ctx, x, y, w, h, slot);
  drawSlotImageLocal(ctx, img, w, h, slot);
  ctx.restore();
}

export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | number[],
) {
  ctx.beginPath();
  // ctx.roundRect يقبل رقماً واحداً أو مصفوفة حتى 4 زوايا
  // [أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار] — نفس عقد Konva.cornerRadius
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}
