import { describe, it, expect, beforeEach } from 'vitest';
import { createHistorySlice, HistoryCross } from './slices/history-slice';
import { DEFAULT_COLLAGE_STATE } from './slices/collage-slice';
import { DEFAULT_GRID_STATE } from './slices/grid-slice';
import { DEFAULT_PRINT_SETTINGS } from './slices/print-slice';
import { SNAPSHOT_KEYS, DEFAULT_HISTORY_ENTRY_EXTRAS, type SnapshotKey } from './history-snapshot';
import { create } from 'zustand';
import type { UseBoundStore, StoreApi } from 'zustand';
import type { CanvasElement, HistoryEntry } from './types';

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
      collageGap: 0,
      collageMargin: 0,
      collageRadius: 0,
      collageShowCutLines: false,
      collageShowEndCutLine: true,
      collageStrokeWidth: 0,
      collageStrokeColor: '#000000',
      // حقول الشبكة/الإرشادات تُضاف إلى اللقطة مثلها مثل collage* — بذرة بلا
      // قيمها الابتدائية تجعل أول مقارنة "مختلفة" فيُدفع إدخال سجل زائف
      showGrid: DEFAULT_GRID_STATE.showGrid,
      gridSize: DEFAULT_GRID_STATE.gridSize,
      gridColor: DEFAULT_GRID_STATE.gridColor,
      gridOpacity: DEFAULT_GRID_STATE.gridOpacity,
      gridSubdivisions: DEFAULT_GRID_STATE.gridSubdivisions,
      gridType: DEFAULT_GRID_STATE.gridType,
      // نفس المرجع (وليس نسخة فارغة) — userGuides تُقارَن بالمرجع
      userGuides: DEFAULT_GRID_STATE.userGuides,
      // بقية حقول اللقطة الصريحة في النوع (تطابق القيم الافتراضية للسجل)
      template: null,
      backgroundGradientColor2: null,
      backgroundGradientAngle: 135,
      lastEditedImage: null,
      lastEditedImageAspect: null,
      printSettings: DEFAULT_PRINT_SETTINGS,
      mode: 'collage',
      selectedId: null,
      selectedIds: [],
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
    const s = store.getState();

    // Push 35 times
    for (let i = 0; i < 35; i++) {
      store.setState({ elements: [{ id: String(i), type: 'shape' }] as CanvasElement[] });
      store.getState().pushHistory();
    }

    const finalState = store.getState();
    expect(finalState.history.length).toBe(30);
  });

  it('should not push if the structural state is unchanged', () => {
    const s = store.getState();
    store.setState({ elements: [{ id: '1', type: 'shape' }] as CanvasElement[] });
    store.getState().pushHistory();

    // Change something non-structural like selectedId
    store.setState({ selectedId: '1' });
    store.getState().pushHistory();

    const finalState = store.getState();
    // Only 1 push should actually be registered in past because the second was structurally identical
    expect(finalState.history.length).toBe(2); // Initial + 1 push
  });

  it('should define a default for every snapshot key', () => {
    for (const key of SNAPSHOT_KEYS) {
      expect(DEFAULT_HISTORY_ENTRY_EXTRAS).toHaveProperty(key);
    }
  });

  it('should lock the registry to every HistoryEntry snapshot field (type-level)', () => {
    // إن أُضيف حقل إلى HistoryEntry دون إدراجه في SNAPSHOT_KEYS يفشل هذا التحقق
    // النوعي عند الـ typecheck — فلا ينزلق حقل من اللقطة بصمت (صنف Bug#1/H4).
    type Uncovered = Exclude<Exclude<keyof HistoryEntry, 'elements' | 'slots'>, SnapshotKey>;
    const registryCoversAllFields: [Uncovered] extends [never] ? true : never = true;
    expect(registryCoversAllFields).toBe(true);
  });

  it('should restore printSettings and grid state on undo (H4 regression)', () => {
    store.setState({ printSettings: { ...DEFAULT_PRINT_SETTINGS, dpi: 600 }, showGrid: true });
    store.getState().pushHistory();
    store.setState({ printSettings: { ...DEFAULT_PRINT_SETTINGS, dpi: 900 } });
    store.getState().pushHistory();

    store.getState().undo();
    expect(store.getState().printSettings?.dpi).toBe(600);
    expect(store.getState().showGrid).toBe(true);

    store.getState().undo();
    expect(store.getState().printSettings?.dpi).toBe(DEFAULT_PRINT_SETTINGS.dpi);
    expect(store.getState().showGrid).toBe(false);
  });
});
