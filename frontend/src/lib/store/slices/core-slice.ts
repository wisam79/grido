import { generateInitialSlots, remapSlotsToCells, DEFAULT_COLLAGE_STATE } from './collage-slice';
import { DEFAULT_GRID_STATE, type RulerUnit, type UserGuide } from './grid-slice';
import { DEFAULT_HISTORY_ENTRY_EXTRAS, seedHistorySnapshot } from './history-slice';
import { DEFAULT_PRINT_SETTINGS } from './print-slice';
import { clearDisplayCache } from '../../canvas/display-image';
import { type CanvasFitMode, readStoredFitMode, writeStoredFitMode } from '../../canvas/fit';
import { invalidateImageCache } from '../../canvas/image-cache';
import { recenterElementsOnResize } from '../../canvas/resize-elements';
import { canvasMm, findPaperByMm } from '../../canvas/units';
import { hydrateProjectState } from '../../io/project-hydrator';
import {
  COLLAGE_TEMPLATES,
  PAPER_SIZES,
  computeDynamicCollageCells,
  getEffectiveDpi,
} from '../../templates';
import { uid } from '../../utils';

import type { PhotoTemplate, CollageTemplate } from '../../templates';
import type {
  EditorMode,
  ProjectFileV1,
  CanvasElement,
  CanvasSlot,
  CollageAutofillSettings,
  PrintSettings,
  HistoryEntry,
} from '../types';
import type { StateCreator } from 'zustand';
export interface CoreSlice {
  projectId: string | null;
  /** اسم المشروع المحفوظ/المفتوح — null لمستند جديد لم يُحفظ بعد */
  projectName: string | null;
  /** توجد تعديلات منذ آخر حفظ أو تحميل — يظهر مؤشرها في شريط العنوان */
  isDirty: boolean;
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  /** لون نهاية تدرج خلفية الورقة — null يعني تعبئة مصمتة (لون واحد فقط) */
  backgroundGradientColor2: string | null;
  /** زاوية التدرج الخطي بالدرجات (0° = يسار→يمين، مع عقارب الساعة) */
  backgroundGradientAngle: number;
  /** أبعاد وخلفية الوضع الحر المعزولة */
  freeformCanvasWidth: number;
  freeformCanvasHeight: number;
  freeformBackgroundColor: string;
  freeformBackgroundGradientColor2: string | null;
  freeformBackgroundGradientAngle: number;
  /** أبعاد وخلفية وضع الكولاج المعزولة */
  collageCanvasWidth: number;
  collageCanvasHeight: number;
  collageBackgroundColor: string;
  collageBackgroundGradientColor2: string | null;
  collageBackgroundGradientAngle: number;
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
  loadProject: (
    project: ProjectFileV1,
    projectId?: string | null,
    projectName?: string | null,
  ) => void;
  /** يثبّت هوية المشروع بعد حفظ ناجح ويرفع علامة التعديل */
  markProjectSaved: (projectId: string, projectName: string) => void;
  canvasZoom: number;
  setCanvasZoom: (zoom: number | ((prev: number) => number)) => void;
  /** وضع ملاءمة الورقة — تفضيل عرض محفوظ محلياً، لا يُصدَّر في ملف المشروع */
  canvasFitMode: CanvasFitMode;
  setCanvasFitMode: (mode: CanvasFitMode) => void;
}

export const DEFAULT_CORE_STATE = {
  projectId: null as string | null,
  projectName: null as string | null,
  isDirty: false,
  mode: 'collage' as EditorMode,
  canvasWidth: 2480,
  canvasHeight: 3508,
  backgroundColor: '#FFFFFF',
  backgroundGradientColor2: null as string | null,
  backgroundGradientAngle: 135,
  freeformCanvasWidth: 2480,
  freeformCanvasHeight: 3508,
  freeformBackgroundColor: '#FFFFFF',
  freeformBackgroundGradientColor2: null as string | null,
  freeformBackgroundGradientAngle: 135,
  collageCanvasWidth: 2480,
  collageCanvasHeight: 3508,
  collageBackgroundColor: '#FFFFFF',
  collageBackgroundGradientColor2: null as string | null,
  collageBackgroundGradientAngle: 135,
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
  autofillImages: string[];
  collagePendingImages: string[];
  autofillSettings: CollageAutofillSettings;
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
    if (get().mode === mode) return;

    set((s) => {
      const isSwitchingToCollage = mode === 'collage';

      // 1. حفظ أبعاد وخلفية الوضع الحالي في خانته المعزولة
      const savedForOutgoing =
        s.mode === 'collage'
          ? {
              collageCanvasWidth: s.canvasWidth,
              collageCanvasHeight: s.canvasHeight,
              collageBackgroundColor: s.backgroundColor,
              collageBackgroundGradientColor2: s.backgroundGradientColor2,
              collageBackgroundGradientAngle: s.backgroundGradientAngle,
            }
          : {
              freeformCanvasWidth: s.canvasWidth,
              freeformCanvasHeight: s.canvasHeight,
              freeformBackgroundColor: s.backgroundColor,
              freeformBackgroundGradientColor2: s.backgroundGradientColor2,
              freeformBackgroundGradientAngle: s.backgroundGradientAngle,
            };

      // 2. استرجاع أبعاد وخلفية الوضع المستهدف
      const targetWidth = isSwitchingToCollage
        ? s.collageCanvasWidth || 2480
        : s.freeformCanvasWidth || 2480;
      const targetHeight = isSwitchingToCollage
        ? s.collageCanvasHeight || 3508
        : s.freeformCanvasHeight || 3508;
      const targetBgColor = isSwitchingToCollage
        ? s.collageBackgroundColor || '#FFFFFF'
        : s.freeformBackgroundColor || '#FFFFFF';
      const targetGradient2 = isSwitchingToCollage
        ? s.collageBackgroundGradientColor2
        : s.freeformBackgroundGradientColor2;
      const targetGradientAngle = isSwitchingToCollage
        ? s.collageBackgroundGradientAngle
        : s.freeformBackgroundGradientAngle;

      const nextState: Partial<CoreSliceCross> = {
        ...savedForOutgoing,
        mode,
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        backgroundColor: targetBgColor,
        backgroundGradientColor2: targetGradient2,
        backgroundGradientAngle: targetGradientAngle,
        selectedId: null,
        selectedIds: [],
      };

      // إذا تم الانتقال لوضع الكولاج وكانت الخانات فارغة، نقوم بإعادة بناء الخلايا لتجنب ظهور الكانفس فارغاً
      const buildSlots = (): CanvasSlot[] | undefined => {
        const template = s.collageTemplate || COLLAGE_TEMPLATES[0];
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(targetWidth, targetHeight, storedDpi);

        let cells = template.cells;
        if (template.physicalLayout) {
          const dynamicCells = computeDynamicCollageCells(
            template,
            targetWidth,
            targetHeight,
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

      if (isSwitchingToCollage && (!s.slots || s.slots.length === 0)) {
        nextState.slots = buildSlots();
      } else if (isSwitchingToCollage) {
        // القوالب الفيزيائية (physicalLayout) تُحسب خلاياها من أبعاد الكانفس
        // الحالية — خانات مبنية لمقاس قديم تبقى مشوهة عند العودة من الوضع الحر
        // بعد تغيير المقاس، لذا نعيد موازنتها مع الحفاظ على الصور والتحويلات
        const template = s.collageTemplate || COLLAGE_TEMPLATES[0];
        if (template.physicalLayout) {
          const storedDpi = s.printSettings?.dpi || 300;
          const dpi = getEffectiveDpi(targetWidth, targetHeight, storedDpi);
          const dynamicCells = computeDynamicCollageCells(
            template,
            targetWidth,
            targetHeight,
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

    const mode = get().mode;
    const isSingle = mode === 'single';

    // 🧱 فصل الوضعين: في الوضع الحر فقط يُعاد تمركز العناصر بالنسبة للأبعاد الجديدة.
    // في وضع الكولاج، عناصر الوضع الحر لا تُمَس ولا تُشوه إطلاقاً!
    const adjustedElements = isSingle
      ? recenterElementsOnResize(get().elements, oldW, oldH, w, h)
      : get().elements;

    const collageTemplate = get().collageTemplate;
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
      ...(isSingle
        ? { freeformCanvasWidth: w, freeformCanvasHeight: h }
        : { collageCanvasWidth: w, collageCanvasHeight: h }),
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
  // الدفع يتم عند اكتمال التفاعل خارج العجلة/الحقل (إصلاح Bug#2)
  setBackgroundColor: (c) => {
    const isSingle = get().mode === 'single';
    set({
      backgroundColor: c,
      ...(isSingle ? { freeformBackgroundColor: c } : { collageBackgroundColor: c }),
    });
  },

  // نفس سياسة اللون الأساسي: بلا pushHistory أثناء السحب الحي، والدفع عند الإغلاق/التغيير من الم_picker
  setBackgroundGradientColor2: (c) => {
    const isSingle = get().mode === 'single';
    set({
      backgroundGradientColor2: c,
      ...(isSingle
        ? { freeformBackgroundGradientColor2: c }
        : { collageBackgroundGradientColor2: c }),
    });
  },
  setBackgroundGradientAngle: (deg) => {
    const angle = ((Math.round(deg) % 360) + 360) % 360;
    const isSingle = get().mode === 'single';
    set({
      backgroundGradientAngle: angle,
      ...(isSingle
        ? { freeformBackgroundGradientAngle: angle }
        : { collageBackgroundGradientAngle: angle }),
    });
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
      projectName: null,
      isDirty: false,
      mode: 'collage' as EditorMode,
      canvasWidth: 2480,
      canvasHeight: 3508,
      backgroundColor: '#FFFFFF',
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
      autofillImages: [],
      collagePendingImages: [],
      autofillSettings: { ...DEFAULT_COLLAGE_STATE.autofillSettings },
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

  loadProject: (
    project: ProjectFileV1,
    projectId: string | null = null,
    projectName: string | null = null,
  ) => {
    const hydrated = hydrateProjectState(project, { projectId });
    if (!hydrated) return;
    // مشروع محمّل = نقطة حفظ نظيفة: لا تعديلات معلّقة فوق محتواه
    set({ ...hydrated, projectName, isDirty: false });
    set(seedHistorySnapshot(get()));
  },

  markProjectSaved: (projectId, projectName) => {
    set({ projectId, projectName, isDirty: false });
  },
});
