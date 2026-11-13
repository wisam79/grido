import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SetTaskbarProgress } from '@bindings/grido/app';
import * as domain from '@bindings/grido/internal/core/domain';
import {
  ExportPrintSheet,
  PrintDirect,
  PollJobStatus,
  ResolvePrinterPlan,
  CancelPrintJob,
  CancelSpoolJob,
} from '@bindings/grido/internal/handlers/printhandler';

import { ensureStickerPrintResolution } from '@/features/stickers/lib/print-rerasterize';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { isBakedCollageLayout } from '@/lib/canvas/collage-geometry';
import { useStageRef } from '@/lib/canvas/stage-context';
import { useEditorStore } from '@/lib/editor-store';
import {
  getLoadedImageDimensions,
  loadCollageSlotImages,
  runCollagePreflight,
} from '@/lib/export/collage-preflight-helpers';
import { CanvasTooLargeError } from '@/lib/export/export-limits';
import {
  resolveFreeformImageDimensions,
  runFreeformPreflight,
} from '@/lib/export/freeform-preflight';
import { createLogger } from '@/lib/logger';
import { computeBlockPosition, computeCollageSlotRectMM } from '@/lib/print/print-layout-math';
import { buildSingleComposition } from '@/lib/print/single-print-composition';

import { extractPrintImageSrc, generatePrintPageStyle } from './print-page-style';
import { buildCollagePayload, buildSinglePayload, type BuiltItems } from './print-payload-builder';
import {
  describeError,
  withTimeout,
  EXPORT_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
  uploadPrintImage,
} from './print-transport';

import type { usePrintLayout } from '@/hooks/use-print-layout';
import type { PrintSettings } from '@/lib/store/types';

export interface PrintExecuteOptions {
  directPrint?: boolean;
  printerName?: string;
  formName?: string;
  paperId?: number;
  borderless?: boolean;
}

// Re-export helpers for backward compatibility with existing unit tests
export {
  extractPrintImageSrc,
  generatePrintPageStyle,
  describeError,
  withTimeout,
  UPLOAD_TIMEOUT_MS,
  EXPORT_TIMEOUT_MS,
};

const logger = createLogger('use-print-export');

const SPOOL_POLL_INTERVAL_MS = 1_500;
const SPOOL_POLL_TIMEOUT_MS = 2 * 60_000;
const PLAN_TIMEOUT_MS = 30_000;

function createClientPrintJobId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `print-${uuid}`;
  const bytes = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  const entropy = Array.from(bytes, (value) => value.toString(36)).join('-');
  return `print-${Date.now().toString(36)}-${entropy || 'client'}`;
}

function isVisiblePrintBackground(color: string | null | undefined): color is string {
  return Boolean(color && color.trim() && color.trim().toLowerCase() !== 'transparent');
}

function spoolFailureDetail(result: domain.DirectPrintResult): string {
  return result.error || result.status || result.code || 'فشلت مهمة الطباعة دون تفاصيل';
}

function buildPrintBackgroundBlocks(input: {
  layout: ReturnType<typeof usePrintLayout>;
  mode: 'single' | 'collage';
  elements: PrintExportContext['elements'];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundGradientColor2?: string | null;
  backgroundGradientAngle?: number;
  imageDimensions?: ReadonlyMap<string, { width: number; height: number }>;
}): domain.PrintBackgroundBlock[] {
  const {
    layout,
    mode,
    elements,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundGradientColor2,
    backgroundGradientAngle,
    imageDimensions,
  } = input;
  if (!isVisiblePrintBackground(backgroundColor)) return [];

  // A captured single-mode blob already contains the Stage background. Only the
  // fast item composition needs a separate local block under each design copy.
  if (mode === 'single') {
    const composition = buildSingleComposition({
      elements,
      canvasWidth,
      canvasHeight,
      canvasWidthMM: layout.imageWidthMM,
      canvasHeightMM: layout.imageHeightMM,
      backgroundColor,
      backgroundGradientColor2,
    });
    if (
      !composition.eligible ||
      !(composition.composition?.items ?? []).every((item) => imageDimensions?.has(item.imageSrc))
    ) {
      return [];
    }
  }

  return Array.from({ length: Math.max(0, layout.actualCopies) }, (_, index) => {
    const block = computeBlockPosition(index, layout.grid);
    return domain.PrintBackgroundBlock.createFrom({
      x: block.xMM,
      y: block.yMM,
      w: layout.imageWidthMM,
      h: layout.imageHeightMM,
      color: backgroundColor,
      ...(isVisiblePrintBackground(backgroundGradientColor2)
        ? { color2: backgroundGradientColor2, angle: backgroundGradientAngle ?? 135 }
        : {}),
    });
  });
}

export interface PrintExportContext {
  layout: ReturnType<typeof usePrintLayout>;
  mode: 'single' | 'collage';
  elements: ReturnType<typeof useEditorStore.getState>['elements'];
  slots: ReturnType<typeof useEditorStore.getState>['slots'];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  collageTemplate: ReturnType<typeof useEditorStore.getState>['collageTemplate'];
  collageMargin: number;
  collageGap: number;
  collageRadius: number;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean;
  printDpi: number;
  printShowCutLines: boolean;
  printShowEndCutLine: boolean | undefined;
  printCutLineStyle: PrintSettings['cutLineStyle'];
  printOrientation: PrintSettings['orientation'];
  printColorSpace?: PrintSettings['colorSpace'];
  printOutputFormat?: PrintSettings['outputFormat'];
}

export function usePrintExport({
  layout,
  mode,
  elements,
  slots,
  canvasWidth,
  canvasHeight,
  backgroundColor,
  collageTemplate,
  collageMargin,
  collageGap,
  collageRadius,
  collageStrokeWidth,
  collageStrokeColor,
  collageShowCutLines,
  collageShowEndCutLine,
  printDpi,
  printShowCutLines,
  printShowEndCutLine,
  printCutLineStyle,
  printOrientation,
  printColorSpace,
  printOutputFormat,
}: PrintExportContext) {
  const stageRef = useStageRef();
  const backgroundGradientColor2 = useEditorStore((state) => state.backgroundGradientColor2);
  const backgroundGradientAngle = useEditorStore((state) => state.backgroundGradientAngle);
  const [isExporting, setIsExportingState] = useState(false);
  const isExportingRef = useRef(false);
  const attemptRef = useRef(0);
  const generationJobIdRef = useRef<string | null>(null);
  const spoolJobRef = useRef<{ printerName: string; jobId: number; attempt: number } | null>(null);
  const pollingResolversRef = useRef<Set<() => void>>(new Set());
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const attempts = attemptRef;
    const pollingResolvers = pollingResolversRef.current;
    return () => {
      mountedRef.current = false;
      attempts.current += 1;
      isExportingRef.current = false;
      generationJobIdRef.current = null;
      spoolJobRef.current = null;
      pollingResolvers.forEach((resolve) => resolve());
      pollingResolvers.clear();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const stopPollingWaiters = useCallback(() => {
    pollingResolversRef.current.forEach((resolve) => resolve());
    pollingResolversRef.current.clear();
  }, []);

  const clearScheduledTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const setExporting = useCallback((v: boolean) => {
    isExportingRef.current = v;
    setIsExportingState(v);
  }, []);

  const cancelExport = useCallback(() => {
    const generationJobId = generationJobIdRef.current;
    const spoolJob = spoolJobRef.current;
    generationJobIdRef.current = null;
    spoolJobRef.current = null;
    attemptRef.current++;
    clearScheduledTimers();
    stopPollingWaiters();
    setExporting(false);

    if (generationJobId && typeof CancelPrintJob === 'function') {
      CancelPrintJob(generationJobId).catch(() => {});
    }
    if (spoolJob && typeof CancelSpoolJob === 'function') {
      CancelSpoolJob(spoolJob.printerName, spoolJob.jobId).catch((err) => {
        logger.warn('Failed to cancel spool job:', err);
      });
    }
    SetTaskbarProgress(0, 'none').catch(() => {});
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.pointerEvents = '';
    }
  }, [clearScheduledTimers, setExporting, stopPollingWaiters]);

  const pollSpoolJob = useCallback(
    async (input: {
      attempt: number;
      printerName: string;
      jobId: number;
      onDone: () => void;
    }): Promise<void> => {
      const { attempt, printerName, jobId, onDone } = input;
      const startedAt = Date.now();

      await new Promise<void>((resolve) => {
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          pollingResolversRef.current.delete(settle);
          resolve();
        };
        pollingResolversRef.current.add(settle);

        const finish = (kind: 'success' | 'failure' | 'timeout', detail?: string) => {
          if (spoolJobRef.current?.attempt === attempt) spoolJobRef.current = null;
          if (attempt !== attemptRef.current || !mountedRef.current) {
            settle();
            return;
          }
          SetTaskbarProgress(0, 'none').catch(() => {});
          if (kind === 'success') {
            toast.success(`اكتملت طباعة المهمة #${jobId} بنجاح`);
            setExporting(false);
            onDone();
          } else if (kind === 'failure') {
            toast.error(`تعذرت مهمة الطباعة #${jobId}: ${detail || 'خطأ غير معروف'}`);
            setExporting(false);
          } else {
            toast.warning(
              `لم تصل حالة نهائية للمهمة #${jobId} خلال دقيقتين — تحقّق من طابور الطباعة قبل إعادة المحاولة.`,
            );
            setExporting(false);
          }
          settle();
        };

        const scheduleNext = () => {
          const elapsed = Date.now() - startedAt;
          const remaining = SPOOL_POLL_TIMEOUT_MS - elapsed;
          if (remaining <= 0) {
            finish('timeout');
            return;
          }
          later(() => void poll(), Math.min(SPOOL_POLL_INTERVAL_MS, remaining));
        };

        const poll = async () => {
          if (
            attempt !== attemptRef.current ||
            !mountedRef.current ||
            spoolJobRef.current?.attempt !== attempt
          ) {
            settle();
            return;
          }
          if (Date.now() - startedAt >= SPOOL_POLL_TIMEOUT_MS) {
            finish('timeout');
            return;
          }

          try {
            const result = await PollJobStatus(printerName, jobId);
            if (
              attempt !== attemptRef.current ||
              !mountedRef.current ||
              spoolJobRef.current?.attempt !== attempt
            ) {
              settle();
              return;
            }
            if (!result.success) {
              finish('failure', spoolFailureDetail(result));
              return;
            }
            if (result.terminal) {
              finish('success');
              return;
            }
          } catch (err) {
            logger.debug('PollJobStatus error while monitoring:', err);
          }
          scheduleNext();
        };

        scheduleNext();
      });
    },
    [later, setExporting],
  );

  const printInvocationRef = useRef<{
    effectiveMarginMM: number;
    onDone: () => void;
    options?: PrintExecuteOptions;
  } | null>(null);

  const setPrintInvocation = useCallback(
    (inv: { effectiveMarginMM: number; onDone: () => void; options?: PrintExecuteOptions }) => {
      printInvocationRef.current = inv;
    },
    [],
  );

  const handlePrintRef = useRef<() => void>(() => {});

  const { paperWidth, paperHeight } = layout;

  const buildItems = useCallback(async (): Promise<BuiltItems> => {
    return buildCollagePayload({
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
      cutLineStyle: printCutLineStyle,
    });
  }, [
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
    printCutLineStyle,
  ]);

  const buildSingleItems = useCallback(
    async (
      attempt: number,
      stickerSrcMap?: ReadonlyMap<string, string>,
      imageDimensions?: ReadonlyMap<string, { width: number; height: number }>,
    ): Promise<BuiltItems | null> => {
      const stage = stageRef.current;
      if (!stage) {
        toast.error('تعذر الوصول إلى محتوى الكانفاس');
        return null;
      }

      try {
        return await buildSinglePayload({
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
          imageDimensions,
          stickerSrcMap,
        });
      } catch (e) {
        if (attempt !== attemptRef.current) return null;
        if (e instanceof CanvasTooLargeError) {
          // أرقام البكسل والميجابكسل من الحقول المحمولة في الخطأ نفسه (لا نعيد حسابها هنا)
          const megapixels = (e.pixelCount / 1e6).toFixed(1);
          toast.error(
            `أبعاد الطباعة كبيرة جداً (${e.width}×${e.height} بكسل ≈ ${megapixels} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل DPI أو مقاس الورقة.`,
          );
          return null;
        }
        logger.error('Single composition capture failed:', e);
        toast.error('فشل تجهيز الصورة للطباعة: ' + describeError(e));
        return null;
      }
    },
    [
      stageRef,
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
    ],
  );

  const executePrint = useCallback(
    async (effectiveMarginMM: number, onDone: () => void, options?: PrintExecuteOptions) => {
      // 🖨️ الحارس على ref فقط (RV-Print-19): حالة state للعرض، والقرار الذري هنا.
      if (isExportingRef.current) return;
      setExporting(true);
      // رمز الجيل: أي نتيجة تصل بعد بدء تصدير أحدث تُتجاهل بصمت.
      const attempt = ++attemptRef.current;
      clearScheduledTimers();
      stopPollingWaiters();
      spoolJobRef.current = null;
      const generationJobId = createClientPrintJobId();
      generationJobIdRef.current = generationJobId;
      // وميض 100% (نجاح/خطأ) يجري عبر later المؤقت — الـ finally كان يمسحه فوراً
      // فيختفي الوميض قبل رسمه؛ هذه الراية تُبقي finally بعيداً عن الوميض المُجدوَل.
      let flashPending = false;
      try {
        // نُسلّم إطار رسم واحد بعد إظهار حالة التحميل — وإلا ظلّت الواجهة
        // مجمدة أثناء التقاط كانفاس 50MP المتزامن على خيط UI قبل أن يُرسم المؤشر
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (attempt !== attemptRef.current) return;

        // 🔍 فحص جودة الوضع الحر + ترقية دقة الملصقات — قبل أي التقاط/رفع مكلف.
        // عناصر الصور الحرة (الملصقات) كانت تُطبع بلا حراسة: تكبيرها فوق قدرة
        // راسترها كان يخفض DPI الفعالة بصمت. الترقية للكلا المسارين: التركيب
        // السريع يستبدل المصدر في PrintItem، ومسار الالتقاط يستبدل صورة عقدة
        // Konva مؤقتاً (swapNodeImagesForCapture) — إذ أغلب الكانفسات الواقعية
        // غير مؤهلة للمسار السريع وكانت الملصقات تُطبع من راستر إدراجها.
        let stickerSrcMap: ReadonlyMap<string, string> | undefined;
        let freeformImageDimensions:
          ReadonlyMap<string, { width: number; height: number }> | undefined;
        if (mode !== 'collage') {
          const dims = await resolveFreeformImageDimensions(elements);
          if (attempt !== attemptRef.current) return;

          const canvasWidthMM = layout.imageWidthMM;
          const canvasHeightMM = layout.imageHeightMM;

          const reraster = await ensureStickerPrintResolution(elements, {
            canvasWidthMM,
            canvasHeightMM,
            targetDpi: printDpi || 300,
            imageDimensions: dims,
            upload: uploadPrintImage,
          });
          if (attempt !== attemptRef.current) return;

          for (const [oldSrc, upgraded] of reraster.newDimensions) {
            dims.set(oldSrc, upgraded);
            const upgradedSrc = reraster.srcMap.get(oldSrc);
            if (upgradedSrc) dims.set(upgradedSrc, upgraded);
          }
          stickerSrcMap = reraster.srcMap;
          freeformImageDimensions = dims;

          const preflight = runFreeformPreflight({
            elements,
            canvasWidthMM,
            canvasHeightMM,
            canvasWidthPx: canvasWidth,
            canvasHeightPx: canvasHeight,
            imageDimensions: dims,
          });
          if (preflight.blocking.length > 0) {
            toast.error(`لا يمكن الطباعة: ${preflight.blocking[0].message}`);
            setExporting(false);
            return;
          }
          const notices = [...reraster.notes, ...preflight.warnings.map((w) => w.message)];
          if (notices.length > 0) {
            toast.warning(
              notices.length === 1
                ? notices[0]
                : `${notices.length} تنبيهات جودة (دقة) — تتم الطباعة`,
            );
          }
        }

        const built =
          mode === 'collage'
            ? await buildItems()
            : await buildSingleItems(attempt, stickerSrcMap, freeformImageDimensions);
        // الإلغاء أثناء الالتقاط/الرفع يمنع بدء طلب جديد أو تحرير حالة جولة أحدث.
        if (attempt !== attemptRef.current) return;
        if (!built) {
          setExporting(false);
          return;
        }

        // 🔍 فحص المحتوى قبل الطباعة: الصور غير المقروءة مانعة، والفراغ المقصود
        // والدقة المنخفضة تحذيرات تستمر بعد تنبيه واحد.
        if (mode === 'collage') {
          const loadResult = await loadCollageSlotImages(slots);
          if (attempt !== attemptRef.current) return;
          const preflight = runCollagePreflight({
            slots,
            slotRectsMM: new Map(
              slots.map((slot) => [
                slot.id,
                computeCollageSlotRectMM(slot, {
                  canvasWidth,
                  canvasHeight,
                  imageWidthMM: layout.imageWidthMM,
                  imageHeightMM: layout.imageHeightMM,
                  collageMargin,
                  collageGap,
                  hasPhysical: isBakedCollageLayout(collageTemplate),
                }),
              ]),
            ),
            imageDimensions: getLoadedImageDimensions(slots, loadResult.loaded),
            failedSlotIds: loadResult.failedSlotIds,
          });
          if (preflight.blocking.length > 0) {
            toast.error(`لا يمكن الطباعة: ${preflight.blocking[0].message}`);
            setExporting(false);
            return;
          }
          if (preflight.warnings.length > 0) {
            toast.warning(
              preflight.warnings.length === 1
                ? preflight.warnings[0].message
                : `${preflight.warnings.length} تنبيهات جودة (فراغ/دقة) — تتم الطباعة`,
            );
          }
        }

        const { items, cutLines, composition } = built;
        const backgroundBlocks = buildPrintBackgroundBlocks({
          layout,
          mode,
          elements,
          canvasWidth,
          canvasHeight,
          backgroundColor,
          backgroundGradientColor2,
          backgroundGradientAngle,
          imageDimensions: freeformImageDimensions,
        });

        // 🖨️ حارس حدود الورقة (RV-Print-24): Go يرفض W/H الأكبر من الورقة (fail-closed)
        // لكنه لا يفحص الموضع، فالعنصر المُزاح خارج الورقة يُقصّ بصمت. إحداثيات العناصر
        // مطلقة على الورقة (Go يرسم item.X/Y مباشرةً وmarginMM غير مستخدم في التركيب)،
        // لذا يُقاس أقصى امتداد على أبعاد الورقة نفسها بتسامح 0.5mm كي لا يُرفض تصدير
        // صالح يقبله Go — مع رسالة توجيهية بالعربية بدل خطأ Go التقني.
        // 🖨️ RV-16-M3: العناصر القالبية تحمل توسيعاً شبكياً (copies/copyCols)، فالحد
        // يُقاس بعد التوسيع (آخر خلية مكررة) لا عند أول نسخة فقط — الحارس القديم كان
        // يمرر شبكة كاملة خارج الورقة ما دامت أول خلية داخلها.
        const frontierToleranceMM = 0.5;
        const expandedFarX = (it: domain.PrintItem): number => {
          const copies = Math.max(1, it.copies || 1);
          const cols = Math.max(1, it.copyCols || 1);
          const maxCol = Math.min(copies, cols) - 1;
          return it.x + maxCol * (it.copyStepX || 0) + it.w;
        };
        const expandedFarY = (it: domain.PrintItem): number => {
          const copies = Math.max(1, it.copies || 1);
          const cols = Math.max(1, it.copyCols || 1);
          const maxRow = Math.floor((copies - 1) / cols);
          return it.y + maxRow * (it.copyStepY || 0) + it.h;
        };
        const farthestX = Math.max(...items.map(expandedFarX));
        const farthestY = Math.max(...items.map(expandedFarY));
        const overflowItem = items.find(
          (it) =>
            it.w <= 0 ||
            it.h <= 0 ||
            it.w > paperWidth + 0.1 ||
            it.h > paperHeight + 0.1 ||
            expandedFarX(it) > paperWidth + frontierToleranceMM ||
            expandedFarY(it) > paperHeight + frontierToleranceMM,
        );
        if (overflowItem) {
          const msg =
            mode === 'collage'
              ? `لا يمكن التصدير: بعض خلايا الكولاج تتجاوز حدود الورقة (${paperWidth}×${paperHeight} مم، أقصى امتداد ${farthestX.toFixed(1)}×${farthestY.toFixed(1)} مم). اختر ورقة أكبر أو صغّر الخلايا.`
              : `لا يمكن التصدير: الصورة أكبر من مساحة الطباعة (${paperWidth}×${paperHeight} مم). اختر ورقة أكبر.`;
          toast.error(msg);
          setExporting(false);
          return;
        }

        SetTaskbarProgress(50, 'indeterminate').catch(() => {});
        // 🖨️ مهلة صريحة (RV-Print-20): IPC لا يُلغى — withTimeout يرفض
        // والرمز أعلاه يتجاهل أي وصول متأخر.
        const result = await withTimeout(
          ExportPrintSheet(
            domain.PrintRequest.createFrom({
              jobId: generationJobId,
              paperWidthMM: paperWidth,
              paperHeightMM: paperHeight,
              marginMM: effectiveMarginMM,
              gapMM: layout.gapMM,
              dpi: printDpi || 300,
              backgroundColor: backgroundColor || previewWhite(),
              showCutLines: mode === 'collage' ? collageShowCutLines : printShowCutLines,
              // 🖨️ RV-16-H1: نمط خطوط القص المختار يُرسل لكل الأوضاع — كان وضع
              // الكولاج يجبر 'dashed' بينما المعاينة تعرض اختيار المستخدم
              // (solid/dotted) فتُطبع الورقة بنمط مختلف عن المعاينة (WYSIWYG مكسور).
              cutLineStyle: printCutLineStyle ?? 'dashed',
              colorSpace: printColorSpace === 'CMYK' ? 'CMYK' : 'sRGB',
              // 🖨️ RV-Print-05 معدّل (جلسة 1.67 بقرار مالك): JPEG يبقى الافتراضي
              // (أسرع ترميزاً وملفه أصغر 3-5× لورقة 50MP)، مع خيار PNG اختياري
              // للنصوص والباركود الملصقي بلا ضجيج ضغط — Go يدعم png في saveOutput
              // مع حقن pHYs جاهزاً بلا أي تعديل باك-إند.
              // CMYK يفرض TIFF (الحامل الحقيقي لفصل الأحبار؛ JPEG يبقى RGB عند المُرمِّز).
              exportFormat:
                printColorSpace === 'CMYK' ? 'tiff' : printOutputFormat === 'png' ? 'png' : 'jpeg',
              orientation: printOrientation || 'portrait',
              cutLines,
              items,
              ...(backgroundBlocks.length > 0 ? { backgroundBlocks } : {}),
              // 🖨️ حارس v1.16.0: تمرير `composition: undefined` كمفتاح عبر
              // createFrom المولّد ينتج CanvasComposition أصفاراً (Nullable +
              // default {}) فيرفضه validateCanvasComposition في Go ويفشل كل
              // تصدير — المفتاح يُحذف كلياً حين لا يوجد تركيب حقيقي.
              ...(composition ? { composition } : {}),
            }),
          ),
          EXPORT_TIMEOUT_MS,
          'ExportPrintSheet',
        );
        if (generationJobIdRef.current === generationJobId) {
          generationJobIdRef.current = null;
        }
        if (attempt !== attemptRef.current) return;

        if (!result.success) {
          SetTaskbarProgress(100, 'error').catch(() => {});
          flashPending = true;
          // 🖨️ مؤقت مُتتبَّع (RV-Print-21): الخام كان يمسح تقدّم تصدير لاحق ناجح.
          later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
          toast.error('فشل التصدير: ' + (result.error || 'خطأ غير معروف'));
          return;
        }

        SetTaskbarProgress(0, 'none').catch(() => {});

        // 🖨️ فضاء ألوان CMYK: يُصدَّر TIFF حقيقي عالي الدقة بفصل أحبار للمطابع
        if (printColorSpace === 'CMYK') {
          SetTaskbarProgress(100, 'normal').catch(() => {});
          flashPending = true;
          later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
          toast.success(
            result.filePath
              ? `تم تصدير ورقة الطباعة للمطبعة (TIFF CMYK): ${result.filePath}`
              : 'تم تصدير ورقة الطباعة للمطبعة (TIFF CMYK) بنجاح',
          );
          setExporting(false);
          onDone();
          return;
        }

        // 🖨️ المسار المباشر الأصلي لويندوز (Win32 GDI Direct Spooling):
        if (
          result.filePath &&
          options?.directPrint !== false &&
          typeof PrintDirect === 'function'
        ) {
          SetTaskbarProgress(75, 'indeterminate').catch(() => {});
          try {
            const requestedPlan = domain.PrinterPlanRequest.createFrom({
              printerName: options?.printerName || '',
              formName: options?.formName,
              paperId: options?.paperId,
              paperWidthMM: paperWidth,
              paperHeightMM: paperHeight,
              orientation: printOrientation || 'portrait',
              borderless: options?.borderless ?? false,
            });
            const plan = await withTimeout(
              ResolvePrinterPlan(requestedPlan),
              PLAN_TIMEOUT_MS,
              'ResolvePrinterPlan',
            );
            if (attempt !== attemptRef.current) return;
            if (!plan.success) {
              const reason = describeError(
                plan.error || plan.code || 'رفض برنامج تشغيل الطابعة الخطة',
              );
              logger.error('Printer plan rejected:', plan.code, plan.error);
              toast.error(`تعذرت الطباعة: ${reason}`);
              return;
            }
            if (plan.fallbackReason || (typeof plan.scale === 'number' && plan.scale < 1)) {
              const scaleNotice =
                typeof plan.scale === 'number' && plan.scale < 1
                  ? `سيُصغّر المحتوى إلى ${Math.round(plan.scale * 100)}٪`
                  : '';
              toast.warning(
                ['عدّلت الطابعة خطة الورق قبل الإرسال', plan.fallbackReason, scaleNotice]
                  .filter(Boolean)
                  .join(' — '),
              );
            }

            const appliedPaperWidth = plan.paperWidthMM || paperWidth;
            const appliedPaperHeight = plan.paperHeightMM || paperHeight;
            const printRes = await withTimeout(
              PrintDirect(
                domain.DirectPrintRequest.createFrom({
                  printerName: options?.printerName || '',
                  filePath: result.filePath,
                  paperWidthMM: appliedPaperWidth,
                  paperHeightMM: appliedPaperHeight,
                  orientation: printOrientation || 'portrait',
                  copies: 1,
                  color: true,
                  borderless: options?.borderless ?? false,
                  formName: plan.appliedFormName || options?.formName,
                  paperId: plan.appliedPaperId || options?.paperId,
                }),
              ),
              30_000,
              'PrintDirect',
            );
            if (attempt !== attemptRef.current) return;
            if (printRes.success) {
              const spoolJobId = printRes.jobId || 0;
              if (spoolJobId > 0 && typeof PollJobStatus === 'function') {
                const printerName = options?.printerName || '';
                spoolJobRef.current = { printerName, jobId: spoolJobId, attempt };
                toast.success(
                  `تم إرسال الورقة إلى طابعة ${printerName || 'النظام'} (المهمة #${spoolJobId}) — جارٍ انتظار النتيجة النهائية`,
                );
                await pollSpoolJob({ attempt, printerName, jobId: spoolJobId, onDone });
                return;
              }

              SetTaskbarProgress(100, 'normal').catch(() => {});
              flashPending = true;
              later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
              toast.success(`تم إرسال الورقة بنجاح إلى طابعة ${options?.printerName || 'النظام'}`);
              setExporting(false);
              onDone();
              return;
            }

            const reason = describeError(
              printRes.error || printRes.status || printRes.code || 'خطأ غير معروف',
            );
            logger.error(
              'Direct print failed:',
              printRes.error || printRes.status || printRes.code,
            );
            toast.error(`تعذرت الطباعة: ${reason}`);
            return;
          } catch (e) {
            if (attempt !== attemptRef.current) return;
            logger.error('Direct print call threw exception:', e);
            const detail = describeError(e);
            if (detail.includes('انتهت المهلة')) {
              toast.warning(
                'تأخرت الطباعة المباشرة عن المهلة — قد تكون المهمة قيد الإرسال. تحقّق من طابور الطباعة قبل إعادة المحاولة.',
              );
              onDone();
              return;
            }
            toast.error(`تعذرت الطباعة: ${detail}`);
            setExporting(false);
            return;
          }
        }

        setExporting(false);
        onDone();
      } catch (err) {
        if (generationJobIdRef.current === generationJobId) {
          generationJobIdRef.current = null;
        }
        if (attempt !== attemptRef.current) return;
        SetTaskbarProgress(100, 'error').catch(() => {});
        flashPending = true;
        later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
        toast.error('حدث خطأ أثناء توليد ورقة الطباعة: ' + describeError(err));
      } finally {
        if (attempt === attemptRef.current) {
          if (!flashPending && !spoolJobRef.current) {
            SetTaskbarProgress(0, 'none').catch(() => {});
          }
          if (!spoolJobRef.current) setExporting(false);
        }
      }
    },
    [
      mode,
      slots,
      elements,
      canvasWidth,
      canvasHeight,
      buildItems,
      buildSingleItems,
      paperWidth,
      paperHeight,
      layout,
      collageMargin,
      collageGap,
      collageTemplate,
      printDpi,
      backgroundColor,
      backgroundGradientColor2,
      backgroundGradientAngle,
      collageShowCutLines,
      printShowCutLines,
      printCutLineStyle,
      printOrientation,
      printColorSpace,
      printOutputFormat,
      setExporting,
      clearScheduledTimers,
      stopPollingWaiters,
      pollSpoolJob,
      later,
    ],
  );

  // يُسلّم وعد التنفيذ للمستدعي (كان مُهملاً في التفكيك) — لا يغيّر سلوك زر «طباعة»
  // الذي يتجاهل القيمة، ويمنح الاختبارات والمستدعين القدرة على انتظار انتهاء الدورة.
  const handlePrint = useCallback(
    (
      effectiveMarginMM?: number,
      onDone?: () => void,
      options?: PrintExecuteOptions,
    ): Promise<void> | void => {
      if (effectiveMarginMM !== undefined && onDone !== undefined) {
        return executePrint(effectiveMarginMM, onDone, options);
      }
      const inv = printInvocationRef.current;
      if (!inv) return;
      return executePrint(inv.effectiveMarginMM, inv.onDone, options ?? inv.options);
    },
    [executePrint],
  );

  useEffect(() => {
    handlePrintRef.current = () => handlePrint();
  }, [handlePrint]);

  return useMemo(
    () => ({
      isExporting,
      setIsExporting: setExporting,
      cancelExport,
      executePrint,
      handlePrintRef,
      handlePrint,
      setPrintInvocation,
    }),
    [isExporting, setExporting, cancelExport, executePrint, handlePrint, setPrintInvocation],
  );
}
