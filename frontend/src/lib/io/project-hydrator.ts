import {
  EditorMode,
  ProjectFileV1,
  CanvasElement,
  CanvasSlot,
  PrintSettings,
} from '../store/types';
import {
  PhotoTemplate,
  CollageTemplate,
  COLLAGE_TEMPLATES,
  PHOTO_TEMPLATES,
  computeDynamicCollageCells,
  getEffectiveDpi,
} from '../templates';
import { generateInitialSlots } from '../store/slices/collage-slice';
import { DEFAULT_PRINT_SETTINGS } from '../store/slices/print-slice';
import { DEFAULT_GRID_STATE, type RulerUnit, type UserGuide } from '../store/slices/grid-slice';
import { uid } from '../utils';
import { createLogger } from '../logger';

const logger = createLogger('project-hydrator');

/**
 * معرّف فريد غير مستخدم في `seen` — يبني على المعرّف الأصلي وموقع العنصر
 * حتى يبقى أثر الملف الأصلي مقروءاً في المشروع المُحمَّل (H8).
 */
export function makeUniqueId(base: string, index: number, seen: Set<string>): string {
  let candidate = `${base}-dup-${index}-${Math.random().toString(36).slice(2, 8)}`;
  while (seen.has(candidate)) {
    candidate = `${base}-dup-${index}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return candidate;
}

export interface HydratedProjectState {
  projectId: string | null;
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundGradientColor2: string | null;
  backgroundGradientAngle: number;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;
  clipboardElements: CanvasElement[];
  elements: CanvasElement[];
  slots: CanvasSlot[];
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  printSettings: PrintSettings;
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
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
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;
}

export interface HydrateProjectOptions {
  projectId?: string | null;
}

export function hydrateProjectState(
  project: ProjectFileV1,
  options?: HydrateProjectOptions,
): HydratedProjectState | null {
  if (!project || typeof project !== 'object') {
    logger.error('[loadProject] Invalid project payload provided');
    return null;
  }

  const projectId = options?.projectId ?? null;

  const validWidth =
    typeof project.canvasWidth === 'number' &&
    project.canvasWidth > 0 &&
    project.canvasWidth <= 20000
      ? project.canvasWidth
      : 2480;
  const validHeight =
    typeof project.canvasHeight === 'number' &&
    project.canvasHeight > 0 &&
    project.canvasHeight <= 20000
      ? project.canvasHeight
      : 3508;

  // قالب غير موجود في الكتالوج (إصدار أحدث/إضافة مخصصة) يُحتفظ به كما هو —
  // بياناته كاملة بعد التحقق، وإسقاطه كان يترك الكانفس بلا قالب
  const restoredTemplate = project.template
    ? (PHOTO_TEMPLATES.find((t) => t.id === project.template?.id) as PhotoTemplate | undefined) ||
      (project.template as PhotoTemplate)
    : null;
  const restoredCollageTemplate = project.collageTemplate
    ? (COLLAGE_TEMPLATES.find((t) => t.id === project.collageTemplate?.id) as
        CollageTemplate | undefined) || (project.collageTemplate as CollageTemplate)
    : null;

  const rawElements = (project.elements || []) as CanvasElement[];
  const validElements = rawElements.filter((el) => {
    if (!el || typeof el !== 'object') return false;
    if (!['image', 'text', 'shape'].includes(el.type)) return false;
    if (!isFinite(el.x) || !isFinite(el.y) || !isFinite(el.width) || !isFinite(el.height))
      return false;
    if (el.width <= 0 || el.height <= 0) return false;
    return true;
  });

  // 🛡️ تفرد المعرّفات (H8 من تدقيق 2026-10-08): الملفات المحررة يدوياً أو
  // الموروثة قد تحوي معرّفات مكرّرة. كل كتابة في الستور مفهرسة بالمعرّف،
  // فالتكرار يجعل `updateElement`/`removeElement`/`bringToFront` تُطبَّق على
  // السجلين معاً — تعديل واحد يلمس عنصرين. نُبقي الأول ونُلحق لاحقاً فريداً.
  const seenIds = new Set<string>();
  let dedupedElementCount = 0;
  const uniqueElements = validElements.map((el, idx) => {
    const rawId = typeof el.id === 'string' ? el.id : '';
    if (rawId && !seenIds.has(rawId)) {
      seenIds.add(rawId);
      return el;
    }
    dedupedElementCount += 1;
    const newId = makeUniqueId(rawId || 'element', idx, seenIds);
    seenIds.add(newId);
    return { ...el, id: newId };
  });

  // وضع موحّد مع الافتراضي: ملفات جديدة/فارغة تبدأ كولاج (مطابقة reset)،
  // بينما الملفات القديمة التي تحتوي عناصر تعديل حر تُحمل كوضع مفرد
  const resolvedMode: EditorMode =
    project.mode || (validElements.length > 0 ? 'single' : 'collage');

  const fallbackSlots = (): CanvasSlot[] =>
    resolvedMode === 'collage' ? generateInitialSlots() : [];

  const rawSlots = ((project.slots && project.slots.length > 0 ? project.slots : fallbackSlots()) ||
    []) as CanvasSlot[];
  // التحقق من سلامة الخانات مثلما تُفلتر العناصر — يمنع خانات تالفة من الوصول للكانفس
  const validSlots = rawSlots.filter((sl) => {
    if (!sl || typeof sl !== 'object') return false;
    if (!isFinite(sl.x) || !isFinite(sl.y) || !isFinite(sl.w) || !isFinite(sl.h)) return false;
    if (sl.w <= 0 || sl.h <= 0) return false;
    return true;
  });

  // نفس تفريد المعرّفات للخانات (H8) — الخانات مفهرسة بالمعرّف في كل مسارات
  // الملء والسحب، فتكررها يُطبّق عملية واحدة على خانتين.
  const seenSlotIds = new Set<string>();
  let dedupedSlotCount = 0;
  const uniqueSlots = validSlots.map((sl, idx) => {
    const rawId = typeof sl.id === 'string' ? sl.id : '';
    if (rawId && !seenSlotIds.has(rawId)) {
      seenSlotIds.add(rawId);
      return sl;
    }
    dedupedSlotCount += 1;
    const newId = makeUniqueId(rawId || 'slot', idx, seenSlotIds);
    seenSlotIds.add(newId);
    return { ...sl, id: newId };
  });

  // تكرار المعرّف علة ملف المشروع لا علة تطبيق — يُسجَّل في سجل التشخيص
  // الموحّد (لا console مباشر — قاعدة RV-4) ليصل إلى Go عند استكشاف الأخطاء.
  if (dedupedElementCount > 0 || dedupedSlotCount > 0) {
    logger.warn('duplicate ids normalized while loading project', {
      elements: dedupedElementCount,
      slots: dedupedSlotCount,
    });
  }

  // مطابقة عدد الخانات مع خلايا قالب الكولاج: اختلاف العدد يعني ملفاً تالفاً
  // أو هجرة قديمة — نعيد بناء الخانات من القالب مع الإبقاء على الصور حسب الموضع
  let reconciledSlots = uniqueSlots;
  if (
    resolvedMode === 'collage' &&
    restoredCollageTemplate &&
    uniqueSlots.length !== restoredCollageTemplate.cells.length
  ) {
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
        project.collageMargin ?? 0,
      );
      if (dynamicCells) cells = dynamicCells;
    }
    reconciledSlots = cells.map((c, i) => {
      const existingSlot = uniqueSlots[i];
      return {
        id: uid(),
        cellIndex: i,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
        // الحفاظ على بيانات الخلية من الملف القديم عند إعادة البناء
        presetType: c.presetType ?? existingSlot?.presetType,
        label: c.label ?? existingSlot?.label,
        rotation: c.rotation ?? existingSlot?.rotation ?? 0,
        imageSrc: existingSlot?.imageSrc || undefined,
        originalImageSrc: existingSlot?.originalImageSrc,
        bgColor: existingSlot?.bgColor,
        filter: existingSlot?.filter || 'none',
        brightness: existingSlot?.brightness || 100,
        contrast: existingSlot?.contrast || 100,
        saturation: existingSlot?.saturation || 100,
        zoom: existingSlot?.zoom || 1,
        dragX: existingSlot?.dragX || 0,
        dragY: existingSlot?.dragY || 0,
        flipX: existingSlot?.flipX,
        flipY: existingSlot?.flipY,
      };
    });
  }

  // تنظيف خطوط الإرشاد (User Guides) للتأكد من سلامة الموضع والنوع وتفرد المعرّفات
  const rawUserGuides = Array.isArray(project.userGuides) ? project.userGuides : [];
  const validUserGuides: UserGuide[] = rawUserGuides
    .filter((g): g is UserGuide => {
      if (!g || typeof g !== 'object') return false;
      const { type, pos } = g as Record<string, unknown>;
      return (
        (type === 'h' || type === 'v') &&
        typeof pos === 'number' &&
        Number.isFinite(pos) &&
        pos >= 0 &&
        pos <= 1
      );
    })
    .map((g) => ({
      id: typeof g.id === 'string' && g.id.trim().length > 0 ? g.id : uid(),
      type: g.type,
      pos: g.pos,
    }));

  const seenGuideIds = new Set<string>();
  const uniqueUserGuides = validUserGuides.map((g, idx) => {
    const rawId = typeof g.id === 'string' && g.id.trim().length > 0 ? g.id : `guide-${idx}`;
    if (!seenGuideIds.has(rawId)) {
      seenGuideIds.add(rawId);
      return { ...g, id: rawId };
    }
    const newId = makeUniqueId(rawId, idx, seenGuideIds);
    seenGuideIds.add(newId);
    return { ...g, id: newId };
  });

  return {
    projectId,
    mode: resolvedMode,
    canvasWidth: validWidth,
    canvasHeight: validHeight,
    backgroundColor: project.backgroundColor || '#FFFFFF',
    backgroundGradientColor2:
      typeof project.backgroundGradientColor2 === 'string' &&
      project.backgroundGradientColor2.length > 0
        ? project.backgroundGradientColor2
        : null,
    // 🎨 الزاوية تُقرأ فقط مع وجود لون ثانٍ: المشاريع القديمة/غير المتدرجة تحمل
    // 0 في هذا الحقل (وهو زاوية صالحة، فلا يمكن تمييزها عن «محفوظة 0°) —
    // فنُبقي 135 الافتراضي حتى لا يبدأ التدرج بزاوية أفقية غير مقصودة.
    backgroundGradientAngle:
      typeof project.backgroundGradientColor2 === 'string' &&
      project.backgroundGradientColor2.length > 0
        ? typeof project.backgroundGradientAngle === 'number' &&
          isFinite(project.backgroundGradientAngle)
          ? ((Math.round(project.backgroundGradientAngle) % 360) + 360) % 360
          : 135
        : 135,
    lastEditedImage: null,
    lastEditedImageAspect: null,
    clipboardElements: [],
    elements: uniqueElements,
    slots: reconciledSlots,
    template: restoredTemplate,
    collageTemplate: restoredCollageTemplate,
    printSettings: project.printSettings
      ? (() => {
          const saved = { ...DEFAULT_PRINT_SETTINGS, ...project.printSettings };
          // ترحيل المشاريع المحفوظة بصيغة قديمة: أبعاد مقلوبة في paperWidthMM
          // (مع orientation=landscape) — تُطبع عمودية خطأً — نعيد الأبعاد الأصلية
          if (
            saved.paperWidthMM &&
            saved.paperHeightMM &&
            saved.paperWidthMM > saved.paperHeightMM
          ) {
            const w = saved.paperWidthMM;
            saved.paperWidthMM = saved.paperHeightMM;
            saved.paperHeightMM = w;
          }
          return saved;
        })()
      : DEFAULT_PRINT_SETTINGS,
    selectedId: null,
    selectedIds: [],
    editingTextId: null,
    showGrid: project.showGrid ?? false,
    gridSize: project.gridSize ?? 48,
    gridColor: project.gridColor ?? '#000000',
    gridOpacity: project.gridOpacity ?? 0.15,
    gridSubdivisions: project.gridSubdivisions ?? 5,
    gridType: project.gridType ?? 'lines',
    snapToGrid: project.snapToGrid ?? true,
    showColumns: project.showColumns ?? false,
    columnsCount: project.columnsCount ?? 12,
    columnsColor: project.columnsColor ?? 'rgba(239, 68, 68, 0.08)',
    columnsMargin: project.columnsMargin ?? 20,
    columnsGutter: project.columnsGutter ?? 12,
    showRuler: project.showRuler ?? DEFAULT_GRID_STATE.showRuler,
    rulerUnit: (['mm', 'cm', 'in', 'px'].includes(project.rulerUnit as string)
      ? project.rulerUnit
      : DEFAULT_GRID_STATE.rulerUnit) as RulerUnit,
    userGuides: uniqueUserGuides,
    showUserGuides: project.showUserGuides ?? DEFAULT_GRID_STATE.showUserGuides,
    lockUserGuides: project.lockUserGuides ?? DEFAULT_GRID_STATE.lockUserGuides,
    showBleedGuides: project.showBleedGuides ?? DEFAULT_GRID_STATE.showBleedGuides,
    bleedMarginMM:
      typeof project.bleedMarginMM === 'number' &&
      Number.isFinite(project.bleedMarginMM) &&
      project.bleedMarginMM >= 0
        ? project.bleedMarginMM
        : DEFAULT_GRID_STATE.bleedMarginMM,
    safeMarginMM:
      typeof project.safeMarginMM === 'number' &&
      Number.isFinite(project.safeMarginMM) &&
      project.safeMarginMM >= 0
        ? project.safeMarginMM
        : DEFAULT_GRID_STATE.safeMarginMM,
    cutShapeType: (['rectangle', 'circle', 'rounded-rect'].includes(project.cutShapeType as string)
      ? project.cutShapeType
      : DEFAULT_GRID_STATE.cutShapeType) as 'rectangle' | 'circle' | 'rounded-rect',
    collageGap: project.collageGap ?? 0,
    collageMargin: project.collageMargin ?? 0,
    collageRadius: project.collageRadius ?? 0,
    collageShowCutLines: project.collageShowCutLines ?? false,
    collageShowEndCutLine: project.collageShowEndCutLine ?? true,
    collageStrokeWidth: project.collageStrokeWidth ?? 0,
    collageStrokeColor: project.collageStrokeColor ?? '#000000',
  };
}
