import Konva from 'konva';

import {
  applyLuminanceThreshold,
  applyNearestPixelate,
  PIXELATE_BLOCK_PX,
  THRESHOLD_LEVEL,
} from './pixel-filters';

// 🎨 مرشّحات Konva المخصصة لمطابقة معايير W3C CSS filter بنسبة 100%
// وهي المرجع الموحد بين المعاينة والطباعة والتصدير.
if (typeof Konva !== 'undefined' && Konva.Filters) {
  if (Konva.Factory && Konva.Node) {
    Konva.Factory.addGetterSetter(Konva.Node, 'sepiaRatio', 0);
    Konva.Factory.addGetterSetter(Konva.Node, 'threshold', THRESHOLD_LEVEL);
    Konva.Factory.addGetterSetter(Konva.Node, 'pixelSize', PIXELATE_BLOCK_PX);
  }

  // 1) سبيا بنسبة شدة (0..1) مطابقة لـ CSS filter: sepia(N%)
  // تُقرأ الشدة بأمان من دالة sepiaRatio أو خاصية getAttr('sepiaRatio')
  // مع السقوط الآمن إلى 0 (بدل 1 الذي كان يطبق 100% سبيا قسرياً).
  (Konva.Filters as unknown as Record<string, unknown>).SepiaBlend = function (
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
  };

  // 2) السطوع المضاعف (Multiplicative Brightness) — مطابق لـ CSS filter: brightness(B)
  // يضاعف قنوات RGB بعامل B بدل الجمع الإزاحي (+15.3) في Konva.Filters.Brighten
  // الذي كان يحرق درجات البشرة ويفجر الهايلايتس إلى أبيض ناصع.
  (Konva.Filters as unknown as Record<string, unknown>).Brightness = function (
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
  };

  // 3) التباين الخطي القياسي — مطابق لـ CSS filter: contrast(C)
  // يطبّق التمدد الخطي حول المنتصف 0.5 دون تربيع العامل (Math.pow(..., 2))
  (Konva.Filters as unknown as Record<string, unknown>).Contrast = function (
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
  };

  // 4) التشبع اللوني القياسي — مطابق لـ CSS filter: saturate(S)
  // يعتمد أوزان الإضاءة المعيارية Rec. 709 بدل مصفوفة NTSC القديمة
  (Konva.Filters as unknown as Record<string, unknown>).Saturation = function (
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
  };

  // 5) عتبة إضاءة على قناة واحدة مع الحفاظ على الشفافية. فلتر Konva المدمج
  // Threshold يطبّق العتبة على كل قناة RGBA مستقلة فتنقلب الألوان والشفافية.
  (Konva.Filters as unknown as Record<string, unknown>).LuminanceThreshold = function (
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
  };

  // 6) تكبير nearest-neighbor بمقدار الكتلة — مطابق لـ applyPixelate في Go.
  // فلتر Konva المدمج Pixelate يجمع (يحسب المتوسط) بكسلات الكتلة بدل nearest-neighbor.
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
