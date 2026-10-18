import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '@/lib/editor-store';
import { useStageRef } from '@/lib/canvas/stage-context';
import {
  ExportPrintSheet,
  PrintDirect,
  PollJobStatus,
} from '@bindings/grido/internal/handlers/printhandler';
import { SetTaskbarProgress } from '@bindings/grido/app';
import * as domain from '@bindings/grido/internal/core/domain';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { CanvasTooLargeError } from '@/lib/export/export-limits';
import type { usePrintLayout } from '@/hooks/use-print-layout';
import type { PrintSettings } from '@/lib/store/types';
import { createLogger } from '@/lib/logger';

import { extractPrintImageSrc, generatePrintPageStyle } from './print-page-style';

import {
  describeError,
  withTimeout,
  EXPORT_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
} from './print-transport';

import { buildCollagePayload, buildSinglePayload, type BuiltItems } from './print-payload-builder';

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
}: PrintExportContext) {
  const stageRef = useStageRef();
  const [isExporting, setIsExportingState] = useState(false);
  const isExportingRef = useRef(false);
  const attemptRef = useRef(0);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
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

  const setExporting = useCallback((v: boolean) => {
    isExportingRef.current = v;
    setIsExportingState(v);
  }, []);

  const cancelExport = useCallback(() => {
    attemptRef.current++;
    setExporting(false);
    SetTaskbarProgress(0, 'none').catch(() => {});
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.pointerEvents = '';
    }
  }, [setExporting]);

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
  ]);

  const buildSingleItems = useCallback(async (): Promise<BuiltItems | null> => {
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
        backgroundGradientColor2: useEditorStore.getState().backgroundGradientColor2,
        printDpi,
        printShowCutLines,
        printShowEndCutLine,
        printCutLineStyle,
      });
    } catch (e) {
      if (e instanceof CanvasTooLargeError) {
        // أرقام البكسل والميجابكسل من الحقول المحمولة في الخطأ نفسه (لا نعيد حسابها هنا)
        const megapixels = (e.pixelCount / 1e6).toFixed(1);
        toast.error(
          `أبعاد الطباعة كبيرة جداً (${e.width}×${e.height} بكسل ≈ ${megapixels} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل DPI أو مقاس الورقة.`,
        );
        return null;
      }
      logger.error('Single composition capture failed:', e);
      toast.error('فشل تجهيز الصورة للطباعة: ' + String(e));
      return null;
    }
  }, [
    stageRef,
    layout,
    elements,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    printDpi,
    printShowCutLines,
    printShowEndCutLine,
    printCutLineStyle,
  ]);

  const executePrint = useCallback(
    async (effectiveMarginMM: number, onDone: () => void, options?: PrintExecuteOptions) => {
      // 🖨️ الحارس على ref فقط (RV-Print-19): حالة state للعرض، والقرار الذري هنا.
      if (isExportingRef.current) return;
      setExporting(true);
      // رمز الجيل: أي نتيجة تصل بعد بدء تصدير أحدث تُتجاهل بصمت.
      const attempt = ++attemptRef.current;
      // وميض 100% (نجاح/خطأ) يجري عبر later المؤقت — الـ finally كان يمسحه فوراً
      // فيختفي الوميض قبل رسمه؛ هذه الراية تُبقي finally بعيداً عن الوميض المُجدوَل.
      let flashPending = false;
      try {
        // نُسلّم إطار رسم واحد بعد إظهار حالة التحميل — وإلا ظلّت الواجهة
        // مجمدة أثناء التقاط كانفاس 50MP المتزامن على خيط UI قبل أن يُرسم المؤشر
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const built = mode === 'collage' ? await buildItems() : await buildSingleItems();
        if (!built) {
          setExporting(false);
          return;
        }

        const { items, cutLines, composition } = built;

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
              // 🖨️ JPEG لا PNG: ترميزه أسرع عدة مرات وملفه أصغر 3-5× — ورقة 50MP
              // بصيغة PNG تُثقل ذاكرة WebView2 وتقترب من مهلة التصدير (RV-Print-05).
              // CMYK يفرض TIFF (الحامل الحقيقي لفصل الأحبار؛ JPEG يبقى RGB عند المُرمِّز).
              exportFormat: printColorSpace === 'CMYK' ? 'tiff' : 'jpeg',
              orientation: printOrientation || 'portrait',
              cutLines,
              items,
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
        if (result.filePath && typeof PrintDirect === 'function') {
          SetTaskbarProgress(75, 'indeterminate').catch(() => {});
          try {
            const printRes = await withTimeout(
              PrintDirect(
                domain.DirectPrintRequest.createFrom({
                  printerName: options?.printerName || '',
                  filePath: result.filePath,
                  paperWidthMM: paperWidth,
                  paperHeightMM: paperHeight,
                  orientation: printOrientation || 'portrait',
                  copies: 1,
                  color: true,
                  borderless: options?.borderless ?? false,
                  formName: options?.formName,
                  paperId: options?.paperId,
                }),
              ),
              30_000,
              'PrintDirect',
            );
            if (attempt !== attemptRef.current) return;
            if (printRes.success) {
              SetTaskbarProgress(100, 'normal').catch(() => {});
              flashPending = true;
              later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
              toast.success(
                `تم إرسال الورقة بنجاح إلى طابعة ${options?.printerName || 'النظام'} (المهمة #${printRes.jobId})`,
              );
              setExporting(false);
              onDone();

              // مراقبة حالة المهمة في طابور الويندوز عبر PollJobStatus
              if (printRes.jobId && typeof PollJobStatus === 'function') {
                const printer = options?.printerName || '';
                const jId = printRes.jobId;
                setTimeout(async () => {
                  try {
                    const poll = await PollJobStatus(printer, jId);
                    if (!poll.success && poll.error) {
                      logger.warn('Print job reported error after spooling:', poll.error);
                      toast.error(`تنبيه الطابعة للمهمة #${jId}: ${poll.error}`);
                    }
                  } catch (err) {
                    logger.debug('PollJobStatus error (ignored):', err);
                  }
                }, 1500);
              }
              return;
            } else {
              const reason = describeError(printRes.error || 'خطأ غير معروف');
              logger.error('Direct print failed:', printRes.error);
              toast.error(`تعذرت الطباعة: ${reason}`);
              setExporting(false);
              return;
            }
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
        if (attempt !== attemptRef.current) return;
        SetTaskbarProgress(100, 'error').catch(() => {});
        flashPending = true;
        later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
        toast.error('حدث خطأ أثناء توليد ورقة الطباعة: ' + describeError(err));
      } finally {
        if (attempt === attemptRef.current) {
          if (!flashPending) {
            SetTaskbarProgress(0, 'none').catch(() => {});
          }
          setExporting(false);
        }
      }
    },
    [
      mode,
      buildItems,
      buildSingleItems,
      paperWidth,
      paperHeight,
      layout.gapMM,
      printDpi,
      backgroundColor,
      collageShowCutLines,
      printShowCutLines,
      printCutLineStyle,
      printOrientation,
      printColorSpace,
      setExporting,
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
