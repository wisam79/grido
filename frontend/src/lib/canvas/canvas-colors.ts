/**
 * Canvas Colors – Single Source of Truth
 * ======================================
 * قراءة ألوان الـ Canvas/Konva من CSS variables المعرّفة في index.css
 * بدلاً من استخدام قيم hex صلبة مباشرة في كل مكوّن.
 *
 * ملاحظة: Konva لا يدعم `var(--xxx)` مباشرة، لذا نقرأ القيمة المحسوبة
 * من getComputedStyle في اللحظة الأولى فقط (مرة واحدة عند التهيؤ).
 */

let _computed: CSSStyleDeclaration | null = null;

function css(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  if (!_computed) {
    _computed = getComputedStyle(document.documentElement);
  }
  return _computed.getPropertyValue(varName).trim() || fallback;
}

/** إعادة تحميل المتغيرات (استخدم عند تغيير الثيم) */
export function invalidateCanvasColors() {
  _computed = null;
}

// ── Checker Pattern ─────────────────────────────────────────────────────────
export const checkerColor = () => css("--canvas-checker-a", "#e2e8f0");

// ── Snap Guides ──────────────────────────────────────────────────────────────
export const guideCenter = () => css("--canvas-guide-center", "#0284c7");
export const guideEdge   = () => css("--canvas-guide-edge",   "#f43f5e");

// ── Ruler ────────────────────────────────────────────────────────────────────
export const rulerCursor = () => css("--canvas-ruler-cursor", "#2563eb");

// ── Transformer ──────────────────────────────────────────────────────────────
export const transformerPrimary     = () => css("--canvas-transformer-primary",      "#2563eb");
export const transformerStroke      = () => css("--canvas-transformer-stroke",       "#1d4ed8");
export const transformerLocked      = () => css("--canvas-transformer-locked",       "#f59e0b");
export const transformerLockedStroke= () => css("--canvas-transformer-locked-stroke","#d97706");
export const transformerAnchorFill  = () => css("--canvas-transformer-anchor-fill",  "#ffffff");
export const transformerBadgeBg     = () => css("--canvas-transformer-badge-bg",     "#1e293b");
export const transformerBadgeText   = () => css("--canvas-transformer-badge-text",   "#ffffff");

// ── Shape Fill Gradient Defaults ─────────────────────────────────────────────
export const gradientStart = () => css("--canvas-gradient-start", "#3b82f6");
export const gradientEnd   = () => css("--canvas-gradient-end",   "#8b5cf6");

// ── Collage Layer ────────────────────────────────────────────────────────────
export const collageCut    = () => css("--canvas-collage-cut",     "#94a3b8");
export const collageEndCut = () => css("--canvas-collage-end-cut", "#3b82f6");
export const slotPlaceholderBg   = () => css("--canvas-slot-placeholder-bg",   "#f1f5f9");
export const slotPlaceholderText = () => css("--canvas-slot-placeholder-text", "#94a3b8");

// ── Magic AI Scanner ─────────────────────────────────────────────────────────
export const scannerBeam      = () => css("--canvas-scanner-beam",       "#0ea5e9");
export const scannerGlow      = () => css("--canvas-scanner-glow",       "#38bdf8");
export const scannerParticleA = () => css("--canvas-scanner-particle-a", "#e0e7ff");
export const scannerParticleB = () => css("--canvas-scanner-particle-b", "#38bdf8");
export const scannerParticleC = () => css("--canvas-scanner-particle-c", "#c084fc");

// ── Document Scanner ─────────────────────────────────────────────────────────
export const docScannerPrimary = () => css("--canvas-doc-scanner-primary", "#6366f1");
export const docScannerHover   = () => css("--canvas-doc-scanner-hover",   "#818cf8");
export const docScannerDark    = () => css("--canvas-doc-scanner-dark",    "#312e81");
export const docScannerInner   = () => css("--canvas-doc-scanner-inner",   "#4f46e5");
export const docScannerLoupe   = () => css("--canvas-doc-scanner-loupe",   "#ef4444");

// ── Preview Backgrounds (refine-bg-dialog) ───────────────────────────────────
export const previewWhite   = () => css("--canvas-preview-white",   "#ffffff");
export const previewBlack   = () => css("--canvas-preview-black",   "#09090b");
export const previewBlue    = () => css("--canvas-preview-blue",    "#1d4ed8");
export const previewChecker = () => css("--canvas-preview-checker", "#80808033");

// ── Text Element Fallbacks ───────────────────────────────────────────────────
/** اللون الافتراضي لعنصر النص (محتوى المستخدم – ليس UI) */
export const TEXT_COLOR_DEFAULT = "#000000";
