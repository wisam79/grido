import { describe, it, expect, afterEach } from 'vitest';
import { snapGuidePosToPixel } from '../src/components/editor/canvas/use-user-guides';

/**
 * اختبارات تثبيت موضع الخط الإرشادي على حافة بكسل مادية (device pixel).
 * الغاية: الخط يُرسم دائماً بسماكة 1px حادة — لا تموّج subpixel يعطي
 * سمكاً متغيراً (2px ضبابي / 1px حاد) حسب موضع الإفلات.
 */

const setDpr = (value: number) => {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value,
  });
};

afterEach(() => {
  setDpr(1);
});

describe('snapGuidePosToPixel — تثبيت الخط الإرشادي على حافة بكسل مادية', () => {
  it('dpr = 1: يقرّب إلى أقرب بكسل صحيح', () => {
    setDpr(1);
    // 348.37px من أصل 512px → 348 / 512
    const pos = snapGuidePosToPixel(348.37 / 512, 512);
    expect(pos).toBeCloseTo(348 / 512, 12);
  });

  it('dpr = 1.25 (Windows 125%): يقرّب إلى أقرب حافة بكسل مادية', () => {
    setDpr(1.25);
    const displayDim = 512;
    const pos = snapGuidePosToPixel(348.37 / displayDim, displayDim);
    // الموضع الناتج * displayDim * dpr يجب أن يكون عدداً صحيحاً
    expect(pos * displayDim * 1.25).toBeCloseTo(Math.round(pos * displayDim * 1.25), 9);
    // لا يبتعد عن الأصل بأكثر من نصف بكسل مادي
    expect(Math.abs(pos - 348.37 / displayDim)).toBeLessThanOrEqual(
      0.5 / displayDim / 1.25 + 1e-12,
    );
  });

  it('dpr = 1.5 (Windows 150%): يقرّب إلى أقرب حافة بكسل مادية', () => {
    setDpr(1.5);
    const displayDim = 700;
    const raw = 214.618 / displayDim;
    const pos = snapGuidePosToPixel(raw, displayDim);
    expect(pos * displayDim * 1.5).toBeCloseTo(Math.round(pos * displayDim * 1.5), 9);
  });

  it('النتيجة دائماً على شبكة 1/(displayDim·dpr) لأي إدخال عشوائي', () => {
    for (const dpr of [1, 1.25, 1.5, 2]) {
      setDpr(dpr);
      const displayDim = 813.7; // عرض كسري (زوم)
      for (const raw of [0.13, 0.3333, 0.5, 0.77777, 0.99999]) {
        const pos = snapGuidePosToPixel(raw, displayDim);
        const devicePx = pos * displayDim * dpr;
        expect(Math.abs(devicePx - Math.round(devicePx))).toBeLessThan(1e-9);
      }
    }
  });

  it('حدود النطاق: 0 و1 يبقيان مطابقين تماماً', () => {
    setDpr(1.25);
    expect(snapGuidePosToPixel(0, 600)).toBe(0);
    expect(snapGuidePosToPixel(1, 600)).toBe(1);
  });

  it('أبعاد غير صالحة (0 أو سالب) تعيد الإدخال كما هو بلا انفجار', () => {
    setDpr(1);
    expect(snapGuidePosToPixel(0.42, 0)).toBe(0.42);
    expect(snapGuidePosToPixel(0.42, -100)).toBe(0.42);
  });
});
