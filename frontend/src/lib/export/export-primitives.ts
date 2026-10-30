/**
 * بدائيات رسم Canvas 2D — دوال نقية بلا اعتماد على المتجر.
 * مستخرجة من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */

/** حقول التحويل التي يفهمها drawSlotImage — كلها اختيارية، تطابق عقدة KonvaCollageImage */
export interface SlotTransform {
  zoom?: number;
  dragX?: number;
  dragY?: number;
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
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

// رسم صورة مع object-fit: cover
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }
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
  const zoom = slot.zoom && slot.zoom > 0 ? slot.zoom : 1;
  sw /= zoom;
  sh /= zoom;
  const sx = imgAspect > slotAspect ? (img.width - sw) / 2 : 0;
  const sy = imgAspect > slotAspect ? 0 : (img.height - sh) / 2;
  const maxDragX = (img.width - sw) / 2;
  const maxDragY = (img.height - sh) / 2;
  return {
    sx: sx + Math.max(-maxDragX, Math.min(maxDragX, slot.dragX || 0)),
    sy: sy + Math.max(-maxDragY, Math.min(maxDragY, slot.dragY || 0)),
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
