import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';

import {
  SNAPSHOT_KEYS,
  DEFAULT_HISTORY_ENTRY_EXTRAS,
  captureHistoryEntry,
  type SnapshotKey,
} from './history-snapshot';
import { DEFAULT_COLLAGE_STATE } from './slices/collage-slice';
import { DEFAULT_GRID_STATE } from './slices/grid-slice';
import { createHistorySlice } from './slices/history-slice';
import { DEFAULT_PRINT_SETTINGS } from './slices/print-slice';

import type { HistoryCross } from './slices/history-slice';
import type { CanvasElement, HistoryEntry } from './types';
import type { UseBoundStore, StoreApi } from 'zustand';

describe('history-slice', () => {
  let store: UseBoundStore<StoreApi<HistoryCross>>;

  beforeEach(() => {
    // Mock the store for testing the slice — البذرة يجب أن تطابق الحالة الابتدائية
    // (نفس مرجع خانات الكولاج) وإلا فشل الـ dedupe في الدفعة الأولى
    store = create<HistoryCross>((set, get, api) => ({
      ...createHistorySlice(set, get, api),
      elements: [],
      slots: DEFAULT_COLLAGE_STATE.slots,
      // كل حقل يقارَن بالمرجع في isSameSnapshot يجب أن يطابق الحالة الابتدائية
      // الفعلية وإلا فشل الـ dedupe في الدفعة الأولى (قالب الكولاج = COLLAGE_TEMPLATES[0])
      collageTemplate: DEFAULT_COLLAGE_STATE.collageTemplate,
      editingTextId: null,
      backgroundColor: '#FFFFFF',
      canvasWidth: 2480,
      canvasHeight: 3508,
      collageGap: DEFAULT_COLLAGE_STATE.collageGap,
      collageMargin: DEFAULT_COLLAGE_STATE.collageMargin,
      collageRadius: 0,
      collageShowCutLines: false,
      collageShowEndCutLine: true,
      collageStrokeWidth: 0,
      collageStrokeColor: '#000000',
      // تدقيق 2026-11-03 (Bug#2): علامات عرض الشبكة أُخرجت من اللقطة فلم تعد
      // حقولاً مطلوبة في HistoryCross. الأدلة اليدوية تبقى حقلاً في اللقطة:
      // نفس المرجع (وليس نسخة فارغة) — userGuides تُقارَن بالمرجع
      userGuides: DEFAULT_GRID_STATE.userGuides,
      // بقية حقول اللقطة الصريحة في النوع (تطابق القيم الافتراضية للسجل)
      template: null,
      backgroundGradientColor2: null,
      backgroundGradientAngle: 135,
      freeformCanvasWidth: 2480,
      freeformCanvasHeight: 3508,
      freeformBackgroundColor: '#FFFFFF',
      freeformBackgroundGradientColor2: null,
      freeformBackgroundGradientAngle: 135,
      collageCanvasWidth: 2480,
      collageCanvasHeight: 3508,
      collageBackgroundColor: '#FFFFFF',
      collageBackgroundGradientColor2: null,
      collageBackgroundGradientAngle: 135,
      collagePendingImages: DEFAULT_COLLAGE_STATE.collagePendingImages,
      autofillImages: DEFAULT_COLLAGE_STATE.autofillImages,
      autofillSettings: DEFAULT_COLLAGE_STATE.autofillSettings,
      lastEditedImage: null,
      lastEditedImageAspect: null,
      printSettings: DEFAULT_PRINT_SETTINGS,
      mode: 'collage',
      selectedId: null,
      selectedIds: [],
      isDirty: false,
    }));
  });

  it('should push state to history and support undo/redo', () => {
    const s = store.getState();
    s.pushHistory();

    store.setState({ elements: [{ id: '1', type: 'shape' }] as CanvasElement[] });
    store.getState().pushHistory();

    store.setState({
      elements: [
        { id: '1', type: 'shape' },
        { id: '2', type: 'shape' },
      ] as CanvasElement[],
    });
    store.getState().pushHistory();

    const stateAfterAdds = store.getState();
    expect(stateAfterAdds.history.length).toBe(3); // 1 initial + 2 pushed
    expect(stateAfterAdds.historyIndex).toBe(2);

    // Undo once
    store.getState().undo();
    expect(store.getState().elements.length).toBe(1);
    expect(store.getState().historyIndex).toBe(1);

    // Undo twice
    store.getState().undo();
    expect(store.getState().elements.length).toBe(0);

    // Redo once
    store.getState().redo();
    expect(store.getState().elements.length).toBe(1);
  });

  it('should limit history to 30 entries and shift old entries', () => {
    // Push 35 times
    for (let i = 0; i < 35; i++) {
      store.setState({ elements: [{ id: String(i), type: 'shape' }] as CanvasElement[] });
      store.getState().pushHistory();
    }

    const finalState = store.getState();
    expect(finalState.history.length).toBe(30);
  });

  it('counts each unique image string once per snapshot when estimating archive bytes', () => {
    // صورة واحدة 20MiB مشاركة بين 3 عناصر تُخزَّن في الذاكرة بمرجع واحد —
    // كان التقدير يجمعها بكل تكرار (60MiB) فيتجاوز سقف 50MiB الوهمي ويُسقط
    // لقطات سليمة أبكر من اللازم. الآن تُحتسب مرة واحدة لكل لقطة عبر Set.
    const sharedImage = 'x'.repeat(20 * 1024 * 1024);
    const sharedElement = (id: string): CanvasElement =>
      ({ id, type: 'image', imageSrc: sharedImage }) as CanvasElement;

    // لقطة أولى بصورة فريدة 10MiB
    const firstImage = 'y'.repeat(10 * 1024 * 1024);
    store.setState({
      elements: [{ id: 'first', type: 'image', imageSrc: firstImage }] as CanvasElement[],
    });
    store.getState().pushHistory();

    // لقطة ثانية تحمل الصورة المشتركة ثلاث مرات (عناصر مختلفة بنفس imageSrc)
    store.setState({
      elements: [sharedElement('a'), sharedElement('b'), sharedElement('c')] as CanvasElement[],
    });
    store.getState().pushHistory();

    const state = store.getState();
    // التقدير الفريد: 10MiB + 20MiB + مصروف إداري ≈ 30MiB < 50MiB —
    // كلتا اللقطتين تبقيان مع بذرة السجل (التقدير القديم بالتكرار 70MiB
    // كان يُسقط اللقطة الأولى ويوقف عند الأخيرة فقط)
    expect(state.history.length).toBe(3); // البذرة + لقطتان
    expect(state.history[1].elements.some((el) => el.id === 'first')).toBe(true);
    expect(state.history[state.history.length - 1].elements).toHaveLength(3);
    // الصورة المشتركة بمرجع واحد في اللقطة الواحدة — النسخ السطحي لا ينسخ السلاسل
    const lastEntry = state.history[state.history.length - 1];
    const srcs = lastEntry.elements.map((el) => (el as { imageSrc?: string }).imageSrc);
    expect(srcs[0]).toBe(sharedImage);
    expect(srcs[0]).toBe(srcs[1]);
  });

  it('should not push if the structural state is unchanged', () => {
    store.setState({ elements: [{ id: '1', type: 'shape' }] as CanvasElement[] });
    store.getState().pushHistory();

    // Change something non-structural like selectedId
    store.setState({ selectedId: '1' });
    store.getState().pushHistory();

    const finalState = store.getState();
    // Only 1 push should actually be registered in past because the second was structurally identical
    expect(finalState.history.length).toBe(2); // Initial + 1 push
  });

  it('marks the document dirty only when history actually changes', () => {
    const s = store.getState();
    // دفعة مطابقة للبذرة لا تغيّر شيئاً → لا علامة تعديل
    s.pushHistory();
    expect(store.getState().isDirty).toBe(false);

    store.setState({ elements: [{ id: '1', type: 'shape' }] as CanvasElement[] });
    store.getState().pushHistory();
    expect(store.getState().isDirty).toBe(true);

    // الاشتقاق بالمقارنة: التراجع يعود لبذرة المستند الجديد (لا حفظ سابق) = نظيف،
    // والإعادة تبتعد عنها = تعديل غير محفوظ مجدداً
    store.getState().undo();
    expect(store.getState().isDirty).toBe(false);
    store.getState().redo();
    expect(store.getState().isDirty).toBe(true);
  });

  it('derives isDirty from the last-saved anchor across undo/redo', () => {
    // حفظ عند الحالة الحالية (لقطة) ثم تعديل جديد — النظافة تتبع المرساة
    store.getState().markHistorySaved();
    expect(store.getState().isDirty).toBe(false);

    store.setState({ elements: [{ id: '2', type: 'shape' }] as CanvasElement[] });
    store.getState().pushHistory();
    expect(store.getState().isDirty).toBe(true);

    // التراجع إلى لقطة الحفظ نفسها = نظيف (كان true الأعمى يبقيها مضاءة)
    store.getState().undo();
    expect(store.getState().isDirty).toBe(false);

    // والإعادة إلى بعد الحفظ = تعديل غير محفوظ
    store.getState().redo();
    expect(store.getState().isDirty).toBe(true);

    // حفظ الحالة الجديدة ينقل المرساة — التراجع عندها يصبح تعديلاً (فقد الحفظ القديم؟ لا:
    // المرساة صارت الحالة الحالية، فالتراجع يبتعد عنها = غير محفوظ)
    store.getState().markHistorySaved();
    store.getState().undo();
    expect(store.getState().isDirty).toBe(true);
  });

  it('should define a default for every snapshot key', () => {
    for (const key of SNAPSHOT_KEYS) {
      expect(DEFAULT_HISTORY_ENTRY_EXTRAS).toHaveProperty(key);
    }
  });

  it('should lock the registry to every HistoryEntry snapshot field (type-level)', () => {
    // إن أُضيف حقل إلى HistoryEntry دون إدراجه في SNAPSHOT_KEYS يفشل هذا التحقق
    // النوعي عند الـ typecheck — فلا ينزلق حقل من اللقطة بصمت (صنف Bug#1/H4).
    // الاستثناء: علامات عرض الشبكة مستبعدة عمداً من اللقطة (Bug#2 تدقيق 2026-11-03)
    // — إعدادات عرض/إدخال لا يعكسها التراجع (انظر history-snapshot.ts).
    type ViewLevelGridFields =
      'showGrid' | 'gridSize' | 'gridColor' | 'gridOpacity' | 'gridSubdivisions' | 'gridType';
    type Uncovered = Exclude<
      Exclude<Exclude<keyof HistoryEntry, 'elements' | 'slots'>, SnapshotKey>,
      ViewLevelGridFields
    >;
    const registryCoversAllFields: [Uncovered] extends [never] ? true : never = true;
    expect(registryCoversAllFields).toBe(true);
  });

  it('should restore printSettings on undo (H4 regression)', () => {
    store.setState({ printSettings: { ...DEFAULT_PRINT_SETTINGS, dpi: 600 } });
    store.getState().pushHistory();
    store.setState({ printSettings: { ...DEFAULT_PRINT_SETTINGS, dpi: 900 } });
    store.getState().pushHistory();

    store.getState().undo();
    expect(store.getState().printSettings?.dpi).toBe(600);

    store.getState().undo();
    expect(store.getState().printSettings?.dpi).toBe(DEFAULT_PRINT_SETTINGS.dpi);
  });

  it('keeps view-level grid display flags out of the undo snapshot (Bug#2 regression)', () => {
    // علامات عرض الشبكة ليست مستندية: لا تُلتقط في اللقطة ولا تُستعاد عند
    // التراجع — كان التراجع عن تحريك عنصر يعكسها رغم أنها لم تدفع السجل قط
    for (const key of [
      'showGrid',
      'gridSize',
      'gridColor',
      'gridOpacity',
      'gridSubdivisions',
      'gridType',
    ] as const) {
      expect(SNAPSHOT_KEYS).not.toContain(key);
    }
    const entry = captureHistoryEntry({
      ...DEFAULT_HISTORY_ENTRY_EXTRAS,
      elements: [],
      slots: [],
    });
    expect('showGrid' in entry).toBe(false);
    expect('gridSize' in entry).toBe(false);
    // الأدلة اليدوية وثيقة المستند وتبقى تُلتقط
    expect(entry.userGuides).toEqual([]);
  });
});
