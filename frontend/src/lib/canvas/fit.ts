/* ═══════════════════════════════════════════════════════════════
   نموذج ملاءمة الورقة داخل منطقة العمل — المصدر الوحيد لحساب أبعاد
   العرض (displayW/displayH).

   كان الحساب مضمّناً في editor-canvas.tsx ويلائم الورقة على الارتفاع
   دائماً: ورقة هوية رأسية (35×45مم) في نافذة أفقية كانت تُعرض بعرض
   361px داخل منطقة عرض 940px — أي ~60% من عرض مساحة العمل فراغ ميت،
   وCtrl+0 لم يكن يعالج شيئاً لأنه يُحسب من نفس صندوق الملاءمة.

   الأوضاع الثلاثة:
   - height : ملاءمة الكل — الورقة كاملة داخل الإطار (السلوك القديم حرفياً).
   - width  : ملاءمة العرض — الورقة تملأ العرض ويُمرَّر الباقي رأسياً.
   - auto   : يختار بينهما تلقائياً من هندسة النافذة (انظر resolveFitMode)
              ولا يعتمد على الزوم، فلا يتقلّب الوضع أثناء التكبير/التصغير.

   الدوال نقية بلا اعتماد على DOM — تُختبَر وحدها (canvas-fit.test.ts).
   ═══════════════════════════════════════════════════════════════ */

/** وضع الملاءمة المطلوب (تفضيل المستخدم) */
export type CanvasFitMode = 'auto' | 'height' | 'width' | 'actual';
/** الوضع الفعلي بعد حلّ `auto` — يُعرض في شريط العرض */
export type ResolvedFitMode = 'height' | 'width' | 'actual';

/** الحشو المطلوب حول الورقة داخل منطقة العمل (p-4 من كل جهة) */
export const CANVAS_FIT_PADDING = 32;
/**
 * عتبة «الفراغ الجانبي المبالغ به» لوضع auto: لا تُفعَّل ملاءمة العرض
 * تلقائياً إلا عندما تشغل الورقة أقل من 45% من عرض منطقة العمل (فراغ
 * يتجاوز حجم الورقة نفسها). في ورقة كاملة داخل الإطار لا تُخفى.
 *
 * ملاحظة رياضية مفيدة: عند تثبيت الورقة على الارتفاع تكون
 *   الفراغ = 1 − (نسبة الورقة / نسبة المنطقة)
 * أي أن العتبة تتبع نسبة النافذة إلى نسبة الورقة، لا مقاس الشاشة. ورقة A4
 * (0.707) في نافذة 1280×800 مع اللوح مفتوحاً (1.417) تعطي فراغاً 0.50،
 * وفي 1600×900 تعطي 0.575 — فالنوافذ العريضة وحدها تنتقل تلقائياً.
 */
export const AUTO_FIT_LEFTOVER_RATIO = 0.55;
/**
 * سقف تمدد ملاءمة العرض في auto. ملاحظة مهمة: نسبة تكبير ملاءمة العرض
 * هي مقلوب نسبة الارتفاع المرئي من الورقة — أي أن سقف 3 يعني تكبيراً
 * لا يتجاوز 3× ويبقى ثلث الورقة على الأقل ظاهراً بلا تمرير. النوافذ
 * العريضة جداً والقصيرة (شريط أفقي طويل) تتجاوز هذا السقف فتبقى على
 * «ملاءمة الكل» بدل تكبير يخفي معظم الورقة.
 */
export const AUTO_FIT_MAX_VERTICAL_OVERFLOW = 3;

export const CANVAS_FIT_STORAGE_KEY = 'grido_canvas_fit_mode_v1';

const FIT_MODES: readonly CanvasFitMode[] = ['auto', 'height', 'width', 'actual'];

/** عنوان الوضع للعرض في الواجهة */
export const CANVAS_FIT_LABELS: Record<CanvasFitMode, string> = {
  auto: 'ملاءمة تلقائية',
  height: 'ملاءمة الكل',
  width: 'ملاءمة العرض',
  actual: 'الحجم الفعلي 1:1',
};

export interface CanvasDisplayInput {
  /** عرض منطقة العمل (حاوية التمرير) بالبكسل */
  containerW: number;
  /** ارتفاع منطقة العمل بالبكسل */
  containerH: number;
  /** نسبة عرض الورقة إلى ارتفاعها (canvasWidth / canvasHeight) */
  aspect: number;
  /** مضاعف الزوم فوق أساس الملاءمة المختار */
  zoom: number;
  /** الوضع المطلوب — الافتراضي auto */
  fitMode?: CanvasFitMode;
  /** عرض الورقة بالبكسل الحقيقي — مطلوب لوضع «الحجم الفعلي» */
  canvasW?: number;
  /** ارتفاع الورقة بالبكسل الحقيقي — مطلوب لوضع «الحجم الفعلي» */
  canvasH?: number;
  /** Manual navigation retains this fit basis until an explicit fit/reset. */
  fitBasis?: CanvasFitBasis;
}

export interface CanvasFitBasis {
  /** Local CSS pixels per logical paper pixel at 100%. */
  baseScale: number;
  resolved: ResolvedFitMode;
  leftoverRatio: number;
}

export interface CanvasDisplay extends CanvasFitBasis {
  displayW: number;
  displayH: number;
  /** Uniform local CSS/logical scale; never independently round the two axes. */
  scale: number;
  /** Unzoomed paper dimensions, not the viewport-sized Konva backing buffers. */
  stageW: number;
  stageH: number;
}

/**
 * مستطيل التقاط الورقة — نافذة التصدير المستقلة عن الزوم.
 * التصدير يجب أن يُنتج دقة ثابتة مهما كان مستوى التكبير الحالي؛ التقاط
 * منطقة الورقة بإحداثياتها المنطقية + pixelRatio صريح يحقّق ذلك.
 */
export function paperCaptureRect(canvasWidth: number, canvasHeight: number) {
  return {
    x: 0,
    y: 0,
    width: Number.isFinite(canvasWidth) && canvasWidth > 0 ? canvasWidth : 1,
    height: Number.isFinite(canvasHeight) && canvasHeight > 0 ? canvasHeight : 1,
  };
}

/** نسبة صالحة دائماً — كان القسمة على aspect غير محمي في editor-canvas */
export function safeAspect(aspect: number): number {
  return Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
}

/** صندوق الملاءمة بعد الحشو (لا يقبل قيماً غير موجبة) */
function fitBox(containerW: number, containerH: number): { boxW: number; boxH: number } {
  return {
    boxW: Math.max(1, (Number.isFinite(containerW) ? containerW : 0) - CANVAS_FIT_PADDING),
    boxH: Math.max(1, (Number.isFinite(containerH) ? containerH : 0) - CANVAS_FIT_PADDING),
  };
}

/**
 * الفراغ الجانبي المتوقع لو لائمنا الورقة على الارتفاع — مؤشر «الهدر»
 * الذي يُبنى عليه قرار auto، ويُعرض في شريط العرض.
 */
export function lateralLeftoverRatio(
  containerW: number,
  containerH: number,
  aspect: number,
): number {
  const a = safeAspect(aspect);
  const { boxW, boxH } = fitBox(containerW, containerH);
  const heightFitW = Math.min(boxW, boxH * a);
  return Math.max(0, Math.min(1, 1 - heightFitW / boxW));
}

/** حلّ الوضع المطلوب إلى وضع فعلي (auto يقرأ هندسة النافذة) */
export function resolveFitMode(input: {
  containerW: number;
  containerH: number;
  aspect: number;
  fitMode?: CanvasFitMode;
}): ResolvedFitMode {
  const { fitMode = 'auto' } = input;
  if (fitMode === 'height' || fitMode === 'width' || fitMode === 'actual') return fitMode;

  const a = safeAspect(input.aspect);
  // ورقة أفقية أو مربعة: ملاءمة الارتفاع تملأ العرض أصلاً فلا فراغ يُستعاد
  if (a >= 1) return 'height';

  if (lateralLeftoverRatio(input.containerW, input.containerH, a) < AUTO_FIT_LEFTOVER_RATIO) {
    return 'height';
  }

  const { boxW, boxH } = fitBox(input.containerW, input.containerH);
  if (boxW / a > boxH * AUTO_FIT_MAX_VERTICAL_OVERFLOW) return 'height';

  return 'width';
}

/**
 * Single display authority for fit and manual navigation. A fit basis is a scale,
 * not rounded W/H: the stage, rulers, DOM overlays and logical export agree even
 * for tiny papers. Contain is never enlarged by a minimum display dimension.
 */
export function computeCanvasDisplay({
  containerW,
  containerH,
  aspect,
  zoom,
  fitMode = 'auto',
  canvasW,
  canvasH,
  fitBasis,
}: CanvasDisplayInput): CanvasDisplay {
  const hasRealSize =
    Number.isFinite(canvasW) &&
    (canvasW as number) > 0 &&
    Number.isFinite(canvasH) &&
    (canvasH as number) > 0;
  const paperW = hasRealSize ? (canvasW as number) : safeAspect(aspect);
  const paperH = hasRealSize ? (canvasH as number) : 1;
  const a = paperW / paperH;
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  let resolved: ResolvedFitMode;
  let baseScale: number;
  let leftoverRatio: number;

  if (fitBasis && Number.isFinite(fitBasis.baseScale) && fitBasis.baseScale > 0) {
    ({ resolved, baseScale, leftoverRatio } = fitBasis);
  } else {
    resolved = resolveFitMode({ containerW, containerH, aspect: a, fitMode });
    if (resolved === 'actual' && !hasRealSize) resolved = 'height';
    const { boxW, boxH } = fitBox(containerW, containerH);
    baseScale =
      resolved === 'actual'
        ? 1
        : resolved === 'width'
          ? boxW / paperW
          : Math.min(boxW / paperW, boxH / paperH);
    leftoverRatio = lateralLeftoverRatio(containerW, containerH, a);
  }

  const scale = baseScale * z;
  return {
    displayW: paperW * scale,
    displayH: paperH * scale,
    stageW: paperW * baseScale,
    stageH: paperH * baseScale,
    scale,
    baseScale,
    resolved,
    leftoverRatio,
  };
}

/** هل القيمة المخزّنة وضع ملاءمة صالح؟ */
export function isCanvasFitMode(value: unknown): value is CanvasFitMode {
  return typeof value === 'string' && FIT_MODES.includes(value as CanvasFitMode);
}

/** قراءة التفضيل المخزّن (الحفظ متعمَّد: تفضيل عرض لا جزء من المستند) */
export function readStoredFitMode(): CanvasFitMode {
  try {
    const raw = localStorage.getItem(CANVAS_FIT_STORAGE_KEY);
    return isCanvasFitMode(raw) ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

/** حفظ التفضيل — الفشل (تخزين معطّل/حصّة) لا يُعطّل الواجهة */
export function writeStoredFitMode(mode: CanvasFitMode): void {
  try {
    localStorage.setItem(CANVAS_FIT_STORAGE_KEY, mode);
  } catch {
    // Ignore storage quota or disabled errors
  }
}
