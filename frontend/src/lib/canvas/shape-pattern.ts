/**
 * shape-pattern.ts — هندسة تعبئة الصور وأنماط الحد للأشكال.
 *
 * وحدة نقية بلا اعتماد على Konva أو Canvas: مصدر واحد للرياضيات يستهلكه
 * مساران مختلفان تماماً:
 *  1. عقدة Konva (shape-node) عبر خصائص fillPattern*.
 *  2. التصدير اليدوي الاحتياطي عبر createPattern + setTransform.
 * لو تكرّرت المعادلة في المسارين لتباينت المعاينة والتصدير.
 *
 * دلالات مصفوفة Konva (من konva/lib/Shape.js __getFillPattern):
 *   matrix = T(fillPatternX, fillPatternY) · R(rotation) · S(scaleX, scaleY) · T(-offsetX, -offsetY)
 * أي أن نقطة الصورة u تُرسم في:  p(u) = (patternX, patternY) + R·S·(u − offset)
 */

export type ShapeFillImageFit = 'stretch' | 'cover' | 'contain' | 'tile';

export interface ShapePatternInput {
  imageWidth: number;
  imageHeight: number;
  boxWidth: number;
  boxHeight: number;
  fit?: ShapeFillImageFit;
  /** مضاعف حجم النقش في وضع التكرار (1 = البكسل الطبيعي للصورة) */
  scale?: number;
  /** دوران النقش بالدرجات حول مركز الشكل */
  rotation?: number;
  /** إزاحة مركز الصورة كنسبة من عرض/ارتفاع الشكل (-0.5..0.5) */
  offsetX?: number;
  offsetY?: number;
}

export interface ShapePatternTransform {
  /** نقطة ارتكاز النقش — مركز الشكل حتى يدور حول نفسه لا حول الزاوية */
  patternX: number;
  patternY: number;
  scaleX: number;
  scaleY: number;
  /** إزاحة الصورة بوحدات بكسل الصورة الأصلية (اصطلاح Konva نفسه) */
  offsetX: number;
  offsetY: number;
  rotation: number;
  repeat: 'repeat' | 'no-repeat';
}

/** حدود مُضاعف التكرار المقبولة — دون ذلك ينكمش القماش لدائرة غير مرئية */
export const TILE_SCALE_MIN = 0.05;
export const TILE_SCALE_MAX = 3;
export const TILE_SCALE_DEFAULT = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * يحسم التحويل الكامل لتعبئة الصورة:
 * - stretch: الصورة تُمدَّد لكل صندوق الشكل (بلا دوران/تكرار).
 * - cover: تُغطّي الصندوق كاملاً بأكبر مقياس موحّد مع قص الفائض.
 * - contain: تدخل الصندوق كاملاً بأصغر مقياس موحّد (فراغ شفاف حولها).
 * - tile: تُكرَّر بحجم = scale × البكسل الطبيعي.
 * الإزاحة تحرّك مركز الصورة عن مركز الشكل بمقدار محسوب في فضاء الصورة،
 * معاكسَ الدوران، حتى تبقى الصيغة صحيحة عند أي زاوية.
 */
export function computeShapePattern(input: ShapePatternInput): ShapePatternTransform {
  const iw = Math.max(1, input.imageWidth || 1);
  const ih = Math.max(1, input.imageHeight || 1);
  const w = Math.max(1, input.boxWidth || 1);
  const h = Math.max(1, input.boxHeight || 1);
  const fit = input.fit ?? 'cover';

  let scaleX = 1;
  let scaleY = 1;
  let repeat: ShapePatternTransform['repeat'] = 'no-repeat';

  switch (fit) {
    case 'stretch':
      scaleX = w / iw;
      scaleY = h / ih;
      break;
    case 'contain': {
      const s = Math.min(w / iw, h / ih);
      scaleX = s;
      scaleY = s;
      break;
    }
    case 'tile': {
      const s = clamp(input.scale ?? TILE_SCALE_DEFAULT, TILE_SCALE_MIN, TILE_SCALE_MAX);
      scaleX = s;
      scaleY = s;
      repeat = 'repeat';
      break;
    }
    case 'cover':
    default: {
      const s = Math.max(w / iw, h / ih);
      scaleX = s;
      scaleY = s;
      break;
    }
  }

  // stretch يجعل النقش بلا معنى (الصورة تغطي الشكل كاملاً) — الدوران يُهمل
  const rotation = fit === 'stretch' ? 0 : (input.rotation ?? 0);
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // الإزاحة الهدف (بكسل الشكل) ثم عكسها إلى فضاء الصورة عبر R(−θ)·d / s
  const dx = (input.offsetX ?? 0) * w;
  const dy = (input.offsetY ?? 0) * h;
  const invX = dx * cos + dy * sin;
  const invY = -dx * sin + dy * cos;

  return {
    patternX: w / 2,
    patternY: h / 2,
    scaleX,
    scaleY,
    offsetX: iw / 2 - invX / scaleX,
    offsetY: ih / 2 - invY / scaleY,
    rotation,
    repeat,
  };
}

/**
 * قيم مصفوفة DOMMatrix [a, b, c, d, e, f] المكافئة لتحويل النقش —
 * يستخدمها التصدير اليدوي مع CanvasPattern.setTransform بنفس الرياضيات.
 */
export function shapePatternMatrix(
  t: ShapePatternTransform,
): [number, number, number, number, number, number] {
  const rad = (t.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const a = cos * t.scaleX;
  const b = sin * t.scaleX;
  const c = -sin * t.scaleY;
  const d = cos * t.scaleY;
  const e = t.patternX - (a * t.offsetX + c * t.offsetY);
  const f = t.patternY - (b * t.offsetX + d * t.offsetY);
  return [a, b, c, d, e, f];
}

/**
 * تعويض المقياس الداخلي للعقدة: مسار SVG يُرسم في فضاء مرجعه viewBox
 * (24×24) ثم يكبّره Konva.Path إلى صندوق العنصر، فيتأثر نقش الصورة بهذا
 * التكبير. القسمة على المقياس تُعيد النقش إلى فضاء العنصر الفعلي فيتطابق
 * معاينة الشاشة مع التصدير بغض النظر عن مقاس الشكل.
 */
export function toLocalPattern(
  t: ShapePatternTransform,
  scaleX: number,
  scaleY: number,
): ShapePatternTransform {
  if (scaleX === 1 && scaleY === 1) return t;
  return {
    ...t,
    patternX: t.patternX / scaleX,
    patternY: t.patternY / scaleY,
    scaleX: t.scaleX / scaleX,
    scaleY: t.scaleY / scaleY,
  };
}

/**
 * مصفوفة dash لأسلوب الحد — تتدرّج مع سماكة الحد فتبقى الشرطات مرئية.
 * المنقّط يعتمد حيلة Konva الموثقة: dash شبه صفري + lineCap round = نقاط دائرية.
 */
export function resolveStrokeDash(
  style: 'solid' | 'dashed' | 'dotted' | undefined,
  strokeWidth: number,
): number[] | undefined {
  if (!style || style === 'solid') return undefined;
  const w = Math.max(1, strokeWidth || 1);
  if (style === 'dotted') return [0.001, w * 2];
  return [w * 3, w * 2];
}

/** المنقّط يتطلب طرفاً مستديراً (توثيق Konva) — أي اختيار آخر يُستبدل به تلقائياً */
export function resolveLineCap(
  style: 'solid' | 'dashed' | 'dotted' | undefined,
  lineCap: 'butt' | 'round' | 'square' | undefined,
): 'butt' | 'round' | 'square' {
  if (style === 'dotted') return 'round';
  return lineCap ?? 'butt';
}
