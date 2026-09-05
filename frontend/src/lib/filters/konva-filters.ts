import Konva from "konva";
import type { Filter } from "konva/lib/Node";

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
  // شدة السبيا (0..1) — تُمرر للفلتر المخصص SepiaBlend عبر خاصية العقدة
  let sepiaRatio = 0;

  if (filter === "enhance") {
    totalContrast = (totalContrast / 100) * 108;
    totalSaturation = (totalSaturation / 100) * 112;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === "skinGlow") {
    // مطابق حرفياً لتعريف CSS في templates/constants.ts — المرجع الموحد
    // للمعاينة والطباعة والتصدير (Go يطبق نفس القيم)
    totalSaturation = (totalSaturation / 100) * 108;
    totalContrast = (totalContrast / 100) * 94;
    totalBrightness = (totalBrightness / 100) * 106;
    sepiaRatio = 0.10;
  } else if (filter === "clarity") {
    totalContrast = (totalContrast / 100) * 122;
    totalSaturation = (totalSaturation / 100) * 120;
    totalBrightness = (totalBrightness / 100) * 98;
  } else if (filter === "lowlight") {
    totalBrightness = (totalBrightness / 100) * 116;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 105;
  } else if (filter === "cinematic") {
    sepiaRatio = 0.05;
    totalSaturation = (totalSaturation / 100) * 115;
    totalContrast = (totalContrast / 100) * 110;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === "monoPro") {
    useGrayscale = true;
    totalContrast = (totalContrast / 100) * 125;
    totalBrightness = (totalBrightness / 100) * 102;
  }

  const filters: Filter[] = [];
  const konvaFilters = Konva.Filters as unknown as {
    SepiaBlend?: Filter;
    Brightness?: Filter;
  };
  if (sepiaRatio > 0 && konvaFilters.SepiaBlend) {
    filters.push(konvaFilters.SepiaBlend);
  }
  if (useGrayscale) filters.push(Konva.Filters.Grayscale);
  const brightnessFilter = konvaFilters.Brightness || Konva.Filters.Brighten;
  if (totalBrightness !== 100) filters.push(brightnessFilter);
  if (totalContrast !== 100) filters.push(Konva.Filters.Contrast);
  if (totalSaturation !== 100) filters.push(Konva.Filters.HSL);

  return {
    filters,
    brightness: brightnessFilter === konvaFilters.Brightness ? totalBrightness / 100 : (totalBrightness - 100) / 100,
    contrast: totalContrast !== 100 ? totalContrast - 100 : 0,
    saturation: totalSaturation !== 100 ? (totalSaturation - 100) / 100 : 0,
    sepiaRatio,
  };
}
