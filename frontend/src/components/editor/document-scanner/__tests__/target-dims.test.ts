import { describe, it, expect } from 'vitest';
import { MAX_EXPORT_PIXELS } from '@/lib/export/export-limits';
import { clampToPixelBudget, resolveTargetDims } from '../core';

/**
 * اختبارات وحدة أبعاد الاستعدال: ثوابت المعاينة كما كانت، الحدود الدنيا
 * للتصدير لكل نوع مستند، وسقف البكسل الموحّد (50MP) الذي يمنع تخصيص
 * كانفاس استعدال بحجم يستهلك مئات الميجابايت.
 */
describe('resolveTargetDims — جدول أبعاد المعاينة والتصدير', () => {
  it('يبقي أبعاد المعاينة الثابتة لكل نوع مستند دون مساس', () => {
    expect(resolveTargetDims('a4_p', true, 3000, 4200)).toEqual({ targetW: 620, targetH: 877 });
    expect(resolveTargetDims('a4_l', true, 3000, 4200)).toEqual({ targetW: 877, targetH: 620 });
    expect(resolveTargetDims('id_card', true, 3000, 4200)).toEqual({ targetW: 500, targetH: 315 });
    expect(resolveTargetDims('square', true, 3000, 4200)).toEqual({ targetW: 600, targetH: 600 });
  });

  it('يحجّم معاينة free إلى 800px كحد أقصى مع حفظ النسبة', () => {
    expect(resolveTargetDims('free', true, 1600, 1200)).toEqual({ targetW: 800, targetH: 600 });
    expect(resolveTargetDims('free', true, 500, 400)).toEqual({ targetW: 500, targetH: 400 });
  });

  it('يطبّق الحدود الدنيا للتصدير لكل نوع مستند', () => {
    expect(resolveTargetDims('a4_p', false, 0, 0)).toEqual({ targetW: 1400, targetH: 1980 });
    expect(resolveTargetDims('a4_l', false, 0, 0)).toEqual({ targetW: 1980, targetH: 1400 });
    expect(resolveTargetDims('id_card', false, 0, 0)).toEqual({ targetW: 1200, targetH: 757 });
    expect(resolveTargetDims('square', false, 0, 0)).toEqual({ targetW: 1200, targetH: 1200 });
  });

  it('يكبّر التصدير مع الحواف المكتشفة الكبيرة ضمن الميزانية (بلا تغيير سلوك)', () => {
    expect(resolveTargetDims('a4_p', false, 2000, 2828)).toEqual({ targetW: 2000, targetH: 2828 });
    expect(resolveTargetDims('free', false, 3000, 2000)).toEqual({ targetW: 3000, targetH: 2000 });
  });
});

describe('clampToPixelBudget — سقف البكسل الموحّد', () => {
  it('يمرّر الأبعاد ضمن الميزانية دون تغيير', () => {
    expect(clampToPixelBudget(1400, 1980)).toEqual({ targetW: 1400, targetH: 1980 });
    expect(clampToPixelBudget(7000, 7000)).toEqual({ targetW: 7000, targetH: 7000 });
  });

  it('يتنازل تدريجياً بنسبة √(السقف/المساحة) مع حفظ النسبة البصرية', () => {
    const out = clampToPixelBudget(12000, 9000);
    expect(out.targetW * out.targetH).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(out.targetW * out.targetH).toBeGreaterThan(MAX_EXPORT_PIXELS * 0.98);
    expect(out.targetH / out.targetW).toBeCloseTo(0.75, 3);
  });

  it('يقيّد استعدال A4 لصورة فائقة الدقة عند 50MP', () => {
    const out = resolveTargetDims('a4_p', false, 8000, 11314);
    expect(out.targetW * out.targetH).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(out.targetH / out.targetW).toBeCloseTo(Math.SQRT2, 2);
  });

  it('يتعامل بأمان مع المدخلات الصفرية والشاذة', () => {
    expect(clampToPixelBudget(0, 100)).toEqual({ targetW: 0, targetH: 100 });
    expect(clampToPixelBudget(NaN, 100)).toEqual({ targetW: NaN, targetH: 100 });
    expect(clampToPixelBudget(-5, -5)).toEqual({ targetW: -5, targetH: -5 });
  });
});
