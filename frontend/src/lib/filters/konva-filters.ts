import Konva from 'konva';
import type { Filter } from 'konva/lib/Node';
// تسجيل المرشّحات المخصصة مسؤوليتنا هنا — الاعتماد على مستوردِعَرَضي في
// مكان آخر يجعلها undefined في صمت (فتصمت المعاينة بلا خطأ)
import './custom-filters';
import { PIXELATE_BLOCK_PX, THRESHOLD_LEVEL } from './pixel-filters';

export interface FilterOptions {
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
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
    NearestNeighborPixelate?: Filter;
    LuminanceThreshold?: Filter;
  };
  if (sepiaRatio > 0 && konvaFilters.SepiaBlend) {
    filters.push(konvaFilters.SepiaBlend);
  }
  if (useGrayscale) filters.push(Konva.Filters.Grayscale);
  const brightnessFilter = konvaFilters.Brightness || Konva.Filters.Brighten;
  if (totalBrightness !== 100) filters.push(brightnessFilter);
  if (totalContrast !== 100) filters.push(Konva.Filters.Contrast);
  if (totalSaturation !== 100) filters.push(Konva.Filters.HSL);
  // الترتيب مطابق لـ Go: تعديلات اللون أولاً ثم مرشّح الأساس
  // (print_image_pipeline.go: applyColorAdjustments ثم applyFilter)
  if (usePixelate && konvaFilters.NearestNeighborPixelate) {
    filters.push(konvaFilters.NearestNeighborPixelate);
  }
  if (useThreshold && konvaFilters.LuminanceThreshold) {
    filters.push(konvaFilters.LuminanceThreshold);
  }

  return {
    filters,
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
