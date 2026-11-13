/**
 * دمج الطبقات وتسطيحها — عمليتان تُنتجان طبقة واحدة من تحديد متعدد.
 *
 * الدمج المنطقي (اتحاد/طرح/تقاطع/استثناء) يعمل على الأشكال المتجهة فقط
 * ويُنتج عنصراً واحداً shape='path' يرسمه ويصدّره المحرّك القائم بلا أي
 * تغيير، فيبقى الشكل الناتج قابلاً للتحرير المتجهي والتصدير عالي الدقة.
 *
 * التسطيح يعمل على أي تحديد مختلط (صور/نصوص/أشكال) ويلتقطه من محرّك Konva
 * بدقة الورقة الكاملة، فيُنتج عنصر صورة واحد — وهو الطريق الوحيد لدمج ما لا
 * يمكن تمثيله متجهياً (نص بخطوطه، صورة بمرشّحاتها).
 *
 * حدود معلنة: حدود الأشكال (stroke) لا تُحوَّل إلى تعبئة قبل الدمج، فتُطبَّق
 * على المحيط الخارجي للنتيجة — وهي نفس النتيجة التي يتوقعها المستخدم من شكل واحد.
 */
import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { getElementVisualBox } from '@/lib/canvas/element-geometry';
import { captureStageBlob } from '@/lib/canvas/konva-export-utils';
import { mergePaths } from '@/lib/canvas/path-boolean';
import { shapeElementToSegments } from '@/lib/canvas/shape-to-path';
import { assertExportablePixels } from '@/lib/export/export-limits';
import { getDocumentSession } from '@/lib/io/document-session';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';

import { normalizeSelection } from './types';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice, MergeResult, RasterizeResult } from './types';
import type { CanvasElement, ImageElement, ShapeElement } from '../../types';
import type { BooleanOp } from '@/lib/canvas/path-boolean';
import type { CubicSeg } from '@/lib/canvas/path-geometry';
import type Konva from 'konva';
import type { StateCreator } from 'zustand';

const logger = createLogger('element-merge');

/**
 * يرفع ناتج التسطيح إلى مسار الوسائط المحلي ليُخزَّن في العنصر وlastEditedImage
 * رابطاً مستقراً بدل Data URL ضخم يتكرر في كل لقطة تاريخ لاحقة — والارتداد إلى
 * Data URL عند تعذر الرفع (خادم الوسائط والاحتياطي معاً) كما يفعل مسار إدراج
 * الملصقات، فلا يضيع عمل المستخدم.
 */
async function uploadRasterBlob(blob: Blob): Promise<string> {
  try {
    const uploaded = await uploadMediaBlob(blob, 'rasterized-selection.png');
    return uploaded.imageSrc;
  } catch (err) {
    logger.warn('Media upload failed for rasterized layer — falling back to data URL', err);
    return blobToDataUrl(blob);
  }
}

/** حارس طزاجة التسطيح بعد انتهاء العمليات غير المتزامنة لمنع تلويث مستند أو حالة أحدث */
function isRasterizeStale(
  state: ElementCross,
  initialSession: number,
  initialProjectId: string | null,
  expectedWidth: number,
  expectedHeight: number,
  sourceRefs: ReadonlyMap<string, CanvasElement>,
): boolean {
  if (getDocumentSession() !== initialSession) return true;
  const currentProjectId = (state as { projectId?: string | null }).projectId ?? null;
  if (currentProjectId !== initialProjectId) return true;
  if (state.mode !== 'single') return true;
  if (state.canvasWidth !== expectedWidth || state.canvasHeight !== expectedHeight) return true;

  let survivingCount = 0;
  for (const el of state.elements) {
    if (!sourceRefs.has(el.id)) continue;
    // الستور immutable: تغير مرجع مصدر واحد يكشف المحتوى والهندسة والرؤية والترتيب،
    // بينما تعديلات العناصر غير المشاركة لا تُبطل نتيجة التحديد.
    if (el !== sourceRefs.get(el.id) || el.locked) return true;
    survivingCount += 1;
  }
  return survivingCount !== sourceRefs.size;
}

/** خصائص الطلاء والمؤثرات التي تنتقل من الطبقة الأمامية إلى الشكل المدموج */
function inheritPaint(front: ShapeElement): Partial<ShapeElement> {
  return {
    fill: front.fill,
    stroke: front.stroke,
    strokeWidth: front.strokeWidth ?? 0,
    strokeStyle: front.strokeStyle,
    lineCap: front.lineCap,
    fillType: front.fillType,
    fillLinearGradientStartPoint: front.fillLinearGradientStartPoint,
    fillLinearGradientEndPoint: front.fillLinearGradientEndPoint,
    fillLinearGradientColorStops: front.fillLinearGradientColorStops,
    fillRadialGradientStartPoint: front.fillRadialGradientStartPoint,
    fillRadialGradientStartRadius: front.fillRadialGradientStartRadius,
    fillRadialGradientEndPoint: front.fillRadialGradientEndPoint,
    fillRadialGradientEndRadius: front.fillRadialGradientEndRadius,
    fillRadialGradientColorStops: front.fillRadialGradientColorStops,
    fillImageSrc: front.fillImageSrc,
    fillImageFit: front.fillImageFit,
    fillImageScale: front.fillImageScale,
    fillImageRotation: front.fillImageRotation,
    fillImageOffsetX: front.fillImageOffsetX,
    fillImageOffsetY: front.fillImageOffsetY,
    shadowColor: front.shadowColor,
    shadowBlur: front.shadowBlur,
    shadowOffsetX: front.shadowOffsetX,
    shadowOffsetY: front.shadowOffsetY,
    shadowOpacity: front.shadowOpacity,
    globalCompositeOperation: front.globalCompositeOperation,
    name: front.name,
  };
}

/**
 * يجمع مصادر الدمج بترتيب zIndex تصاعدي — الأخير هو الطبقة الأمامية التي
 * تعمل قاطعاً في عملية الطرح. الطبقات المخفية تُستبعد كما في كل أدوات الدمج.
 */
function collectSources(elements: CanvasElement[], selectedIds: string[]): CanvasElement[] {
  const wanted = new Set(selectedIds);
  return elements
    .filter((el) => wanted.has(el.id) && el.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);
}

export const createElementMergeSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<ElementSlice, 'mergeSelectedShapes' | 'rasterizeSelected'>
> = (set, get) => ({
  mergeSelectedShapes: (op: BooleanOp): MergeResult => {
    const { selectedIds, elements, canvasWidth, canvasHeight } = get();
    if (selectedIds.length < 2) return 'need-two-shapes';

    const sources = collectSources(elements, selectedIds);
    if (sources.length < 2) return 'need-two-shapes';
    if (sources.some((el) => el.locked)) return 'locked';
    if (sources.some((el) => el.type !== 'shape')) return 'unsupported';

    const inputs: CubicSeg[][] = [];
    for (const el of sources) {
      const segs = shapeElementToSegments(el as ShapeElement, canvasWidth, canvasHeight);
      if (!segs || segs.length === 0) return 'unsupported';
      inputs.push(segs);
    }

    let geometry;
    try {
      geometry = mergePaths(inputs, op);
    } catch (err) {
      logger.error('Boolean merge failed', err);
      return 'failed';
    }
    if (!geometry) return 'empty-result';

    const front = sources[sources.length - 1] as ShapeElement;
    const merged: ShapeElement = {
      ...inheritPaint(front),
      id: uid(),
      type: 'shape',
      shape: 'path',
      svgPath: geometry.svgPath,
      // المسار مخزَّن منسَّباً إلى أصل صندوقه فيكفي وضع الصندوق على الورقة
      x: geometry.minX / canvasWidth,
      y: geometry.minY / canvasHeight,
      width: geometry.w / canvasWidth,
      height: geometry.h / canvasHeight,
      rotation: 0,
      opacity: front.opacity ?? 1,
      zIndex: front.zIndex,
      visible: true,
      locked: false,
    } as ShapeElement;

    const sourceIds = new Set(sources.map((el) => el.id));
    set((s) => ({
      elements: [...s.elements.filter((el: CanvasElement) => !sourceIds.has(el.id)), merged],
      ...normalizeSelection(merged.id),
    }));
    get().pushHistory();
    return 'ok';
  },

  rasterizeSelected: async (stage: Konva.Stage | null): Promise<RasterizeResult> => {
    const { selectedIds, elements, canvasWidth, canvasHeight, mode } = get();
    // العناصر تُرسم في طبقة الوضع الحر وحدها — لا وجود لها على كانفاس الكولاج
    if (mode !== 'single') return 'wrong-mode';
    if (!stage) return 'no-stage';

    const sources = collectSources(elements, selectedIds);
    if (sources.length === 0) return 'empty';
    if (sources.some((el) => el.locked)) return 'locked';

    // صندوق التحديد ببكسلات الورقة (مع مراعاة الدوران) مقصوصاً إلى حدود الورقة
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of sources) {
      const box = getElementVisualBox(el, canvasWidth, canvasHeight);
      minX = Math.min(minX, box.x * canvasWidth);
      minY = Math.min(minY, box.y * canvasHeight);
      maxX = Math.max(maxX, (box.x + box.width) * canvasWidth);
      maxY = Math.max(maxY, (box.y + box.height) * canvasHeight);
    }
    const rect = {
      x: Math.max(0, Math.floor(minX)),
      y: Math.max(0, Math.floor(minY)),
      width: 0,
      height: 0,
    };
    rect.width = Math.min(canvasWidth, Math.ceil(maxX)) - rect.x;
    rect.height = Math.min(canvasHeight, Math.ceil(maxY)) - rect.y;
    if (rect.width <= 0 || rect.height <= 0) return 'empty';

    try {
      assertExportablePixels(rect.width, rect.height);
    } catch (err) {
      logger.warn('Rasterize area too large', err);
      return 'too-large';
    }

    const initialSession = getDocumentSession();
    const initialProjectId = (get() as { projectId?: string | null }).projectId ?? null;
    const sourceRefs = new Map(sources.map((el) => [el.id, el]));
    const keepIds = new Set(sourceRefs.keys());

    let imageSrc: string;
    try {
      // نسبة 1 = بكسلات الورقة المنطقية، فهي الدقة الكاملة المستقلة عن الزوم؛
      // إخفاء العقد غير المحددة واستعادة حالتها المرئية الأصلية يتم ذرياً داخل قفل المسرح
      const blob = await captureStageBlob(stage, 1, 'image/png', undefined, rect, {
        useFullResolution: true,
        includeNodeIds: keepIds,
      });
      if (!blob) return 'failed';
      if (
        isRasterizeStale(
          get(),
          initialSession,
          initialProjectId,
          canvasWidth,
          canvasHeight,
          sourceRefs,
        )
      ) {
        return 'failed';
      }
      imageSrc = await uploadRasterBlob(blob);
    } catch (err) {
      logger.error('Rasterize capture failed', err);
      return 'failed';
    }

    const latestState = get();
    if (
      isRasterizeStale(
        latestState,
        initialSession,
        initialProjectId,
        canvasWidth,
        canvasHeight,
        sourceRefs,
      )
    ) {
      return 'failed';
    }

    const front = sources[sources.length - 1];
    const flat: ImageElement = {
      id: uid(),
      type: 'image',
      x: rect.x / canvasWidth,
      y: rect.y / canvasHeight,
      width: rect.width / canvasWidth,
      height: rect.height / canvasHeight,
      rotation: 0,
      // الشفافية والظلال والمرشّحات خُبزت في البكسلات — إبقاء الشفافية الأصلية
      // كان يضاعفها
      opacity: 1,
      zIndex: front.zIndex,
      visible: true,
      locked: false,
      imageSrc,
      filter: 'none',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      name: front.name,
    } as ImageElement;

    set((s) => ({
      elements: [...s.elements.filter((el: CanvasElement) => !keepIds.has(el.id)), flat],
      ...normalizeSelection(flat.id),
      lastEditedImage: imageSrc,
      lastEditedImageAspect: rect.width / rect.height,
    }));
    get().pushHistory();
    return 'ok';
  },
});
