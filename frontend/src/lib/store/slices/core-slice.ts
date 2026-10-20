import { StateCreator } from 'zustand';
import {
  EditorMode,
  ProjectFileV1,
  CanvasElement,
  CanvasSlot,
  PrintSettings,
  HistoryEntry,
} from '../types';
import {
  PhotoTemplate,
  CollageTemplate,
  COLLAGE_TEMPLATES,
  PAPER_SIZES,
  computeDynamicCollageCells,
  getEffectiveDpi,
} from '../../templates';
import { generateInitialSlots, remapSlotsToCells, DEFAULT_COLLAGE_STATE } from './collage-slice';
import { DEFAULT_PRINT_SETTINGS } from './print-slice';
import { DEFAULT_HISTORY_ENTRY_EXTRAS, seedHistorySnapshot } from './history-slice';
import { DEFAULT_GRID_STATE, type RulerUnit, type UserGuide } from './grid-slice';
import { invalidateImageCache } from '../../canvas/image-cache';
import { clearDisplayCache } from '../../canvas/display-image';
import { uid } from '../../utils';
import { canvasMm, findPaperByMm } from '../../canvas/units';
import { type CanvasFitMode, readStoredFitMode, writeStoredFitMode } from '../../canvas/fit';
import { hydrateProjectState } from '../../io/project-hydrator';
export interface CoreSlice {
  projectId: string | null;
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  /** لون نهاية تدرج خلفية الورقة — null يعني تعبئة مصمتة (لون واحد فقط) */
  backgroundGradientColor2: string | null;
  /** زاوية التدرج الخطي بالدرجات (0° = يسار→يمين، مع عقارب الساعة) */
  backgroundGradientAngle: number;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;

  setMode: (mode: EditorMode) => void;
  setCanvasSize: (w: number, h: number) => void;
  setBackgroundColor: (c: string) => void;
  /** تعيين لون نهاية تدرج الخلفية — null يزيل التدرج ويعيد التعبئة المصمتة */
  setBackgroundGradientColor2: (c: string | null) => void;
  /** تعيين زاوية تدرج الخلفية (0-360) */
  setBackgroundGradientAngle: (deg: number) => void;
  setLastEditedImage: (src: string | null) => void;
  setLastEditedImageAspect: (aspect: number | null) => void;
  reset: () => void;
  loadProject: (project: ProjectFileV1, projectId?: string | null) => void;
  canvasZoom: number;
  setCanvasZoom: (zoom: number | ((prev: number) => number)) => void;
  /** وضع ملاءمة الورقة — تفضيل عرض محفوظ محلياً، لا يُصدَّر في ملف المشروع */
  canvasFitMode: CanvasFitMode;
  setCanvasFitMode: (mode: CanvasFitMode) => void;
}

export const DEFAULT_CORE_STATE = {
  projectId: null as string | null,
  mode: 'collage' as EditorMode,
  canvasWidth: 2480,
  canvasHeight: 3508,
  backgroundColor: '#FFFFFF',
  backgroundGradientColor2: null as string | null,
  backgroundGradientAngle: 135,
  lastEditedImage: null as string | null,
  lastEditedImageAspect: null as number | null,
  canvasZoom: 1,
  canvasFitMode: 'auto' as CanvasFitMode,
};

type CoreSliceCross = CoreSlice & {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  slots: CanvasSlot[];
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  printSettings: PrintSettings;
  printImageSrc: string | null;
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  gridOpacity: number;
  gridSubdivisions: number;
  gridType: 'lines' | 'dots';
  snapToGrid: boolean;
  showColumns: boolean;
  columnsCount: number;
  columnsColor: string;
  columnsMargin: number;
  columnsGutter: number;
  showRuler: boolean;
  rulerUnit: RulerUnit;
  userGuides: UserGuide[];
  showUserGuides: boolean;
  lockUserGuides: boolean;
  showBleedGuides: boolean;
  bleedMarginMM: number;
  safeMarginMM: number;
  cutShapeType: 'rectangle' | 'circle' | 'rounded-rect';
  history: HistoryEntry[];
  historyIndex: number;
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  clipboardElements: CanvasElement[];
  pushHistory: () => void;
};

export const createCoreSlice: StateCreator<CoreSliceCross, [], [], CoreSlice> = (set, get) => ({
  ...DEFAULT_CORE_STATE,
  // تفضيل عرض محفوظ محلياً (مثل حجم الألواح) — يُقرأ مرة واحدة عند إنشاء المتجر
  canvasFitMode: readStoredFitMode(),

  setMode: (mode) => {
    set((s) => {
      const nextState: Partial<CoreSliceCross> = { mode, selectedId: null, selectedIds: [] };

      // إذا تم الانتقال لوضع الكولاج وكانت الخانات فارغة، نقوم بإعادة بناء الخلايا لتجنب ظهور الكانفس فارغاً
      const buildSlots = (): CanvasSlot[] | undefined => {
        const template = s.collageTemplate || COLLAGE_TEMPLATES[0];
        const currentWidth = s.canvasWidth || 2480;
        const currentHeight = s.canvasHeight || 3508;
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(currentWidth, currentHeight, storedDpi);

        let cells = template.cells;
        if (template.physicalLayout) {
          const dynamicCells = computeDynamicCollageCells(
            template,
            currentWidth,
            currentHeight,
            dpi,
            s.collageGap || 0,
            s.collageMargin || 0,
          );
          if (dynamicCells) {
            cells = dynamicCells;
          }
        }

        return cells.map((c: { x: number; y: number; w: number; h: number }, i: number) => ({
          id: uid(),
          cellIndex: i,
          x: c.x,
          y: c.y,
          w: c.w,
          h: c.h,
          filter: 'none',
          brightness: 100,
          contrast: 100,
          saturation: 100,
          zoom: 1,
          dragX: 0,
          dragY: 0,
        }));
      };

      if (mode === 'collage' && (!s.slots || s.slots.length === 0)) {
        nextState.slots = buildSlots();
      } else if (mode === 'collage') {
        // القوالب الفيزيائية (physicalLayout) تُحسب خلاياها من أبعاد الكانفس
        // الحالية — خانات مبنية لمقاس قديم تبقى مشوهة عند العودة من الوضع الحر
        // بعد تغيير المقاس، لذا نعيد موازنتها مع الحفاظ على الصور والتحويلات
        const template = s.collageTemplate || COLLAGE_TEMPLATES[0];
        if (template.physicalLayout) {
          const currentWidth = s.canvasWidth || 2480;
          const currentHeight = s.canvasHeight || 3508;
          const storedDpi = s.printSettings?.dpi || 300;
          const dpi = getEffectiveDpi(currentWidth, currentHeight, storedDpi);
          const dynamicCells = computeDynamicCollageCells(
            template,
            currentWidth,
            currentHeight,
            dpi,
            s.collageGap || 0,
            s.collageMargin || 0,
          );
          if (dynamicCells && dynamicCells.length === s.slots.length) {
            const stale = dynamicCells.some((c, i) => {
              const sl = s.slots[i];
              return (
                Math.abs(sl.x - c.x) > 1e-6 ||
                Math.abs(sl.y - c.y) > 1e-6 ||
                Math.abs(sl.w - c.w) > 1e-6 ||
                Math.abs(sl.h - c.h) > 1e-6
              );
            });
            if (stale) {
              nextState.slots = dynamicCells.map((c, i) => ({
                ...s.slots[i],
                cellIndex: i,
                x: c.x,
                y: c.y,
                w: c.w,
                h: c.h,
              }));
            }
          } else if (dynamicCells) {
            nextState.slots = buildSlots();
          }
        }
      }

      return nextState;
    });
    // تبديل الوضع قابل للتراجع — اللقطة الآن تتضمن mode (إصلاح E-4)
    get().pushHistory();
  },

  setCanvasSize: (w, h) => {
    const oldW = get().canvasWidth;
    const oldH = get().canvasHeight;
    if (oldW === w && oldH === h) return;

    const adjustedElements = get().elements.map((el: CanvasElement) => {
      const oldPxX = el.x * oldW;
      const oldPxY = el.y * oldH;
      const oldPxW = el.width * oldW;
      const oldPxH = el.height * oldH;

      const newPxX = oldPxX + (w - oldW) / 2;
      const newPxY = oldPxY + (h - oldH) / 2;

      return {
        ...el,
        x: newPxX / w,
        y: newPxY / h,
        width: oldPxW / w,
        height: oldPxH / h,
      };
    });

    const collageTemplate = get().collageTemplate;
    const mode = get().mode;
    let adjustedSlots = get().slots || [];

    if (mode === 'collage' && collageTemplate) {
      if (collageTemplate.physicalLayout) {
        const storedDpi = get().printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(w, h, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          w,
          h,
          dpi,
          get().collageGap,
          get().collageMargin,
        );
        if (dynamicCells) {
          adjustedSlots = remapSlotsToCells(get().slots || [], dynamicCells);
        }
      }
    }

    const currentDpi = get().printSettings?.dpi || 300;
    const { wMM, hMM } = canvasMm(w, h, currentDpi);
    const matchedPaper = findPaperByMm(wMM, hMM, PAPER_SIZES);
    const isLandscape = w > h;

    set({
      canvasWidth: w,
      canvasHeight: h,
      elements: adjustedElements,
      slots: adjustedSlots,
      printSettings: matchedPaper
        ? {
            ...get().printSettings,
            paperId: matchedPaper.id,
            // الأبعاد الأصلية (غير المقلوبة) دائماً: العرض ≤ الارتفاع، والاتجاه
            // علم مستقل — تخزين أبعاد مقلوبة هنا مع علم الاتجاه كان يقلبهما
            // usePrintLayout مرة ثانية (انعكاس مزدوج) فتظهر المعاينة بعكس حالة
            // الكانفاس عند اختيار الاتجاه لأول مرة
            paperWidthMM: Math.min(wMM, hMM),
            paperHeightMM: Math.max(wMM, hMM),
            orientation: isLandscape ? 'landscape' : 'portrait',
          }
        : get().printSettings,
    });
    get().pushHistory();
  },

  // لا pushHistory هنا — يُستدعى باستمرار أثناء اختيار اللون؛
  // الدفع يتم عند الإغلاق (PopoverColorPicker) أو بتأجيل من ColorWheelPicker المباشر (إصلاح Bug#2)
  setBackgroundColor: (c) => {
    set({ backgroundColor: c });
  },

  // نفس سياسة اللون الأساسي: بلا pushHistory أثناء السحب الحي، والدفع عند الإغلاق/التغيير من الم_picker
  setBackgroundGradientColor2: (c) => {
    set({ backgroundGradientColor2: c });
  },
  setBackgroundGradientAngle: (deg) => {
    const angle = ((Math.round(deg) % 360) + 360) % 360;
    set({ backgroundGradientAngle: angle });
  },

  setLastEditedImage: (src) => {
    if (src) invalidateImageCache(src);
    set({ lastEditedImage: src });
  },
  setLastEditedImageAspect: (aspect) => set({ lastEditedImageAspect: aspect }),
  setCanvasZoom: (zoom) =>
    set((state) => ({
      canvasZoom: typeof zoom === 'function' ? zoom(state.canvasZoom) : zoom,
    })),

  setCanvasFitMode: (mode) => {
    writeStoredFitMode(mode);
    set({ canvasFitMode: mode });
  },

  reset: () => {
    const freshSlots = generateInitialSlots();
    // مستند جديد: لا معنى للاحتفاظ بصور المستند السابق (كاش الصور الكامل
    // ونسخ العرض 2048px) — تحريرها فوراً يمنع تراكم مئات الميغابايتات
    // عند فتح/إغلاق عدة مشاريع في الجلسة الواحدة.
    invalidateImageCache();
    clearDisplayCache();
    set({
      projectId: null,
      mode: 'collage' as EditorMode,
      canvasWidth: 2480,
      canvasHeight: 3508,
      backgroundColor: '#FFFFFF',
      backgroundGradientColor2: null,
      backgroundGradientAngle: 135,
      lastEditedImage: null,
      lastEditedImageAspect: null,
      clipboardElements: [],
      elements: [],
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      template: null,
      collageTemplate: COLLAGE_TEMPLATES[0],
      slots: freshSlots,
      collageGap: 0,
      collageMargin: 0,
      collageRadius: 0,
      collageShowCutLines: false,
      // 🛡️ كان السطر الوحيد الناقص من الافتراضيات هنا: `reset()` يُبقي القيمة
      // القديمة فيُحمَّل مع المشروع التالي بلا مصدر لها (المسلسل والحفظ يعرفانه).
      collageShowEndCutLine: DEFAULT_COLLAGE_STATE.collageShowEndCutLine,
      collageStrokeWidth: 0,
      collageStrokeColor: '#000000',
      showGrid: false,
      gridSize: 48,
      gridColor: '#000000',
      gridOpacity: 0.15,
      gridSubdivisions: 5,
      gridType: 'lines' as const,
      snapToGrid: true,
      showColumns: false,
      columnsCount: 12,
      columnsColor: 'rgba(239, 68, 68, 0.08)',
      columnsMargin: 20,
      columnsGutter: 12,
      showRuler: DEFAULT_GRID_STATE.showRuler,
      rulerUnit: DEFAULT_GRID_STATE.rulerUnit,
      userGuides: [],
      showUserGuides: DEFAULT_GRID_STATE.showUserGuides,
      lockUserGuides: DEFAULT_GRID_STATE.lockUserGuides,
      showBleedGuides: DEFAULT_GRID_STATE.showBleedGuides,
      bleedMarginMM: DEFAULT_GRID_STATE.bleedMarginMM,
      safeMarginMM: DEFAULT_GRID_STATE.safeMarginMM,
      cutShapeType: DEFAULT_GRID_STATE.cutShapeType,
      printSettings: DEFAULT_PRINT_SETTINGS,
      printImageSrc: null,
      history: [{ elements: [], slots: freshSlots, ...DEFAULT_HISTORY_ENTRY_EXTRAS }],
      historyIndex: 0,
    });
  },

  loadProject: (project: ProjectFileV1, projectId: string | null = null) => {
    const hydrated = hydrateProjectState(project, { projectId });
    if (!hydrated) return;
    set(hydrated);
    set(seedHistorySnapshot(get()));
  },
});
