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

// شبكة 2×2 بمعرّفات ثابتة: a/b في صف واحد، a/c في عمود واحد، d منفصلة
function setupSlotGrid() {
  setupCollage();
  const base = useEditorStore.getState().slots[0];
  useEditorStore.setState({
    slots: [
      { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.3, h: 0.3, imageSrc: undefined },
      { ...base, id: 'b', cellIndex: 1, x: 0.5, y: 0.0004, w: 0.3, h: 0.3, imageSrc: undefined },
      { ...base, id: 'c', cellIndex: 2, x: 0, y: 0.5, w: 0.3, h: 0.3, imageSrc: undefined },
      { ...base, id: 'd', cellIndex: 3, x: 0.6, y: 0.6, w: 0.3, h: 0.3, imageSrc: undefined },
    ],
  });
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

  it('resizes one slot atomically and preserves manual geometry on undo/redo', () => {
    const current = useEditorStore.getState();
    const base = current.slots[0];
    const firstSlot = { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.3, h: 0.3 };
    useEditorStore.setState({
      collageTemplate: {
        ...current.collageTemplate!,
        slots: 2,
        cells: [
          { x: 0, y: 0, w: 0.3, h: 0.3 },
          { x: 0.5, y: 0, w: 0.3, h: 0.3 },
        ],
        physicalLayout: { type: 'visa', rows: 1, cols: 2 },
      },
      slots: [firstSlot, { ...base, id: 'b', cellIndex: 1, x: 0.5, y: 0, w: 0.3, h: 0.3 }],
      collageGap: 12,
      collageMargin: 8,
    });
    useEditorStore.getState().pushHistory();
    const historyBefore = useEditorStore.getState().historyIndex;

    const resizeResult = useEditorStore.getState().resizeCollageSlot(firstSlot.id, 0.2, 0.3);
    expect(resizeResult).toEqual({ ok: true });

    const resized = useEditorStore.getState();
    expect(resized.slots[0]).toMatchObject({ w: 0.2, h: 0.3, x: firstSlot.x, y: firstSlot.y });
    expect(resized.slots[0].id).toBe(firstSlot.id);
    expect(resized.collageTemplate?.cells[0]).toMatchObject({ w: 0.2, h: 0.3 });
    expect(resized.collageTemplate?.physicalLayout).toBeUndefined();
    expect(resized.collageGap).toBe(0);
    expect(resized.collageMargin).toBe(0);
    expect(resized.historyIndex).toBe(historyBefore + 1);

    resized.undo();
    expect(useEditorStore.getState().slots[0]).toMatchObject({ w: firstSlot.w, h: firstSlot.h });
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().slots[0]).toMatchObject({ w: 0.2, h: 0.3 });
  });

  it('applies a slot size to all cells in one history step without moving them', () => {
    const firstSlot = setupCollage();
    const positions = useEditorStore.getState().slots.map(({ x, y }) => ({ x, y }));
    useEditorStore.getState().resizeCollageSlot(firstSlot.id, firstSlot.w * 0.8, firstSlot.h * 0.9);
    const historyBefore = useEditorStore.getState().historyIndex;
    const source = useEditorStore.getState().slots[0];

    expect(useEditorStore.getState().applyCollageSlotSizeToAll(firstSlot.id).ok).toBe(true);

    const updated = useEditorStore.getState();
    expect(updated.slots.every((slot) => slot.w === source.w && slot.h === source.h)).toBe(true);
    expect(updated.slots.map(({ x, y }) => ({ x, y }))).toEqual(positions);
    expect(updated.historyIndex).toBe(historyBefore + 1);
  });

  it('rejects apply-to-all when the size would leave the paper', () => {
    const slots = setupCollage();
    useEditorStore.getState().updateSlot(slots.id, { w: 0.95, h: 0.95 });
    const before = useEditorStore.getState();
    const historyBefore = before.historyIndex;

    const result = useEditorStore.getState().applyCollageSlotSizeToAll(slots.id);
    expect(result).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(useEditorStore.getState().slots).toBe(before.slots);
    expect(useEditorStore.getState().historyIndex).toBe(historyBefore);
  });

  it('displaces a neighbor when resize causes overlap and there is room', () => {
    const base = setupCollage();
    useEditorStore.setState({
      collageTemplate: null,
      collageGap: 0,
      collageMargin: 0,
      slots: [
        { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.3, h: 0.3 },
        { ...base, id: 'b', cellIndex: 1, x: 0.4, y: 0, w: 0.3, h: 0.3 },
      ],
    });
    const historyBefore = useEditorStore.getState().historyIndex;

    const result = useEditorStore.getState().resizeCollageSlot('a', 0.45, 0.3);

    expect(result).toEqual({ ok: true });
    const state = useEditorStore.getState();
    expect(state.slots[0]).toMatchObject({ w: 0.45, h: 0.3 });
    // الخلية 'b' تُزاح لليمين بمقدار التداخل (0.05) + التباعد الأصلي (0.1) = 0.15
    expect(state.slots[1]).toMatchObject({ x: 0.55, w: 0.3, h: 0.3 });
    expect(state.historyIndex).toBe(historyBefore + 1);
  });

  it('preserves gap between cells during displacement', () => {
    const base = setupCollage();
    useEditorStore.setState({
      collageTemplate: null,
      collageGap: 20,
      collageMargin: 10,
      slots: [
        { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.3, h: 0.3 },
        { ...base, id: 'b', cellIndex: 1, x: 0.4, y: 0, w: 0.3, h: 0.3 },
      ],
    });

    const result = useEditorStore.getState().resizeCollageSlot('a', 0.45, 0.3);

    expect(result).toEqual({ ok: true });
    const state = useEditorStore.getState();
    // التحقق من أن التباعد بين الخليتين محفوظ
    const gap = state.slots[1].x - (state.slots[0].x + state.slots[0].w);
    expect(gap).toBeGreaterThan(0.09); // التباعد الأصلي كان 0.1
  });

  it('moves a vertically separated neighbor when their horizontal ranges already overlap', () => {
    const base = setupCollage();
    useEditorStore.setState({
      collageTemplate: null,
      collageGap: 0,
      collageMargin: 0,
      slots: [
        { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.6, h: 0.1 },
        { ...base, id: 'b', cellIndex: 1, x: 0.4, y: 0.2, w: 0.35, h: 0.1 },
      ],
    });

    // تكبير ارتفاع A يخلق تداخلاً عمودياً. بما أن التداخل الأفقي أصغر،
    // تُزاح B أفقياً رغم أن الخليتين كانتا متداخلتين أفقياً قبل التكبير.
    const result = useEditorStore.getState().resizeCollageSlot('a', 0.6, 0.8);

    expect(result).toEqual({ ok: true });
    const state = useEditorStore.getState();
    expect(state.slots.find((slot) => slot.id === 'b')?.x).toBeCloseTo(0.6);
    expect(state.slots[0]).toMatchObject({ w: 0.6, h: 0.8 });
  });

  it('rejects resize when displacement would push neighbor out of bounds', () => {
    const base = setupCollage();
    useEditorStore.setState({
      collageTemplate: null,
      collageGap: 0,
      collageMargin: 0,
      slots: [
        { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.3, h: 0.3 },
        { ...base, id: 'b', cellIndex: 1, x: 0.4, y: 0, w: 0.55, h: 0.3 }, // 'b' at right edge
      ],
    });
    const before = useEditorStore.getState();
    const historyBefore = before.historyIndex;

    // Resize 'a' to 0.5 — overlap 0.1 + original gap 0.1 = displacement 0.2
    // 'b' pushed to x=0.6, right edge = 1.15 > 1 → rejected
    const result = useEditorStore.getState().resizeCollageSlot('a', 0.5, 0.3);

    expect(result).toEqual({ ok: false, reason: 'overlap' });
    expect(useEditorStore.getState().slots).toBe(before.slots);
    expect(useEditorStore.getState().historyIndex).toBe(historyBefore);
  });

  it('rejects apply-to-all when the uniform size would overlap cells', () => {
    const base = setupCollage();
    useEditorStore.setState({
      collageTemplate: null,
      collageGap: 0,
      collageMargin: 0,
      slots: [
        { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.4, h: 0.3 },
        { ...base, id: 'b', cellIndex: 1, x: 0.35, y: 0.5, w: 0.2, h: 0.3 },
        { ...base, id: 'c', cellIndex: 2, x: 0.6, y: 0.5, w: 0.2, h: 0.3 },
      ],
    });
    const before = useEditorStore.getState();
    const historyBefore = before.historyIndex;

    const result = useEditorStore.getState().applyCollageSlotSizeToAll('a');

    expect(result).toEqual({ ok: false, reason: 'overlap' });
    expect(useEditorStore.getState().slots).toBe(before.slots);
    expect(useEditorStore.getState().historyIndex).toBe(historyBefore);
  });

  it('rejects resize for unknown slot, invalid dimensions, and NaN', () => {
    const firstSlot = setupCollage();
    const store = useEditorStore.getState();
    const before = store.historyIndex;

    expect(store.resizeCollageSlot('nonexistent', 0.3, 0.3)).toEqual({
      ok: false,
      reason: 'not-found',
    });
    expect(store.resizeCollageSlot(firstSlot.id, 0, 0.3)).toEqual({ ok: false, reason: 'invalid' });
    expect(store.resizeCollageSlot(firstSlot.id, 0.3, -1)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(store.resizeCollageSlot(firstSlot.id, NaN, 0.3)).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(useEditorStore.getState().historyIndex).toBe(before);
  });

  it('returns ok without pushing history when resizing to the same dimensions', () => {
    const firstSlot = setupCollage();
    const historyBefore = useEditorStore.getState().historyIndex;

    const result = useEditorStore
      .getState()
      .resizeCollageSlot(firstSlot.id, firstSlot.w, firstSlot.h);

    expect(result).toEqual({ ok: true });
    expect(useEditorStore.getState().historyIndex).toBe(historyBefore);
  });

  it('clears physicalLayout and zeroes gap/margin even without a prior physical template', () => {
    const base = setupCollage();
    useEditorStore.setState({
      collageTemplate: {
        ...useEditorStore.getState().collageTemplate!,
        slots: 2,
        cells: [
          { x: 0, y: 0, w: 0.3, h: 0.3 },
          { x: 0.5, y: 0, w: 0.3, h: 0.3 },
        ],
      },
      collageGap: 10,
      collageMargin: 5,
      slots: [
        { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.3, h: 0.3 },
        { ...base, id: 'b', cellIndex: 1, x: 0.5, y: 0, w: 0.3, h: 0.3 },
      ],
    });

    const result = useEditorStore.getState().resizeCollageSlot('a', 0.2, 0.3);

    expect(result).toEqual({ ok: true });
    const state = useEditorStore.getState();
    expect(state.collageTemplate?.physicalLayout).toBeUndefined();
    expect(state.collageGap).toBe(0);
    expect(state.collageMargin).toBe(0);
  });

  it('clamps the physical-layout margin like manual layouts so cells stay positive', () => {
    const tmpl = COLLAGE_TEMPLATES.find((t) => t.physicalLayout?.type === 'iq-national-id')!;
    // ورقة 4×6 إنش (102×152 مم) — هامش 100 مم كان يولّد خلايا سالبة على هذا القياس
    useEditorStore.setState({
      mode: 'collage',
      collageTemplate: tmpl,
      canvasWidth: 1205,
      canvasHeight: 1800,
    });
    const hugeMarginPx = (100 / 25.4) * 300;

    useEditorStore.getState().previewCollageMargin(hugeMarginPx);
    const previewed = useEditorStore.getState().collageMargin;
    expect(previewed).toBeLessThan(hugeMarginPx);
    expect(previewed).toBeGreaterThan(0);

    useEditorStore.getState().commitCollageSpacing();
    const slots = useEditorStore.getState().slots;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.w > 0 && s.h > 0)).toBe(true);
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

  it('fills only the matching row and records one history step', () => {
    setupSlotGrid();
    const historyBefore = useEditorStore.getState().historyIndex;

    useEditorStore.getState().fillRowSlots('a', 'row.jpg');

    const slots = useEditorStore.getState().slots;
    expect(slots.find((s) => s.id === 'a')?.imageSrc).toBe('row.jpg');
    expect(slots.find((s) => s.id === 'b')?.imageSrc).toBe('row.jpg');
    expect(slots.find((s) => s.id === 'c')?.imageSrc).toBeUndefined();
    expect(slots.find((s) => s.id === 'd')?.imageSrc).toBeUndefined();
    expect(useEditorStore.getState().historyIndex).toBe(historyBefore + 1);
  });

  it('fills only the matching column and records one history step', () => {
    setupSlotGrid();
    const historyBefore = useEditorStore.getState().historyIndex;

    useEditorStore.getState().fillColumnSlots('a', 'column.jpg');

    const slots = useEditorStore.getState().slots;
    expect(slots.find((s) => s.id === 'a')?.imageSrc).toBe('column.jpg');
    expect(slots.find((s) => s.id === 'c')?.imageSrc).toBe('column.jpg');
    expect(slots.find((s) => s.id === 'b')?.imageSrc).toBeUndefined();
    expect(slots.find((s) => s.id === 'd')?.imageSrc).toBeUndefined();
    expect(useEditorStore.getState().historyIndex).toBe(historyBefore + 1);
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

    useEditorStore.getState().setSlotImagesBatch(
      [
        { slotId: slots[0].id, src: 'a.jpg' },
        { slotId: slots[1].id, src: 'b.jpg' },
      ],
      'b.jpg',
    );

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

    useEditorStore
      .getState()
      .setSlotImagesBatch([{ slotId: slots[0].id, src: 'new-landscape.png' }], 'new-landscape.png');

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

  it('normalizes and synchronizes selection state during template and collage switches', () => {
    // 1. تطبيق قالب فردي (single template) مع وجود صورة سابقة والتحقق من مزامنة selectedId و selectedIds
    useEditorStore.setState({ lastEditedImage: 'portrait.jpg', lastEditedImageAspect: 0.75 });
    useEditorStore.getState().setTemplate({
      id: 'tmpl-passport',
      name: 'Passport Photo',
      width: 1200,
      height: 1800,
      background: '#FFFFFF',
      slots: 1,
    } as any);

    const singleState = useEditorStore.getState();
    expect(singleState.elements.length).toBe(1);
    expect(singleState.selectedId).toBe(singleState.elements[0].id);
    expect(singleState.selectedIds).toEqual([singleState.elements[0].id]);

    // 2. التحويل إلى كولاج والتأكد من تصفير كل من selectedId و selectedIds بالكامل
    //    مع بقاء عناصر الوضع الحر سليمة (فصل الوضعين)
    useEditorStore.getState().setCollageTemplate(COLLAGE_TEMPLATES[0]);

    const collageState = useEditorStore.getState();
    expect(collageState.mode).toBe('collage');
    expect(collageState.elements.length).toBe(1);
    expect(collageState.selectedId).toBeNull();
    expect(collageState.selectedIds).toEqual([]);
  });

  describe('فصل الوضعين: الكولاج لا يمس الوضع الحر والعكس', () => {
    const freeElement = {
      id: 'free-1',
      type: 'text',
      text: 'تصميم حر',
      fontSize: 40,
      x: 0.1,
      y: 0.1,
      width: 0.4,
      height: 0.1,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
    } as any;

    it('تبديل قالب الكولاج من داخل الكولاج يُبقي عناصر الوضع الحر', () => {
      useEditorStore.setState({ elements: [freeElement], mode: 'collage' });
      useEditorStore.getState().setCollageTemplate(COLLAGE_TEMPLATES[1] ?? COLLAGE_TEMPLATES[0]);
      useEditorStore.getState().setCollageTemplate(COLLAGE_TEMPLATES[0]);

      const s = useEditorStore.getState();
      expect(s.elements).toHaveLength(1);
      expect(s.elements[0].id).toBe('free-1');

      // العودة للوضع الحر تجد التصميم كما هو
      s.setMode('single');
      expect(useEditorStore.getState().elements[0].id).toBe('free-1');
    });

    it('setTemplate لا يمسح خانات الكولاج ولا يستبدل تصميماً حراً قائماً', () => {
      useEditorStore.getState().setCollageTemplate(COLLAGE_TEMPLATES[0]);
      const slotId = useEditorStore.getState().slots[0].id;
      useEditorStore.getState().setSlotImage(slotId, 'collage.jpg');
      useEditorStore.setState({
        elements: [freeElement],
        lastEditedImage: 'portrait.jpg',
        lastEditedImageAspect: 0.75,
      });

      useEditorStore.getState().setTemplate({
        id: 'tmpl-2',
        name: 'Single',
        width: 1200,
        height: 1800,
        background: '#FFFFFF',
        slots: 1,
      } as any);

      const s = useEditorStore.getState();
      expect(s.mode).toBe('single');
      expect(s.elements).toHaveLength(1);
      expect(s.elements[0].id).toBe('free-1');
      expect(s.slots.find((sl) => sl.id === slotId)?.imageSrc).toBe('collage.jpg');
    });

    it('عزل مقاس الورقة ولون الخلفية تماماً بين الوضع الحر والكولاج', () => {
      // 1. إعداد الوضع الحر بمقاس وخلفية مخصصين
      useEditorStore.getState().setMode('single');
      useEditorStore.getState().setCanvasSize(1000, 800);
      useEditorStore.getState().setBackgroundColor('#FF0000');

      let s = useEditorStore.getState();
      expect(s.canvasWidth).toBe(1000);
      expect(s.canvasHeight).toBe(800);
      expect(s.backgroundColor).toBe('#FF0000');

      // 2. التبديل إلى الكولاج وتغيير المقاس والخلفية
      useEditorStore.getState().setMode('collage');
      useEditorStore.getState().setCanvasSize(2480, 3508);
      useEditorStore.getState().setBackgroundColor('#00FF00');

      s = useEditorStore.getState();
      expect(s.canvasWidth).toBe(2480);
      expect(s.canvasHeight).toBe(3508);
      expect(s.backgroundColor).toBe('#00FF00');

      // 3. العودة للوضع الحر: استعادة مقاس وخلفية الوضع الحر دون تأثر بتغييرات الكولاج
      useEditorStore.getState().setMode('single');
      s = useEditorStore.getState();
      expect(s.canvasWidth).toBe(1000);
      expect(s.canvasHeight).toBe(800);
      expect(s.backgroundColor).toBe('#FF0000');

      // 4. العودة للكولاج: استعادة مقاس وخلفية الكولاج
      useEditorStore.getState().setMode('collage');
      s = useEditorStore.getState();
      expect(s.canvasWidth).toBe(2480);
      expect(s.canvasHeight).toBe(3508);
      expect(s.backgroundColor).toBe('#00FF00');
    });
  });

  describe('إضافة خلية مجاورة مباشرة عبر أزرار (+) حول الخلية المحددة', () => {
    it('يضيف خلية مجاورة بنفس المقاس الفيزيائي وينسخ صورة الخلية المحددة وينقل التحديد إليها', () => {
      useEditorStore.setState({
        mode: 'collage',
        canvasWidth: 1000,
        canvasHeight: 1000,
        collageMargin: 0,
        collageGap: 0,
        collageTemplate: {
          id: 'collage-custom',
          name: 'مخصص',
          slots: 1,
          cells: [{ x: 0.1, y: 0.1, w: 0.3, h: 0.4 }],
        },
        slots: [
          {
            id: 'slot-1',
            cellIndex: 0,
            x: 0.1,
            y: 0.1,
            w: 0.3,
            h: 0.4,
            imageSrc: 'id-photo.jpg',
            filter: 'bw',
            brightness: 110,
            contrast: 105,
            saturation: 90,
            zoom: 1.25,
            dragX: 12,
            dragY: -8,
            flipX: true,
            flipY: false,
            rotation: 90,
          },
        ],
        selectedId: 'slot-1',
        selectedIds: ['slot-1'],
      });
      const historyBefore = useEditorStore.getState().historyIndex;

      const res = useEditorStore.getState().addAdjacentCollageSlot('slot-1', 'right');
      expect(res.ok).toBe(true);

      const s = useEditorStore.getState();
      expect(s.slots).toHaveLength(2);
      const added = s.slots[1];
      expect(added.x).toBeCloseTo(0.4, 5);
      expect(added.y).toBeCloseTo(0.1, 5);
      expect(added.w).toBeCloseTo(0.3, 5);
      expect(added.h).toBeCloseTo(0.4, 5);
      expect(added.imageSrc).toBe('id-photo.jpg');
      expect(added.filter).toBe('bw');
      expect(added.brightness).toBe(110);
      expect(added.zoom).toBe(1.25);
      expect(added.flipX).toBe(true);
      expect(added.rotation).toBe(90);
      expect(s.selectedId).toBe(added.id);
      expect(s.selectedIds).toEqual([added.id]);
      expect(s.historyIndex).toBe(historyBefore + 1);
    });

    it('يرفض الإضافة عندما تتجاوز حدود الورقة أو تتصادم مع خلية قائمة', () => {
      useEditorStore.setState({
        mode: 'collage',
        canvasWidth: 1000,
        canvasHeight: 1000,
        collageMargin: 0,
        collageGap: 0,
        slots: [
          { id: 'slot-tl', cellIndex: 0, x: 0, y: 0, w: 0.4, h: 0.4 },
          { id: 'slot-tr', cellIndex: 1, x: 0.4, y: 0, w: 0.4, h: 0.4 },
        ],
      });

      // أعلى ويسار الخلية الأولى خارج حدود الورقة
      expect(useEditorStore.getState().addAdjacentCollageSlot('slot-tl', 'top')).toEqual({
        ok: false,
        reason: 'out-of-bounds',
      });
      expect(useEditorStore.getState().addAdjacentCollageSlot('slot-tl', 'left')).toEqual({
        ok: false,
        reason: 'out-of-bounds',
      });
      // يمين الخلية الأولى مشغول بـ slot-tr
      expect(useEditorStore.getState().addAdjacentCollageSlot('slot-tl', 'right')).toEqual({
        ok: false,
        reason: 'out-of-bounds',
      });
      // أسفل الخلية الأولى متاح وفارغ
      const bottomRes = useEditorStore.getState().addAdjacentCollageSlot('slot-tl', 'bottom');
      expect(bottomRes.ok).toBe(true);
      expect(useEditorStore.getState().slots).toHaveLength(3);
    });
  });

  describe('smart displacement upgrades', () => {
    it('يحفظ جميع الفجوات الأصلية في سلسلة الدومينو من 3 خلايا (A -> B -> C)', () => {
      const base = setupCollage();
      useEditorStore.setState({
        collageTemplate: null,
        collageGap: 0,
        collageMargin: 0,
        slots: [
          { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.2, h: 0.3 },
          { ...base, id: 'b', cellIndex: 1, x: 0.25, y: 0, w: 0.2, h: 0.3 },
          { ...base, id: 'c', cellIndex: 2, x: 0.5, y: 0, w: 0.2, h: 0.3 },
        ],
      });

      const result = useEditorStore.getState().resizeCollageSlot('a', 0.3, 0.3);
      expect(result).toEqual({ ok: true });

      const state = useEditorStore.getState();
      const slotA = state.slots.find((s) => s.id === 'a')!;
      const slotB = state.slots.find((s) => s.id === 'b')!;
      const slotC = state.slots.find((s) => s.id === 'c')!;

      expect(slotA.x).toBeCloseTo(0, 5);
      expect(slotB.x).toBeCloseTo(0.35, 5); // فجوة AB الأصلية (0.05) محفوظة
      expect(slotC.x).toBeCloseTo(0.6, 5); // فجوة BC الأصلية (0.05) محفوظة أيضاً
    });

    it('يدفع الجار الأفقي في نفس الصف أفقياً حتى لو كان التداخل الأفقي أكبر من العمودي أو ابتلعه بالكامل', () => {
      const base = setupCollage();
      useEditorStore.setState({
        collageTemplate: null,
        collageGap: 0,
        collageMargin: 0,
        slots: [
          { ...base, id: 'a', cellIndex: 0, x: 0, y: 0.1, w: 0.2, h: 0.2 },
          { ...base, id: 'b', cellIndex: 1, x: 0.25, y: 0.1, w: 0.2, h: 0.2 },
        ],
      });

      // تكبير عرض A إلى 0.55 يبتلع B بالكامل ويجعل overlapX > overlapY، ومع ذلك يجب إزاحة B أفقياً في نفس الصف
      const result = useEditorStore.getState().resizeCollageSlot('a', 0.55, 0.2);
      expect(result).toEqual({ ok: true });

      const slotB = useEditorStore.getState().slots.find((s) => s.id === 'b')!;
      expect(slotB.y).toBeCloseTo(0.1, 5);
      expect(slotB.x).toBeCloseTo(0.6, 5); // 0.55 + الفجوة الأصلية 0.05
    });

    it('يسمح بتكبير خلية على الحافة اليمنى عبر إزاحة ارتكازها للداخل ودفع جارها لليسار', () => {
      const base = setupCollage();
      useEditorStore.setState({
        collageTemplate: null,
        collageGap: 0,
        collageMargin: 0,
        slots: [
          { ...base, id: 'left', cellIndex: 0, x: 0.3, y: 0, w: 0.3, h: 0.3 },
          { ...base, id: 'right', cellIndex: 1, x: 0.65, y: 0, w: 0.35, h: 0.3 },
        ],
      });

      const result = useEditorStore.getState().resizeCollageSlot('right', 0.5, 0.3);
      expect(result).toEqual({ ok: true });

      const state = useEditorStore.getState();
      const leftSlot = state.slots.find((s) => s.id === 'left')!;
      const rightSlot = state.slots.find((s) => s.id === 'right')!;

      expect(rightSlot.x).toBeCloseTo(0.5, 5);
      expect(rightSlot.w).toBeCloseTo(0.5, 5);
      expect(leftSlot.x).toBeCloseTo(0.15, 5); // دُفعت لليسار مع الحفاظ على فجوة 0.05
    });

    it('ينجح applyCollageSlotSizeToAll عبر الإزاحة الذكية المتسلسلة عندما تتوفر مساحة على الورقة', () => {
      const base = setupCollage();
      useEditorStore.setState({
        collageTemplate: null,
        collageGap: 0,
        collageMargin: 0,
        slots: [
          { ...base, id: 'a', cellIndex: 0, x: 0, y: 0, w: 0.35, h: 0.3 },
          { ...base, id: 'b', cellIndex: 1, x: 0.25, y: 0.5, w: 0.2, h: 0.3 },
          { ...base, id: 'c', cellIndex: 2, x: 0.5, y: 0.5, w: 0.2, h: 0.3 },
        ],
      });

      const result = useEditorStore.getState().applyCollageSlotSizeToAll('a');
      expect(result).toEqual({ ok: true });

      const state = useEditorStore.getState();
      expect(state.slots.every((s) => s.w === 0.35 && s.h === 0.3)).toBe(true);
      const slotB = state.slots.find((s) => s.id === 'b')!;
      const slotC = state.slots.find((s) => s.id === 'c')!;
      expect(slotB.x).toBeCloseTo(0.25, 5);
      expect(slotC.x).toBeCloseTo(0.65, 5); // دُفعت لليمين مع الحفاظ على الفجوة الأصلية 0.05
    });
  });
});
