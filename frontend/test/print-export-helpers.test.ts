import { describe, it, expect, vi, afterEach } from 'vitest';
import { describeError, withTimeout } from '../src/components/editor/print/use-print-export';
import { resolveCutLineDash } from '../src/lib/export/export-canvas-collage';

// ─────────────────────────────────────────────────────────────────────────────
// print-export-helpers.test.ts — مساعدات الطباعة (RV-Print-20/25):
// رسائل أخطاء بلا "[object Object]"، مهلات بلا تعليق، وإيقاع شرطات موحّد.
// ─────────────────────────────────────────────────────────────────────────────

describe('describeError', () => {
  it('يمرر رسالة Error كما هي', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('يمرر النص كما هو', () => {
    expect(describeError('plain failure')).toBe('plain failure');
  });

  it('يستخرج message من كائنات أخطاء Go/Wails', () => {
    expect(describeError({ message: 'server says no' })).toBe('server says no');
  });

  it('يستخرج حقل error الاحتياطي', () => {
    expect(describeError({ error: 'native failed' })).toBe('native failed');
  });

  it('لا ينتج [object Object] أبداً للكائنات العادية', () => {
    const out = describeError({ code: 42, detail: 'x' });
    expect(out).not.toContain('[object Object]');
    expect(out).toContain('42');
  });

  it('يعيد افتراضياً للقيم الفارغة', () => {
    expect(describeError(null)).toBe('خطأ غير معروف');
    expect(describeError(undefined)).toBe('خطأ غير معروف');
  });
});

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('يعيد قيمة الوعد السريع', async () => {
    await expect(withTimeout(Promise.resolve(7), 1000, 'fast')).resolves.toBe(7);
  });

  it('يرفض بتسمية واضحة عند انتهاء المهلة', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 1000, 'ExportPrintSheet');
    const assertion = expect(pending).rejects.toThrow('ExportPrintSheet');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('الوعد الفائز بالسباق لا يُلغى بالمهلة اللاحقة', async () => {
    vi.useFakeTimers();
    let settled = 'pending';
    const p = withTimeout(
      new Promise<string>((resolve) => setTimeout(() => resolve('late'), 500)),
      5000,
      'race',
    ).then((v) => {
      settled = v;
      return v;
    });
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBe('late');
    expect(settled).toBe('late');
  });
});

describe('resolveCutLineDash', () => {
  it('dashed الافتراضي [8,8]', () => {
    expect(resolveCutLineDash('dashed')).toEqual([8, 8]);
  });

  it('solid بلا شرطات', () => {
    expect(resolveCutLineDash('solid')).toEqual([]);
  });

  it('dotted نقاط قصيرة', () => {
    expect(resolveCutLineDash('dotted')).toEqual([2, 5]);
  });

  it('cropmarks بلا شرطات (زوايا منفصلة)', () => {
    expect(resolveCutLineDash('cropmarks')).toEqual([]);
  });

  it('القيم المجهولة تسقط على dashed', () => {
    expect(resolveCutLineDash(undefined)).toEqual([8, 8]);
    expect(resolveCutLineDash('wavy')).toEqual([8, 8]);
  });
});
