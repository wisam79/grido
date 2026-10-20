import type { CanvasElement, ShapeElement, StickerElementSource } from '../../types';
import type { TextPresetType } from '../../../templates';

export type { TextPresetType };

export interface BatchImageItem {
  src: string;
  aspectRatio?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface ElementSlice {
  elements: CanvasElement[];
  selectedId: string | null;
  selectedIds: string[];
  editingTextId: string | null;
  clipboardElements: CanvasElement[];

  addImageElement: (
    src: string,
    imageAspectRatio?: number,
    /** مصدر ملصق اختياري — يربط العنصر بقالب الاستوديو لإتاحة إعادة التحرير */
    stickerSource?: StickerElementSource,
  ) => void;
  addImageElementsBatch: (
    items: BatchImageItem[],
    options?: {
      layoutMode?: 'grid' | 'cascade' | 'stack';
      columns?: number;
      gapPx?: number;
      marginPx?: number;
      centerLastRow?: boolean;
    },
  ) => void;
  addTextElement: (text?: string) => void;
  addTextPreset: (preset: TextPresetType) => void;
  /**
   * إدراج شكل. options.aspect يحسم نسبة الأبعاد الابتدائية (من الكتالوج)
   * و options.defaults يُدمج فوق القيم الافتراضية (رؤوس نجمة، سهم مزدوج...).
   */
  addShapeElement: (
    shape: ShapeElement['shape'],
    svgPath?: string,
    options?: { aspect?: number; defaults?: Partial<ShapeElement> },
  ) => void;
  /**
   * مستطيل خلفية كامل يغطي الورقة ويُوضع خلف كل العناصر — بإنشاء واحد
   * وإدخال واحد في السجل. (addShapeElement ثم updateElement كانا يتركان
   * لقطة وسيطة بمستطيل صغير في منتصف الورقة يظهر عند التراجع)
   */
  addBackdropRect: (patch?: Partial<CanvasElement>) => string;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  updateElements: (patches: { id: string; patch: Partial<CanvasElement> }[]) => void;
  removeElement: (id: string, force?: boolean) => void;
  removeElements: (ids: string[], force?: boolean) => void;
  duplicateElement: (id: string) => void;
  duplicateElements: (ids: string[]) => void;
  copySelectedElements: (targetIds?: string[]) => void;
  cutSelectedElements: (targetIds?: string[]) => void;
  pasteCopiedElements: (customElements?: CanvasElement[]) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  selectElement: (id: string | null) => void;
  selectAllElements: () => void;
  setSelectedIds: (ids: string[]) => void;
  toggleElementSelection: (id: string) => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  setEditingTextId: (id: string | null) => void;
  autoFitTextWidth: (id: string, textWidthPx?: number) => void;
  centerElementHorizontally: (id: string) => void;
  centerElementVertically: (id: string) => void;
  alignSelectedElements: (
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  ) => void;
  distributeSelectedElements: (axis: 'horizontal' | 'vertical') => void;
}

export const DEFAULT_ELEMENT_STATE = {
  elements: [] as CanvasElement[],
  selectedId: null as string | null,
  selectedIds: [] as string[],
  editingTextId: null as string | null,
  clipboardElements: [] as CanvasElement[],
};

/**
 * توليد zIndex تصاعدي رتيب خالٍ من التصادم —
 * بديل عن صيغة (length + Date.now + random) القديمة التي كانت قابلة للتكرار (E-8)
 */
export const nextZIndex = (elements: CanvasElement[]): number => {
  let max = 0;
  for (const el of elements) {
    if (el.zIndex > max) max = el.zIndex;
  }
  return max + 10;
};

/**
 * أدنى zIndex في المصفوفة (مع الأرضية 0) — بدلاً عن `Math.min(0, ...arr)`
 * الذي يفشل عمليات النشر (RangeError) على كانفاسات بعناصر كثيلة جداً.
 */
export const minZIndex = (elements: CanvasElement[]): number => {
  let min = 0;
  for (const el of elements) {
    if (el.zIndex < min) min = el.zIndex;
  }
  return min;
};

/** أعلى zIndex في المصفوفة (مع الأرضية 0) — بديل حلقي عن `Math.max(0, ...arr)` */
export const maxZIndex = (elements: CanvasElement[]): number => {
  let max = 0;
  for (const el of elements) {
    if (el.zIndex > max) max = el.zIndex;
  }
  return max;
};

/**
 * توحيد ومزامنة حالة التحديد (Selection State Normalization):
 * يضمن بقاء selectedId و selectedIds متسقين تماماً وبلا انحراف:
 * - إذا كان التحديد فارغاً: كلاهما فارغ (null و []).
 * - إذا بقي عنصر واحد فقط: selectedId يصبح ذلك العنصر تلقائياً.
 * - إذا كانت هناك عناصر متعددة: selectedId يحتفظ بالعنصر الأساسي إن كان ضمنها، أو آخر عنصر.
 */
export const normalizeSelection = (
  ids: string[] | string | null | undefined,
  currentPrimaryId?: string | null,
): { selectedIds: string[]; selectedId: string | null } => {
  if (!ids) {
    return { selectedIds: [], selectedId: null };
  }
  const selectedIds = Array.isArray(ids) ? ids : [ids];
  // نسخة دائماً: إعادة مرجع المصفوفة المُمرّرة كانت تُخزَّن في الستور فيعدّلها
  // المتصل لاحقاً من خارج الستور (تلويث حالة التحديد بحالة الـ UI).
  if (selectedIds.length === 0) {
    return { selectedIds: [], selectedId: null };
  }
  if (selectedIds.length === 1) {
    return { selectedIds: [...selectedIds], selectedId: selectedIds[0] };
  }
  const selectedId =
    currentPrimaryId && selectedIds.includes(currentPrimaryId)
      ? currentPrimaryId
      : selectedIds[selectedIds.length - 1];
  return { selectedIds: [...selectedIds], selectedId };
};

export type ElementCross = ElementSlice & {
  canvasWidth: number;
  canvasHeight: number;
  lastEditedImage: string | null;
  lastEditedImageAspect: number | null;
  pushHistory: () => void;
};
