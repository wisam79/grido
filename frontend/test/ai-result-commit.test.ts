import { describe, it, expect, vi, beforeEach } from 'vitest';

import { commitAiImageResult, findLiveAiTarget } from '../src/lib/ai/ai-result-commit';
import { useEditorStore } from '../src/lib/editor-store';

const makeSlot = (over: Record<string, unknown> = {}) => ({
  id: 'slot-1',
  cellIndex: 0,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  imageSrc: '/img/a.png',
  ...over,
});

const makeElement = (over: Record<string, unknown> = {}) => ({
  id: 'el-1',
  type: 'image',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  imageSrc: '/img/a.png',
  ...over,
});

let pushHistory: ReturnType<typeof vi.fn>;

beforeEach(() => {
  pushHistory = vi.fn();
  // نستبدل pushHistory بمُراقب حتمي — سلوك السجل الفعلي مُغطّى في history-slice.test
  useEditorStore.setState({ elements: [], slots: [], pushHistory } as never);
});

describe('findLiveAiTarget — البحث في العناصر والخانات', () => {
  it('يجد عنصراً حراً في elements', () => {
    useEditorStore.setState({ elements: [makeElement()], slots: [] } as never);
    expect(findLiveAiTarget('el-1')).toMatchObject({ id: 'el-1', imageSrc: '/img/a.png' });
  });

  it('يجد خانة كولاج في slots', () => {
    useEditorStore.setState({ elements: [], slots: [makeSlot()] } as never);
    expect(findLiveAiTarget('slot-1')).toMatchObject({ id: 'slot-1', imageSrc: '/img/a.png' });
  });

  it('يعيد undefined عند غياب المعرّف من المجموعتين', () => {
    useEditorStore.setState({ elements: [makeElement()], slots: [makeSlot()] } as never);
    expect(findLiveAiTarget('missing')).toBeUndefined();
  });
});

describe('commitAiImageResult — حارس الطزاثة والتطبيق', () => {
  it('not-found: لا يطبّق ولا يدفع تراجعاً إن اختفى الهدف', () => {
    const onUpdate = vi.fn();
    const status = commitAiImageResult(
      { id: 'missing', imageSrc: '/img/a.png' },
      '/img/new.png',
      onUpdate,
    );
    expect(status).toBe('not-found');
    expect(onUpdate).not.toHaveBeenCalled();
    expect(pushHistory).not.toHaveBeenCalled();
  });

  it('changed: لا يطبّق إن تغيّرت صورة الهدف أثناء المعالجة', () => {
    useEditorStore.setState({ slots: [makeSlot({ imageSrc: '/img/swapped.png' })] } as never);
    const onUpdate = vi.fn();
    const status = commitAiImageResult(
      { id: 'slot-1', imageSrc: '/img/a.png' },
      '/img/new.png',
      onUpdate,
    );
    expect(status).toBe('changed');
    expect(onUpdate).not.toHaveBeenCalled();
    expect(pushHistory).not.toHaveBeenCalled();
  });

  it('ok: يطبّق على خانة كولاج ويحفظ الصورة الأصلية في أول تعديل', () => {
    useEditorStore.setState({ slots: [makeSlot()] } as never);
    const onUpdate = vi.fn();
    const status = commitAiImageResult(
      { id: 'slot-1', imageSrc: '/img/a.png' },
      '/img/new.png',
      onUpdate,
    );
    expect(status).toBe('ok');
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: '/img/new.png',
      originalImageSrc: '/img/a.png',
    });
    expect(pushHistory).toHaveBeenCalledTimes(1);
  });

  it('ok: لا يستبدل originalImageSrc إن كان محفوظاً مسبقاً', () => {
    useEditorStore.setState({
      slots: [makeSlot({ originalImageSrc: '/img/orig.png' })],
    } as never);
    const onUpdate = vi.fn();
    const status = commitAiImageResult(
      { id: 'slot-1', imageSrc: '/img/a.png' },
      '/img/new.png',
      onUpdate,
    );
    expect(status).toBe('ok');
    // لا مفتاح originalImageSrc إطلاقاً — التطابق الصارم يثبت غيابه
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', { imageSrc: '/img/new.png' });
  });

  it('preserves existing callers with nonzero collage offsets when dimensions are omitted', () => {
    useEditorStore.setState({ slots: [makeSlot({ dragX: 80, dragY: -20 })] } as never);
    const onUpdate = vi.fn();
    commitAiImageResult({ id: 'slot-1', imageSrc: '/img/a.png' }, '/img/new.png', onUpdate);
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: '/img/new.png',
      originalImageSrc: '/img/a.png',
    });
  });

  it('scales live collage pans and commits them with the image in one history step', () => {
    const target = { id: 'slot-1', imageSrc: '/img/a.png' };
    useEditorStore.setState({ slots: [makeSlot({ dragX: 80, dragY: -20 })] } as never);
    // The user pans and edits presentation while enhancement is pending.
    useEditorStore.getState().updateSlot('slot-1', {
      dragX: 120,
      dragY: -35,
      zoom: 1.8,
      rotation: 90,
      flipX: true,
    });
    const onUpdate = vi.fn((id, patch) => useEditorStore.getState().updateSlot(id, patch));
    const status = commitAiImageResult(target, '/img/new.png', onUpdate, {
      source: { width: 1000, height: 750 },
      result: { width: 2000, height: 1500 },
    });
    expect(status).toBe('ok');
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: '/img/new.png',
      originalImageSrc: '/img/a.png',
      dragX: 240,
      dragY: -70,
    });
    expect(useEditorStore.getState().slots[0]).toMatchObject({
      dragX: 240,
      dragY: -70,
      zoom: 1.8,
      rotation: 90,
      flipX: true,
    });
    expect(pushHistory).toHaveBeenCalledTimes(1);
  });

  it('uses actual source/result ratios rather than doubling uploaded or original-image dimensions', () => {
    useEditorStore.setState({
      slots: [makeSlot({ dragX: 500, dragY: -250, originalImageSrc: '/img/older.png' })],
    } as never);
    const onUpdate = vi.fn();
    commitAiImageResult({ id: 'slot-1', imageSrc: '/img/a.png' }, '/img/new.png', onUpdate, {
      source: { width: 5000, height: 2500 },
      result: { width: 4096, height: 2048 },
    });
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: '/img/new.png',
      dragX: 409.6,
      dragY: -204.8,
    });
  });

  it.each([0, -1, NaN, Infinity])(
    'rejects invalid dimensions (%s) before commit/history',
    (width) => {
      useEditorStore.setState({ slots: [makeSlot({ dragX: 80 })] } as never);
      const onUpdate = vi.fn();
      expect(() =>
        commitAiImageResult({ id: 'slot-1', imageSrc: '/img/a.png' }, '/img/new.png', onUpdate, {
          source: { width, height: 750 },
          result: { width: 2000, height: 1500 },
        }),
      ).toThrow();
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pushHistory).not.toHaveBeenCalled();
    },
  );

  it('rejects nonfinite pan values before commit/history', () => {
    useEditorStore.setState({ slots: [makeSlot({ dragX: Infinity })] } as never);
    const onUpdate = vi.fn();
    expect(() =>
      commitAiImageResult({ id: 'slot-1', imageSrc: '/img/a.png' }, '/img/new.png', onUpdate, {
        source: { width: 1000, height: 750 },
        result: { width: 2000, height: 1500 },
      }),
    ).toThrow();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(pushHistory).not.toHaveBeenCalled();
  });

  it('keeps stale-result checks ahead of resize validation', () => {
    useEditorStore.setState({ slots: [makeSlot({ imageSrc: '/img/replaced.png' })] } as never);
    const onUpdate = vi.fn();
    expect(
      commitAiImageResult({ id: 'slot-1', imageSrc: '/img/a.png' }, '/img/new.png', onUpdate, {
        source: { width: 0, height: 0 },
        result: { width: 0, height: 0 },
      }),
    ).toBe('changed');
    expect(onUpdate).not.toHaveBeenCalled();
    expect(pushHistory).not.toHaveBeenCalled();
  });

  it('does not resize freeform geometry even when resize metadata is supplied', () => {
    const original = makeElement({ width: 0.4, height: 0.3, rotation: 90 });
    useEditorStore.setState({ elements: [original], slots: [] } as never);
    const onUpdate = vi.fn();
    commitAiImageResult({ id: 'el-1', imageSrc: '/img/a.png' }, '/img/new.png', onUpdate, {
      source: { width: 1000, height: 750 },
      result: { width: 2000, height: 1500 },
    });
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('el-1', {
      imageSrc: '/img/new.png',
      originalImageSrc: '/img/a.png',
    });
  });

  it('ok: يطبّق على عنصر حر ويحفظ الصورة الأصلية', () => {
    useEditorStore.setState({ elements: [makeElement()], slots: [] } as never);
    const onUpdate = vi.fn();
    const status = commitAiImageResult(
      { id: 'el-1', imageSrc: '/img/a.png' },
      '/img/new.png',
      onUpdate,
    );
    expect(status).toBe('ok');
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('el-1', {
      imageSrc: '/img/new.png',
      originalImageSrc: '/img/a.png',
    });
    expect(pushHistory).toHaveBeenCalledTimes(1);
  });
});
