import Konva from 'konva';
import {
  applyLuminanceThreshold,
  applyNearestPixelate,
  PIXELATE_BLOCK_PX,
  THRESHOLD_LEVEL,
} from './pixel-filters';

// سبيا بنسبة شدة (0..1) مطابقة تماماً لـ CSS filter: sepia(N%) وهي المرجع
// المشترك للمعاينة والطباعة والتصدير. فلتر Konva المدمج Sepia يكون بكامل
// الشدة دائماً ولا يقبل نسبة — كان يجعل المحرر يظهر سبياً أقوى من المطبوع.
// تُقرأ الشدة من خاصية العقدة sepiaRatio (Konva يستدعي الفلتر بـ this = العقدة).
if (typeof Konva !== 'undefined' && Konva.Filters) {
  (Konva.Filters as unknown as Record<string, unknown>).SepiaBlend = function (
    this: Konva.Node & { sepiaRatio?: () => number },
    imageData: ImageData,
  ) {
    const ratio = Math.max(0, Math.min(1, Number(this.sepiaRatio?.() ?? 1)));
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
  };

  // عتبة إضاءة على قناة واحدة مع الحفاظ على الشفافية. فلتر Konva المدمج
  // Threshold يطبّق العتبة على كل قناة RGBA مستقلة فتنقلب الألوان والشفافية.
  (Konva.Filters as unknown as Record<string, unknown>).LuminanceThreshold = function (
    this: Konva.Node & { threshold?: () => number },
    imageData: ImageData,
  ) {
    const level = Number.isFinite(this.threshold?.())
      ? Number(this.threshold?.())
      : THRESHOLD_LEVEL;
    applyLuminanceThreshold(imageData.data, level);
  };

  // تكبير nearest-neighbor بمقدار الكتلة — مطابق لـ applyPixelate في Go.
  // فلتر Konva المدمج Pixelate يجمع (يحسب المتوسط) بكسلات الكتلة بدل nearest-neighbor.
  (Konva.Filters as unknown as Record<string, unknown>).NearestNeighborPixelate = function (
    this: Konva.Node & { pixelSize?: () => number },
    imageData: ImageData,
  ) {
    const block = Number.isFinite(this.pixelSize?.())
      ? Number(this.pixelSize?.())
      : PIXELATE_BLOCK_PX;
    applyNearestPixelate(imageData.data, imageData.width, imageData.height, block);
  };
}
