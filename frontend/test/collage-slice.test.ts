import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { COLLAGE_TEMPLATES } from '../src/lib/templates/collage-templates';

// محاكاة Image بأبعاد تعكس اسم الصورة (portrait=أطول، landscape=أعرض)
// — يتيح اختبار منطق إعادة ضبط القص عند تغيّر نسبة الأبعاد
class FakeImage {
  width = 10;
  height = 20;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';
  set src(v: string) {
    this._src = v;
    if (v.includes('landscape')) {
      this.width = 20;
      this.height = 10;
    } else {
      this.width = 10;
      this.height = 20;
    }
    queueMicrotask(() => this.onload?.());
  }
  get src() {
    return this._src;
  }
}

// إعداد مشترك: تطبيق قالب الكولاج وإرجاع أول فتحة — يزيل تكرار كتل الإعداد عبر الاختبارات
function setupCollage() {
  const tmpl = COLLAGE_TEMPLATES[0];
  useEditorStore.getState().setCollageTemplate(tmpl);
  return useEditorStore.getState().slots[0];
}

describe('CollageSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.stubGlobal('Image', FakeImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets collage template and updates slots', () => {
    const tmpl = COLLAGE_TEMPLATES[0];
    useEditorStore.getState().setCollageTemplate(tmpl);

    expect(useEditorStore.getState().collageTemplate?.id).toBe(tmpl.id);
    expect(useEditorStore.getState().slots.length).toBeGreaterThan(0);
  });

  it('updates slot properties', () => {
    const firstSlot = setupCollage();

    useEditorStore.getState().updateSlot(firstSlot.id, { imageSrc: 'photo.jpg' });

    const updated = useEditorStore.getState().slots.find((s) => s.id === firstSlot.id);
    expect(updated?.imageSrc).toBe('photo.jpg');
  });

  it('sets slot image directly', () => {
    const firstSlot = setupCollage();

    useEditorStore.getState().setSlotImage(firstSlot.id, 'pic.png');

    const updated = useEditorStore.getState().slots.find((s) => s.id === firstSlot.id);
    expect(updated?.imageSrc).toBe('pic.png');
  });

  it('fills all slots with specified image', () => {
    const firstSlot = setupCollage();

    useEditorStore.getState().fillAllSlots('fill.jpg', firstSlot.id);

    const allSlots = useEditorStore.getState().slots;
    expect(allSlots.every((s) => s.imageSrc === 'fill.jpg')).toBe(true);
  });

  it('clears all slots image data', () => {
    const firstSlot = setupCollage();

    useEditorStore.getState().setSlotImage(firstSlot.id, 'pic.png');

    useEditorStore.getState().clearSlots();

    const allSlots = useEditorStore.getState().slots;
    expect(allSlots.every((s) => !s.imageSrc)).toBe(true);
  });

  it('assigns multiple slot images in one batch', () => {
    const state = useEditorStore.getState();
    const tmpl = COLLAGE_TEMPLATES[0];
    state.setCollageTemplate(tmpl);
    const slots = useEditorStore.getState().slots;
    const before = useEditorStore.getState().historyIndex;

    useEditorStore.getState().setSlotImagesBatch([
      { slotId: slots[0].id, src: 'a.jpg' },
      { slotId: slots[1].id, src: 'b.jpg' },
    ], 'b.jpg');

    const after = useEditorStore.getState();
    expect(after.slots[0].imageSrc).toBe('a.jpg');
    expect(after.slots[1].imageSrc).toBe('b.jpg');
    expect(after.lastEditedImage).toBe('b.jpg');
    // دفعة واحدة = خطوة تراجع واحدة فقط
    expect(after.historyIndex).toBe(before + 1);
  });

  it('resets zoom and drag of replaced slots whose aspect changed', async () => {
    const state = useEditorStore.getState();
    const tmpl = COLLAGE_TEMPLATES[0];
    state.setCollageTemplate(tmpl);
    const slots = useEditorStore.getState().slots;

    useEditorStore.getState().setSlotImage(slots[0].id, 'old-portrait.png');
    useEditorStore.getState().updateSlot(slots[0].id, { zoom: 1.5, dragX: 20, dragY: 10 });

    useEditorStore.getState().setSlotImagesBatch([
      { slotId: slots[0].id, src: 'new-landscape.png' },
    ], 'new-landscape.png');

    // ‏الانتظار حتى اكتمال قياس الأبعاد غير المتزامن
    await new Promise((r) => setTimeout(r, 50));

    const updated = useEditorStore.getState().slots.find((s) => s.id === slots[0].id);
    expect(updated?.zoom).toBe(1);
    expect(updated?.dragX).toBe(0);
    expect(updated?.dragY).toBe(0);
  });

  it('setTemplate preserves history and allows undo', () => {
    const initialHistoryLen = useEditorStore.getState().history.length;
    
    useEditorStore.getState().setTemplate({
      id: 'tmpl-1',
      name: 'Single 4x6',
      width: 1200,
      height: 1800,
      background: '#FFFFFF',
      slots: 1,
    } as any);

    expect(useEditorStore.getState().history.length).toBeGreaterThan(initialHistoryLen);
    expect(useEditorStore.getState().mode).toBe('single');

    // تراجع (Undo)
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().mode).toBe('collage');
  });
});
