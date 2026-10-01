import { describe, it, expect } from 'vitest';
import { OVERLAP_TUNING } from '../core/overlap-tuning';
import { applyNMS } from '../core/multi-doc-segmenter';
import { ML_CONFIRM_IOU, ML_MISS_IOU, ML_CONTAINMENT_BLOCK } from '../core/detect-fusion';
import type { Point, ScoredCandidate } from '../core/types';

/**
 * تثبيت سطح المعايرة الموحّد (`core/overlap-tuning.ts`).
 *
 * الغرض المزدوج: (1) تثبيت الأرقام صراحةً حتى لا يتغيّر أي منها «بالصدفة» مع
 * تغيير في المقياس، و(2) إثبات أن العتبات ما زالت **تدفع سلوك NMS الفعلي** —
 * أي أن الاختبار يعضّ، لا يكتفي بمقارنة أرقام بأرقام.
 */

describe('OVERLAP_TUNING — سطح المعايرة الموحّد', () => {
  it('القيم مثبّتة صراحةً (أي تغيير يجب أن يكون مقصوداً وموثّقاً)', () => {
    expect(OVERLAP_TUNING).toEqual({
      nmsDetailOverlapMax: 0.38,
      nmsContainerOverlap: 0.6,
      nmsContainerAreaRatio: 1.3,
      nmsMutualOverlapMax: 0.45,
      nmsIouThreshold: 0.3,
      nmsIouThresholdFused: 0.4,
      fusionConfirmIou: 0.55,
      fusionMissIou: 0.35,
      fusionRescueContainmentOverlap: 0.75,
      fusionReplaceContainmentOverlap: 0.8,
      fusionReplaceContainmentAreaRatio: 1.35,
      disjointPairMaxIou: 0.25,
      disjointPairMaxAreaRatio: 1.7,
    });
    expect(Object.isFrozen(OVERLAP_TUNING)).toBe(true);
  });

  it('العلاقات الداخلية سليمة (نطاقات ونسب وترتيب منطقي)', () => {
    const t = OVERLAP_TUNING;
    const overlaps = [
      t.nmsDetailOverlapMax,
      t.nmsContainerOverlap,
      t.nmsMutualOverlapMax,
      t.nmsIouThreshold,
      t.nmsIouThresholdFused,
      t.fusionConfirmIou,
      t.fusionMissIou,
      t.fusionRescueContainmentOverlap,
      t.fusionReplaceContainmentOverlap,
      t.disjointPairMaxIou,
    ];
    for (const v of overlaps) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    for (const r of [
      t.nmsContainerAreaRatio,
      t.fusionReplaceContainmentAreaRatio,
      t.disjointPairMaxAreaRatio,
    ]) {
      expect(r).toBeGreaterThan(1);
    }

    // عتبة الاسترداد أدقّ (أصغر IoU) من عتبة التأكيد
    expect(t.fusionMissIou).toBeLessThan(t.fusionConfirmIou);
    // «لا تُضِف نسخة» (75%) أدنى من «استبدل الهندسة» (80%) — قراران مختلفان
    expect(t.fusionRescueContainmentOverlap).toBeLessThan(t.fusionReplaceContainmentOverlap);
    // فحص الثنوية أكثر صرامةً من إخماد NMS العادي
    expect(t.disjointPairMaxIou).toBeLessThan(t.nmsIouThreshold);
    // مسار الدمج يستعمل عتبة IoU أصرح من الافتراضية
    expect(t.nmsIouThresholdFused).toBeGreaterThan(t.nmsIouThreshold);
  });

  it('ثوابت detect-fusion مشتقّة من السطح (لا نسخ منفصلة تنحرف)', () => {
    expect(ML_CONFIRM_IOU).toBe(OVERLAP_TUNING.fusionConfirmIou);
    expect(ML_MISS_IOU).toBe(OVERLAP_TUNING.fusionMissIou);
    expect(ML_CONTAINMENT_BLOCK).toBe(OVERLAP_TUNING.fusionRescueContainmentOverlap);
  });

  it('عتبة التفصيل الداخلي تدفع قرار NMS فعلاً (فوق/تحت الحد)', () => {
    const reference: Point[] = rect(0, 0);
    // تداخل 39% > 0.38 ⇒ إخماد (w=200، إزاحة 122 ⇒ 78/200)
    const above = rect(122, 0);
    const suppressed = applyNMS([
      { quad: reference, score: 1.5 },
      { quad: above, score: 1.4 },
    ]);
    expect(suppressed).toHaveLength(1);

    // تداخل 37% < 0.38 ⇒ إبقاء (لا شرط آخر يتحقق: max 0.37 < 0.45، iou 0.227 < 0.30)
    const below = rect(126, 0);
    const kept = applyNMS([
      { quad: reference, score: 1.5 },
      { quad: below, score: 1.4 },
    ]);
    expect(kept).toHaveLength(2);
  });

  it('الاستدعاء الافتراضي في applyNMS يستعمل عتبة السطح نفسها', () => {
    const cands: ScoredCandidate[] = [
      { quad: rect(0, 0), score: 1.5 },
      { quad: rect(126, 0), score: 1.4 },
    ];
    const withDefault = applyNMS(cands);
    const explicit = applyNMS(cands, OVERLAP_TUNING.nmsIouThreshold);
    expect(withDefault.map((c) => c.score)).toEqual(explicit.map((c) => c.score));
  });

  it('شرط الحاوية الخارجية (b) يُخمِد كتلة كبيرة تحوي مستنداً معتمداً بالكامل', () => {
    // المستند المعتمد صغير وثقته أعلى؛ الكتلة الكبيرة تلتفّ حوله تماماً:
    // overlapRatio2 = 1 > 0.60 و candArea(40000) ≥ 1.30 × selArea(1600) ⇒ إخماد
    const selectedDoc: Point[] = box(50, 50, 40, 40);
    const container: Point[] = box(0, 0, 200, 200);
    const kept = applyNMS([
      { quad: selectedDoc, score: 1.5 },
      { quad: container, score: 1.4 },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].quad).toEqual(selectedDoc);
  });

  it('شرط التداخل المتبادل (c) عند الحد 0.45 (فوق ⇒ إخماد · تحت ⇒ إبقاء)', () => {
    // المستند المعتمد 100×100 (أعلى ثقة)، والمرشح 100×125 (أدنى ثقة):
    // candArea/selArea = 1.25 < 1.30 (فلا شرط الحاوية)، و overlapRatio1 < 0.38 دائماً
    const selectedDoc: Point[] = box(0, 0, 100, 100);
    // إزاحة 53 ⇒ تقاطع 4700: ratio2 = 0.47 > 0.45 و ratio1 = 0.376 < 0.38 و iou ≈ 0.264
    const above = applyNMS([
      { quad: selectedDoc, score: 1.5 },
      { quad: box(53, 0, 100, 125), score: 1.4 },
    ]);
    expect(above).toHaveLength(1);

    // إزاحة 56 ⇒ تقاطع 4400: ratio2 = 0.44 < 0.45 ⇒ يبقى الاثنان
    const below = applyNMS([
      { quad: selectedDoc, score: 1.5 },
      { quad: box(56, 0, 100, 125), score: 1.4 },
    ]);
    expect(below).toHaveLength(2);
  });

  it('مستندان منفصلان تماماً يبقيان معاً (لا إخماد كاذب)', () => {
    const left: Point[] = box(0, 0, 100, 100);
    const right: Point[] = box(300, 300, 100, 100);
    const kept = applyNMS([
      { quad: left, score: 1.5 },
      { quad: right, score: 1.4 },
    ]);
    expect(kept).toHaveLength(2);
  });
});

/** مستطيل قياسي 200×126 (نسبة ID-1) عند إزاحة x — نفس هندسة بقية اختبارات الماسح */
function rect(x: number, y: number): Point[] {
  return box(x, y, 200, 126);
}

function box(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}
