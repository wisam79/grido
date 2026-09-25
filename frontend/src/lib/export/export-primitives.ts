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
  const normRot = (((slot.rotation || 0) % 360) + 360) % 360;
  const isRotated90or270 = normRot === 90 || normRot === 270;
  const imgAspect = img.width / img.height;
  const slotAspect = isRotated90or270 ? h / w : w / h;
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
  const defaultSx = imgAspect > slotAspect ? (img.width - sw) / 2 : 0;
  const defaultSy = imgAspect > slotAspect ? 0 : (img.height - sh) / 2;
  const maxDragX = (img.width - sw) / 2;
  const maxDragY = (img.height - sh) / 2;
  const dragX = Math.max(-maxDragX, Math.min(maxDragX, slot.dragX || 0));
  const dragY = Math.max(-maxDragY, Math.min(maxDragY, slot.dragY || 0));

  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
  if (slot.flipX) ctx.scale(-1, 1);
  if (slot.flipY) ctx.scale(1, -1);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(img, defaultSx + dragX, defaultSy + dragY, sw, sh, 0, 0, w, h);
}

export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
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
