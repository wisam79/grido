import { describe, it, expect } from 'vitest';
import {
  computeShapePattern,
  resolveLineCap,
  resolveStrokeDash,
  shapePatternMatrix,
  TILE_SCALE_DEFAULT,
  TILE_SCALE_MAX,
  toLocalPattern,
} from '../src/lib/canvas/shape-pattern';

/**
 * إسقاط مستقل لمعادلة النقش: p(u) = (e,f) + [a c; b d]·u
 * مكتوب هنا يدوياً (لا يستدعي دوال الوحدة) حتى يتحقق الاختبار من النتيجة
 * لا من إعادة إنتاج نفس الصيغة.
 */
function mapPoint(m: number[], ux: number, uy: number): { x: number; y: number } {
  return { x: m[0] * ux + m[2] * uy + m[4], y: m[1] * ux + m[3] * uy + m[5] };
}

describe('shape-pattern — رياضيات تعبئة الصور المشتركة (Konva + التصدير)', () => {
  it('stretch: تمدد مستقل للمحورين وبلا تكرار، والدوران يُهمل', () => {
    const t = computeShapePattern({
      imageWidth: 200,
      imageHeight: 100,
      boxWidth: 100,
      boxHeight: 200,
      fit: 'stretch',
      rotation: 45,
    });
    expect(t.scaleX).toBeCloseTo(0.5);
    expect(t.scaleY).toBeCloseTo(2);
    expect(t.repeat).toBe('no-repeat');
    expect(t.rotation).toBe(0);
  });

  it('cover: مقياس موحّد يغطي الصندوق ومركز الصورة يستقر على مركز الشكل', () => {
    const t = computeShapePattern({
      imageWidth: 100,
      imageHeight: 200,
      boxWidth: 100,
      boxHeight: 100,
      fit: 'cover',
    });
    expect(t.scaleX).toBeCloseTo(1);
    expect(t.repeat).toBe('no-repeat');

    const p = mapPoint(shapePatternMatrix(t), 50, 100); // مركز الصورة الأصلية
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(50);
  });

  it('contain: مقياس موحّد أصغر يُدخل الصورة كاملة داخل الصندوق', () => {
    const t = computeShapePattern({
      imageWidth: 100,
      imageHeight: 200,
      boxWidth: 100,
      boxHeight: 100,
      fit: 'contain',
    });
    expect(t.scaleX).toBeCloseTo(0.5);
    expect(t.scaleY).toBeCloseTo(0.5);
  });

  it('tile: تكرار بمضاعف الحجم مع تثبيت القيمة الافتراضية والحد الأقصى', () => {
    const t = computeShapePattern({
      imageWidth: 100,
      imageHeight: 100,
      boxWidth: 300,
      boxHeight: 300,
      fit: 'tile',
      scale: 5,
    });
    expect(t.repeat).toBe('repeat');
    expect(t.scaleX).toBeCloseTo(TILE_SCALE_MAX);

    const def = computeShapePattern({
      imageWidth: 100,
      imageHeight: 100,
      boxWidth: 300,
      boxHeight: 300,
      fit: 'tile',
    });
    expect(def.scaleX).toBeCloseTo(TILE_SCALE_DEFAULT);
  });

  it('دوران وإزاحة: مركز الصورة ينزاح بالإزاحة المطلوبة رغم الدوران', () => {
    const t = computeShapePattern({
      imageWidth: 400,
      imageHeight: 200,
      boxWidth: 200,
      boxHeight: 100,
      fit: 'cover',
      rotation: 90,
      offsetX: 0.25,
      offsetY: -0.1,
    });
    const p = mapPoint(shapePatternMatrix(t), 200, 100);
    // مركز الصندوق (100, 50) + الإزاحة (0.25×200, −0.1×100)
    expect(p.x).toBeCloseTo(100 + 0.25 * 200);
    expect(p.y).toBeCloseTo(50 - 0.1 * 100);
  });

  it('toLocalPattern: تعويض مقياس عقدة المسار يبقي النقش بمقاس العنصر', () => {
    const t = computeShapePattern({
      imageWidth: 100,
      imageHeight: 100,
      boxWidth: 200,
      boxHeight: 200,
      fit: 'cover',
    });
    const nodeScale = 200 / 24;
    const local = toLocalPattern(t, nodeScale, nodeScale);

    // المصفوفة الفعلية = مقياس العقدة × النقش المحلي ⇒ التكبير الكلي = الأصلي
    expect(local.scaleX * nodeScale).toBeCloseTo(t.scaleX);
    expect(local.patternX * nodeScale).toBeCloseTo(t.patternX);
    // الإزاحة بوحدات بكسل الصورة فلا تتأثر بالمقياس
    expect(local.offsetX).toBeCloseTo(t.offsetX);
  });

  it('resolveStrokeDash: المنقّط حيلة Konva الموثقة والشرطات تتدرّج مع السماكة', () => {
    expect(resolveStrokeDash('solid', 4)).toBeUndefined();
    expect(resolveStrokeDash('dotted', 3)).toEqual([0.001, 6]);
    expect(resolveStrokeDash('dashed', 2)).toEqual([6, 4]);
  });

  it('resolveLineCap: المنقّط يُثبَّت مستديراً ليبقى نقاطاً دائرية', () => {
    expect(resolveLineCap('dotted', 'butt')).toBe('round');
    expect(resolveLineCap('solid', undefined)).toBe('butt');
    expect(resolveLineCap('solid', 'square')).toBe('square');
  });
});
