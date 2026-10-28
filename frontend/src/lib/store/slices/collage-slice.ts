import { normalizeSelection } from './element-slice';
import { getCollageGeometry, getSlotRect } from '../../canvas/collage-geometry';
import { measureImageAspect } from '../../canvas/measure-image';
import { recenterElementsOnResize } from '../../canvas/resize-elements';
import { mmToPx, pxToMm } from '../../canvas/units';
import {
  COLLAGE_TEMPLATES,
  computeDynamicCollageCells,
  getEffectiveDpi,
  getPhysicalMaxMarginMM,
} from '../../templates';
import { uid } from '../../utils';

import type { SlotRect } from '../../canvas/collage-geometry';
import type {
  CanvasElement,
  CanvasSlot,
  PhotoTemplate,
  CollageTemplate,
  PrintSettings,
  HistoryEntry,
} from '../types';
import type { StateCreator } from 'zustand';

/** تحمّل الفاصلة العائمة (floating-point) للإحداثيات النسبية [0,1] — يُستخدم في فحص الحدود */
const EPSILON_BOUNDS = 1e-9;
/** تحمّل floating-point لفحص التداخل بالبكسل — أصغر من أن يُرى بالعين */
const EPSILON_OVERLAP = 1e-6;

export type CollageSlotSizeError = 'not-found' | 'invalid' | 'out-of-bounds' | 'overlap';
export type CollageSlotSizeResult = { ok: true } | { ok: false; reason: CollageSlotSizeError };

export interface CollageSlice {
  template: PhotoTemplate | null;
  collageTemplate: CollageTemplate | null;
  slots: CanvasSlot[];
  collageGap: number;
  collageMargin: number;
  collageRadius: number;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean;
  collageStrokeWidth: number;
  collageStrokeColor: string;

  setTemplate: (template: PhotoTemplate | null) => void;
  setCollageTemplate: (template: CollageTemplate | null) => void;
  setSlotImage: (slotId: string, src: string) => void;
  updateSlot: (slotId: string, patch: Partial<CanvasSlot>) => void;
  updateSlotsBatch: (slotIds: string[], patch: Partial<CanvasSlot>) => void;
  resizeCollageSlot: (slotId: string, w: number, h: number) => CollageSlotSizeResult;
  applyCollageSlotSizeToAll: (slotId: string) => CollageSlotSizeResult;
  clearSlots: () => void;
  fillAllSlots: (src: string, sourceSlotId?: string) => void;
  fillRowSlots: (slotId: string, src: string) => void;
  fillColumnSlots: (slotId: string, src: string) => void;
  setSlotImagesBatch: (
    assignments: { slotId: string; src: string }[],
    lastEditedSrc?: string | null,
  ) => void;
  /** قائمة صور معالج التعبئة — حالة جلسة تبقى عبر تبويبات لوحة الكولاج */
  autofillImages: string[];
  setAutofillImages: (images: string[]) => void;

  setCollageGap: (gap: number) => void;
  setCollageMargin: (margin: number) => void;
  previewCollageGap: (gap: number) => void;
  previewCollageMargin: (margin: number) => void;
  commitCollageSpacing: () => void;
  setCollageRadius: (radius: number) => void;
  setCollageShowCutLines: (show: boolean) => void;
  setCollageShowEndCutLine: (show: boolean) => void;
  setCollageStrokeWidth: (width: number) => void;
  setCollageStrokeColor: (color: string) => void;

  swapSlots: (slotIdA: string, slotIdB: string) => void;
  fillEmptySlots: (src: string, sourceSlotId?: string) => void;
  rotateSlot: (slotId: string, angleDelta?: number) => void;
  flipSlotX: (slotId: string) => void;
  flipSlotY: (slotId: string) => void;
  /**
   * لفّ جماعي **تزايدي** — يضيف angleDelta لتدوير كل خانة محددة.
   * `updateSlotsBatch` لا يصلح لهذا: يفرض قيمة مطلقة فيجعل الضغط مرتين
   * بلا أثر (90 ثم 90 = 90)، وبلا تسجيل في سجل التراجع أصلاً.
   */
  rotateSlotsBatch: (slotIds: string[], angleDelta?: number) => void;
  resetSlotAdjustments: (slotId: string) => void;
}

const initialCollage = COLLAGE_TEMPLATES[0];

/**
 * إعادة ربط خلايا الشبكة الجديدة بالخلايا القديمة **بأقرب مركز** لا بالفهرس.
 * تغيير الفجوة/الهامش قد يغيّر عدد الصفوف والأعمدة، والربط بالفهرس
 * (`existingSlots[i]`) كان ينقل الصور إلى خلايا أخرى بلا أي سبب مرئي.
 * المطابقة الجشعة تُبقي كل صورة في أقرب خلية لموضعها السابق وتحفظ معرّفها
 * (فلا ينقطع التحديد ولا يتضخم سجل التراجع بمعرّفات جديدة).
 */
export function remapSlotsToCells(
  existing: CanvasSlot[],
  cells: Array<{ x: number; y: number; w: number; h: number }>,
): CanvasSlot[] {
  const pool = existing.map((slot) => ({
    slot,
    cx: slot.x + slot.w / 2,
    cy: slot.y + slot.h / 2,
  }));

  return cells.map((cell, index) => {
    const cx = cell.x + cell.w / 2;
    const cy = cell.y + cell.h / 2;
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pool.length; i++) {
      const distance = (pool[i].cx - cx) ** 2 + (pool[i].cy - cy) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const matched = bestIndex >= 0 ? pool.splice(bestIndex, 1)[0].slot : undefined;

    return {
      ...(matched ?? {}),
      id: matched?.id || uid(),
      cellIndex: index,
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
      filter: matched?.filter ?? 'none',
      brightness: matched?.brightness ?? 100,
      contrast: matched?.contrast ?? 100,
      saturation: matched?.saturation ?? 100,
      zoom: matched?.zoom ?? 1,
      dragX: matched?.dragX ?? 0,
      dragY: matched?.dragY ?? 0,
    };
  });
}

export function generateInitialSlots(): CanvasSlot[] {
  return initialCollage.cells.map((c, i) => ({
    // uid() (crypto.randomUUID) مثل بقية التطبيق بدل Math.random
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
}

export const DEFAULT_COLLAGE_STATE = {
  template: null as PhotoTemplate | null,
  collageTemplate: initialCollage,
  slots: generateInitialSlots(),
  collageGap: 0,
  collageMargin: 0,
  collageRadius: 0,
  collageShowCutLines: false,
  collageShowEndCutLine: true,
  collageStrokeWidth: 0,
  collageStrokeColor: '#000000',
  autofillImages: [] as string[],
};

type CollageCross = CollageSlice & {
  mode: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  freeformCanvasWidth?: number;
  freeformCanvasHeight?: number;
  freeformBackgroundColor?: string;
  collageCanvasWidth?: number;
  collageCanvasHeight?: number;
  collageBackgroundColor?: string;
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;
  history: HistoryEntry[];
  historyIndex: number;
  pushHistory: () => void;
  printSettings?: PrintSettings;
};

/** فحص تقاطع مستطيلين محوريين (AABB) بتحمّل floating-point. */
function rectsIntersect(a: SlotRect, b: SlotRect): boolean {
  return (
    a.left < b.left + b.width - EPSILON_OVERLAP &&
    a.left + a.width > b.left + EPSILON_OVERLAP &&
    a.top < b.top + b.height - EPSILON_OVERLAP &&
    a.top + a.height > b.top + EPSILON_OVERLAP
  );
}

function hasOverlap(slots: CanvasSlot[], geo: ReturnType<typeof getCollageGeometry>): boolean {
  const rects = slots.map((slot) => getSlotRect(slot, geo));
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (rectsIntersect(rects[i], rects[j])) return true;
    }
  }
  return false;
}

/** يثبّت الهندسة اليدوية في القالب حتى لا يمحوها إعادة توليد التخطيط الفيزيائي. */
function manualGeometryPatch(state: CollageCross, slots: CanvasSlot[]) {
  const wasPhysical = Boolean(state.collageTemplate?.physicalLayout);
  const collageTemplate = state.collageTemplate
    ? {
        ...state.collageTemplate,
        cells: slots.map(({ x, y, w, h, presetType, label, rotation }) => ({
          x,
          y,
          w,
          h,
          presetType,
          label,
          rotation,
        })),
      }
    : null;
  if (collageTemplate) delete collageTemplate.physicalLayout;
  return {
    slots,
    collageTemplate,
    // كانت الإحداثيات الفيزيائية تشمل الهوامش والفجوات؛ لا نطبقها مرة ثانية.
    ...(wasPhysical ? { collageGap: 0, collageMargin: 0 } : {}),
  };
}

/**
 * محاولة إزاحة الخلايا المتداخلة عند تغيير مقاس خلية.
 * تدفع كل خلية متداخلة في اتجاه أصغر تداخل (أفقي أو عمودي).
 * إذا تسببت الإزاحة في تداخل جديد، تُزاح الخلية الجديدة بشكل متكرر.
 * تُرجع مصفوفة الخلايا المُحدّثة أو null إذا تعذّرت الإزاحة.
 */
function tryDisplaceOverlappingCells(
  resizedSlotId: string,
  resizedSlotNewRect: SlotRect,
  resizedSlotOriginalRect: SlotRect,
  slots: CanvasSlot[],
  geo: ReturnType<typeof getCollageGeometry>,
  displacedIds: Set<string> = new Set(),
  depth: number = 0,
): CanvasSlot[] | null {
  if (depth > 20) return null; // حارس عمق التكرار لمنع تجاوز سعة المكدس في التداخلات المعقدة

  const overlapping = slots.filter((slot) => {
    if (slot.id === resizedSlotId || displacedIds.has(slot.id)) return false;
    return rectsIntersect(resizedSlotNewRect, getSlotRect(slot, geo));
  });

  if (overlapping.length === 0) return slots;

  let result = [...slots];
  for (const overlapSlot of overlapping) {
    const overlapRect = getSlotRect(overlapSlot, geo);

    // حساب مقدار التداخل في كل اتجاه
    const overlapX = Math.min(
      resizedSlotNewRect.left + resizedSlotNewRect.width - overlapRect.left,
      overlapRect.left + overlapRect.width - resizedSlotNewRect.left,
    );
    const overlapY = Math.min(
      resizedSlotNewRect.top + resizedSlotNewRect.height - overlapRect.top,
      overlapRect.top + overlapRect.height - resizedSlotNewRect.top,
    );

    // حساب التباعد الأصلي بين الخلية المُعدّلة والخلية المتداخلة
    // لضمان الحفاظ على المسافة الافتراضية بعد الإزاحة. إذا كانت الخلايا
    // متداخلة أصلاً على هذا المحور (لكنها منفصلة على المحور الآخر)، فلا
    // توجد فجوة قابلة للحفظ؛ القيمة السالبة كانت تلغي مقدار الإزاحة المطلوب
    // وتسمح بحفظ تداخل حقيقي بعد تكبير الخلية.
    let originalGapX = 0;
    let originalGapY = 0;

    if (resizedSlotOriginalRect.left < overlapRect.left) {
      originalGapX =
        overlapRect.left - (resizedSlotOriginalRect.left + resizedSlotOriginalRect.width);
    } else {
      originalGapX = resizedSlotOriginalRect.left - (overlapRect.left + overlapRect.width);
    }

    if (resizedSlotOriginalRect.top < overlapRect.top) {
      originalGapY =
        overlapRect.top - (resizedSlotOriginalRect.top + resizedSlotOriginalRect.height);
    } else {
      originalGapY = resizedSlotOriginalRect.top - (overlapRect.top + overlapRect.height);
    }
    originalGapX = Math.max(0, originalGapX);
    originalGapY = Math.max(0, originalGapY);

    // الدفع في اتجاه أصغر تداخل + التباعد الأصلي
    let dx = 0;
    let dy = 0;

    if (overlapX < overlapY) {
      // دفع أفقي
      if (resizedSlotNewRect.left < overlapRect.left) {
        dx = (overlapX + originalGapX) / geo.availW; // دفع لليمين
      } else {
        dx = -(overlapX + originalGapX) / geo.availW; // دفع لليسار
      }
    } else {
      // دفع عمودي
      if (resizedSlotNewRect.top < overlapRect.top) {
        dy = (overlapY + originalGapY) / geo.availH; // دفع للأسفل
      } else {
        dy = -(overlapY + originalGapY) / geo.availH; // دفع للأعلى
      }
    }

    const newX = overlapSlot.x + dx;
    const newY = overlapSlot.y + dy;

    // التحقق من أن الإزاحة ضمن الحدود
    if (
      newX < -EPSILON_BOUNDS ||
      newX + overlapSlot.w > 1 + EPSILON_BOUNDS ||
      newY < -EPSILON_BOUNDS ||
      newY + overlapSlot.h > 1 + EPSILON_BOUNDS
    ) {
      return null; // تعذّرت الإزاحة
    }

    const displacedSlot = { ...overlapSlot, x: newX, y: newY };
    result = result.map((s) => (s.id === overlapSlot.id ? displacedSlot : s));

    // التحقق بشكل متكرر من أن الخلية المُزاحة لا تتداخل مع خلايا أخرى
    const displacedRect = getSlotRect(displacedSlot, geo);
    const recursiveResult = tryDisplaceOverlappingCells(
      overlapSlot.id,
      displacedRect,
      displacedRect, // الخلية المُزاحة أصبحت الآن "الأصلية" للتداخلات التالية
      result,
      geo,
      new Set([...displacedIds, resizedSlotId]),
      depth + 1,
    );

    if (!recursiveResult) return null; // تعذّر حل التداخلات المتسلسلة
    result = recursiveResult;
  }

  return result;
}

/**
 * نسخ خصائص الصورة البصرية من الخلية المصدر إلى الخلية المستهدفة — مصدر واحد
 * للحقول المنقولة عند ملء/نسخ الصور (fillAll, fillRow, fillColumn, fillEmpty).
 * القيم الاحتياطية من الخلية المستهدفة (`sl`) تُحفظ عند غياب مصدر.
 */
function deriveSlotImageProps(
  source: CanvasSlot | null | undefined,
  sl: CanvasSlot,
): Partial<CanvasSlot> {
  return {
    filter: source?.filter || 'none',
    brightness: source?.brightness ?? 100,
    contrast: source?.contrast ?? 100,
    saturation: source?.saturation ?? 100,
    zoom: source?.zoom ?? sl.zoom,
    dragX: source?.dragX ?? sl.dragX,
    dragY: source?.dragY ?? sl.dragY,
    flipX: source?.flipX ?? sl.flipX,
    flipY: source?.flipY ?? sl.flipY,
    rotation: source?.rotation ?? sl.rotation,
    bgColor: source?.bgColor ?? sl.bgColor,
  };
}

/** يملأ الخلايا الواقعة على نفس المحور (صف/عمود) حول خلية مصدر — null إذا لم توجد. */
function fillSlotsAlongAxis(
  slots: CanvasSlot[],
  axis: 'x' | 'y',
  slotId: string,
  src: string,
): CanvasSlot[] | null {
  const targetSlot = slots.find((sl) => sl.id === slotId);
  if (!targetSlot) return null;
  const targetPos = Math.round(targetSlot[axis] * 1000);
  return slots.map((sl) =>
    Math.abs(Math.round(sl[axis] * 1000) - targetPos) < 2
      ? {
          ...sl,
          imageSrc: src,
          ...deriveSlotImageProps(targetSlot, sl),
        }
      : sl,
  );
}

/**
 * يحسب أقصى فجوة مسموح بها للخلايا اليدوية بحيث لا يهبط مقاس أي خلية عن الحد الأدنى (1 مم).
 * يمنع إنتاج أبعاد سالبة عند زيادة التباعد في التخطيطات اليدوية (P1).
 */
function getManualMaxGap(
  slots: CanvasSlot[],
  canvasW: number,
  canvasH: number,
  margin: number,
  minSlotPx: number,
): number {
  if (!slots || slots.length === 0) return Number.POSITIVE_INFINITY;
  const availW = Math.max(1, canvasW - 2 * margin);
  const availH = Math.max(1, canvasH - 2 * margin);
  let minSpan = Number.POSITIVE_INFINITY;
  for (const sl of slots) {
    const spanW = sl.w * availW;
    const spanH = sl.h * availH;
    if (spanW < minSpan) minSpan = spanW;
    if (spanH < minSpan) minSpan = spanH;
  }
  return Math.max(0, minSpan - minSlotPx);
}

/**
 * يحسب أقصى هامش مسموح به للخلايا اليدوية بحيث لا تنحسر أبعاد أي خلية عن الحد الأدنى (1 مم).
 */
function getManualMaxMargin(
  slots: CanvasSlot[],
  canvasW: number,
  canvasH: number,
  gap: number,
  minSlotPx: number,
): number {
  if (!slots || slots.length === 0) return Math.min(canvasW, canvasH) / 4;
  let maxMargin = Math.min(canvasW, canvasH) / 4;
  for (const sl of slots) {
    if (sl.w > 0) {
      const limitW = (canvasW - (gap + minSlotPx) / sl.w) / 2;
      if (limitW < maxMargin) maxMargin = limitW;
    }
    if (sl.h > 0) {
      const limitH = (canvasH - (gap + minSlotPx) / sl.h) / 2;
      if (limitH < maxMargin) maxMargin = limitH;
    }
  }
  return Math.max(0, maxMargin);
}

/**
 * أقصى هامش مسموح به للتخطيط الفيزيائي (بالبكسل الكانفسي): يمنع الهامش من ابتلاع
 * الورقة — الذي كان يولّد خلايا سالبة عبر `computeDynamicCollageCells` — ويمنع
 * انحسار أصغر خلية دون 1 مم، بنفس الحد المطبق على الهوامش اليدوية.
 * يُعيد null إن لم يوجد تخطيط فيزيائي أو كان نوعه غير معروف — عندها لا يُقيَّد الهامش.
 */
function getPhysicalMaxMargin(state: CollageCross): number | null {
  const template = state.collageTemplate;
  if (!template?.physicalLayout) return null;
  const storedDpi = state.printSettings?.dpi || 300;
  const dpi = getEffectiveDpi(state.canvasWidth, state.canvasHeight, storedDpi);
  const paperWmm = pxToMm(state.canvasWidth, dpi);
  const paperHmm = pxToMm(state.canvasHeight, dpi);
  // نفس تحويل الفجوة الصريحة في computeDynamicCollageCells — الصفر يبقى صفراً
  // (كان استبدالاً خفياً بـ2 مم يجعل حدّ الهامش لا يطابق الخلايا المولّدة)
  const gapMM = pxToMm(Math.max(0, state.collageGap), dpi);
  const maxMarginMM = getPhysicalMaxMarginMM(template, paperWmm, paperHmm, gapMM, 1);
  return maxMarginMM == null ? null : mmToPx(maxMarginMM, dpi);
}

export const createCollageSlice: StateCreator<CollageCross, [], [], CollageSlice> = (set, get) => ({
  ...DEFAULT_COLLAGE_STATE,

  setAutofillImages: (images) => set({ autofillImages: images }),

  setTemplate: (template) => {
    if (template) {
      // 🧱 فصل الوضعين: قالب الصورة يخص الوضع الحر فقط — خانات الكولاج (`slots`)
      // لا تُمس، وعناصر الوضع الحر الموجودة تُحفظ (يُعاد استدعاء setTemplate عند
      // تغيير المقاس/الاتجاه في لوحة الأبعاد وكان يستبدل التصميم كله بصورة واحدة).
      // البذر بآخر صورة معدلة يتم فقط عندما يكون الوضع الحر فارغاً.
      const s = get();
      const lastImg = s.lastEditedImage;
      const lastAspect = s.lastEditedImageAspect || 1;
      // العناصر الموجودة تحتفظ بأبعادها بالبكسل ومتمركزة في المقاس الجديد
      // (نسخة دائماً: الدالة تعيد المرجع نفسه عند تطابق الأبعاد و push أدناه يعدّلها)
      const elements: CanvasElement[] = [
        ...recenterElementsOnResize(
          s.elements,
          s.canvasWidth,
          s.canvasHeight,
          template.width,
          template.height,
        ),
      ];
      let seededId: string | null = null;
      if (lastImg && elements.length === 0) {
        const id = uid();
        seededId = id;
        let hPercent = 0.6;
        let wPercent = hPercent * (template.height / template.width) * lastAspect;

        if (wPercent > 0.8) {
          wPercent = 0.8;
          hPercent = (wPercent * (template.width / template.height)) / lastAspect;
        }

        elements.push({
          id,
          type: 'image',
          x: 0.5 - wPercent / 2,
          y: 0.5 - hPercent / 2,
          width: wPercent,
          height: hPercent,
          rotation: 0,
          opacity: 1,
          zIndex: 10,
          imageSrc: lastImg,
          filter: 'none',
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
        });
      }
      set({
        template,
        mode: 'single',
        canvasWidth: template.width,
        canvasHeight: template.height,
        freeformCanvasWidth: template.width,
        freeformCanvasHeight: template.height,
        backgroundColor: template.background,
        freeformBackgroundColor: template.background,
        elements,
        ...normalizeSelection(seededId),
      });
      get().pushHistory();
    } else {
      set({ template: null });
      get().pushHistory();
    }
  },

  setCollageTemplate: (template) => {
    if (template) {
      const currentWidth = get().collageCanvasWidth || get().canvasWidth || 2480;
      const currentHeight = get().collageCanvasHeight || get().canvasHeight || 3508;
      const storedDpi = get().printSettings?.dpi || 300;
      const dpi = getEffectiveDpi(currentWidth, currentHeight, storedDpi);

      let cells = template.cells;
      if (template.physicalLayout) {
        const dynamicCells = computeDynamicCollageCells(
          template,
          currentWidth,
          currentHeight,
          dpi,
          get().collageGap,
          get().collageMargin,
        );
        if (dynamicCells) {
          cells = dynamicCells;
        }
      }

      const existingSlots = get().slots || [];
      const filledSlots = existingSlots.filter((s) => s.imageSrc);
      const isSingleImageAllFilled =
        filledSlots.length > 0 &&
        filledSlots.length === existingSlots.length &&
        new Set(filledSlots.map((s) => s.imageSrc)).size === 1;
      const singleImgSlot = isSingleImageAllFilled ? filledSlots[0] : null;

      const slots: CanvasSlot[] = cells.map((c, i) => {
        const existingSlot = existingSlots[i] || singleImgSlot;
        return {
          id: uid(),
          cellIndex: i,
          x: c.x,
          y: c.y,
          w: c.w,
          h: c.h,
          // الحفاظ على بيانات الخلية من القالب الحر (مقاس/تسمية/تدوير الصورة)
          presetType: c.presetType ?? existingSlot?.presetType,
          label: c.label ?? existingSlot?.label,
          rotation: c.rotation ?? existingSlot?.rotation ?? 0,
          imageSrc: existingSlot?.imageSrc || undefined,
          // 🔁 كانت هذه الحقول الأربعة تُسقط عند تبديل القالب: يضيع لون الخلية
          // والقلب الأفقي/الرأسي ومصدر الصورة الأصلي («استعادة الأصل» يتعطل)
          originalImageSrc: existingSlot?.originalImageSrc,
          bgColor: existingSlot?.bgColor,
          flipX: existingSlot?.flipX,
          flipY: existingSlot?.flipY,
          filter: existingSlot?.filter || 'none',
          brightness: existingSlot?.brightness ?? 100,
          contrast: existingSlot?.contrast ?? 100,
          saturation: existingSlot?.saturation ?? 100,
          zoom: existingSlot?.zoom || 1,
          dragX: existingSlot?.dragX || 0,
          dragY: existingSlot?.dragY || 0,
        };
      });
      // 🧱 فصل الوضعين: الكولاج يملك `slots` فقط وعناصر الوضع الحر (`elements`)
      // لا تُمس هنا إطلاقاً — كان التبديل يمسحها فيضيع تصميم الوضع الحر بالكامل
      // عند اختيار أي قالب أو تعديل الشبكة من داخل الكولاج.
      set({
        collageTemplate: template,
        mode: 'collage',
        slots,
        ...normalizeSelection([]),
        canvasWidth: currentWidth,
        canvasHeight: currentHeight,
        collageCanvasWidth: currentWidth,
        collageCanvasHeight: currentHeight,
      });
      // لا نمسح سجل التراجع — التبديل يُسجل كخطوة واحدة قابلة للتراجع (إصلاح E-2)
      get().pushHistory();
    } else {
      set({ collageTemplate: null, slots: [] });
      get().pushHistory();
    }
  },

  setSlotImage: (slotId, src) => {
    // لقطة الخانات ما قبل العملية غير المتزامنة — المرجع الوحيد لكل قيم «ما قبل
    // الاستبدال» (المصدر القديم). الحالة الآنية بعد القياس تخلط العمليات
    // المتداخلة فتُطبّق تصحيحاً لا يخص هذه العملية (H7).
    const slotsAtBatch = get().slots.map((sl: CanvasSlot) => ({ ...sl }));
    const prev = slotsAtBatch.find((sl) => sl.id === slotId);
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) =>
        sl.id === slotId
          ? {
              ...sl,
              imageSrc: src,
              filter: 'none',
              brightness: 100,
              contrast: 100,
              saturation: 100,
            }
          : sl,
      ),
      lastEditedImage: src,
    }));
    get().pushHistory();

    // استبدال الصورة يُبقي إزاحات القص مضبوطة على أبعاد الصورة السابقة —
    // عند اختلاف نسبة الأبعاد نُصفّر dragX/dragY/zoom (مع إبقاء flip/rotation)
    if (!prev?.imageSrc || prev.imageSrc === src) return;
    void (async () => {
      const [prevAspect, nextAspect] = await Promise.all([
        measureImageAspect(prev.imageSrc!),
        measureImageAspect(src),
      ]);
      if (!Number.isFinite(prevAspect) || !Number.isFinite(nextAspect)) return;
      if (Math.abs(prevAspect - nextAspect) > 0.001) {
        // حارس قِدم: الحالة الآنية فقط هي ما يكشف أن عملية أحدث استبدلت الصورة
        // أثناء القياس — وكل قيم «قبل» تأتي من لقطة ما قبل العملية أعلاه.
        if (get().slots.find((sl) => sl.id === slotId)?.imageSrc !== src) return;
        // تصحيح واحد مدموج في نفس العملية — العملية كلها خطوة تراجع واحدة (H7):
        // كانت اللقطة المتأخرة تُسجّل إدخالاً ثانٍ يعكس حالة آنية لا حالة الدفعة
        set((state) => ({
          slots: state.slots.map((sl: CanvasSlot) =>
            sl.id === slotId ? { ...sl, dragX: 0, dragY: 0, zoom: 1 } : sl,
          ),
        }));
      }
    })();
  },

  setSlotImagesBatch: (assignments, lastEditedSrc) => {
    if (assignments.length === 0) return;
    // فهارس O(1) بدل find داخل map — كانت الدفعة O(خانات × إسنادات)
    // وتُجمّد اللوحة عند توزيع مئات الصور من مجلد واحد.
    const srcBySlot = new Map<string, string>();
    for (const a of assignments) srcBySlot.set(a.slotId, a.src);
    // قيم «قبل» من لقطة ما قبل التحديث — مقارنة ما بعد التحديث كانت
    // تبطل الكشف عن الاستبدالات دائماً (imageSrc أصبح يساوي الجديد)
    const prevBySlot = new Map<string, string | undefined>();
    for (const sl of get().slots) {
      if (srcBySlot.has(sl.id)) prevBySlot.set(sl.id, sl.imageSrc);
    }
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => {
        const nextSrc = srcBySlot.get(sl.id);
        if (nextSrc === undefined) return sl;
        return {
          ...sl,
          imageSrc: nextSrc,
          filter: 'none',
          brightness: 100,
          contrast: 100,
          saturation: 100,
        };
      }),
      lastEditedImage: lastEditedSrc ?? state.lastEditedImage,
    }));
    // دفعة كاملة تُسجل كخطوة تراجع واحدة (الإسقاط المتعدد)
    get().pushHistory();

    // استبدالات تختلف نسبة أبعادها عن السابقة: تصفير إزاحات القص (مطابقة setSlotImage)
    const replaced = assignments.filter((a) => {
      const prev = prevBySlot.get(a.slotId);
      return !!prev && prev !== a.src;
    });
    if (replaced.length === 0) return;
    void (async () => {
      const results = await Promise.all(
        replaced.map(async (a) => {
          const [prevAspect, nextAspect] = await Promise.all([
            measureImageAspect(prevBySlot.get(a.slotId) || ''),
            measureImageAspect(a.src),
          ]);
          if (!Number.isFinite(prevAspect) || !Number.isFinite(nextAspect)) return null;
          if (Math.abs(prevAspect - nextAspect) <= 0.001) return null;
          return a.slotId;
        }),
      );
      const candidates = results.filter((id): id is string => !!id);
      if (candidates.length === 0) return;
      // حارس قِدم: نتجاهل النتيجة إذا استُبدلت الصورة مجدداً أثناء القياس —
      // كل قيم «قبل» مقروءة من لقطة ما قبل الدفعة (لتُطبَّق على خاناتها لا على
      // خانات دفعة أحدث تجاورها في نفس المللي ثانية)
      const currentSrcBySlot = new Map(
        get().slots.map((sl: CanvasSlot) => [sl.id, sl.imageSrc] as const),
      );
      const toReset = candidates.filter((id) => {
        const nextSrc = srcBySlot.get(id);
        return nextSrc !== undefined && currentSrcBySlot.get(id) === nextSrc;
      });
      if (toReset.length === 0) return;
      // تصحيح واحد مدموج في نفس الدفعة — لا إدخال سجل ثانٍ (H7): الدفعة كلها
      // خطوة تراجع واحدة، وكانت اللقطة اللاحقة تدفع إدخالاً يعكس حالة آنية
      set((state) => ({
        slots: state.slots.map((sl: CanvasSlot) =>
          toReset.includes(sl.id) ? { ...sl, dragX: 0, dragY: 0, zoom: 1 } : sl,
        ),
      }));
    })();
  },

  updateSlot: (slotId, patch) => {
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => (sl.id === slotId ? { ...sl, ...patch } : sl)),
    }));
  },

  // تحديث دُفعي: set واحد لكل الخلايا بدل N إشعارات ستور (ألوان الخلفية الشاملة)
  updateSlotsBatch: (slotIds, patch) => {
    if (slotIds.length === 0) return;
    const idSet = new Set(slotIds);
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => (idSet.has(sl.id) ? { ...sl, ...patch } : sl)),
    }));
  },

  resizeCollageSlot: (slotId, w, h) => {
    const state = get();
    const source = state.slots.find((slot) => slot.id === slotId);
    if (!source) return { ok: false, reason: 'not-found' };
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return { ok: false, reason: 'invalid' };
    }
    if (w > 1 - source.x + EPSILON_BOUNDS || h > 1 - source.y + EPSILON_BOUNDS) {
      return { ok: false, reason: 'out-of-bounds' };
    }
    if (Math.abs(source.w - w) < EPSILON_BOUNDS && Math.abs(source.h - h) < EPSILON_BOUNDS) {
      return { ok: true };
    }
    const geo = getCollageGeometry(
      state.canvasWidth,
      state.canvasHeight,
      state.collageMargin,
      state.collageGap,
      Boolean(state.collageTemplate?.physicalLayout),
    );
    const originalRect = getSlotRect(source, geo);
    const candidateRect = getSlotRect({ ...source, w, h }, geo);
    const hasConflict = state.slots.some((slot) => {
      if (slot.id === slotId) return false;
      return rectsIntersect(candidateRect, getSlotRect(slot, geo));
    });

    if (hasConflict) {
      // محاولة إزاحة الخلايا المتداخلة
      const displacedSlots = tryDisplaceOverlappingCells(
        slotId,
        candidateRect,
        originalRect,
        state.slots,
        geo,
      );
      if (!displacedSlots) {
        return { ok: false, reason: 'overlap' };
      }
      // تطبيق التغيير والمقاس الجديد معًا كخطوة واحدة
      const slots = displacedSlots.map((slot) => (slot.id === slotId ? { ...slot, w, h } : slot));
      // قد يتداخل أكثر من مسار إزاحة متسلسل؛ لا نعتمد على نجاح كل خطوة
      // منفردة، بل نتحقق من الهندسة النهائية قبل تسجيل أي حالة في السجل.
      if (hasOverlap(slots, geo)) return { ok: false, reason: 'overlap' };
      set(manualGeometryPatch(state, slots));
      get().pushHistory();
      return { ok: true };
    }

    const slots = state.slots.map((slot) => (slot.id === slotId ? { ...slot, w, h } : slot));
    set(manualGeometryPatch(state, slots));
    get().pushHistory();
    return { ok: true };
  },

  applyCollageSlotSizeToAll: (slotId) => {
    const state = get();
    const source = state.slots.find((slot) => slot.id === slotId);
    if (!source) return { ok: false, reason: 'not-found' };
    // المقاس الموحّد لا يجوز أن يدفع أي خلية خارج الورقة؛ لا نغيّر مواضعها ضمنياً.
    const fits = state.slots.every(
      (slot) => slot.x + source.w <= 1 + EPSILON_BOUNDS && slot.y + source.h <= 1 + EPSILON_BOUNDS,
    );
    if (!fits) return { ok: false, reason: 'out-of-bounds' };
    const changed = state.slots.some(
      (slot) =>
        Math.abs(slot.w - source.w) > EPSILON_BOUNDS ||
        Math.abs(slot.h - source.h) > EPSILON_BOUNDS,
    );
    if (!changed) return { ok: true };
    const slots = state.slots.map((slot) => ({ ...slot, w: source.w, h: source.h }));
    const geo = getCollageGeometry(
      state.canvasWidth,
      state.canvasHeight,
      state.collageMargin,
      state.collageGap,
      Boolean(state.collageTemplate?.physicalLayout),
    );
    if (hasOverlap(slots, geo)) return { ok: false, reason: 'overlap' };
    set(manualGeometryPatch(state, slots));
    get().pushHistory();
    return { ok: true };
  },

  clearSlots: () => {
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => ({ ...sl, imageSrc: undefined })),
      // ℹ️ lastEditedImage **يبقى** عن قصد: زر «آخر صورة معدلة» في لوحة الخلية
      // الفارغة يُستخدم لإعادة تعبئة الشبكة بعد مسحها (سير عمل مقصود، لا شبح).
    }));
    get().pushHistory();
  },

  fillAllSlots: (src, sourceSlotId) => {
    const targetSlot = sourceSlotId ? get().slots.find((sl) => sl.id === sourceSlotId) : null;
    set((state) => ({
      slots: state.slots.map((sl: CanvasSlot) => ({
        ...sl,
        imageSrc: src,
        ...deriveSlotImageProps(targetSlot, sl),
      })),
    }));
    get().pushHistory();
  },

  fillRowSlots: (slotId, src) => {
    const slots = fillSlotsAlongAxis(get().slots, 'y', slotId, src);
    if (!slots) return;
    set({ slots });
    get().pushHistory();
  },

  fillColumnSlots: (slotId, src) => {
    const slots = fillSlotsAlongAxis(get().slots, 'x', slotId, src);
    if (!slots) return;
    set({ slots });
    get().pushHistory();
  },

  setCollageGap: (gap) => {
    set((s) => {
      let adjustedSlots = s.slots || [];
      const collageTemplate = s.collageTemplate;
      const mode = s.mode;
      let effectiveGap = Math.max(0, gap);

      if (mode === 'collage') {
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);

        if (collageTemplate && collageTemplate.physicalLayout) {
          const dynamicCells = computeDynamicCollageCells(
            collageTemplate,
            s.canvasWidth,
            s.canvasHeight,
            dpi,
            gap,
            s.collageMargin,
          );
          if (dynamicCells) {
            adjustedSlots = remapSlotsToCells(s.slots || [], dynamicCells);
          }
        } else if (s.slots?.length > 0) {
          const minSlotPx = Math.max(1, mmToPx(1, dpi));
          const maxGap = getManualMaxGap(
            s.slots,
            s.canvasWidth,
            s.canvasHeight,
            s.collageMargin,
            minSlotPx,
          );
          effectiveGap = Math.min(effectiveGap, maxGap);
        }
      }
      return {
        collageGap: effectiveGap,
        slots: adjustedSlots,
      };
    });
    // الدفع عبر onCommit من الواجهة — لا pushHistory هنا (إصلاح Bug#2)
  },

  // 🚀 معاينة عابرة أثناء سحب السلايدر: تُحدَّث القيمة فقط بلا إعادة حساب
  // الخلايا (O(خلايا×خانات) + مصفوفة slots جديدة كل إطار تسقط طبقة الكولاج).
  // التثبيت الحسابي يتم مرة واحدة في commitCollageSpacing عند الإفلات.
  previewCollageGap: (gap) => {
    const s = get();
    let effectiveGap = Math.max(0, gap);
    if (s.mode === 'collage' && !s.collageTemplate?.physicalLayout && s.slots?.length > 0) {
      const storedDpi = s.printSettings?.dpi || 300;
      const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
      const minSlotPx = Math.max(1, mmToPx(1, dpi));
      const maxGap = getManualMaxGap(
        s.slots,
        s.canvasWidth,
        s.canvasHeight,
        s.collageMargin,
        minSlotPx,
      );
      effectiveGap = Math.min(effectiveGap, maxGap);
    }
    set({ collageGap: effectiveGap });
  },
  previewCollageMargin: (margin) => {
    const s = get();
    let effectiveMargin = Math.max(0, margin);
    if (s.mode === 'collage') {
      if (s.collageTemplate?.physicalLayout) {
        // التخطيط الفيزيائي أيضاً: الهامش لا يجوز أن يبتلع الورقة فيولّد خلايا سالبة
        const maxMargin = getPhysicalMaxMargin(s);
        if (maxMargin != null) effectiveMargin = Math.min(effectiveMargin, maxMargin);
      } else if (s.slots?.length > 0) {
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
        const minSlotPx = Math.max(1, mmToPx(1, dpi));
        const maxMargin = getManualMaxMargin(
          s.slots,
          s.canvasWidth,
          s.canvasHeight,
          s.collageGap,
          minSlotPx,
        );
        effectiveMargin = Math.min(effectiveMargin, maxMargin);
      }
    }
    set({ collageMargin: effectiveMargin });
  },
  commitCollageSpacing: () => {
    const s = get();
    if (s.mode !== 'collage' || !s.collageTemplate?.physicalLayout) return;
    const storedDpi = s.printSettings?.dpi || 300;
    const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);
    const dynamicCells = computeDynamicCollageCells(
      s.collageTemplate,
      s.canvasWidth,
      s.canvasHeight,
      dpi,
      s.collageGap,
      s.collageMargin,
    );
    if (dynamicCells) {
      set({ slots: remapSlotsToCells(s.slots || [], dynamicCells) });
    }
  },

  setCollageMargin: (margin) => {
    set((s) => {
      let adjustedSlots = s.slots || [];
      const collageTemplate = s.collageTemplate;
      const mode = s.mode;
      let effectiveMargin = Math.max(0, margin);

      if (mode === 'collage') {
        const storedDpi = s.printSettings?.dpi || 300;
        const dpi = getEffectiveDpi(s.canvasWidth, s.canvasHeight, storedDpi);

        if (collageTemplate && collageTemplate.physicalLayout) {
          // قيّد الهامش أولاً ثم أعد بناء الخلايا منه — حتى تطابق الخلايا المخزنة
          // القيمة المخزنة ولا تُكتب خلايا سالبة في سجل التراجع.
          const maxMargin = getPhysicalMaxMargin(s);
          if (maxMargin != null) effectiveMargin = Math.min(effectiveMargin, maxMargin);
          const dynamicCells = computeDynamicCollageCells(
            collageTemplate,
            s.canvasWidth,
            s.canvasHeight,
            dpi,
            s.collageGap,
            effectiveMargin,
          );
          if (dynamicCells) {
            adjustedSlots = remapSlotsToCells(s.slots || [], dynamicCells);
          }
        } else if (s.slots?.length > 0) {
          const minSlotPx = Math.max(1, mmToPx(1, dpi));
          const maxMargin = getManualMaxMargin(
            s.slots,
            s.canvasWidth,
            s.canvasHeight,
            s.collageGap,
            minSlotPx,
          );
          effectiveMargin = Math.min(effectiveMargin, maxMargin);
        }
      }
      return {
        collageMargin: effectiveMargin,
        slots: adjustedSlots,
      };
    });
    // الدفع عبر onCommit من الواجهة — لا pushHistory هنا (إصلاح Bug#2)
  },
  // ملاحظة: هذه المحددات تُستدعى بشكل مستمر أثناء السحب — لا تدفع سجل التراجع هنا.
  // الدفع يتم عبر onCommit من الواجهة (إصلاح Bug#2: فيضان سجل التراجع)
  setCollageRadius: (radius) => {
    set({ collageRadius: radius });
  },
  setCollageShowCutLines: (show) => {
    set({ collageShowCutLines: show });
    get().pushHistory();
  },
  setCollageShowEndCutLine: (show) => {
    set({ collageShowEndCutLine: show });
    get().pushHistory();
  },
  setCollageStrokeWidth: (width) => {
    set({ collageStrokeWidth: width });
  },
  setCollageStrokeColor: (color) => {
    set({ collageStrokeColor: color });
  },

  swapSlots: (slotIdA: string, slotIdB: string) => {
    if (!slotIdA || !slotIdB || slotIdA === slotIdB) return;
    const currentSlots = get().slots;
    const slotA = currentSlots.find((s) => s.id === slotIdA);
    const slotB = currentSlots.find((s) => s.id === slotIdB);
    if (!slotA || !slotB) return;

    set((state) => ({
      slots: state.slots.map((sl) => {
        if (sl.id === slotIdA) {
          return {
            ...sl,
            imageSrc: slotB.imageSrc,
            filter: slotB.filter || 'none',
            brightness: slotB.brightness ?? 100,
            contrast: slotB.contrast ?? 100,
            saturation: slotB.saturation ?? 100,
            zoom: slotB.zoom ?? 1,
            dragX: slotB.dragX ?? 0,
            dragY: slotB.dragY ?? 0,
            flipX: slotB.flipX ?? false,
            flipY: slotB.flipY ?? false,
            rotation: slotB.rotation ?? 0,
            originalImageSrc: slotB.originalImageSrc,
            bgColor: slotB.bgColor,
          };
        }
        if (sl.id === slotIdB) {
          return {
            ...sl,
            imageSrc: slotA.imageSrc,
            filter: slotA.filter || 'none',
            brightness: slotA.brightness ?? 100,
            contrast: slotA.contrast ?? 100,
            saturation: slotA.saturation ?? 100,
            zoom: slotA.zoom ?? 1,
            dragX: slotA.dragX ?? 0,
            dragY: slotA.dragY ?? 0,
            flipX: slotA.flipX ?? false,
            flipY: slotA.flipY ?? false,
            rotation: slotA.rotation ?? 0,
            originalImageSrc: slotA.originalImageSrc,
            bgColor: slotA.bgColor,
          };
        }
        return sl;
      }),
    }));
    get().pushHistory();
  },

  fillEmptySlots: (src: string, sourceSlotId?: string) => {
    if (!src) return;
    const sourceSlot = sourceSlotId ? get().slots.find((s) => s.id === sourceSlotId) : null;
    set((state) => ({
      slots: state.slots.map((sl) => {
        if (sl.imageSrc) return sl;
        return {
          ...sl,
          imageSrc: src,
          ...deriveSlotImageProps(sourceSlot, sl),
        };
      }),
    }));
    get().pushHistory();
  },

  rotateSlot: (slotId: string, angleDelta: number = 90) => {
    set((state) => ({
      slots: state.slots.map((sl) => {
        if (sl.id !== slotId) return sl;
        const currentRot = sl.rotation || 0;
        const newRot = (((currentRot + angleDelta) % 360) + 360) % 360;
        // التدوير يبدّل المحاور: نُصفّر أيضاً zoom كما نُصفّر الإزاحات
        // (وإلا بقي اقتصاص الصورة السابق داخل إطار مقلوب)
        return {
          ...sl,
          rotation: newRot,
          dragX: 0,
          dragY: 0,
          zoom: 1,
        };
      }),
    }));
    get().pushHistory();
  },

  rotateSlotsBatch: (slotIds, angleDelta = 90) => {
    if (slotIds.length === 0) return;
    const idSet = new Set(slotIds);
    set((state) => ({
      slots: state.slots.map((sl) => {
        if (!idSet.has(sl.id)) return sl;
        const currentRot = sl.rotation || 0;
        // مطابقة rotateSlot: التدوير يبدّل المحاور فيُصفَّر التكبير والإزاحات
        return {
          ...sl,
          rotation: (((currentRot + angleDelta) % 360) + 360) % 360,
          dragX: 0,
          dragY: 0,
          zoom: 1,
        };
      }),
    }));
    get().pushHistory();
  },

  flipSlotX: (slotId: string) => {
    set((state) => ({
      slots: state.slots.map((sl) => (sl.id === slotId ? { ...sl, flipX: !sl.flipX } : sl)),
    }));
    get().pushHistory();
  },

  flipSlotY: (slotId: string) => {
    set((state) => ({
      slots: state.slots.map((sl) => (sl.id === slotId ? { ...sl, flipY: !sl.flipY } : sl)),
    }));
    get().pushHistory();
  },

  resetSlotAdjustments: (slotId: string) => {
    set((state) => ({
      slots: state.slots.map((sl) =>
        sl.id === slotId
          ? {
              ...sl,
              filter: 'none',
              brightness: 100,
              contrast: 100,
              saturation: 100,
              zoom: 1,
              dragX: 0,
              dragY: 0,
              flipX: false,
              flipY: false,
              rotation: 0,
            }
          : sl,
      ),
    }));
    get().pushHistory();
  },
});
