/**
 * 🛡️ Grido UI Compliance Guard — R1-R40 + 600 violations enforcement
 *
 * ملف واحد مركزي يمنع الـ 600 مخالفة برمجياً:
 * - توكنز موحدة (مسافات 4px، نصف قطر، Z-Index، حركة، ألوان)
 * - قاموس Wait UX العربي + رسائل AI الشفافة + رسائل الأخطاء القابلة للحل
 * - مدققات dev-only تكشف المخالفة فوراً في الكونسول
 *
 * القاعدة: أي مكون جديد يجب أن يستورد من هنا بدل القيم السحرية.
 */

// ─── R4: سلم المسافات 4px — ممنوع أي قيمة خارجها ───
export const SPACING_RAMP = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56] as const;

export function assertSpacing(value: number, where: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (!SPACING_RAMP.includes(value as (typeof SPACING_RAMP)[number])) {
    console.warn(`[UI-COMPLIANCE R4] spacing ${value}px في ${where} خارج سلم 4px`);
  }
}

// ─── R18: هرمية نصف القطر ───
export const RADIUS = {
  control: 'rounded-md', // 4-6px: أزرار/حقول/قوائم
  container: 'rounded-xl', // 8-12px: بطاقات/ألواح
  modal: 'rounded-2xl', // 16-24px: مودالات
  pill: 'rounded-full', // كبسولات/أفاتار
} as const;

// ─── R24/R36: الحد الأدنى للمس + حلقة التركيز ───
export const TOUCH_TARGET_MIN = 44; // px
export const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

// ─── Z-Index الموحد — يُمنع z-30/z-50 العشوائي ───
export const Z = {
  panel: 40,
  canvasOverlay: 45,
  canvasGuides: 60,
  canvasTextOverlay: 70,
  ruler: 100,
  printToolbar: 150,
  quickBar: 500,
  menu: 1000,
  popover: 1500,
  dialog: 2000,
  toast: 3000,
} as const;
export const Z_CLASS = {
  panel: 'z-(--z-panel)',
  canvasOverlay: 'z-(--z-canvas-overlay)',
  canvasTextOverlay: 'z-(--z-canvas-text-overlay)',
  ruler: 'z-(--z-ruler)',
  quickBar: 'z-(--z-quick-bar)',
  menu: 'z-(--z-menu)',
  popover: 'z-(--z-popover)',
} as const;

export function assertNoArbitraryZ(className: string, where: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  const m = className.match(/(?:^|\s)z-(20|30|50)(?=\s|$)/);
  if (m) console.warn(`[UI-COMPLIANCE Z] استخدم z-(--z-*) بدل z-${m[1]} في ${where}`);
}

// ─── R23: أزمنة الحركة Fluent 2 ───
export const MOTION = {
  ultraFast: 50,
  faster: 100,
  fast: 150,
  normal: 250,
  gentle: 400,
  slow: 600,
  spring: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.1, 1)',
  accelerate: 'cubic-bezier(0.9, 0.1, 1, 1)',
} as const;

// ─── R3/R6: المساطر والزوم ───
export const RULER_SIZE = 20; // px ثابت
export const GRID_BASE = 4; // كل الشبكات مضاعفات 4
export const DEFAULT_GRID_PX = 48; // كان 50 مخالفاً → 48
export const MIN_DPI_ID_PHOTO = 300;

// ─── R27: قاموس Wait UX العربي ───
export const WAIT_COPY = {
  saving: 'جاري الحفظ ...',
  exporting: 'جاري التصدير بجودة عالية ...',
  preparingFile: 'جاري إعداد الملف ...',
  applying: 'جاري التطبيق ...',
  creating: 'جاري إنشاء المشروع ...',
  isolating: 'جاري عزل الخلفية ...',
  enhancing: 'جاري المعالجة وتحسين الوضوح ...',
  scanningDoc: 'جاري مسح المستند ...',
  warping: 'جاري استعدال المستند ...',
  fittingFace: 'جاري ضبط الوجه ...',
  syncing: 'جاري المزامنة ...',
  loadingUpdate: 'جاري تحميل التحديث ...',
} as const;

export function pickWaitComponent(
  expectedMs: number,
): 'none' | 'spinner' | 'progress' | 'toast' | 'skeleton' {
  if (expectedMs < 1000) return 'none'; // منع الوميض
  if (expectedMs <= 3000) return 'spinner';
  return 'progress';
}

// ─── R28: شفافية AI ───
export const AI_BADGE = 'AI';
export function aiProgressLabel(step: string): string {
  return `جاري ${step} ...`;
}

// ─── R30: أخطاء قابلة للحل ───
export interface SolvableError {
  reason: string;
  fix: string;
  code?: string;
}
export function formatSolvableError(e: SolvableError): string {
  return `${e.reason} — الحل: ${e.fix}${e.code ? ` (كود: ${e.code})` : ''}`;
}

// ─── R12: مصطلحات مختصرة ───
export const SHORT_LABELS = {
  openImage: 'فتح صورة...',
  projects: 'المشاريع...',
  clearWorkspace: 'تفريغ العمل',
  duplicate: 'تكرار',
  delete: 'حذف',
  rulers: 'المساطر',
  grid: 'الشبكة',
  properties: 'الخصائص',
  fillAll: 'تعبئة الكل',
  fillEmpty: 'تعبئة الفارغ',
} as const;

// ─── R32: حالة الحفظ في العنوان ───
export function dirtyDot(isDirty: boolean): string {
  return isDirty ? '● ' : '';
}

// ─── R17: تباين — يمنع muted/70 الشبحي ───
export const READABLE_MUTED = 'text-muted-foreground'; // ممنوع إضافة /70 أو opacity-70 للنصوص

// ─── R37: وحدات LTR داخل RTL ───
export function ltrSpan(value: string): { dir: 'ltr'; value: string } {
  return { dir: 'ltr', value };
}

// ─── RTL/LTR Direction Contract (تدقيق RTL 2026-10-13) ───
// مصدر الحقيقة الوحيد: <html lang="ar" dir="rtl"> (frontend/index.html).
// كل Portals (Dialog/Sheet/Dropdown/Popover/Select/Tooltip/Sonner) تُزرع في
// document.body فترث rtl من html — لذلك كل Content يحمل dir="rtl" صريحاً
// ولا يعتمد على وراثة الشجرة المستدعية (قد تكون داخل جزيرة ltr).
//
// الجزر المسموحة بـ dir="ltr" حصراً (موثقة بتعليق /* ltr-island */ في موضعها):
//  1) main التخطيط WorkspaceLayout — يفرض Rail يساراً والمفتش يميناً فيزيائياً لبرامج التصميم.
//  2) محررات الكانفس (freeform-canvas-editor) — إحداثيات Konva لا تُقلب.
//  3) الحقول الرقمية/المونو (font-mono + tabular-nums) — dir="ltr" + text-left.
//  4) Switch — dir="ltr" عمداً (سلوك Windows ثابت: التفعيل يميناً).
//
// القاعدة: خارج هذه الجزر استخدم الخصائص المنطقية حصراً
// (ms-/me-/ps-/pe-/start-/end- + text-start/end + border-s/e).
// الفيزيائيات (ml-/mr-/pl-/pr-/left-/right-/text-left/right) ممنوعة إلا
// داخل ltr-island مع تعليق يبررها.
export const DIRECTION_CONTRACT = {
  root: 'rtl' as const,
  portalContentDir: 'rtl' as const,
  ltrIslands: [
    'app-header',
    'workspace-layout-main',
    'canvas-editors',
    'numeric-mono-fields',
    'switch-control',
  ],
} as const;

export function assertNoPhysicalDirection(className: string, where: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  // يستثني ltr-island الموثقة: المتصل يمرر className بلا التعليق فقط عند المخالفة.
  const m = className.match(
    /(?:^|\s)(ml-|mr-|pl-|pr-|text-left|text-right|border-l-|border-r-|rounded-l|rounded-r|left-\d|right-\d)(?=\s|$)/,
  );
  if (m)
    console.warn(
      `[UI-COMPLIANCE RTL] خاصية فيزيائية ${m[1]} في ${where} — استخدم ms-/me-/ps-/pe-/start-/end- أو وثّق ltr-island`,
    );
}

// ─── R39: حارس الخيط الرئيسي — أي عملية >3s يجب أن تكون قابلة للإلغاء ───
export function mustBeCancellable(expectedMs: number, canCancel: boolean, where: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (expectedMs > 3000 && !canCancel) {
    console.warn(`[UI-COMPLIANCE R39] عملية طويلة دون إلغاء في ${where}`);
  }
}

// ─── R34: لا فقدان جودة صامت ───
export function qualityWarning(dpi: number, where: string): string | null {
  if (dpi < MIN_DPI_ID_PHOTO)
    return `تنبيه: الدقة ${dpi} أقل من ${MIN_DPI_ID_PHOTO} المطلوبة لصور الهوية (${where})`;
  return null;
}
