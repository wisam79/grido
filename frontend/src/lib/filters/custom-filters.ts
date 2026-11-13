import Konva from 'konva';

import {
  applyLuminanceThreshold,
  applyNearestPixelate,
  PIXELATE_BLOCK_PX,
  THRESHOLD_LEVEL,
} from './pixel-filters';
import type { PrintFilterOperation } from './print-filter-contract';

// 🎨 مرشّحات Konva المخصصة لمطابقة معايير W3C CSS filter بنسبة 100%
// وهي المرجع الموحد بين المعاينة والطباعة والتصدير.

/**
 * وسم الفلاتر اللونية لكل-بكسل (لا تحتاج نافذة جيران): يتيح لـ composePixelFilters
 * في konva-filters.ts دمج الجِيران المتتاليين منها في تمريرة واحدة على نفس
 * ImageData بلا putImageData وسيط. الفلاتر بلا هذا الوسم تُعامل كمكانية
 * (تمريرة مستقلة) — التصنيف المحافظ يحفظ المطابقة البكسلية مع المسار القديم.
 */
export const PER_PIXEL_FILTER_MARKER = '__gridoPerPixelFilter';

type PixelFilterFn = (this: Konva.Node, imageData: ImageData) => void;

/** يوسم فلتراً بأنه لوني لكل-بكسل آمن للتجميع، ويعيده كما هو (بلا تغليف). */
export function markPerPixelFilter<T extends PixelFilterFn>(fn: T): T {
  (fn as unknown as { [PER_PIXEL_FILTER_MARKER]?: boolean })[PER_PIXEL_FILTER_MARKER] = true;
  return fn;
}

/** Metadata key used to expose the exact operation carried by a generated filter. */
export const PRINT_FILTER_OPERATION_MARKER = '__gridoPrintFilterOperation';

export interface OrderedPrintFilterFn extends PixelFilterFn {
  [PRINT_FILTER_OPERATION_MARKER]: PrintFilterOperation;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function nonNegativeFactor(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

/** Apply one canonical operation in-place using CSS/W3C byte-domain semantics. */
export function applyPrintFilterOperation(
  imageData: ImageData,
  operation: PrintFilterOperation,
): void {
  if (operation.kind === 'threshold') {
    applyLuminanceThreshold(imageData.data, operation.level);
    return;
  }
  if (operation.kind === 'pixelate') {
    applyNearestPixelate(imageData.data, imageData.width, imageData.height, operation.blockSize);
    return;
  }

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    switch (operation.kind) {
      case 'brightness': {
        const factor = nonNegativeFactor(operation.factor, 1);
        data[i] = r * factor;
        data[i + 1] = g * factor;
        data[i + 2] = b * factor;
        break;
      }
      case 'contrast': {
        const factor = nonNegativeFactor(operation.factor, 1);
        data[i] = (r - 127.5) * factor + 127.5;
        data[i + 1] = (g - 127.5) * factor + 127.5;
        data[i + 2] = (b - 127.5) * factor + 127.5;
        break;
      }
      case 'saturation': {
        const factor = nonNegativeFactor(operation.factor, 1);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        data[i] = luma + (r - luma) * factor;
        data[i + 1] = luma + (g - luma) * factor;
        data[i + 2] = luma + (b - luma) * factor;
        break;
      }
      case 'sepia': {
        const amount = clampUnit(operation.amount);
        const tr = r * 0.393 + g * 0.769 + b * 0.189;
        const tg = r * 0.349 + g * 0.686 + b * 0.168;
        const tb = r * 0.272 + g * 0.534 + b * 0.131;
        data[i] = r + (tr - r) * amount;
        data[i + 1] = g + (tg - g) * amount;
        data[i + 2] = b + (tb - b) * amount;
        break;
      }
      case 'grayscale': {
        const amount = clampUnit(operation.amount);
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        data[i] = r + (luma - r) * amount;
        data[i + 1] = g + (luma - g) * amount;
        data[i + 2] = b + (luma - b) * amount;
        break;
      }
      case 'invert': {
        const amount = clampUnit(operation.amount);
        data[i] = r + (255 - 2 * r) * amount;
        data[i + 1] = g + (255 - 2 * g) * amount;
        data[i + 2] = b + (255 - 2 * b) * amount;
        break;
      }
    }
    // Alpha is deliberately untouched for every color operation.
  }
}

/** Create a Konva filter bound to one operation, so duplicate operations stay ordered. */
export function createOrderedPrintFilter(operation: PrintFilterOperation): OrderedPrintFilterFn {
  const filter = function (_imageData: ImageData) {
    applyPrintFilterOperation(_imageData, operation);
  } as OrderedPrintFilterFn;
  filter[PRINT_FILTER_OPERATION_MARKER] = operation;
  return operation.kind === 'pixelate' ? filter : markPerPixelFilter(filter);
}

// الفلاتر المدمجة في Konva المؤكدة أنها لونية لكل-بكسل (تعمل على data[i] وحده)
// — المدمجة المكانية مثل Blur/Emboss/Enhance/Mask/Pixelate مستثناة عمداً.
const PER_PIXEL_BUILTIN_FILTERS: readonly PixelFilterFn[] = [
  Konva.Filters.Grayscale,
  Konva.Filters.Brighten,
  Konva.Filters.HSL,
  Konva.Filters.RGB,
  Konva.Filters.RGBA,
  Konva.Filters.HSV,
  Konva.Filters.Invert,
  Konva.Filters.Posterize,
] as unknown as readonly PixelFilterFn[];

/** هل هذا الفلتر لوني لكل-بكسل (قابل للدمج في تمريرة واحدة)؟ */
export function isPerPixelFilter(fn: unknown): boolean {
  if (typeof fn !== 'function') return false;
  if ((fn as { [PER_PIXEL_FILTER_MARKER]?: boolean })[PER_PIXEL_FILTER_MARKER] === true)
    return true;
  return (PER_PIXEL_BUILTIN_FILTERS as readonly unknown[]).includes(fn);
}

if (typeof Konva !== 'undefined' && Konva.Filters) {
  const konvaFactory = (
    Konva as unknown as {
      Factory?: {
        addGetterSetter: (node: unknown, prop: string, def: unknown) => void;
      };
    }
  ).Factory;
  if (konvaFactory && Konva.Node) {
    konvaFactory.addGetterSetter(Konva.Node, 'sepiaRatio', 0);
    konvaFactory.addGetterSetter(Konva.Node, 'threshold', THRESHOLD_LEVEL);
    konvaFactory.addGetterSetter(Konva.Node, 'pixelSize', PIXELATE_BLOCK_PX);
  }

  // 1) سبيا بنسبة شدة (0..1) مطابقة لـ CSS filter: sepia(N%)
  // تُقرأ الشدة بأمان من دالة sepiaRatio أو خاصية getAttr('sepiaRatio')
  // مع السقوط الآمن إلى 0 (بدل 1 الذي كان يطبق 100% سبيا قسرياً).
  (Konva.Filters as unknown as Record<string, unknown>).SepiaBlend = markPerPixelFilter(function (
    this: Konva.Node & {
      sepiaRatio?: () => number;
      getAttr?: (name: string) => unknown;
    },
    imageData: ImageData,
  ) {
    const raw =
      typeof this.sepiaRatio === 'function'
        ? this.sepiaRatio()
        : (this.getAttr?.('sepiaRatio') ??
          (this as unknown as { attrs?: { sepiaRatio?: number } }).attrs?.sepiaRatio ??
          0);
    const ratio = Math.max(0, Math.min(1, Number(raw) || 0));
    if (!ratio || ratio <= 0) return;
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const tr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      const tg = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      const tb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      d[i] = r + (tr - r) * ratio;
      d[i + 1] = g + (tg - g) * ratio;
      d[i + 2] = b + (tb - b) * ratio;
    }
  });

  // 2) السطوع المضاعف (Multiplicative Brightness) — مطابق لـ CSS filter: brightness(B)
  // يضاعف قنوات RGB بعامل B بدل الجمع الإزاحي (+15.3) في Konva.Filters.Brighten
  // الذي كان يحرق درجات البشرة ويفجر الهايلايتس إلى أبيض ناصع.
  (Konva.Filters as unknown as Record<string, unknown>).Brightness = markPerPixelFilter(function (
    this: Konva.Node & {
      brightness?: () => number;
      getAttr?: (name: string) => unknown;
    },
    imageData: ImageData,
  ) {
    const raw =
      typeof this.brightness === 'function'
        ? this.brightness()
        : (this.getAttr?.('brightness') ??
          (this as unknown as { attrs?: { brightness?: number } }).attrs?.brightness);
    const b = Number(raw ?? 1);
    if (!Number.isFinite(b) || Math.abs(b - 1) < 0.001) return;
    const mult = Math.max(0, b);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] * mult);
      d[i + 1] = Math.min(255, d[i + 1] * mult);
      d[i + 2] = Math.min(255, d[i + 2] * mult);
    }
  });

  // 3) التباين الخطي القياسي — مطابق لـ CSS filter: contrast(C)
  // يطبّق التمدد الخطي حول المنتصف 0.5 دون تربيع العامل (Math.pow(..., 2))
  (Konva.Filters as unknown as Record<string, unknown>).Contrast = markPerPixelFilter(function (
    this: Konva.Node & {
      contrast?: () => number;
      getAttr?: (name: string) => unknown;
    },
    imageData: ImageData,
  ) {
    const raw =
      typeof this.contrast === 'function'
        ? this.contrast()
        : (this.getAttr?.('contrast') ??
          (this as unknown as { attrs?: { contrast?: number } }).attrs?.contrast);
    const c = Number(raw ?? 0);
    if (!Number.isFinite(c) || Math.abs(c) < 0.001) return;
    const factor = Math.max(0, (c + 100) / 100);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, ((d[i] / 255 - 0.5) * factor + 0.5) * 255));
      d[i + 1] = Math.min(255, Math.max(0, ((d[i + 1] / 255 - 0.5) * factor + 0.5) * 255));
      d[i + 2] = Math.min(255, Math.max(0, ((d[i + 2] / 255 - 0.5) * factor + 0.5) * 255));
    }
  });

  // 4) التشبع اللوني القياسي — مطابق لـ CSS filter: saturate(S)
  // يعتمد أوزان الإضاءة المعيارية Rec. 709 بدل مصفوفة NTSC القديمة
  (Konva.Filters as unknown as Record<string, unknown>).Saturation = markPerPixelFilter(function (
    this: Konva.Node & {
      saturation?: () => number;
      getAttr?: (name: string) => unknown;
    },
    imageData: ImageData,
  ) {
    const raw =
      typeof this.saturation === 'function'
        ? this.saturation()
        : (this.getAttr?.('saturation') ??
          (this as unknown as { attrs?: { saturation?: number } }).attrs?.saturation);
    const s = Number(raw ?? 0);
    if (!Number.isFinite(s) || Math.abs(s) < 0.001) return;
    const mult = Math.max(0, s + 1);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      d[i] = Math.min(255, Math.max(0, gray + (r - gray) * mult));
      d[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * mult));
      d[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * mult));
    }
  });

  // 5) عتبة إضاءة على قناة واحدة مع الحفاظ على الشفافية. فلتر Konva المدمج
  // Threshold يطبّق العتبة على كل قناة RGBA مستقلة فتنقلب الألوان والشفافية.
  (Konva.Filters as unknown as Record<string, unknown>).LuminanceThreshold = markPerPixelFilter(
    function (
      this: Konva.Node & {
        threshold?: () => number;
        getAttr?: (name: string) => unknown;
      },
      imageData: ImageData,
    ) {
      const raw =
        typeof this.threshold === 'function'
          ? this.threshold()
          : (this.getAttr?.('threshold') ??
            (this as unknown as { attrs?: { threshold?: number } }).attrs?.threshold);
      const level = Number.isFinite(Number(raw)) ? Number(raw) : THRESHOLD_LEVEL;
      applyLuminanceThreshold(imageData.data, level);
    },
  );

  // 6) تكبير nearest-neighbor بمقدار الكتلة — مطابق لـ applyPixelate في Go.
  // فلتر Konva المدمج Pixelate يجمع (يحسب المتوسط) بكسلات الكتلة بدل nearest-neighbor.
  // ⚠️ لا يُوسم لكل-بكسل: يقرأ عيّنات من كتل الجيران فهو يبقى تمريرة مستقلة.
  (Konva.Filters as unknown as Record<string, unknown>).NearestNeighborPixelate = function (
    this: Konva.Node & {
      pixelSize?: () => number;
      getAttr?: (name: string) => unknown;
    },
    imageData: ImageData,
  ) {
    const raw =
      typeof this.pixelSize === 'function'
        ? this.pixelSize()
        : (this.getAttr?.('pixelSize') ??
          (this as unknown as { attrs?: { pixelSize?: number } }).attrs?.pixelSize);
    const block = Number.isFinite(Number(raw)) ? Number(raw) : PIXELATE_BLOCK_PX;
    applyNearestPixelate(imageData.data, imageData.width, imageData.height, block);
  };
}
