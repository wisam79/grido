import { DEFAULT_COLLAGE_STATE } from './slices/collage-slice';
import { DEFAULT_GRID_STATE } from './slices/grid-slice';
import { DEFAULT_PRINT_SETTINGS } from './slices/print-slice';

import type {
  CanvasElement,
  CanvasSlot,
  CollageTemplate,
  HistoryEntry,
  PhotoTemplate,
  PrintSettings,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// history-snapshot.ts — السجل الموحّد لحقول اللقطة القابلة للتراجع (مصدر واحد)
//
// كانت حقول اللقطة تُعدَّد يدوياً في خمسة مواضع منفصلة (نوع HistoryCross،
// القيم الافتراضية، الالتقاط، الاستعادة، والمقارنة) — أي حقل جديد يعني تعديل
// الخمسة وإلا انحرفت بذرة أو مقارنة بصمت (صنف أخطاء Bug#1/H4). الآن تُعلن
// الحقول مرة واحدة في SNAPSHOT_KEYS ومواصفاتها في SNAPSHOT_FIELDS، وتُشتق
// منها الالتقاط/الاستعادة/المقارنة/الافتراضيات. إضافة حقل = سطران هنا فقط.
// ─────────────────────────────────────────────────────────────────────────────

/** مفاتيح اللقطة — المصدر الوحيد لعدد الحقول وترتيبها */
export const SNAPSHOT_KEYS = [
  'mode',
  'canvasWidth',
  'canvasHeight',
  'backgroundColor',
  'template',
  'collageTemplate',
  'backgroundGradientColor2',
  'backgroundGradientAngle',
  'freeformCanvasWidth',
  'freeformCanvasHeight',
  'freeformBackgroundColor',
  'freeformBackgroundGradientColor2',
  'freeformBackgroundGradientAngle',
  'collageCanvasWidth',
  'collageCanvasHeight',
  'collageBackgroundColor',
  'collageBackgroundGradientColor2',
  'collageBackgroundGradientAngle',
  'collageGap',
  'collageMargin',
  'collageRadius',
  'collageShowCutLines',
  'collageShowEndCutLine',
  'collageStrokeWidth',
  'collageStrokeColor',
  'showGrid',
  'gridSize',
  'gridColor',
  'gridOpacity',
  'gridSubdivisions',
  'gridType',
  'userGuides',
  'lastEditedImage',
  'lastEditedImageAspect',
  'printSettings',
] as const;

export type SnapshotKey = (typeof SNAPSHOT_KEYS)[number];

/** قيمة كل حقل لقطة — مشتقة من HistoryEntry (المصدر النوعي الواحد) بلا undefined */
export type SnapshotValues = {
  [K in SnapshotKey]: Exclude<HistoryEntry[K], undefined>;
};

/** مدخل الالتقاط: حالة تحمل حقول اللقطة (يتسامح مع حقول غائبة في بذور الاختبارات) */
export type SnapshotSource = Partial<SnapshotValues> & {
  elements: CanvasElement[];
  slots: CanvasSlot[];
};

interface SnapshotFieldSpec<K extends SnapshotKey> {
  /** القيمة الابتدائية — بنفس مرجع الحالة الابتدائية حيثما كان المرجع هو هوية المقارنة */
  default: SnapshotValues[K];
  /** تطبيع عند الالتقاط: تسوية undefined → null/قيمة افتراضية لتطابق الـ dedupe */
  normalize?: (value: SnapshotValues[K] | undefined) => SnapshotValues[K];
  /** نسخة مستقلة عند الالتقاط (لكائنات تتغير حقولها بلا تغيير المرجع) */
  clone?: (value: SnapshotValues[K]) => SnapshotValues[K];
  /** مقارنة مخصصة — الافتراضية مرجعية مع تسوية null (انظر snapshotValuesEqual) */
  equals?: (a: SnapshotValues[K], b: SnapshotValues[K]) => boolean;
}

// 🛡️ إعدادات الطباعة (H4): اللقطة تحمل نسخة مستقلة (`{...}`) فالمقارنة المرجعية
// تجعل كل لقطتين "مختلفتين" وتسجّل خطوة تراجع وهمية عند كل عملية — نقارن حقولها.
const printSettingsEqual = (a: PrintSettings, b: PrintSettings): boolean => {
  const keys = Object.keys(a) as (keyof PrintSettings)[];
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
};

export const SNAPSHOT_FIELDS: { readonly [K in SnapshotKey]: SnapshotFieldSpec<K> } = {
  mode: { default: 'collage' },
  canvasWidth: { default: 2480 },
  canvasHeight: { default: 3508 },
  backgroundColor: { default: '#FFFFFF' },
  template: { default: null as PhotoTemplate | null, normalize: (v) => v ?? null },
  // يطابق الحالة الابتدائية الفعلية (نفس مرجع قالب الكولاج الافتراضي)
  collageTemplate: {
    default: DEFAULT_COLLAGE_STATE.collageTemplate as CollageTemplate | null,
    normalize: (v) => v ?? null,
  },
  backgroundGradientColor2: { default: null as string | null, normalize: (v) => v ?? null },
  backgroundGradientAngle: { default: 135, normalize: (v) => v ?? 135 },
  freeformCanvasWidth: { default: 2480 },
  freeformCanvasHeight: { default: 3508 },
  freeformBackgroundColor: { default: '#FFFFFF' },
  freeformBackgroundGradientColor2: { default: null as string | null, normalize: (v) => v ?? null },
  freeformBackgroundGradientAngle: { default: 135, normalize: (v) => v ?? 135 },
  collageCanvasWidth: { default: 2480 },
  collageCanvasHeight: { default: 3508 },
  collageBackgroundColor: { default: '#FFFFFF' },
  collageBackgroundGradientColor2: { default: null as string | null, normalize: (v) => v ?? null },
  collageBackgroundGradientAngle: { default: 135, normalize: (v) => v ?? 135 },
  collageGap: { default: 0 },
  collageMargin: { default: 0 },
  collageRadius: { default: 0 },
  collageShowCutLines: { default: false },
  collageShowEndCutLine: { default: true },
  collageStrokeWidth: { default: 0 },
  collageStrokeColor: { default: '#000000' },
  // الشبكة والأدلة — بدونها كان التراجع يستعيد الخانات ويُبقي الشبكة/الأدلة
  // الجديدة، فتتباعد الحالتان بلا إمكانية عكس التغيير (نفس صنف إصلاح H4)
  showGrid: { default: DEFAULT_GRID_STATE.showGrid },
  gridSize: { default: DEFAULT_GRID_STATE.gridSize },
  gridColor: { default: DEFAULT_GRID_STATE.gridColor },
  gridOpacity: { default: DEFAULT_GRID_STATE.gridOpacity },
  gridSubdivisions: { default: DEFAULT_GRID_STATE.gridSubdivisions },
  gridType: { default: DEFAULT_GRID_STATE.gridType },
  // نفس مرجع مصفوفة الحالة الابتدائية (مثل collageTemplate) — مصفوفة جديدة
  // تجعل مقارنة اللقطتين ترى الإرشادات "مختلفة" فتُدفع لقطة وهمية في كل مرة
  userGuides: { default: DEFAULT_GRID_STATE.userGuides },
  lastEditedImage: { default: null as string | null, normalize: (v) => v ?? null },
  lastEditedImageAspect: { default: null as number | null, normalize: (v) => v ?? null },
  printSettings: {
    default: DEFAULT_PRINT_SETTINGS,
    clone: (v) => ({ ...v }),
    equals: printSettingsEqual,
  },
};

const buildDefaults = (): SnapshotValues => {
  const extras = {} as SnapshotValues;
  const target = extras as Record<SnapshotKey, unknown>;
  for (const key of SNAPSHOT_KEYS) {
    target[key] = SNAPSHOT_FIELDS[key].default;
  }
  return extras;
};

// القيم الافتراضية للحقول الإضافية — يجب أن تطابق DEFAULT_CORE_STATE في core-slice
export const DEFAULT_HISTORY_ENTRY_EXTRAS = buildDefaults();

function captureValue<K extends SnapshotKey>(
  key: K,
  source: Partial<SnapshotValues>,
): SnapshotValues[K] {
  const spec = SNAPSHOT_FIELDS[key];
  const raw = source[key];
  const normalized = spec.normalize ? spec.normalize(raw) : (raw as SnapshotValues[K]);
  return spec.clone ? spec.clone(normalized) : normalized;
}

/** التقاط لقطة كاملة للحالة القابلة للتراجع (عناصر + خانات + كل حقول السجل) */
export const captureHistoryEntry = (source: SnapshotSource): HistoryEntry => {
  const entry: HistoryEntry = {
    // نسخ سطحي يمنع نسخ البيانات الضخمة مع ضمان فصل المراجع
    elements: source.elements.map((el) => ({ ...el })),
    slots: source.slots.map((sl) => ({ ...sl })),
  };
  const target = entry as { [K in SnapshotKey]?: unknown };
  for (const key of SNAPSHOT_KEYS) {
    target[key] = captureValue(key, source);
  }
  return entry;
};

/**
 * مقارنة حقول اللقطة — العددية/النصية مباشرة مع تسوية null، والقوالب والأدلة
 * بالمرجع (الستور immutable)، وإعدادات الطباعة بحقولها (نسخة الالتقاط مستقلة).
 */
export const snapshotValuesEqual = (
  a: Partial<SnapshotValues>,
  b: Partial<SnapshotValues>,
): boolean => {
  for (const key of SNAPSHOT_KEYS) {
    const spec = SNAPSHOT_FIELDS[key] as SnapshotFieldSpec<SnapshotKey>;
    const va = a[key];
    const vb = b[key];
    if (spec.equals) {
      if (va === undefined || vb === undefined) {
        if (va !== vb) return false;
      } else if (!spec.equals(va, vb)) {
        return false;
      }
    } else if ((va ?? null) !== (vb ?? null)) {
      return false;
    }
  }
  return true;
};
