import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { commitAiImageResult, findLiveAiTarget } from '../src/lib/ai/ai-result-commit';

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
