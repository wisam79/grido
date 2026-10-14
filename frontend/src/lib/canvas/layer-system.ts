/**
 * 🗂️ layer-system.ts — نظام الطبقات المركزي V2 لـ Grido
 *
 * يوحّد تعريف ترتيب الطبقات وميزانيتها وخصائصها مستنداً إلى توثيق Konva الرسمي:
 * - https://konvajs.org/docs/performance/All_Performance_Tips.html
 * - https://konvajs.org/docs/performance/Layer_Management.html
 * - https://konvajs.org/docs/performance/Listening_False.html
 * - https://konvajs.org/docs/performance/Optimize_Strokes.html
 * - https://konvajs.org/docs/performance/Shape_Caching.html
 *
 * قواعد ذهبية (Konva Performance Guide):
 * 1. كل Layer = عنصرا <canvas> منفصلان (scene + hit) — ~41MB على شاشة 1920×1080@dpr2.
 *    تحذير Konva: >5 طبقات ≈ 200MB VRAM على طبقات فارغة.
 * 2. Keep layers minimal — فحتى طبقة فارغة تستهلك VRAM كاملاً للإطار.
 * 3. listening=false على الطبقات الثابتة يمنع بناء hit graph المكلّف.
 * 4. hitOnDragEnabled = false افتراضياً — لا تفعّله إلا لحاجة تظليل هدف إسقاط.
 * 5. pixelRatio ثابت عند التركيب — إعادة تخصيصه تعيد تخصيص كل backing store.
 *
 * هذا الملف هو مصدر الحقيقة الوحيد لترتيب الـ z وخصائص كل طبقة.
 * أي تغيير على عدد الطبقات أو ترتيبها يجب أن يمر من هنا أولاً.
 */

export const LAYER_IDS = ['background', 'collage', 'content', 'overlay', 'drag'] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export interface LayerDef {
  /** معرّف الطبقة */
  id: LayerId;
  /** السمة name في Konva — تُستخدم للاختبارات والتصدير */
  name: string;
  /** ترتيب الطبقة داخل <Stage> (الأصغر = في الخلف) */
  z: number;
  /** هل تستقبل الطبقة أحداث المؤشر؟ (hit graph) */
  listening: boolean;
  /** هل isClearBeforeDraw مفعّل؟ false نادراً ما يُستخدم */
  clearBeforeDraw: boolean;
  /** وصف دور الطبقة */
  role: string;
  /** الطبقات المسموح لها أن تكون visible=false بلا فك تركيب (توفير رسم لا VRAM) */
  canToggleVisibility: boolean;
  /** هل الطبقة تُصدَّر للصورة؟ */
  exportable: boolean;
}

/**
 * التعريف المرجعي لكل طبقة — z مطابق لترتيب JSX في konva-canvas.tsx.
 * أي تغيير في z هنا يجب أن يُعكس في JSX بنفس الترتيب وإلا تختلف النتيجة البصرية.
 */
export const LAYER_DEFS: Record<LayerId, LayerDef> = {
  background: {
    id: 'background',
    name: 'background-layer',
    z: 0,
    listening: false, // ثابتة + شبكة/أعمدة = بلا hit — توفير كبير (Listening_False)
    clearBeforeDraw: true,
    role: 'ورق وظل وشبكة وأعمدة — رسم مجمع في Shape واحد (Path Batching)',
    canToggleVisibility: false, // دائمة
    exportable: true,
  },
  collage: {
    id: 'collage',
    name: 'collage-layer',
    z: 1,
    listening: true, // تحتاج نقر/لمس/عجلة على الخانات
    clearBeforeDraw: true,
    role: 'خانات الكولاج والصور داخلها + خطوط القص — visible/listening حسب mode',
    canToggleVisibility: true,
    exportable: true,
  },
  content: {
    id: 'content',
    name: 'elements-content-layer',
    z: 2,
    listening: true, // عناصر حرة قابلة للتحديد
    clearBeforeDraw: true,
    role: 'العناصر الحرة (صور/نصوص/أشكال) — مع viewport-culling',
    canToggleVisibility: true,
    exportable: true,
  },
  overlay: {
    id: 'overlay',
    name: 'overlay-tools-layer',
    z: 3,
    listening: true, // محوّل + marquee
    clearBeforeDraw: true,
    role: 'المحوّل (Transformer) ومستطيل التحديد — طبقة منفصلة تحمي المحتوى من إعادة الرسم',
    canToggleVisibility: true,
    exportable: false, // لا تُصدَّر — معاينة فقط
  },
  drag: {
    id: 'drag',
    name: 'drag-layer',
    z: 4,
    listening: false, // طول السحب فقط — بلا hit
    clearBeforeDraw: true,
    role: 'طبقة السحب الرسمية (Official Drag-Layer) — عقدة واحدة تُرسم كل إطار',
    canToggleVisibility: false,
    exportable: false,
  },
};

export const LAYER_ORDER: LayerId[] = ['background', 'collage', 'content', 'overlay', 'drag'];

// ──────────────────────────────────────────────
//  VRAM Budget — تقدير استهلاك الطبقات
// ──────────────────────────────────────────────

/**
 * تقدير ذاكرة طبقة واحدة بالميغابايت (MiB).
 *
 * الصيغة من التوثيق الرسمي:
 *   sceneCanvas = w * h * 4 bytes * pixelRatio²
 *   hitCanvas   = w * h * 4 bytes * 1²
 *   total ≈ scene + hit (+ caches إن وجدت)
 *
 * على 1920×1080@dpr2:
 *   scene: 1920*1080*4*4 ≈ 33MB
 *   hit:   1920*1080*4   ≈ 8MB
 *   → ≈ 41MB / layer
 */
export function estimateLayerVramMB(stageW: number, stageH: number, pixelRatio: number): number {
  const scene = stageW * stageH * 4 * pixelRatio * pixelRatio;
  const hit = stageW * stageH * 4;
  return (scene + hit) / (1024 * 1024);
}

export function estimateTotalVramMB(
  stageW: number,
  stageH: number,
  pixelRatio: number,
  layerCount: number = LAYER_ORDER.length,
): number {
  return estimateLayerVramMB(stageW, stageH, pixelRatio) * layerCount;
}

/** حدود VRAM التقريبية — تجاوزها يسبّب شاشة بيضاء على Mobile Safari */
export const VRAM_BUDGET = {
  /** سقف Mobile Safari: 256–384MB حسب الجهاز — نستخدم 256 كحد آمن */
  mobileSafariMB: 256,
  /** تحذير Konva الرسمي: 5 طبقات على 1080p@dpr2 ≈ 205MB */
  warningLayers: 5,
  /** حد Grido المختار: 5 طبقات كحد أقصى (ضمن التحذير الرسمي) */
  maxLayers: 5,
} as const;

export type VramPressure = 'ok' | 'warn' | 'critical';

/**
 * تصنيف ضغط VRAM الحالي — يُستخدم لتفعيل تدهور لطيف (degradation):
 * warn → تعطيل الظلال الثقيلة، critical → خفض pixelRatio أو تعطيل caches.
 */
export function getVramPressure(
  stageW: number,
  stageH: number,
  pixelRatio: number,
  layerCount: number = LAYER_ORDER.length,
): { mb: number; pressure: VramPressure } {
  const mb = estimateTotalVramMB(stageW, stageH, pixelRatio, layerCount);
  let pressure: VramPressure = 'ok';
  if (mb > VRAM_BUDGET.mobileSafariMB * 0.85) pressure = 'critical';
  else if (mb > VRAM_BUDGET.mobileSafariMB * 0.6) pressure = 'warn';
  // أيضاً حسب عدد الطبقات (التحذير الرسمي عند 5)
  if (layerCount > VRAM_BUDGET.warningLayers) pressure = 'critical';
  else if (layerCount === VRAM_BUDGET.warningLayers && pressure === 'ok') pressure = 'warn';
  return { mb, pressure };
}

/**
 * Totip: طباعة تحذير VRAM في DEV فقط — لا يُستدعى في الإنتاج.
 */
export function logVramBudget(stageW: number, stageH: number, pixelRatio: number): void {
  if (import.meta.env.PROD) return;
  const { mb, pressure } = getVramPressure(stageW, stageH, pixelRatio);
  const per = estimateLayerVramMB(stageW, stageH, pixelRatio).toFixed(1);
  const msg =
    `[LayerSystem] VRAM: ${mb.toFixed(1)}MB total (${per}MB/layer × ${LAYER_ORDER.length} layers) ` +
    `stage ${stageW}×${stageH}@${pixelRatio} — pressure: ${pressure}`;
  if (pressure === 'critical') console.warn(msg);
  else if (pressure === 'warn') console.debug(msg);
}
