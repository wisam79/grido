import Konva from 'konva';

// تسجيل المرشّحات المخصصة مسؤوليتنا هنا — الاعتماد على مستوردِعَرَضي في
// مكان آخر يجعلها undefined في صمت (فتصمت المعاينة بلا خطأ).
// الاستيراد المسمّى ينفّذ تسجيل الوحدة أيضاً (تأثير جانبي مطلوب).
import { isPerPixelFilter } from './custom-filters';
import { PIXELATE_BLOCK_PX, THRESHOLD_LEVEL } from './pixel-filters';
import type { Filter, FilterFunction } from 'konva/lib/Node';

export interface FilterOptions {
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

/** فلتر Konva مركّب يحمل تسلسله المصدر للتحقق والتوثيق. */
export interface ComposedPixelFilter extends FilterFunction {
  /** الفلاتر الأصلية بالترتيب الحرفي الذي يحفظه المركّب. */
  composedFrom: readonly Filter[];
}

/**
 * 🚀 مركّب بكسلي بتمريرة واحدة (H1 من خطة أداء كاش الفلاتر).
 *
 * حلقة Konva القديمة في `Node._getCachedSceneCanvas` تستدعي getImageData
 * مرة واحدة ثم لكل فلتر: `filter.call(node, imageData)` **وتحته putImageData
 * كامل للكانفس** — فتسلسل N فلاتر لونية يدفع N بليت (blit) على كانفس بحجم
 * W·H·r². هذا المركّب يعيد الفلاتر على نفس ImageData بلا putImageData وسيط،
 * فيدفع Konva بليتاً واحداً بعد الفلتر المركّب وحده.
 *
 * ⛔ قيد المطابقة الحرفي (W3C — قرار محمي من 47bf6320/d7dc47df): الرياضيات
 * لكل فلتر تُستدعى كما هي بلا إعادة صياغة ولا دمج حلقات داخلية؛ الفلاتر
 * المكانية (Blur وما يحتاج نافذة جيران) لا تُدمج في تمريرة لكل-بكسل بل تبقى
 * تمريرات مستقلة بين المجموعات — الترتيب الكلي محفوظ. والنتيجة بكسلياً
 * مطابقة 100% للمسار المتسلسل القديم: حلقة Konva تمرر نفس كائن ImageData
 * للفلاتر المتتالية (putImageData الوسيطة لا يعدّل الـ ImageData ولا تُقرأ
 * بإعادة getImageData داخل الحلقة)، فكل فلتر يرى نفس الحالة التي يراها هنا.
 *
 * @returns الفلتر المركّب عند وجود فلترين فأكثر، أو null إن لم يوجد ما
 * يُركّب (فلتر واحد لا يوفّر أي putImageData لأن Konva يدفع واحداً أصلاً).
 */
export function composePixelFilters(fns: readonly Filter[]): ComposedPixelFilter | null {
  if (fns.length < 2) return null;

  // تجميع الجِيران المتتاليين: الفلاتر اللونية لكل-بكسل المتجاورة تمريرة واحدة،
  // وكل فلتر مكاني تمريرة مستقلة بمفرده. لا ندمج الحلقات الداخلية — كل فلتر
  // يحتفظ بحلقته ورياضياته الحرفية، والدمج هو ترتيب الاستدعاء على نفس المخزن.
  const groups: Filter[][] = [];
  for (const fn of fns) {
    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup &&
      lastGroup.length > 0 &&
      isPerPixelFilter(fn) &&
      lastGroup.every(isPerPixelFilter)
    ) {
      lastGroup.push(fn);
    } else {
      groups.push([fn]);
    }
  }

  const composed = function (this: Konva.Node, imageData: ImageData) {
    for (const group of groups) {
      for (const fn of group) {
        // this = عقدة Konva (تقرأ attrs مثل sepiaRatio/brightness) — نفس
        // استدعاء Konva القديم filter.call(node, imageData) حرفياً.
        (fn as FilterFunction).call(this, imageData);
      }
    }
  } as ComposedPixelFilter;
  composed.composedFrom = fns;
  return composed;
}

export function getKonvaFilters(options: FilterOptions) {
  const { filter, brightness, contrast, saturation } = options;

  let totalBrightness = brightness ?? 100;
  let totalContrast = contrast ?? 100;
  let totalSaturation = saturation ?? 100;
  let useGrayscale = false;
  let usePixelate = false;
  let useThreshold = false;
  // مقاس الكتلة بالبكسل — مطابق لقيمة Go في print_image_pipeline.go
  let pixelSize = PIXELATE_BLOCK_PX;
  let threshold = THRESHOLD_LEVEL;
  // شدة السبيا (0..1) — تُمرر للفلتر المخصص SepiaBlend عبر خاصية العقدة
  let sepiaRatio = 0;

  if (filter === 'enhance') {
    totalContrast = (totalContrast / 100) * 108;
    totalSaturation = (totalSaturation / 100) * 112;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === 'skinGlow') {
    // مطابق حرفياً لتعريف CSS في templates/constants.ts — المرجع الموحد
    // للمعاينة والطباعة والتصدير (Go يطبق نفس القيم)
    totalSaturation = (totalSaturation / 100) * 108;
    totalContrast = (totalContrast / 100) * 94;
    totalBrightness = (totalBrightness / 100) * 106;
    sepiaRatio = 0.1;
  } else if (filter === 'clarity') {
    totalContrast = (totalContrast / 100) * 122;
    totalSaturation = (totalSaturation / 100) * 120;
    totalBrightness = (totalBrightness / 100) * 98;
  } else if (filter === 'lowlight') {
    totalBrightness = (totalBrightness / 100) * 116;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 105;
  } else if (filter === 'cinematic') {
    sepiaRatio = 0.05;
    totalSaturation = (totalSaturation / 100) * 115;
    totalContrast = (totalContrast / 100) * 110;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === 'monoPro') {
    useGrayscale = true;
    totalContrast = (totalContrast / 100) * 125;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === 'pixelate') {
    usePixelate = true;
    pixelSize = PIXELATE_BLOCK_PX;
  } else if (filter === 'threshold') {
    useThreshold = true;
    threshold = THRESHOLD_LEVEL;
  }

  const filters: Filter[] = [];
  const konvaFilters = Konva.Filters as unknown as {
    SepiaBlend?: Filter;
    Brightness?: Filter;
    Contrast?: Filter;
    Saturation?: Filter;
    NearestNeighborPixelate?: Filter;
    LuminanceThreshold?: Filter;
  };
  if (sepiaRatio > 0 && konvaFilters.SepiaBlend) {
    filters.push(konvaFilters.SepiaBlend);
  }
  if (useGrayscale) filters.push(Konva.Filters.Grayscale);
  const brightnessFilter = konvaFilters.Brightness || Konva.Filters.Brighten;
  if (totalBrightness !== 100) filters.push(brightnessFilter);
  const contrastFilter = konvaFilters.Contrast || Konva.Filters.Contrast;
  if (totalContrast !== 100) filters.push(contrastFilter);
  const saturationFilter = konvaFilters.Saturation || Konva.Filters.HSL;
  if (totalSaturation !== 100) filters.push(saturationFilter);
  // الترتيب مطابق لـ Go: تعديلات اللون أولاً ثم مرشّح الأساس
  // (print_image_pipeline.go: applyColorAdjustments ثم applyFilter)
  if (usePixelate && konvaFilters.NearestNeighborPixelate) {
    filters.push(konvaFilters.NearestNeighborPixelate);
  }
  if (useThreshold && konvaFilters.LuminanceThreshold) {
    filters.push(konvaFilters.LuminanceThreshold);
  }

  // 🚀 الربط في نقطة تطبيق الفلاتر: image-node.tsx و collage-image.tsx يمرران
  // المصفوفة هنا إلى `filters={...}` مباشرة (والسحب/Blur في image-node يُلحق
  // بعدها)، فيكفي تركيب المصفوفة هنا لينال مسارا العرض والتصدير التمريرة
  // الواحدة دون تعديل أي عقدة. الفلتر المكاني (Blur) يُلحق خارج المركّب
  // لاحقاً فيبقى تمريرة مستقلة كما كان.
  const composed = composePixelFilters(filters);

  return {
    filters: composed ? [composed] : filters,
    brightness:
      brightnessFilter === konvaFilters.Brightness
        ? totalBrightness / 100
        : (totalBrightness - 100) / 100,
    contrast: totalContrast !== 100 ? totalContrast - 100 : 0,
    saturation: totalSaturation !== 100 ? (totalSaturation - 100) / 100 : 0,
    sepiaRatio,
    pixelSize,
    threshold,
  };
}
