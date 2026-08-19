import Konva from "konva";

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
  let totalHue = 0;
  let useSepia = false;
  let useGrayscale = false;

  if (filter === "enhance") {
    totalContrast = (totalContrast / 100) * 108;
    totalSaturation = (totalSaturation / 100) * 112;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === "skinGlow") {
    totalHue = 10;
    totalSaturation = (totalSaturation / 100) * 110;
    totalContrast = (totalContrast / 100) * 94;
    totalBrightness = (totalBrightness / 100) * 106;
  } else if (filter === "clarity") {
    totalContrast = (totalContrast / 100) * 122;
    totalSaturation = (totalSaturation / 100) * 120;
    totalBrightness = (totalBrightness / 100) * 98;
  } else if (filter === "lowlight") {
    totalBrightness = (totalBrightness / 100) * 116;
    totalContrast = (totalContrast / 100) * 90;
    totalSaturation = (totalSaturation / 100) * 105;
  } else if (filter === "cinematic") {
    useSepia = true;
    totalHue = 5;
    totalSaturation = (totalSaturation / 100) * 115;
    totalContrast = (totalContrast / 100) * 110;
    totalBrightness = (totalBrightness / 100) * 102;
  } else if (filter === "monoPro") {
    useGrayscale = true;
    totalContrast = (totalContrast / 100) * 125;
    totalBrightness = (totalBrightness / 100) * 102;
  }

  const filters: any[] = [];
  if (filter === "skinGlow" && (Konva.Filters as any).SkinGlow) {
    filters.push((Konva.Filters as any).SkinGlow);
  }
  if (useGrayscale) filters.push(Konva.Filters.Grayscale);
  if (useSepia) filters.push(Konva.Filters.Sepia);
  const brightnessFilter = (Konva.Filters as any).Brightness || Konva.Filters.Brighten;
  if (totalBrightness !== 100) filters.push(brightnessFilter);
  if (totalContrast !== 100) filters.push(Konva.Filters.Contrast);
  if (totalSaturation !== 100 || totalHue !== 0) filters.push(Konva.Filters.HSL);

  return {
    filters,
    brightness: brightnessFilter === (Konva.Filters as any).Brightness ? totalBrightness / 100 : (totalBrightness - 100) / 100,
    contrast: totalContrast !== 100 ? totalContrast - 100 : 0,
    hue: totalHue,
    saturation: totalSaturation !== 100 ? (totalSaturation - 100) / 100 : 0,
  };
}
