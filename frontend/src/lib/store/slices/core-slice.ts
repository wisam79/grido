import { StateCreator } from "zustand";
import { EditorMode, ProjectFileV1, CanvasElement, CanvasSlot, PrintSettings, HistoryEntry } from "../types";
import { PhotoTemplate, CollageTemplate, COLLAGE_TEMPLATES, PHOTO_TEMPLATES, PAPER_SIZES, computeDynamicCollageCells, getEffectiveDpi } from "../../templates";
import { generateInitialSlots } from "./collage-slice";
import { DEFAULT_PRINT_SETTINGS } from "./print-slice";
import { DEFAULT_HISTORY_ENTRY_EXTRAS } from "./history-slice";
import { invalidateImageCache } from "@/hooks/use-async-image";
import { uid } from "../../utils";

export interface CoreSlice {
  projectId: string | null;
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;

  setMode: (mode: EditorMode) => void;
  setCanvasSize: (w: number, h: number) => void;
  setBackgroundColor: (c: string) => void;
  setLastEditedImage: (src: string | null) => void;
  setLastEditedImageAspect: (aspect: number | null) => void;
  reset: () => void;
  loadProject: (project: ProjectFileV1, projectId?: string | null) => void;
  canvasZoom: number;
  setCanvasZoom: (zoom: number | ((prev: number) => number)) => void;
}

export const DEFAULT_CORE_STATE = {
  projectId: null as string | null,
  mode: "collage" as EditorMode,
  canvasWidth: 2480,
  canvasHeight: 3508,
  backgroundColor: "#FFFFFF",
  lastEditedImage: null as string | null,
  lastEditedImageAspect: null as number | null,
  canvasZoom: 1,
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
  gridType: "lines" | "dots";
  snapToGrid: boolean;
  showColumns: boolean;
  columnsCount: number;
  columnsColor: string;
  columnsMargin: number;
  columnsGutter: number;
  showRuler: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  pushHistory: () => void;
};

export const createCoreSlice: StateCreator<CoreSliceCross, [], [], CoreSlice> = (set, get) => ({
  ...DEFAULT_CORE_STATE,

  setMode: (mode) => {
    set((s) => {
      const nextState: Partial<CoreSliceCross> = { mode, selectedId: null };
      
      // إذا تم الانتقال لوضع الكولاج وكانت الخانات فارغة، نقوم بإعادة بناء الخلايا لتجنب ظهور الكانفس فارغاً
      if (mode === "collage" && (!s.slots || s.slots.length === 0)) {
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
            s.collageMargin || 0
          );
          if (dynamicCells) {
            cells = dynamicCells;
          }
        }

        nextState.slots = cells.map((c: { x: number; y: number; w: number; h: number }, i: number) => ({
          id: uid(),
          cellIndex: i,
          x: c.x,
          y: c.y,
          w: c.w,
          h: c.h,
          filter: "none",
          brightness: 100,
          contrast: 100,
          saturation: 100,
          zoom: 1,
          dragX: 0,
          dragY: 0,
        }));
        
        nextState.elements = []; // مسح عناصر التعديل الحر عند العودة للكولاج
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

    if (mode === "collage" && collageTemplate) {
      if (collageTemplate.physicalLayout) {
        const storedDpi = get().printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(w, h, storedDpi);
        const dynamicCells = computeDynamicCollageCells(
          collageTemplate,
          w,
          h,
          dpi,
          get().collageGap,
          get().collageMargin
        );
        if (dynamicCells) {
          adjustedSlots = dynamicCells.map((c, i) => {
            const existingSlot = (get().slots || [])[i] || {};
            return {
              ...existingSlot,
              id: existingSlot.id || uid(),
              cellIndex: i,
              x: c.x,
              y: c.y,
              w: c.w,
              h: c.h,
            };
          });
        }
      }
    }

    const currentDpi = get().printSettings?.dpi || 300;
    const wMM = Math.round((w / currentDpi) * 25.4);
    const hMM = Math.round((h / currentDpi) * 25.4);
    const matchedPaper = PAPER_SIZES.find(
      (p) => (p.widthMM === wMM && p.heightMM === hMM) || (p.widthMM === hMM && p.heightMM === wMM)
    );
    const isLandscape = w > h;

    set({
      canvasWidth: w,
      canvasHeight: h,
      elements: adjustedElements,
      slots: adjustedSlots,
      printSettings: {
        ...get().printSettings,
        paperId: matchedPaper ? matchedPaper.id : "custom",
        paperWidthMM: isLandscape ? Math.max(wMM, hMM) : Math.min(wMM, hMM),
        paperHeightMM: isLandscape ? Math.min(wMM, hMM) : Math.max(wMM, hMM),
        orientation: isLandscape ? "landscape" : "portrait",
      },
    });
    get().pushHistory();
  },

  setBackgroundColor: (c) => { set({ backgroundColor: c }); get().pushHistory(); },

  setLastEditedImage: (src) => {
    if (src) invalidateImageCache(src);
    set({ lastEditedImage: src });
  },
  setLastEditedImageAspect: (aspect) => set({ lastEditedImageAspect: aspect }),
  setCanvasZoom: (zoom) => set((state) => ({
    canvasZoom: typeof zoom === "function" ? zoom(state.canvasZoom) : zoom
  })),

  reset: () => {
    const freshSlots = generateInitialSlots();
    set({
      projectId: null,
      mode: "collage" as EditorMode,
      canvasWidth: 2480,
      canvasHeight: 3508,
      backgroundColor: "#FFFFFF",
      lastEditedImage: null,
      lastEditedImageAspect: null,
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
      collageStrokeWidth: 0,
      collageStrokeColor: "#000000",
      showGrid: false,
      gridSize: 50,
      gridColor: "#000000",
      gridOpacity: 0.15,
      gridSubdivisions: 5,
      gridType: "lines" as const,
      snapToGrid: false,
      showColumns: false,
      columnsCount: 12,
      columnsColor: "rgba(239, 68, 68, 0.08)",
      columnsMargin: 20,
      columnsGutter: 12,
      showRuler: true,
      printSettings: DEFAULT_PRINT_SETTINGS,
      printImageSrc: null,
      history: [{ elements: [], slots: freshSlots, ...DEFAULT_HISTORY_ENTRY_EXTRAS }],
      historyIndex: 0,
    });
  },

  loadProject: (project: ProjectFileV1, projectId: string | null = null) => {
    if (!project || typeof project !== "object") {
      console.error("[loadProject] Invalid project payload provided");
      return;
    }
    const validWidth = typeof project.canvasWidth === "number" && project.canvasWidth > 0 && project.canvasWidth <= 20000
      ? project.canvasWidth
      : 2480;
    const validHeight = typeof project.canvasHeight === "number" && project.canvasHeight > 0 && project.canvasHeight <= 20000
      ? project.canvasHeight
      : 3508;

    // قالب غير موجود في الكتالوج (إصدار أحدث/إضافة مخصصة) يُحتفظ به كما هو —
    // بياناته كاملة بعد التحقق، وإسقاطه كان يترك الكانفس بلا قالب
    const restoredTemplate = project.template
      ? (PHOTO_TEMPLATES.find((t) => t.id === project.template?.id) as PhotoTemplate | undefined) || (project.template as PhotoTemplate)
      : null;
    const restoredCollageTemplate = project.collageTemplate
      ? (COLLAGE_TEMPLATES.find((t) => t.id === project.collageTemplate?.id) as CollageTemplate | undefined) || (project.collageTemplate as CollageTemplate)
      : null;

    const rawElements = (project.elements || []) as CanvasElement[];
    const validElements = rawElements.filter(el => {
      if (!el || typeof el !== "object") return false;
      if (!["image", "text", "shape"].includes(el.type)) return false;
      if (!isFinite(el.x) || !isFinite(el.y) || !isFinite(el.width) || !isFinite(el.height)) return false;
      if (el.width <= 0 || el.height <= 0) return false;
      return true;
    });

    // وضع موحّد مع الافتراضي: ملفات جديدة/فارغة تبدأ كولاج (مطابقة reset)،
    // بينما الملفات القديمة التي تحتوي عناصر تعديل حر تُحمل كوضع مفرد
    const resolvedMode: EditorMode =
      project.mode || (validElements.length > 0 ? "single" : "collage");

    const fallbackSlots = (): CanvasSlot[] => (resolvedMode === "collage" ? generateInitialSlots() : []);

    const rawSlots = ((project.slots && project.slots.length > 0 ? project.slots : fallbackSlots()) || []) as CanvasSlot[];
    // التحقق من سلامة الخانات مثلما تُفلتر العناصر — يمنع خانات تالفة من الوصول للكانفس
    const validSlots = rawSlots.filter((sl) => {
      if (!sl || typeof sl !== "object") return false;
      if (!isFinite(sl.x) || !isFinite(sl.y) || !isFinite(sl.w) || !isFinite(sl.h)) return false;
      if (sl.w <= 0 || sl.h <= 0) return false;
      return true;
    });

    // مطابقة عدد الخانات مع خلايا قالب الكولاج: اختلاف العدد يعني ملفاً تالفاً
    // أو هجرة قديمة — نعيد بناء الخانات من القالب مع الإبقاء على الصور حسب الموضع
    let reconciledSlots = validSlots;
    if (resolvedMode === "collage" && restoredCollageTemplate && validSlots.length !== restoredCollageTemplate.cells.length) {
      const storedDpi = project.printSettings?.dpi || 300;
      const dpi = getEffectiveDpi(validWidth, validHeight, storedDpi);
      let cells = restoredCollageTemplate.cells;
      if (restoredCollageTemplate.physicalLayout) {
        const dynamicCells = computeDynamicCollageCells(
          restoredCollageTemplate,
          validWidth,
          validHeight,
          dpi,
          project.collageGap ?? 0,
          project.collageMargin ?? 0
        );
        if (dynamicCells) cells = dynamicCells;
      }
      reconciledSlots = cells.map((c, i) => {
        const existingSlot = validSlots[i];
        return {
          id: uid(),
          cellIndex: i,
          x: c.x,
          y: c.y,
          w: c.w,
          h: c.h,
          imageSrc: existingSlot?.imageSrc || undefined,
          filter: existingSlot?.filter || "none",
          brightness: existingSlot?.brightness || 100,
          contrast: existingSlot?.contrast || 100,
          saturation: existingSlot?.saturation || 100,
          zoom: existingSlot?.zoom || 1,
          dragX: existingSlot?.dragX || 0,
          dragY: existingSlot?.dragY || 0,
        };
      });
    }

    set({
      projectId,
      mode: resolvedMode,
      canvasWidth: validWidth,
      canvasHeight: validHeight,
      backgroundColor: project.backgroundColor || "#FFFFFF",
      elements: validElements,
      slots: reconciledSlots,
      template: restoredTemplate,
      collageTemplate: restoredCollageTemplate,
      printSettings: project.printSettings
        ? { ...DEFAULT_PRINT_SETTINGS, ...project.printSettings }
        : DEFAULT_PRINT_SETTINGS,
      selectedId: null,
      selectedIds: [],
      editingTextId: null,
      history: [{
        // تُبذر بداية التاريخ بالعناصر المفلترة نفسها المعروضة — إعادة الخام
        // تعني أن أول تراجع يعيد العنصر التالف (NaN/أبعاد صفرية) للكانفس.
        mode: resolvedMode,
        elements: validElements,
        slots: reconciledSlots,
        canvasWidth: validWidth,
        canvasHeight: validHeight,
        backgroundColor: project.backgroundColor || "#FFFFFF",
        collageGap: project.collageGap ?? 0,
        collageMargin: project.collageMargin ?? 0,
        collageRadius: project.collageRadius ?? 0,
        collageShowCutLines: project.collageShowCutLines ?? false,
        collageStrokeWidth: project.collageStrokeWidth ?? 0,
        collageStrokeColor: project.collageStrokeColor ?? "#000000",
      }],
      historyIndex: 0,
      showGrid: project.showGrid ?? false,
      gridSize: project.gridSize ?? 50,
      gridColor: project.gridColor ?? "#000000",
      gridOpacity: project.gridOpacity ?? 0.15,
      gridSubdivisions: project.gridSubdivisions ?? 5,
      gridType: project.gridType ?? "lines",
      snapToGrid: project.snapToGrid ?? false,
      showColumns: project.showColumns ?? false,
      columnsCount: project.columnsCount ?? 12,
      columnsColor: project.columnsColor ?? "rgba(239, 68, 68, 0.08)",
      columnsMargin: project.columnsMargin ?? 20,
      columnsGutter: project.columnsGutter ?? 12,
      collageGap: project.collageGap ?? 0,
      collageMargin: project.collageMargin ?? 0,
      collageRadius: project.collageRadius ?? 0,
      collageShowCutLines: project.collageShowCutLines ?? false,
      collageStrokeWidth: project.collageStrokeWidth ?? 0,
      collageStrokeColor: project.collageStrokeColor ?? "#000000",
    });
  },
});
