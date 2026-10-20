import { beforeEach, describe, expect, it } from 'vitest';
import { getCachedImage, invalidateImageCache, setWithLRU } from './image-cache';

function fakeImage(width: number, height: number): HTMLImageElement {
  return { naturalWidth: width, naturalHeight: height, width, height } as HTMLImageElement;
}

describe('image-cache byte budget', () => {
  beforeEach(() => {
    invalidateImageCache();
  });

  it('evicts the oldest entry when the byte budget overflows', () => {
    // 4096×4096×4 = 64 MiB لكل صورة؛ الميزانية 256 MiB تستوعب أربعاً فقط.
    for (let i = 0; i < 5; i++) {
      setWithLRU(`big-${i}`, fakeImage(4096, 4096));
    }

    expect(getCachedImage('big-0')).toBeUndefined();
    expect(getCachedImage('big-1')).toBeDefined();
    expect(getCachedImage('big-4')).toBeDefined();
  });

  it('keeps a single entry even if it alone exceeds the byte budget', () => {
    setWithLRU('huge', fakeImage(20_000, 20_000));

    expect(getCachedImage('huge')).toBeDefined();
  });

  it('still enforces the entry-count cap for small images', () => {
    for (let i = 0; i < 101; i++) {
      setWithLRU(`small-${i}`, fakeImage(10, 10));
    }

    expect(getCachedImage('small-0')).toBeUndefined();
    expect(getCachedImage('small-100')).toBeDefined();
  });

  it('releases byte accounting when entries are invalidated', () => {
    for (let i = 0; i < 4; i++) {
      setWithLRU(`big-${i}`, fakeImage(4096, 4096));
    }
    invalidateImageCache('big-0');

    // لو لم تُطرح بايتات الإدخال المحذوف لكانت الإضافة التالية فوق الميزانية
    // وطردت big-1 رغم وجود مساحة كافية بعد الحذف.
    setWithLRU('big-4', fakeImage(4096, 4096));

    expect(getCachedImage('big-1')).toBeDefined();
    expect(getCachedImage('big-4')).toBeDefined();
  });

  it('clears the budget on a full invalidation', () => {
    for (let i = 0; i < 4; i++) {
      setWithLRU(`big-${i}`, fakeImage(4096, 4096));
    }
    invalidateImageCache();

    for (let i = 0; i < 4; i++) {
      setWithLRU(`next-${i}`, fakeImage(4096, 4096));
    }

    expect(getCachedImage('next-0')).toBeDefined();
  });
});
