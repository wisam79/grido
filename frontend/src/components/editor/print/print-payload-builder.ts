/**
 * print-payload-builder.ts — تجميع عناصر ورقة الطباعة وخطوط القص
 *
 * مسؤولية أحادية: تحويل بيانات تخطيط الكولاج أو الوضع الحر إلى عناصر domain.PrintItem[]
 * وخطوط domain.CutLine[] جاهزة للإرسال إلى Go backend.
 * مستخرج من use-print-export.ts ضمن خطة الإصلاح المعماري.
 */

import * as domain from '@bindings/grido/internal/core/domain';

import { previewWhite } from '@/lib/canvas/canvas-colors';
import { isBakedCollageLayout } from '@/lib/canvas/collage-geometry';
import { hasCollageSlotContent } from '@/lib/canvas/collage-slot-content';
import { paperCaptureRect } from '@/lib/canvas/fit';
import { resolveImageDimensions } from '@/lib/canvas/image-dimensions';
import { captureStageBlob, swapNodeImagesForCapture } from '@/lib/canvas/konva-export-utils';
import { assertExportablePixels } from '@/lib/export/export-limits';
import { computeSlotCrop } from '@/lib/export/export-primitives';
import { ensureElementsFontsLoaded } from '@/lib/io/fonts';
import { calculatePrintCutLines } from '@/lib/print/cut-lines-utils';
import { computeBlockPosition, computeCollageSlotRectMM } from '@/lib/print/print-layout-math';
import { buildSingleComposition } from '@/lib/print/single-print-composition';

import { uploadPrintImage } from './print-transport';

import type { usePrintLayout } from '@/hooks/use-print-layout';
import type {
  CanvasSlot,
  CanvasElement,
  ImageElement,
  CollageTemplate,
  PrintSettings,
} from '@/lib/store/types';
import type Konva from 'konva';

/**
 * مهلة قراءة أبعاد صورة الخانة لأجل نافذة القصّة — بعدها يُسقط إلى اشتقاق Go.
 * العقد الذهبي لهذا المسار (144.1/0/512/480 لدخل 800×600 بروت 90 زوم 1.25)
 * مُقفل في print-payload-builder.test.ts ويُتحقق سحابياً بحزمة Frontend كاملة.
 */
const CROP_DIMS_TIMEOUT_MS = 2_000;

export interface BuiltItems {
  items: domain.PrintItem[];
  cutLines: domain.CutLine[];
  composition?: domain.CanvasComposition;
}

export interface CollagePayloadContext {
  layout: ReturnType<typeof usePrintLayout>;
  slots: CanvasSlot[];
  canvasWidth: number;
  canvasHeight: number;
  collageTemplate: CollageTemplate | null | undefined;
  collageMargin: number;
  collageGap: number;
  collageRadius: number;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean | undefined;
  cutLineStyle?: PrintSettings['cutLineStyle'];
}

export async function buildCollagePayload(ctx: CollagePayloadContext): Promise<BuiltItems> {
  const {
    layout,
    slots,
    canvasWidth,
    canvasHeight,
    collageTemplate,
    collageMargin,
    collageGap,
    collageRadius,
    collageStrokeWidth,
    collageStrokeColor,
    collageShowCutLines,
    collageShowEndCutLine,
    cutLineStyle,
  } = ctx;

  const { imageWidthMM, imageHeightMM, gapMM, actualCopies, paperWidth, paperHeight, grid } =
    layout;

  const items: domain.PrintItem[] = [];
  const hasPhysical = isBakedCollageLayout(collageTemplate);
  const scaleXPxToMM = imageWidthMM / canvasWidth;
  const slotGeometry = {
    canvasWidth,
    canvasHeight,
    imageWidthMM,
    imageHeightMM,
    collageMargin,
    collageGap,
    hasPhysical,
  };

  const rawCutLines = collageShowCutLines
    ? calculatePrintCutLines({
        mode: 'collage',
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        // نمط cropmarks يرسم أذرع زوايا فقط، والخط الختامي الممتد على عرض الورقة
        // يوسّع صندوق الإحاطة في Go إلى حدود الورقة — يُحجب عن الحمولة كي
        // تنطبق الزوايا على حدود الشبكة كما في المعاينة.
        showEndCutLine: collageShowEndCutLine !== false && cutLineStyle !== 'cropmarks',
        slots,
        collageMargin,
        collageGap,
        canvasWidth,
        canvasHeight,
        hasPhysical,
        grid,
      })
    : [];

  const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
    x1: l.x1,
    y1: l.y1,
    x2: l.x2,
    y2: l.y2,
  }));

  const slotTemplates = slots.filter((slot) =>
    hasCollageSlotContent(slot, collageStrokeWidth, collageStrokeColor),
  );
  const firstBlock = computeBlockPosition(0, grid);
  const stepXMM = actualCopies > 1 ? grid.cellWidth : 0;
  const stepYMM = actualCopies > 1 ? grid.cellHeight : 0;

  for (const slot of slotTemplates) {
    const rect = computeCollageSlotRectMM(slot, slotGeometry, firstBlock);
    // نسبة الخانة المطبوعة بعد الهامش والفجوة — نسبة الإحداثيات الطبيعية
    // وحدها تتجاهل ما يقتطعه الهامش/الفجوة فتخطئ خانات Go في اقتصاص cover
    // (مثال: خانة 400×900 بكسل داخل ورقة بهامش تُطبع بنسبة 4:9 لا 0.44).
    const slotAspect = rect.hMM > 0 ? rect.wMM / rect.hMM : 0;

    // 🧮 «احسب مرة واحدة، مرّر البيانات»: نافذة القصّة النهائية تُحسب هنا
    // (بنفس مسار preflight والتصدير اليدوي) وتُمرَّر لـGo جاهزة — Go يفضّل
    // الحقول المرسلة حين cropW/cropH > 0 ويُلغي فئة إعادة الاشتقاق المزدوجة
    // بين TS وGo. عند تعذر قراءة الأبعاد تبقى الأصفار = فرع الاشتقاق القديم
    // (تدهور آمن مطابق للسلوك السابق).
    let cropWindow: { cropX: number; cropY: number; cropW: number; cropH: number } | null = null;
    if (slot.imageSrc) {
      // 🛡️ مهلة قصيرة: مصدر صامت (يتلف ولا يطلق onload/onerror) لا يجوز أن
      // يعلّق مسار الطباعة كلها — انتهاء المهلة يعيد null فيسقط الاشتقاق
      // إلى فرع Go القديم (تدهور آمن مطابق للسلوك السابق)
      const dims = await Promise.race([
        resolveImageDimensions(slot.imageSrc),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), CROP_DIMS_TIMEOUT_MS)),
      ]);
      if (dims && dims.width > 0 && dims.height > 0) {
        const crop = computeSlotCrop(dims, rect.wMM, rect.hMM, {
          zoom: slot.zoom,
          dragX: slot.dragX,
          dragY: slot.dragY,
          flipX: slot.flipX,
          flipY: slot.flipY,
          rotation: slot.rotation,
        });
        cropWindow = { cropX: crop.sx, cropY: crop.sy, cropW: crop.sw, cropH: crop.sh };
      }
    }

    items.push(
      domain.PrintItem.createFrom({
        imageSrc: slot.imageSrc || '',
        x: rect.xMM,
        y: rect.yMM,
        w: rect.wMM,
        h: rect.hMM,
        filter: slot.filter || 'none',
        brightness: slot.brightness ?? 100,
        contrast: slot.contrast ?? 100,
        saturation: slot.saturation ?? 100,
        slotAspect,
        ...(cropWindow ?? {}),
        zoom: slot.zoom || 1,
        dragX: slot.dragX || 0,
        dragY: slot.dragY || 0,
        cornerRadiusMM: collageRadius * scaleXPxToMM,
        borderWidthMM: collageStrokeWidth * scaleXPxToMM,
        borderColor: collageStrokeColor,
        bgColor: slot.bgColor || '',
        flipX: slot.flipX,
        flipY: slot.flipY,
        rotation: slot.rotation,
        copies: actualCopies,
        copyCols: grid.safeCols,
        copyStepX: stepXMM,
        copyStepY: stepYMM,
      }),
    );
  }

  return { items, cutLines, composition: undefined };
}

export interface SinglePayloadContext {
  stage: Konva.Stage | null;
  layout: ReturnType<typeof usePrintLayout>;
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundGradientColor2?: string | null;
  printDpi: number;
  printShowCutLines: boolean;
  printShowEndCutLine: boolean | undefined;
  printCutLineStyle: PrintSettings['cutLineStyle'];
  /** استبدال مصادر الملصقات المُرقّاة بدقة الطباعة (من ensureStickerPrintResolution) */
  stickerSrcMap?: ReadonlyMap<string, string>;
}

export async function buildSinglePayload(ctx: SinglePayloadContext): Promise<BuiltItems | null> {
  const {
    stage,
    layout,
    elements,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundGradientColor2,
    printDpi,
    printShowCutLines,
    printShowEndCutLine,
    printCutLineStyle,
    stickerSrcMap,
  } = ctx;

  if (!stage) return null;

  const { imageWidthMM, imageHeightMM, gapMM, actualCopies, paperWidth, paperHeight, grid } =
    layout;

  const items: domain.PrintItem[] = [];
  const exportDpi = printDpi || 300;
  const printPixelW = Math.round((imageWidthMM / 25.4) * exportDpi);
  const printPixelH = Math.round((imageHeightMM / 25.4) * exportDpi);

  assertExportablePixels(printPixelW, printPixelH);

  const singleCompRes = buildSingleComposition({
    elements,
    canvasWidth,
    canvasHeight,
    canvasWidthMM: imageWidthMM,
    canvasHeightMM: imageHeightMM,
    backgroundColor: backgroundColor || previewWhite(),
    backgroundGradientColor2: backgroundGradientColor2 ?? null,
  });

  const isSimpleRaster = singleCompRes.eligible && !!singleCompRes.composition;
  const comp = singleCompRes.composition;
  let singleImageSrc = '';

  if (!isSimpleRaster) {
    await ensureElementsFontsLoaded(elements);
    // 🛡️ M15: التقاط منطقة الورقة بإحداثياتها المنطقية يجعل عرض المخرج
    // `printPixelW` بغضّ النظر عن مستوى التكبير على الشاشة. كان `stage.width()`
    // هو مقاس العرض المرئي فيتغير حجم الطباعة بمجرد تكبير المستخدم.
    const captureRect = paperCaptureRect(canvasWidth, canvasHeight);
    const targetPixelRatio = canvasWidth > 0 ? printPixelW / canvasWidth : 1;
    // 🖨️ ترقية دقة الملصقات في مسار الالتقاط أيضاً: كانت إعادة الراسترة
    // مسارَ التركيب السريع حصراً، وأغلب كانفسات الوضع الحر الواقعية غير
    // مؤهلة له (نص/دوران/ظل/خلفية متدرجة) فتُطبع الملصقات المكبّرة من
    // راستر إدراجها الصغير. استبدال صور العقد مؤقتاً بالمصادر المُرقّاة —
    // الند التلو لعذر upgradeImagesToFullResolution — مع استعادة فورية.
    const nodeOverrides =
      stickerSrcMap && stickerSrcMap.size > 0
        ? elements
            .filter(
              (el): el is ImageElement =>
                el.type === 'image' && !!el.imageSrc && stickerSrcMap.has(el.imageSrc),
            )
            .map((el) => ({ nodeId: el.id, src: stickerSrcMap.get(el.imageSrc)! }))
        : [];
    const restoreStickerNodes = await swapNodeImagesForCapture(stage, nodeOverrides);
    let capturedBlob: Blob | null = null;
    try {
      capturedBlob = await captureStageBlob(
        stage,
        targetPixelRatio,
        'image/png',
        undefined,
        captureRect,
        { useFullResolution: true },
      );
    } finally {
      restoreStickerNodes();
    }
    if (!capturedBlob) {
      throw new Error('stage capture returned no blob');
    }
    singleImageSrc = await uploadPrintImage(capturedBlob);
  }

  const rawCutLines = printShowCutLines
    ? calculatePrintCutLines({
        mode: 'single',
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        // كما في الكولاج: الخط الختامي الممتد يفسد صندوق cropmarks في Go
        showEndCutLine: printShowEndCutLine !== false && printCutLineStyle !== 'cropmarks',
        cutLineStyle: printCutLineStyle ?? 'dashed',
        grid,
      })
    : [];

  const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
    x1: l.x1,
    y1: l.y1,
    x2: l.x2,
    y2: l.y2,
  }));

  // 🖨️ RV-16-M3: توسيع النسخ على جانب Go (نفس آلية الكولاج — domain.PrintItem.copies)
  // بدل تكرار العناصر عبر IPC: 48 نسخة × 21 عنصراً كانت تتجاوز حد التحقق 1000 عنصر
  // وتُرفض الورقة، والحمولة كانت تتضخم ×48 بلا حاجة.
  const firstBlock = computeBlockPosition(0, grid);
  const stepXMM = actualCopies > 1 ? grid.cellWidth : 0;
  const stepYMM = actualCopies > 1 ? grid.cellHeight : 0;

  if (isSimpleRaster && comp) {
    const itemWidthMM = imageWidthMM;
    const itemHeightMM = imageHeightMM;
    const scaleX = itemWidthMM / comp.canvasWidthPx;
    const scaleY = itemHeightMM / comp.canvasHeightPx;

    for (const compItem of comp.items) {
      items.push(
        domain.PrintItem.createFrom({
          // 🖨️ ترقية دقة الملصقات: المصدر المُرقّى (أصل طباعة مؤقت بـ DPI الورقة)
          // يحل محل راستر الإدراج المنخفض — إن وُجد في خريطة الاستبدال
          imageSrc: stickerSrcMap?.get(compItem.imageSrc) ?? compItem.imageSrc,
          x: firstBlock.xMM + compItem.x * scaleX,
          y: firstBlock.yMM + compItem.y * scaleY,
          w: compItem.w * scaleX,
          h: compItem.h * scaleY,
          filter: compItem.filter,
          brightness: compItem.brightness,
          contrast: compItem.contrast,
          saturation: compItem.saturation,
          // 🖨️ RV-16-H2: عناصر الوضع الحر تُمدَّد (stretch) داخل مستطيلها في Konva
          // (image-node.tsx يضبط width/height مباشرة). إرسال slotAspect كان يفعّل
          // قصاً تغاطياً (cover) في computeCropFromSlot فتُطبع منتصف الصورة بدل
          // تمديدها كاملاً كلما تبدّلت نسبة المستطيل عن نسبة المصدر. الصفر = بلا
          // قصّ ⇒ تمديد كامل مطابق للمحرر.
          slotAspect: 0,
          zoom: 1,
          dragX: 0,
          dragY: 0,
          cornerRadiusMM: (compItem.cornerRadius / comp.canvasWidthPx) * itemWidthMM,
          borderWidthMM: 0,
          borderColor: '#000000',
          bgColor: compItem.bgColor || '',
          flipX: compItem.flipX,
          flipY: compItem.flipY,
          rotation: compItem.rotation,
          copies: actualCopies,
          copyCols: grid.safeCols,
          copyStepX: stepXMM,
          copyStepY: stepYMM,
        }),
      );
    }
  } else {
    items.push(
      domain.PrintItem.createFrom({
        imageSrc: singleImageSrc,
        x: firstBlock.xMM,
        y: firstBlock.yMM,
        w: imageWidthMM,
        h: imageHeightMM,
        filter: 'none',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        zoom: 1,
        dragX: 0,
        dragY: 0,
        copies: actualCopies,
        copyCols: grid.safeCols,
        copyStepX: stepXMM,
        copyStepY: stepYMM,
      }),
    );
  }

  return { items, cutLines, composition: undefined };
}
