import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { canvasToBlob } from '@/lib/canvas/canvas-blob';
import {
  Point,
  DocumentAspectType,
  ScannerFilterMode,
  warpPerspective,
  rotateCanvas,
  resolveTargetDims,
} from '../core';
import {
  WarpCancelledError,
  WarpWorkerClient,
  supportsWorkerWarp,
} from '../core/warp-worker-client';

/**
 * 🧭 معالجة الماسح النهائية: استعدال المنظور بأبعاد حقيقية ديناميكية لكل
 * نوع مستند (A4/بطاقة/مربع)، التدوير، المعاينة السريعة، والتصدير المفرد/المتعدد.
 *
 * الاستعدال الثقيل (خصوصاً على صور 50MP) يُنفَّذ داخل Web Worker عبر
 * WarpWorkerClient حتى لا تتجمّد الواجهة؛ ويبقى المسار المتزامن كاحتياطي
 * للبيئات التي لا تدعم Worker/OffscreenCanvas.
 */

/** يحسب أبعاد الإخراج (معاينة/تصدير) من أركان المستند ونوعه. */
function resolveDocTargetDims(
  docCorners: Point[],
  docAspect: DocumentAspectType,
  isPreview: boolean,
): { targetW: number; targetH: number } {
  const topW = Math.hypot(docCorners[1].x - docCorners[0].x, docCorners[1].y - docCorners[0].y);
  const botW = Math.hypot(docCorners[2].x - docCorners[3].x, docCorners[2].y - docCorners[3].y);
  const leftH = Math.hypot(docCorners[3].x - docCorners[0].x, docCorners[3].y - docCorners[0].y);
  const rightH = Math.hypot(docCorners[2].x - docCorners[1].x, docCorners[2].y - docCorners[1].y);

  const maxEdgeW = Math.round(Math.max(topW, botW));
  const maxEdgeH = Math.round(Math.max(leftH, rightH));

  return resolveTargetDims(docAspect, isPreview, maxEdgeW, maxEdgeH);
}

export function useScannerProcessor(
  imgRef: React.RefObject<HTMLImageElement | null>,
  fallbackFilter: ScannerFilterMode,
  fallbackRotation: number,
  open?: boolean,
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  // حارس الإغلاق أثناء التصدير: onSave/onDone بعد الإغلاق تُتجاهل.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // إلغاء التصدير متعدد المستندات (R39: عملية >3s قابلة للإلغاء).
  const exportCancelRef = useRef(false);

  // 🧵 عامل الاستعدال (خارج الخيط الرئيسي) — يُنشأ عند أول استخدام ويُنهي عند الإغلاق.
  const warpClientRef = useRef<WarpWorkerClient | null>(null);
  // رابط الكائن لمعاينة Blob — يجب إبطالته عند الإلغاء/الإغلاق.
  const previewUrlRef = useRef<string | null>(null);

  const getWarpClient = useCallback((): WarpWorkerClient | null => {
    if (!supportsWorkerWarp()) return null;
    if (!warpClientRef.current) {
      warpClientRef.current = new WarpWorkerClient();
    }
    return warpClientRef.current;
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
    warpClientRef.current?.cancel();
  }, []);

  // 🔒 تنظيف وتصفير حالات التصدير والمعاينة عند إغلاق النافذة
  useEffect(() => {
    if (open === false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset export/preview state on close
      setIsExporting(false);
      setIsPreviewMode(false);
      setIsPreviewing(false);
      setPreviewSrc(null);
      revokePreviewUrl();
      warpClientRef.current?.dispose();
      warpClientRef.current = null;
    }
  }, [open, revokePreviewUrl]);

  // 🧹 تفكيك العامل عند إزالة المكوّن (حماية من تسريب عامل حي).
  useEffect(
    () => () => {
      warpClientRef.current?.dispose();
      warpClientRef.current = null;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    },
    [],
  );

  const generateWarpedForDoc = useCallback(
    (
      docCorners: Point[],
      docAspect: DocumentAspectType,
      isPreview = false,
      docRotation?: number,
      docFilter?: ScannerFilterMode,
    ): HTMLCanvasElement | null => {
      const img = imgRef.current;
      if (!img || docCorners.length !== 4) return null;

      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) return null;
      srcCtx.drawImage(img, 0, 0);

      // حساب الأبعاد الحقيقية ديناميكياً للحفاظ على دقة الطباعة الكاملة
      const { targetW, targetH } = resolveDocTargetDims(docCorners, docAspect, isPreview);

      const effectiveFilter = docFilter || fallbackFilter;
      let resCanvas: HTMLCanvasElement | null = null;
      try {
        resCanvas = warpPerspective(
          srcCtx,
          img.naturalWidth,
          img.naturalHeight,
          docCorners,
          targetW,
          targetH,
          effectiveFilter,
        );
      } catch {
        srcCanvas.width = 0;
        srcCanvas.height = 0;
        toast.error(
          'تعذر استعدال المنظور — الحل: باعد بين الأركان الأربع ولا تجمعها في نقطة واحدة',
        );
        return null;
      }

      srcCanvas.width = 0;
      srcCanvas.height = 0;

      const rotToApply = docRotation !== undefined ? docRotation : fallbackRotation;
      if (rotToApply !== 0 && resCanvas) {
        return rotateCanvas(resCanvas, rotToApply, true);
      }

      return resCanvas;
    },
    [imgRef, fallbackFilter, fallbackRotation],
  );

  /**
   * 🔄 الاستعدال عبر العامل (المسار المفضّل) مع رجوع للمسار المتزامن
   * عند عدم دعم Worker. يُرجع Blob جاهزاً للإدراج.
   */
  const generateWarpedBlobForDoc = useCallback(
    async (
      docCorners: Point[],
      docAspect: DocumentAspectType,
      isPreview = false,
      docRotation?: number,
      docFilter?: ScannerFilterMode,
    ): Promise<Blob | null> => {
      const img = imgRef.current;
      if (!img || docCorners.length !== 4) return null;

      const client = getWarpClient();
      if (client) {
        const { targetW, targetH } = resolveDocTargetDims(docCorners, docAspect, isPreview);
        const effectiveFilter = docFilter || fallbackFilter;
        const rotToApply = docRotation !== undefined ? docRotation : fallbackRotation;

        try {
          const response = await fetch(img.currentSrc || img.src);
          const source = await response.blob();
          return await client.warp({
            source,
            corners: docCorners,
            targetW,
            targetH,
            filterMode: effectiveFilter,
            rotation: rotToApply,
          });
        } catch (error) {
          if (error instanceof WarpCancelledError) return null;
          // لا نعود للمسار المتزامن هنا: على صورة 50MP سيجمّد الواجهة مجدداً.
          toast.error('تعذّر استعدال المستند في الخلفية — أعد المحاولة');
          return null;
        }
      }

      // احتياطي: بيئات بلا Worker/OffscreenCanvas (أو الاختبارات).
      const warped = generateWarpedForDoc(docCorners, docAspect, isPreview, docRotation, docFilter);
      if (!warped) return null;
      try {
        const blob = await canvasToBlob(warped);
        warped.width = 0;
        warped.height = 0;
        return blob;
      } catch {
        warped.width = 0;
        warped.height = 0;
        return null;
      }
    },
    [imgRef, fallbackFilter, fallbackRotation, getWarpClient, generateWarpedForDoc],
  );

  const handleTogglePreview = useCallback(
    async (corners: Point[], aspect: DocumentAspectType) => {
      if (isPreviewMode) {
        setIsPreviewMode(false);
        return;
      }
      if (isPreviewing) return;

      setIsPreviewing(true);
      try {
        const blob = await generateWarpedBlobForDoc(corners, aspect, true);
        if (!blob || !openRef.current) {
          if (!blob && (corners.length !== 4 || !imgRef.current)) {
            toast.error('حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط');
          }
          return;
        }
        revokePreviewUrl();
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewSrc(url);
        setIsPreviewMode(true);
      } finally {
        setIsPreviewing(false);
      }
    },
    [isPreviewMode, isPreviewing, generateWarpedBlobForDoc, revokePreviewUrl, imgRef],
  );

  const handleApplyActive = useCallback(
    async (
      corners: Point[],
      aspect: DocumentAspectType,
      onSave: (blob: Blob) => void,
      onDone: () => void,
    ) => {
      exportCancelRef.current = false;
      setIsExporting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const blob = await generateWarpedBlobForDoc(corners, aspect, false);
        if (exportCancelRef.current || !openRef.current) return;
        if (blob) {
          onSave(blob);
          onDone();
        } else if (corners.length !== 4 || !imgRef.current) {
          toast.error('حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط');
        }
      } finally {
        setIsExporting(false);
      }
    },
    [generateWarpedBlobForDoc, imgRef],
  );

  const handleApplySelected = useCallback(
    async (
      docsToExport: {
        corners: Point[];
        aspectType: DocumentAspectType;
        rotation?: number;
        filterMode?: ScannerFilterMode;
      }[],
      onSave: (result: Blob | Blob[]) => void,
      onDone: () => void,
    ) => {
      if (docsToExport.length === 0) {
        toast.error('يرجى تحديد مستند واحد على الأقل للإدراج');
        return;
      }

      exportCancelRef.current = false;
      setIsExporting(true);
      setExportProgress({ done: 0, total: docsToExport.length });
      try {
        const results: Blob[] = [];
        for (let i = 0; i < docsToExport.length; i++) {
          if (exportCancelRef.current || !openRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, 30)); // Yield to UI
          const doc = docsToExport[i];
          const blob = await generateWarpedBlobForDoc(
            doc.corners,
            doc.aspectType,
            false,
            doc.rotation,
            doc.filterMode,
          );
          if (exportCancelRef.current || !openRef.current) break;
          if (blob) {
            results.push(blob);
          }
          setExportProgress({ done: i + 1, total: docsToExport.length });
        }

        if (exportCancelRef.current || !openRef.current) return;
        if (results.length > 0) {
          onSave(results.length === 1 ? results[0] : results);
          onDone();
        } else {
          toast.error('فشل معالجة المستندات المحددة');
        }
      } finally {
        setIsExporting(false);
        setExportProgress(null);
      }
    },
    [generateWarpedBlobForDoc],
  );

  const resetPreview = useCallback(() => {
    setIsPreviewMode(false);
    setPreviewSrc(null);
    revokePreviewUrl();
  }, [revokePreviewUrl]);

  const resetProcessorState = useCallback(() => {
    exportCancelRef.current = true;
    warpClientRef.current?.cancel();
    setIsExporting(false);
    setIsPreviewMode(false);
    setIsPreviewing(false);
    setPreviewSrc(null);
    setExportProgress(null);
    revokePreviewUrl();
  }, [revokePreviewUrl]);

  return {
    isExporting,
    isPreviewMode,
    isPreviewing,
    previewSrc,
    exportProgress,
    cancelExport,
    setIsPreviewMode,
    generateWarpedForDoc,
    handleTogglePreview,
    handleApplyActive,
    handleApplySelected,
    resetPreview,
    resetProcessorState,
  };
}
