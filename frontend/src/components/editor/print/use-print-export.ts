import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '@/lib/editor-store';
import { useStageRef } from '@/lib/canvas/stage-context';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { ExportPrintSheet, PrintNative } from '../../../../wailsjs/go/handlers/PrintHandler';
import { SetTaskbarProgress } from '../../../../wailsjs/go/main/App';
import { domain } from '../../../../wailsjs/go/models';
import { captureStageBlob } from '@/lib/canvas/konva-export-utils';
import { assertExportablePixels, CanvasTooLargeError } from '@/lib/export/export-limits';
import { calculatePrintCutLines } from '@/lib/print/cut-lines-utils';
import {
  computeBlockPosition,
  computeSlotAspect,
  computeSlotRectMM,
} from '@/lib/print/print-layout-math';
import { buildSingleComposition } from '@/lib/print/single-print-composition';
import type { usePrintLayout } from '@/hooks/use-print-layout';
import type { PrintSettings } from '@/lib/store/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('use-print-export');

/** مهلة رفع صورة الطباعة — بلا AbortController سابقاً كان التعليق أبدياً. */
const UPLOAD_TIMEOUT_MS = 120_000;
/** مهلة توليد الورقة عبر Go — ورقة 50MP TIFF قد تستغرق دقائق؛ فوقها فشل صريح. */
const EXPORT_TIMEOUT_MS = 10 * 60_000;

/** وصف خطأ آمن للعرض: أخطاء Go/Wails كائنات تُنتج "[object Object]" بـ String(). */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message || 'خطأ غير معروف';
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    if (typeof rec.message === 'string' && rec.message) return rec.message;
    if (typeof rec.error === 'string' && rec.error) return rec.error;
    try {
      const s = JSON.stringify(rec);
      if (s && s !== '{}') return s;
    } catch {
      /* ignore */
    }
  }
  return 'خطأ غير معروف';
}

/** يلف وعداً بمهلة — Wails IPC لا يدعم الإلغاء، فالنتيجة المتأخرة تُتجاهل بالرمز. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: انتهت المهلة (${Math.round(ms / 1000)} ث)`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * يستخرج رابط صورة ورقة الطباعة من وثيقة HTML المرافقة.
 */
export function extractPrintImageSrc(htmlDoc: string): string {
  if (!htmlDoc || typeof DOMParser === 'undefined') return '';
  try {
    const parsed = new DOMParser().parseFromString(htmlDoc, 'text/html');
    return parsed.querySelector('img')?.getAttribute('src') ?? '';
  } catch {
    return '';
  }
}

/**
 * يولّد نمط CSS الصارم لـ @page و WebView2 للطباعة بهوامش صفرية وحفظ النسبة 1:1.
 * يمنع الصفحات البيضاء الزائدة عبر حصر الحاوية بنسبة 100% ومنع الفواصل بعد العناصر.
 */
export function generatePrintPageStyle(paperWidthMM: number, paperHeightMM: number): string {
  return (
    `#print-container { display: none !important; }\n` +
    `@media screen { #print-container { display: none !important; } }\n` +
    `@page { margin: 0 !important; size: ${paperWidthMM}mm ${paperHeightMM}mm; }\n` +
    `@page :left { margin: 0 !important; }\n` +
    `@page :right { margin: 0 !important; }\n` +
    `@page :first { margin: 0 !important; }\n` +
    `@media print {\n` +
    `  * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\n` +
    `  html, body {\n` +
    `    margin: 0 !important;\n` +
    `    padding: 0 !important;\n` +
    `    width: 100% !important;\n` +
    `    height: 100% !important;\n` +
    `    max-width: 100% !important;\n` +
    `    max-height: 100% !important;\n` +
    `    overflow: hidden !important;\n` +
    `    background: white !important;\n` +
    `    page-break-after: avoid !important;\n` +
    `    break-after: avoid !important;\n` +
    `    -webkit-print-color-adjust: exact !important;\n` +
    `    print-color-adjust: exact !important;\n` +
    `  }\n` +
    `  body > *:not(#print-container) { display: none !important; }\n` +
    `  #print-container {\n` +
    `    display: block !important;\n` +
    `    position: absolute !important;\n` +
    `    top: 0 !important;\n` +
    `    left: 0 !important;\n` +
    `    width: 100% !important;\n` +
    `    height: 100% !important;\n` +
    `    max-width: 100% !important;\n` +
    `    max-height: 100% !important;\n` +
    `    margin: 0 !important;\n` +
    `    padding: 0 !important;\n` +
    `    overflow: hidden !important;\n` +
    `    background: white !important;\n` +
    `    page-break-after: avoid !important;\n` +
    `    break-after: avoid !important;\n` +
    `    page-break-inside: avoid !important;\n` +
    `    break-inside: avoid !important;\n` +
    `  }\n` +
    `  #print-container img {\n` +
    `    position: absolute !important;\n` +
    `    top: 0 !important;\n` +
    `    left: 0 !important;\n` +
    `    width: 100% !important;\n` +
    `    height: 100% !important;\n` +
    `    max-width: 100% !important;\n` +
    `    max-height: 100% !important;\n` +
    `    object-fit: fill !important;\n` +
    `    display: block !important;\n` +
    `    margin: 0 !important;\n` +
    `    padding: 0 !important;\n` +
    `    page-break-after: avoid !important;\n` +
    `    break-after: avoid !important;\n` +
    `    page-break-inside: avoid !important;\n` +
    `    break-inside: avoid !important;\n` +
    `  }\n` +
    `}`
  );
}

/** المدخلات المشتركة لمولّد العناصر والتصدير — من usePrintLayout والدالة الأصل */
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
}

interface BuiltItems {
  items: domain.PrintItem[];
  cutLines: domain.CutLine[];
  composition: undefined;
}

/**
 * 🚀 W-B: رفع صورة الطباعة كتيار ثنائي إلى /api/upload-print-image وإرجاع
 * مسار /local-image/ — يقطع مرور DataURL عملاقة (25-60MB نص) عبر جسر
 * Wails IPC. الفشل يرمي ليقع التعامل معه في المستدعي.
 */
async function uploadPrintImage(blob: Blob): Promise<string> {
  if (typeof window === 'undefined' || !window.location?.origin) {
    throw new Error('upload unavailable: no window origin');
  }
  // 🖨️ إلغاء ومهلة (RV-Print-20): التعليق السابق كان يُبقي isExporting=true
  // حتى يغلق المستخدم الحوار يدوياً.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const resp = await fetch(`${window.location.origin}/api/upload-print-image`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/png' },
      body: blob,
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      throw new Error(`upload failed: HTTP ${resp.status}`);
    }
    const resJson = (await resp.json().catch(() => null)) as {
      status?: string;
      imageSrc?: string;
    } | null;
    if (resJson?.status !== 'success' || !resJson.imageSrc) {
      throw new Error('upload failed: invalid server response');
    }
    return resJson.imageSrc;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 🧭 محرك تصدير الطباعة: بناء عناصر الورقة (كولاج أو مفرد) بكل خصائص
 * الخانات والقص والحدود، ثم توليد الورقة عبر Go وعرض حوار الطباعة عبر
 * iframe مخفي مع img.decode() وafterprint — كانت هذه الكتل مضمّنة في Dialog.
 */
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
}: PrintExportContext) {
  const stageRef = useStageRef();
  const [isExporting, setIsExportingState] = useState(false);
  const isExportingRef = useRef(false);
  // 🖨️ رموز الجيل والمهلات (RV-Print-20/21): تجاهل النتائج المتأخرة بعد
  // تصدير أحدث، وتنظيف كل المؤقتات عند التفكيك بدل التسرب.
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

  // 🖨️ ضبط ذري متزامن (RV-Print-19): المزامنة السابقة عبر useEffect خلقت
  // نافذة سباق — الحارس يعتمد ref قد لا يُصفَّر. الآن المصدر الوحيد للضبط،
  // ويُصدَّر باسم setIsExporting نفسه فكل المستدعين (الحوار/الاختصارات) متزامنون.
  const setExporting = useCallback((v: boolean) => {
    isExportingRef.current = v;
    setIsExportingState(v);
  }, []);

  // مؤشر الطباعة Enter — آخر معاملات نداء الطباعة من المكوّن
  const printInvocationRef = useRef<{
    effectiveMarginMM: number;
    onDone: () => void;
  } | null>(null);

  const setPrintInvocation = useCallback(
    (inv: { effectiveMarginMM: number; onDone: () => void }) => {
      printInvocationRef.current = inv;
    },
    [],
  );

  const handlePrintRef = useRef<() => void>(() => {});

  const { imageWidthMM, imageHeightMM, gapMM, actualCopies, paperWidth, paperHeight, grid } =
    layout;

  const buildItems = useCallback(async (): Promise<BuiltItems> => {
    const items: domain.PrintItem[] = [];
    const hasPhysical = Boolean(collageTemplate?.physicalLayout);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const scaleXPxToMM = imageWidthMM / canvasWidth;
    const scaleYPxToMM = imageHeightMM / canvasHeight;
    const marginXMM = marginPx * scaleXPxToMM;
    const marginYMM = marginPx * scaleYPxToMM;
    const gapXMM = gapPx * scaleXPxToMM;
    const gapYMM = gapPx * scaleYPxToMM;

    const rawCutLines = collageShowCutLines
      ? calculatePrintCutLines({
          mode,
          actualCopies,
          imageWidthMM,
          imageHeightMM,
          gapMM,
          paperWidth,
          paperHeight,
          showEndCutLine: collageShowEndCutLine !== false,
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

    // 🚀 تكرار شبكي على جانب Go: كل خانة تُرسل مرة واحدة كقالب مع معاملات
    // الاستنساخ (عدد النسخ + خطوة الشبكة بالمليمتر) — كان الكولاج يكرر عناصر
    // كل خانة لكل نسخة عبر IPC (حتى 2,304 عنصراً وتجاوز حد التحقق 1000).
    // firstBlock يحدد موضع القالب في الشبكة المُحاذية top-left: العنصر 0 في
    // الصف الأول من أول خانة ذات صورة، وخانات بلا صورة لا تُحسب نسخاً لها.
    const slotTemplates = slots.filter((slot) => slot.imageSrc);
    const firstBlock = computeBlockPosition(0, grid);
    const stepXMM = actualCopies > 1 ? grid.cellWidth : 0;
    const stepYMM = actualCopies > 1 ? grid.cellHeight : 0;

    for (const slot of slotTemplates) {
      const rect = computeSlotRectMM(
        firstBlock,
        { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
        { widthMM: imageWidthMM, heightMM: imageHeightMM },
        { marginXMM, marginYMM },
        { gapXMM, gapYMM },
      );
      const slotAspect = computeSlotAspect({ w: slot.w, h: slot.h }, canvasWidth, canvasHeight);

      items.push(
        domain.PrintItem.createFrom({
          imageSrc: slot.imageSrc,
          x: rect.xMM,
          y: rect.yMM,
          w: rect.wMM,
          h: rect.hMM,
          filter: slot.filter || 'none',
          brightness: slot.brightness ?? 100,
          contrast: slot.contrast ?? 100,
          saturation: slot.saturation ?? 100,
          slotAspect,
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
  }, [
    collageTemplate,
    collageMargin,
    collageGap,
    collageRadius,
    collageStrokeWidth,
    collageStrokeColor,
    collageShowCutLines,
    collageShowEndCutLine,
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    paperWidth,
    paperHeight,
    grid,
    mode,
    slots,
    canvasWidth,
    canvasHeight,
  ]);

  const buildSingleItems = useCallback(async (): Promise<BuiltItems | null> => {
    const items: domain.PrintItem[] = [];
    const stage = stageRef.current;
    if (!stage) {
      toast.error('تعذر الوصول إلى محتوى الكانفاس');
      return null;
    }

    const exportDpi = printDpi || 300;
    const printPixelW = Math.round((imageWidthMM / 25.4) * exportDpi);
    const printPixelH = Math.round((imageHeightMM / 25.4) * exportDpi);
    try {
      assertExportablePixels(printPixelW, printPixelH);
    } catch (e) {
      if (e instanceof CanvasTooLargeError) {
        toast.error(
          `أبعاد الطباعة كبيرة جداً (${printPixelW}×${printPixelH} بكسل ≈ ${((printPixelW * printPixelH) / 1e6).toFixed(1)} ميجابكسل) — الحد الأقصى 50 ميجابكسل. قلّل DPI أو مقاس الورقة.`,
        );
        return null;
      }
      throw e;
    }

    const singleCompRes = buildSingleComposition({
      elements,
      canvasWidth,
      canvasHeight,
      canvasWidthMM: imageWidthMM,
      canvasHeightMM: imageHeightMM,
      backgroundColor: backgroundColor || previewWhite(),
      backgroundGradientColor2: useEditorStore.getState().backgroundGradientColor2,
    });

    const isSimpleRaster = singleCompRes.eligible && !!singleCompRes.composition;
    const comp = singleCompRes.composition;
    let singleImageSrc = '';
    if (!isSimpleRaster) {
      try {
        const targetPixelRatio = stage.width() > 0 ? printPixelW / stage.width() : 1;
        const capturedBlob = await captureStageBlob(stage, targetPixelRatio, 'image/png');
        if (!capturedBlob) {
          throw new Error('stage capture returned no blob');
        }
        // 🚀 W-B: رفع ثنائي مباشر بدل DataURL عبر IPC — يوفر 33% من الحجم
        // وحلقة فك ترميز كاملة في Go، ويُرجع مسار /local-image/ المُخدَم محلياً
        singleImageSrc = await uploadPrintImage(capturedBlob);
      } catch (err) {
        logger.error('Single composition capture failed:', err);
        toast.error('فشل تجهيز الصورة للطباعة: ' + String(err));
        return null;
      }
    }

    const rawCutLines = printShowCutLines
      ? calculatePrintCutLines({
          mode,
          actualCopies,
          imageWidthMM,
          imageHeightMM,
          gapMM,
          paperWidth,
          paperHeight,
          showEndCutLine: printShowEndCutLine !== false,
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

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);

      if (isSimpleRaster && comp) {
        const itemWidthMM = imageWidthMM;
        const itemHeightMM = imageHeightMM;
        const scaleX = itemWidthMM / comp.canvasWidthPx;
        const scaleY = itemHeightMM / comp.canvasHeightPx;

        for (const compItem of comp.items) {
          items.push(
            domain.PrintItem.createFrom({
              imageSrc: compItem.imageSrc,
              x: block.xMM + compItem.x * scaleX,
              y: block.yMM + compItem.y * scaleY,
              w: compItem.w * scaleX,
              h: compItem.h * scaleY,
              filter: compItem.filter,
              brightness: compItem.brightness,
              contrast: compItem.contrast,
              saturation: compItem.saturation,
              slotAspect: compItem.w / Math.max(1, compItem.h),
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
            }),
          );
        }
      } else {
        items.push(
          domain.PrintItem.createFrom({
            imageSrc: singleImageSrc,
            x: block.xMM,
            y: block.yMM,
            w: imageWidthMM,
            h: imageHeightMM,
            filter: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            slotAspect: imageWidthMM / imageHeightMM,
            zoom: 1,
            dragX: 0,
            dragY: 0,
            cornerRadiusMM: 0,
            borderWidthMM: 0,
            borderColor: '#000000',
            bgColor: '',
            flipX: false,
            flipY: false,
            rotation: 0,
          }),
        );
      }
    }
    return { items, cutLines, composition: undefined };
  }, [
    stageRef,
    printDpi,
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    paperWidth,
    paperHeight,
    printShowCutLines,
    printShowEndCutLine,
    printCutLineStyle,
    grid,
    mode,
    elements,
    canvasWidth,
    canvasHeight,
    backgroundColor,
  ]);

  /**
   * مسار الطباعة المباشر عبر WebView2 / المتصفح — يجهز حاوية @page المخصصة بهوامش صفرية
   * وأبعاد الورقة الدقيقة ويستدعي window.print() مباشرة لتفادي معالج صور ويندوز العتيق.
   */
  const fallbackBrowserPrint = useCallback(
    (result: domain.PrintResult) => {
      if (result.htmlDoc) {
        const win = window as Window & {
          __gridoPrintCleanup?: (() => void) | null;
        };
        // حماية من استدعاءين متتاليين: نظّف أي طباعة سابقة أولاً
        win.__gridoPrintCleanup?.();

        // فك وثيقة الطباعة لاستخراج مسار الصورة فقط — لا نحقن <style> الوثيقة
        // كما هو لأن قواعدها العامة (html/body/*) ستدمّر تنسيق التطبيق الحي،
        // بل نبني قاعدة @page بأبعاد الورقة المعروفة محلياً + الصورة بمقاس inline
        const imageSrc = extractPrintImageSrc(result.htmlDoc);
        if (!imageSrc) {
          if (result.filePath && typeof PrintNative === 'function') {
            PrintNative(result.filePath)
              .then(() => toast.success('تم إرسال الورقة إلى الطباعة الأصلية بنجاح'))
              .catch((err) => logger.error('PrintNative failed:', err));
          }
          return;
        }

        // قاعدة @page في المستند الأعلى هي ما يفرض مقاس الورقة وهوامش الصفر
        // (مؤكد تجريبياً: iframe المخفي يُسقطها فتُطبع على Letter بهوامش المتصفح)
        const styleEl = document.createElement('style');
        styleEl.id = 'grido-print-sheet-style';
        styleEl.textContent = generatePrintPageStyle(paperWidth, paperHeight);

        const container = document.createElement('div');
        container.id = 'print-container';
        container.setAttribute('aria-hidden', 'true');
        container.style.display = 'none';

        const img = document.createElement('img');
        img.alt = '';
        img.src = imageSrc;
        // الصورة مولّدة أصلاً بأبعاد الورقة الفيزيائية بدقة DPI المحددة (بكسل ÷ DPI)
        // استخدام 100% مع object-fit: fill يضمن ملء الورقة تماماً ومنع أي صفحة ثانية فارغة
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'fill';
        img.style.display = 'block';
        container.appendChild(img);

        let done = false;
        let safetyTimer: ReturnType<typeof setTimeout> | undefined;
        const cleanup = () => {
          if (done) return;
          done = true;
          win.__gridoPrintCleanup = null;
          window.removeEventListener('afterprint', cleanup);
          if (safetyTimer) {
            clearTimeout(safetyTimer);
            safetyTimer = undefined;
          }
          styleEl.remove();
          container.remove();
          window.focus();
        };
        win.__gridoPrintCleanup = cleanup;

        try {
          document.head.appendChild(styleEl);
          document.body.appendChild(container);
          // afterprint يُطلق عند إغلاق حوار الطباعة (طباعة أو إلغاء)؛
          // والمؤقت ضمانة استعادة إن لم يُطلق الحدث في WebView2
          window.addEventListener('afterprint', cleanup, { once: true });
          safetyTimer = setTimeout(cleanup, 120_000);
        } catch (e) {
          logger.error('Print container injection failed:', e);
          cleanup();
          if (result.filePath && typeof PrintNative === 'function') {
            PrintNative(result.filePath)
              .then(() => toast.success('تم إرسال الورقة إلى الطباعة الأصلية بنجاح'))
              .catch((err) => logger.error('PrintNative fallback failed:', err));
          }
          return;
        }

        const triggerPrint = () => {
          try {
            window.print();
            toast.success('تم إرسال الورقة إلى الطباعة بنجاح');
          } catch (e) {
            logger.error('Browser print error:', e);
            cleanup();
            if (result.filePath && typeof PrintNative === 'function') {
              PrintNative(result.filePath)
                .then(() => toast.success('تم إرسال الورقة إلى الطباعة الأصلية بنجاح'))
                .catch((err) => logger.error('PrintNative after browser error failed:', err));
            }
          }
        };

        // 🖼️ الصورة تُخدم من سيرفر Wails المحلي — ننتظر اكتمال فك ترميزها
        // (img.decode + onload/onerror + مهلة 10ث) قبل فتح حوار الطباعة.
        // الصورة داخل #print-container (display:none على الشاشة) والتحميل
        // وفك الترميز يعملان لأي صورة داخل الـ DOM مهما كانت حالتها العرضية.
        let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
        const runPrint = () => {
          if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = undefined;
          }
          if (img.decode) {
            img.decode().then(triggerPrint).catch(triggerPrint);
          } else {
            triggerPrint();
          }
        };
        if (img.complete && img.naturalWidth > 0) {
          runPrint();
        } else {
          img.onload = runPrint;
          img.onerror = () => {
            if (fallbackTimer) {
              clearTimeout(fallbackTimer);
              fallbackTimer = undefined;
            }
            cleanup();
            toast.error('تعذر تحميل صورة الطباعة في المتصفح، جاري التحويل للطباعة الأصلية ...');
            if (result.filePath && typeof PrintNative === 'function') {
              PrintNative(result.filePath)
                .then(() => toast.success('تم إرسال الورقة إلى الطباعة الأصلية بنجاح'))
                .catch((err) => logger.error('PrintNative after image error failed:', err));
            }
          };
          fallbackTimer = setTimeout(runPrint, 10000);
        }
      } else if (result.filePath && typeof PrintNative === 'function') {
        PrintNative(result.filePath)
          .then(() => toast.success('تم إرسال الورقة إلى الطباعة الأصلية بنجاح'))
          .catch((err) => logger.error('PrintNative failed:', err));
      }
    },
    [paperWidth, paperHeight],
  );

  /**
   * 🧭 إطلاق حوار الطباعة:
   * - استخدام مسار الطباعة المباشر المعتمد على WebView2 مع @page بمقاسات الورقة الميكرومترية
   *   وهوامش صفرية وبلا أي روابط (fallbackBrowserPrint) بدقة 100% 1:1.
   * - هذا المسار يتجنّب معالج ويندوز العتيق لطباعة الصور (photowiz.dll) الذي يُشوه قوالب الورق
   *   ويفشل مع طابعات Brother وEpson بخطأ "An internal error occurred".
   */
  const showPrintResult = useCallback(
    (result: domain.PrintResult) => {
      setExporting(false);
      if (!result.success) {
        toast.error('فشل التصدير: ' + (result.error || 'خطأ غير معروف'));
        return;
      }

      fallbackBrowserPrint(result);
    },
    [fallbackBrowserPrint, setExporting],
  );

  const handlePrint = useCallback(
    async (effectiveMarginMM: number, onDone: () => void) => {
      // 🖨️ الحارس على ref فقط (RV-Print-19): حالة state للعرض، والقرار الذري هنا.
      if (isExportingRef.current) return;
      setExporting(true);
      // رمز الجيل: أي نتيجة تصل بعد بدء تصدير أحدث تُتجاهل بصمت.
      const attempt = ++attemptRef.current;
      try {
        // نُسلّم إطار رسم واحد بعد إظهار حالة التحميل — وإلا ظلّت الواجهة
        // مجمدة أثناء التقاط كانفس 50MP المتزامن على خيط UI قبل أن يُرسم المؤشر
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const buildResult = mode === 'collage' ? await buildItems() : await buildSingleItems();
        if (!buildResult) {
          setExporting(false);
          return;
        }

        const overflowItem = buildResult.items.find(
          (it) => it.w <= 0 || it.h <= 0 || it.w > paperWidth + 0.1 || it.h > paperHeight + 0.1,
        );
        if (overflowItem) {
          const msg =
            mode === 'collage'
              ? `لا يمكن التصدير: بعض خلايا الكولاج تتجاوز حدود الورقة (${paperWidth}×${paperHeight} مم). اختر ورقة أكبر أو صغّر الخلايا في المحرر الحر.`
              : `لا يمكن التصدير: الصورة أكبر من مساحة الطباعة (${paperWidth}×${paperHeight} مم). اختر ورقة أكبر أو عدّل الإعدادات.`;
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
              gapMM: gapMM,
              dpi: printDpi || 300,
              backgroundColor: backgroundColor || previewWhite(),
              showCutLines: mode === 'collage' ? collageShowCutLines : printShowCutLines,
              cutLineStyle: printCutLineStyle ?? 'dashed',
              colorSpace: 'sRGB',
              exportFormat: 'jpeg',
              orientation: printOrientation || 'portrait',
              cutLines: buildResult.cutLines,
              items: buildResult.items,
              composition: buildResult.composition,
            }),
          ),
          EXPORT_TIMEOUT_MS,
          'ExportPrintSheet',
        );
        if (attempt !== attemptRef.current) return;

        if (!result.success) {
          SetTaskbarProgress(100, 'error').catch(() => {});
          // 🖨️ مؤقت مُتتبَّع (RV-Print-21): الخام كان يمسح تقدّم تصدير لاحق ناجح.
          later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
          toast.error('فشل التصدير: ' + (result.error || 'خطأ غير معروف'));
          return;
        }

        SetTaskbarProgress(0, 'none').catch(() => {});

        // 1. إغلاق نافذة إعدادات الطباعة أولاً لضمان عدم بقائها عالقة خلف حوار الطباعة
        setExporting(false);
        onDone();

        // ضمان استعادة تفاعل الصفحة فوراً بإزالة أي قيد inline بدل فرض "auto"
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.pointerEvents = '';
        }

        // 2. إطلاق حوار الطباعة بعد اكتمال أنيميشن إغلاق Radix (200ms) حتى لا يتجمد
        // الـ overlay شبه المُغلق عند حجب خيط الـ UI بواسطة window.print()
        later(() => {
          showPrintResult(result);
        }, 450);
      } catch (err) {
        if (attempt !== attemptRef.current) return;
        SetTaskbarProgress(100, 'error').catch(() => {});
        later(() => SetTaskbarProgress(0, 'none').catch(() => {}), 2000);
        toast.error('حدث خطأ أثناء توليد ورقة الطباعة: ' + describeError(err));
      } finally {
        if (attempt === attemptRef.current) {
          SetTaskbarProgress(0, 'none').catch(() => {});
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
      gapMM,
      printDpi,
      backgroundColor,
      collageShowCutLines,
      printShowCutLines,
      printCutLineStyle,
      printOrientation,
      showPrintResult,
      setExporting,
      later,
    ],
  );

  // مزامنة مؤشر Enter مع أحدث المعاملات — داخل الـ hook نفسه
  // 🖨️ تبعيات صريحة (RV-Print-19): النسخة بلا مصفوفة كانت تُعيد الضبط كل render.
  useEffect(() => {
    handlePrintRef.current = () => {
      const inv = printInvocationRef.current;
      if (inv) {
        void handlePrint(inv.effectiveMarginMM, inv.onDone);
      }
    };
  }, [handlePrint]);

  // 🖨️ كائن مُثبَّت (RV-Print-19): النسخة الحرفية الجديدة كل render كانت
  // تُعيد اشتراك keydown في الحوار مع كل رسمة.
  return useMemo(
    () => ({
      isExporting,
      setIsExporting: setExporting,
      handlePrintRef,
      handlePrint,
      setPrintInvocation,
    }),
    [isExporting, setExporting, handlePrint, setPrintInvocation],
  );
}
