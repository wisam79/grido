/**
 * ✂️ die-cut-offset.ts — توليد مسارات القص المتجه (True Vector Die-Cut Contour)
 *
 * يوفر للمطابع ومقصات الفينيل (Plotters مثل Roland VersaWorks, Graphtec, Summa)
 * مسارات قطع متجهة نقية (CutContour) قابلة للتوسعة اللانهائية، مع:
 *  1. نزف (bleed) نسبي حول حدود مساحة عمل الملصق.
 *  2. خط القص الماجنتا القياسي للمطابع (#FF00FF كـ Spot Color).
 *  3. توليد ملف SVG المتكامل (Artwork + CutContour Layer).
 *  4. توليد ملف SVG لخط القص فقط (Standalone Vector Cut Path).
 *
 * ⚠️ قرار هندسي مقصود — الحدّ الخارجي مشتق من الـ viewBox وحده:
 * الكشف التلقائي لحد الملصق الخارجي من بنية SVG **مرفوض عمداً**. القوالب في
 * `templates/*.ts` لا توفّر عنصراً واحداً يمثّل الحد الخارجي؛ بل تخلط عنصر الحد
 * الحقيقي مع أشكال زخرفية (نجوم، هلالات، ورقات) مغلّفة بـ `<g transform>`.
 * أي استدلال فوقي — مثل «أول polygon به ≥ 8 رؤوس» — كان يلتقط الزخرفة الأولى بدل
 * الملصق، ويُخرج مسار قصّ في مكان فارغ من الملف ⇒ قصّ في موضع خاطئ بالمطبعة.
 * أمان الطباعة أهم من ذوق هندسي: مستطيل حوافه ناعمة يضمن احتواء العمل **دائماً**
 * ولا يمكن أن يقصّ في غيره. الحجم الفيزيائي النهائي يحدّده المشغّل عند الطباعة
 * (SVG متجه ⇒ لا دقة ثابتة)، أو إعدادات الطباعة في التطبيق.
 */

/** حافة الأمان الافتراضية كنسبة مئوية من أصغر بُعد للـ viewBox (~4% ≈ 2 مم على ملصق 50 مم). */
export const DEFAULT_BLEED_PERCENT = 4;

/** نصف قطر انحناء الحواف الافتراضي كنسبة مئوية من أصغر بُعد للـ viewBox. */
export const DEFAULT_CORNER_RADIUS_PERCENT = 6;

export interface DieCutOptions {
  /** نسبة النزف من أصغر بُعد للـ viewBox (افتراضي 4%) */
  bleedPercent?: number;
  /** لون خط القص (افتراضي: #FF00FF ماجنتا المطابع القياسي) */
  strokeColor?: string;
  /** سماكة خط القص بوحدات الـ viewBox (افتراضي 1.5) */
  strokeWidth?: number;
  /** نصف قطر انحناء الحواف كنسبة من أصغر بُعد (افتراضي 6%) */
  cornerRadiusPercent?: number;
}

export interface DieCutResult {
  /** مسار SVG المتجه لخط القص d="..." */
  pathData: string;
  /** كود SVG الكامل متضمناً طبقة خط القص CutContour */
  fullSvgWithContour: string;
  /** كود SVG نقي يحتوي على خط القص فقط لمقصات المطابع */
  standaloneContourSvg: string;
  /** أبعاد viewBox المستخرجة من الملف الأصلي */
  viewBox: { x: number; y: number; width: number; height: number };
  /** قيمة النزف المحسوبة بوحدات الـ viewBox */
  bleedPx: number;
}

/** استخراج أبعاد viewBox من كود SVG. */
export function extractSvgViewBox(svgString: string): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const vbMatch = svgString.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (vbMatch) {
    const parts = vbMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
      return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }

  // في حال غياب viewBox، نقرأ width و height (بأرقام مجردة أو بوحدات).
  const wMatch = svgString.match(/width\s*=\s*["']([0-9.]+)(?:[a-z%]*)?["']/i);
  const hMatch = svgString.match(/height\s*=\s*["']([0-9.]+)(?:[a-z%]*)?["']/i);
  const w = wMatch ? parseFloat(wMatch[1]) : 500;
  const h = hMatch ? parseFloat(hMatch[1]) : 500;

  return { x: 0, y: 0, width: w, height: h };
}

/** يبني مسار مستطيل بحواف دائرية ناعمة (Rounded Rect) بصيغة SVG. */
function generateRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const x2 = x + width;
  const y2 = y + height;
  const fmt = (n: number) => n.toFixed(2);

  return [
    `M ${fmt(x + r)} ${fmt(y)}`,
    `H ${fmt(x2 - r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x2)} ${fmt(y + r)}`,
    `V ${fmt(y2 - r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x2 - r)} ${fmt(y2)}`,
    `H ${fmt(x + r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y2 - r)}`,
    `V ${fmt(y + r)}`,
    `A ${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x + r)} ${fmt(y)}`,
    'Z',
  ].join(' ');
}

/**
 * يولّد حدود القص المتجه (Die-Cut Vector Contour) حول مساحة عمل الملصق.
 *
 * الحدّ = الـ viewBox موسَّعاً بنسبة نزف محسوبة من أصغر بُعد، فضمن احتواء محتوى
 * الملصق كاملاً مهما كان شكله (دائري أو نجمة أو بيضاوي أو غير منتظم).
 */
export function generateDieCutContour(
  svgString: string,
  options: DieCutOptions = {},
): DieCutResult {
  const bleedPercent = options.bleedPercent ?? DEFAULT_BLEED_PERCENT;
  const cornerRadiusPercent = options.cornerRadiusPercent ?? DEFAULT_CORNER_RADIUS_PERCENT;
  const strokeColor = options.strokeColor ?? '#FF00FF'; // ماجنتا المطابع (Spot: CutContour)
  const strokeWidth = options.strokeWidth ?? 1.5;

  const viewBox = extractSvgViewBox(svgString);

  // النزف نسبي إلى أصغر بُعد ⇒ متجانس على المحورين القصير والطويل.
  const minDim = Math.min(viewBox.width, viewBox.height) || 1;
  const bleedPx = (bleedPercent / 100) * minDim;
  const cornerRadiusPx = (cornerRadiusPercent / 100) * minDim;

  const x = viewBox.x - bleedPx;
  const y = viewBox.y - bleedPx;
  const w = viewBox.width + bleedPx * 2;
  const h = viewBox.height + bleedPx * 2;
  const pathData = generateRoundedRectPath(x, y, w, h, cornerRadiusPx);

  // توسيع حدود الـ viewBox ليتسع لخط القص وهامش الأمان.
  const margin = Math.ceil(bleedPx + strokeWidth * 2);
  const expVb = {
    x: viewBox.x - margin,
    y: viewBox.y - margin,
    width: viewBox.width + margin * 2,
    height: viewBox.height + margin * 2,
  };
  const expVbStr = `${expVb.x.toFixed(1)} ${expVb.y.toFixed(1)} ${expVb.width.toFixed(1)} ${expVb.height.toFixed(1)}`;

  // عنصر طبقة القص المتجه المعتمد لمعايير ماكينات ومقصات الفينيل
  const cutLayer = `
  <!-- ============================================== -->
  <!-- ✂️ SPOT CUT CONTOUR LAYER (For Plotters & Vinyl) -->
  <!-- Name: CutContour | Color: Magenta (#FF00FF)    -->
  <!-- ============================================== -->
  <g id="CutContour" inkscape:label="CutContour" data-role="die-cut-contour">
    <path
      d="${pathData}"
      fill="none"
      stroke="${strokeColor}"
      stroke-width="${strokeWidth}"
      stroke-linejoin="round"
      stroke-linecap="round"
      data-cut-contour="true"
    />
  </g>`;

  // 1. توليد SVG المتكامل (Artwork + CutContour Layer)
  let fullSvgWithContour = svgString;
  if (fullSvgWithContour.includes('</svg>')) {
    fullSvgWithContour = fullSvgWithContour.replace('</svg>', `${cutLayer}\n</svg>`);
    // تحديث viewBox ليتسع لخط القص
    fullSvgWithContour = fullSvgWithContour.replace(
      /viewBox\s*=\s*["'][^"']+["']/i,
      `viewBox="${expVbStr}"`,
    );
  }

  // 2. توليد SVG خط القص فقط (Standalone Vector Cut Path) — بلا عرض فيزيائي:
  //    المشغّل يحدّد الحجم النهائي عند الاستيراد (SVG متجه ⇒ لا دقة ثابتة).
  const standaloneContourSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="${expVbStr}">
  ${cutLayer}
</svg>`;

  return {
    pathData,
    fullSvgWithContour,
    standaloneContourSvg,
    viewBox,
    bleedPx,
  };
}
