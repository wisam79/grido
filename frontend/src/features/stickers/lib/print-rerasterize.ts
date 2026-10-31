/**
 * print-rerasterize.ts — ترقية دقة الملصقات لحظة الطباعة.
 *
 * راستر الملصق يُبنى مرة واحدة عند الإدراج على مقاس القالب الافتراضي
 * (stickerRasterSize بـ 300DPI). أي تكبير لاحق للعنصر على الكانفس يخفض
 * الدقة الفعالة بصمت. هنا نعالج السبب لا العَرَض: قبل بناء حمولة الطباعة،
 * كل عنصر يحمل stickerSource ويكون ممتداً فوق قدرة مصدره يُعاد تصييره
 * من SVG المتجه المحفوظ (أو من قالب+معاملاته) على المقاس المطبوع الفعلي
 * بـ targetDpi، ويُرفع كأصل طباعة مؤقت — **دون لمس عنصر الكانفس أو الستور**.
 *
 * يُطبَّق على مسار التركيب السريع فقط (CanvasComposition). مسار الالتقاط
 * (عناصر بدوران/ظل/تدرج) يُصيّر الكانفس كما هو، فتبقى تحذيرات preflight
 * هي الغلاف الأمين هناك.
 */
import { MM_PER_INCH } from '@/lib/canvas/units';
import { createLogger } from '@/lib/logger';

import { getStickerTemplateById } from '../templates';

import { assertRasterBudget } from './export-limits';
import { buildStickerSvg } from './sticker-design/build-svg';
import { mmToPx } from './sticker-text';
import { renderSvgToPngBlob } from './svg-rasterizer';

import type { CanvasElement, ImageElement, StickerElementSource } from '@/lib/store/types';

const logger = createLogger('print-rerasterize');

export interface StickerReRasterOptions {
  /** الحجم الفيزيائي لورقة الكانفس كاملة بالمم */
  canvasWidthMM: number;
  canvasHeightMM: number;
  /** دقة الطباعة المستهدفة (printDpi) */
  targetDpi: number;
  /** أصغر دقة تبرّر إعادة التصيير (افتراضي 250 — نفس عقد preflight) */
  minDpi?: number;
  /** أبعاد المصادر (من resolveFreeformImageDimensions) — الغياب يعني تخطي العنصر */
  imageDimensions?: ReadonlyMap<string, { width: number; height: number }>;
  /** رفع الأصل الجديد وإرجاع مسار /local-image/ — يُحقن من المستدعي (uploadPrintImage) */
  upload: (blob: Blob) => Promise<string>;
}

export interface StickerReRasterResult {
  /** استبدال المصادر: القديم → الجديد المرفوع */
  srcMap: Map<string, string>;
  /** أبعاد المصادر الجديدة مفتاحية بالمصدر القديم — لتغذية preflight بعد الترقية */
  newDimensions: Map<string, { width: number; height: number }>;
  /** ملاحظات تُعرض للمستخدم مع تحذيرات preflight */
  notes: string[];
}

/** مصدر ملصق قابل للمعالجة من عنصر صورة */
function stickerSourceOf(el: CanvasElement): StickerElementSource | null {
  if (el.type !== 'image' || el.visible === false || !el.imageSrc) return null;
  const source = (el as ImageElement).stickerSource;
  return source && source.templateId ? source : null;
}

/**
 * البكسلات اللازمة لتغطية مقاس مطبعي بـ targetDpi — نقي للاختبار.
 * يعيد null إذا تجاوز الطلب ميزانية الراستر (50MP).
 */
export function computeTargetRasterPx(
  widthMM: number,
  heightMM: number,
  dpi: number,
): { width: number; height: number } | null {
  if (!(widthMM > 0) || !(heightMM > 0) || !Number.isFinite(dpi) || dpi <= 0) return null;
  const width = mmToPx(widthMM, dpi);
  const height = mmToPx(heightMM, dpi);
  try {
    assertRasterBudget(width, height);
  } catch {
    return null;
  }
  return { width, height };
}

/**
 * إعادة راسترة كل ملصق انخفضت دقته الفعالة عن `minDpi` على مقاسه المطبوع.
 * العناصر المتشابهة (نفس المصدر) تُجمَّع على أكبر مقاس مطلوب فيُصيَّر مرة واحدة.
 */
export async function ensureStickerPrintResolution(
  elements: CanvasElement[],
  options: StickerReRasterOptions,
): Promise<StickerReRasterResult> {
  const srcMap = new Map<string, string>();
  const newDimensions = new Map<string, { width: number; height: number }>();
  const notes: string[] = [];
  const minDpi = options.minDpi ?? 250;

  if (
    !(options.canvasWidthMM > 0) ||
    !(options.canvasHeightMM > 0) ||
    !Number.isFinite(options.targetDpi) ||
    options.targetDpi <= 0
  ) {
    return { srcMap, newDimensions, notes };
  }

  // 1) جمع المقاس المطلوب لكل مصدر (أكبر استخدام على الكانفس)
  interface Needed {
    widthMM: number;
    heightMM: number;
    source: StickerElementSource;
  }
  const neededBySrc = new Map<string, Needed>();

  for (const el of elements) {
    const source = stickerSourceOf(el);
    if (!source) continue;
    const src = (el as ImageElement).imageSrc!;

    const widthMM = el.width * options.canvasWidthMM;
    const heightMM = el.height * options.canvasHeightMM;
    if (!(widthMM > 0) || !(heightMM > 0)) continue;

    const dims = options.imageDimensions?.get(src);
    if (!dims || !(dims.width > 0) || !(dims.height > 0)) continue;

    const dpiX = dims.width / (widthMM / MM_PER_INCH);
    const dpiY = dims.height / (heightMM / MM_PER_INCH);
    const effectiveDpi = Math.min(dpiX, dpiY);
    if (!Number.isFinite(effectiveDpi) || effectiveDpi >= minDpi) continue;

    const existing = neededBySrc.get(src);
    if (!existing || widthMM * heightMM > existing.widthMM * existing.heightMM) {
      neededBySrc.set(src, { widthMM, heightMM, source });
    }
  }

  if (neededBySrc.size === 0) {
    return { srcMap, newDimensions, notes };
  }

  // 2) إعادة التصيير والرفع — مصدر واحد مرة واحدة
  let upgraded = 0;
  for (const [oldSrc, need] of neededBySrc) {
    try {
      const svg = await resolveStickerSvg(need.source);
      if (!svg) {
        notes.push('ملصق بلا مصدر متجه قابل لإعادة التصيير — تُطبع دقته الحالية');
        continue;
      }

      const target = computeTargetRasterPx(need.widthMM, need.heightMM, options.targetDpi);
      if (!target) {
        notes.push('مقاس طباعة الملصق يتجاوز ميزانية الراستر — تُطبع دقته الحالية');
        continue;
      }

      const fontFamily = need.source.params?.fontFamily || 'Cairo';
      const blob = await renderSvgToPngBlob(svg, target.width, target.height, [fontFamily]);
      const newSrc = await options.upload(blob);

      srcMap.set(oldSrc, newSrc);
      newDimensions.set(oldSrc, target);
      upgraded++;
    } catch (err) {
      // فشل ترقية ملصق لا يُسقط الطباعة — يبقى على مصدره مع بقاء تحذير preflight
      logger.error('Sticker re-rasterization failed:', oldSrc, err);
    }
  }

  if (upgraded > 0) {
    notes.push(
      upgraded === 1
        ? 'أُعيدت راسترة ملصق واحد بدقة الطباعة الكاملة'
        : `أُعيدت راسترة ${upgraded} ملصقات بدقة الطباعة الكاملة`,
    );
  }

  return { srcMap, newDimensions, notes };
}

/** SVG الجاهز من الإدراج أولاً، وإلا إعادة التوليد من القالب والمعاملات المحفوظة */
async function resolveStickerSvg(source: StickerElementSource): Promise<string | null> {
  if (source.svg) return source.svg;
  const template = getStickerTemplateById(source.templateId);
  if (!template) return null;
  try {
    return buildStickerSvg(template, source.params);
  } catch (err) {
    logger.error('Sticker SVG rebuild failed:', source.templateId, err);
    return null;
  }
}
