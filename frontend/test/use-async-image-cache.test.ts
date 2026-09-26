import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useAsyncImage,
  invalidateImageCache,
  preloadImageIntoCache,
} from '../src/hooks/use-async-image';

/**
 * انحدار كاش صور الواجهة (M-3 — تحصين useAsyncImage):
 *  - الطرد عند بلوغ الحد (100) يُسقط مرجع الكاش فقط ولا يُفرغ src
 *    الكائن الحي الذي قد تكون عقدة Konva تعرضه حالياً.
 *  - إصابة الكاش تُحدّث حداثة LRU (لا FIFO بتاريخ الإدراج الأول).
 *  - الإبطال (جزئي/كامل) يُفرغ الكاش فعلاً دون لمس الكائنات الحية.
 */

// ── محاكاة Image في jsdom: تحميل فوري + تسجيل كل src مُسند ──
// (عدد الإسنادات = عدد التحميلات الفعلية؛ الإصابة لا تُسند شيئاً)
const assignedSrcs: string[] = [];

class MockImage {
  onload: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  complete = false;
  crossOrigin: string | null = null;
  private _src = '';
  decode() {
    return Promise.resolve();
  }
  set src(v: string) {
    this._src = v;
    assignedSrcs.push(v);
    queueMicrotask(() => {
      this.complete = true;
      this.onload?.({ target: this });
    });
  }
  get src() {
    return this._src;
  }
}

const RealImage = globalThis.Image;

beforeEach(() => {
  assignedSrcs.length = 0;
  globalThis.Image = MockImage as unknown as typeof Image;
  // حالة بداية حتمية: إفراغ الكاش الوحيد المشترك بين اختبارات الملف
  invalidateImageCache();
});

afterEach(() => {
  globalThis.Image = RealImage;
  invalidateImageCache();
});

let seq = 0;
const fresh = (label: string) => `https://cache-test.invalid/${label}-${seq++}.png`;

async function loadViaHook(src: string) {
  const { result, unmount } = renderHook(() => useAsyncImage(src));
  await waitFor(() => expect(result.current[1]).toBe('loaded'));
  const img = result.current[0];
  unmount();
  return img;
}

async function fillCache(n: number, tag: string) {
  for (let i = 0; i < n; i++) {
    await preloadImageIntoCache(fresh(`${tag}-${i}`));
  }
}

describe('useAsyncImage — كاش LRU', () => {
  it('الطرد عند الحد يُسقط المرجع دون تصفير src الصورة الحية', async () => {
    const victim = fresh('victim');
    const liveImg = await loadViaHook(victim);
    expect(liveImg?.src).toBe(victim);

    // تجاوز الحد (100) بكثير لطرد victim حتماً من أي حالة بداية
    await fillCache(150, 'filler');

    // الكائن الحي الذي تعرضه الكانفس لم يُمسّ
    expect(liveImg?.src).toBe(victim);

    // لكن مرجع الكاش سقط فعلاً: إعادة الطلب تُعيد التحميل من جديد
    const before = assignedSrcs.length;
    await loadViaHook(victim);
    expect(assignedSrcs.slice(before)).toEqual([victim]);
  });

  it('الإصابة تُحدّث حداثة LRU: الملموس حديثاً ينجو والمهمل يُطرد', async () => {
    const oldSrc = fresh('old');
    const hotSrc = fresh('hot');
    await loadViaHook(oldSrc);
    await loadViaHook(hotSrc);

    // لمس hot ليصبح الأحدث استخداماً
    await preloadImageIntoCache(hotSrc);

    // الكاش الآن [old, hot] + 99 مادة مالئة = 101 ⇒ طرد واحد لأقدم مفتاح
    await fillCache(99, 'fill');

    const before = assignedSrcs.length;
    await loadViaHook(hotSrc); // إصابة — بلا أي تحميل جديد
    expect(assignedSrcs.length).toBe(before);

    await loadViaHook(oldSrc); // miss — تحميل جديد واحد فقط
    expect(assignedSrcs.slice(before)).toEqual([oldSrc]);
  });

  it('invalidateImageCache (جزئي/كامل) يُفرغ الكاش دون لمس الكائن الحي', async () => {
    const src = fresh('live');
    const liveImg = await loadViaHook(src);

    invalidateImageCache(src);
    invalidateImageCache();
    expect(liveImg?.src).toBe(src);

    // الكاش فُرّغ فعلاً: إعادة الطلب تُعيد التحميل
    const before = assignedSrcs.length;
    await loadViaHook(src);
    expect(assignedSrcs.slice(before)).toEqual([src]);
  });
});
