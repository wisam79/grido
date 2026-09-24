import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Point,
  DocumentAspectType,
  ScannerFilterMode,
  warpPerspective,
  rotateCanvas,
} from "../core";

/**
 * جدول الأبعاد الحقيقية لكل نوع مستند (معاينة/تصدير) — مصدر واحد بدل
 * سلسلة if/else المبعثرة داخل generateWarpedForDoc.
 */
function resolveTargetDims(
  docAspect: DocumentAspectType,
  isPreview: boolean,
  maxEdgeW: number,
  maxEdgeH: number
): { targetW: number; targetH: number } {
  if (docAspect === "a4_p") {
    if (isPreview) return { targetW: 620, targetH: 877 };
    const baseW = Math.max(1400, maxEdgeW);
    return { targetW: baseW, targetH: Math.round(baseW * Math.SQRT2) };
  }
  if (docAspect === "a4_l") {
    if (isPreview) return { targetW: 877, targetH: 620 };
    const baseW = Math.max(1980, maxEdgeW);
    return { targetW: baseW, targetH: Math.round(baseW / Math.SQRT2) };
  }
  if (docAspect === "id_card") {
    if (isPreview) return { targetW: 500, targetH: 315 };
    const baseW = Math.max(1200, maxEdgeW);
    return { targetW: baseW, targetH: Math.round(baseW / (85.60 / 53.98)) };
  }
  if (docAspect === "square") {
    const avg = isPreview ? 600 : Math.max(1200, Math.round((maxEdgeW + maxEdgeH) / 2));
    return { targetW: avg, targetH: avg };
  }
  if (isPreview) {
    const s = Math.min(1, 800 / Math.max(maxEdgeW, maxEdgeH, 1));
    return { targetW: Math.round(maxEdgeW * s), targetH: Math.round(maxEdgeH * s) };
  }
  return { targetW: maxEdgeW, targetH: maxEdgeH };
}

/**
 * 🧭 معالجة الماسح النهائية: استعدال المنظور بأبعاد حقيقية ديناميكية لكل
 * نوع مستند (A4/بطاقة/مربع)، التدوير، المعاينة السريعة، والتصدير المفرد/المتعدد.
 * كانت هذه الكتلة (generateWarpedForDoc + handlers) مضمّنة في Dialog.
 */
export function useScannerProcessor(
  imgRef: React.RefObject<HTMLImageElement | null>,
  fallbackFilter: ScannerFilterMode,
  fallbackRotation: number,
  open?: boolean
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);

  // حارس الإغلاق أثناء التصدير: onSave/onDone بعد الإغلاق تُتجاهل.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // إلغاء التصدير متعدد المستندات (R39: عملية >3s قابلة للإلغاء).
  const exportCancelRef = useRef(false);
  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
  }, []);

  // 🔒 تنظيف وتصفير حالات التصدير والمعاينة عند إغلاق النافذة
  useEffect(() => {
    if (open === false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset export/preview state on close
      setIsExporting(false);
      setIsPreviewMode(false);
      setPreviewSrc(null);
    }
  }, [open]);

  const generateWarpedForDoc = useCallback(
    (
      docCorners: Point[],
      docAspect: DocumentAspectType,
      isPreview = false,
      docRotation?: number,
      docFilter?: ScannerFilterMode
    ): HTMLCanvasElement | null => {
      const img = imgRef.current;
      if (!img || docCorners.length !== 4) return null;

      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) return null;
      srcCtx.drawImage(img, 0, 0);

      // حساب الأبعاد الحقيقية ديناميكياً للحفاظ على دقة الطباعة الكاملة
      const topW = Math.hypot(docCorners[1].x - docCorners[0].x, docCorners[1].y - docCorners[0].y);
      const botW = Math.hypot(docCorners[2].x - docCorners[3].x, docCorners[2].y - docCorners[3].y);
      const leftH = Math.hypot(docCorners[3].x - docCorners[0].x, docCorners[3].y - docCorners[0].y);
      const rightH = Math.hypot(docCorners[2].x - docCorners[1].x, docCorners[2].y - docCorners[1].y);

      const maxEdgeW = Math.round(Math.max(topW, botW));
      const maxEdgeH = Math.round(Math.max(leftH, rightH));

      const { targetW, targetH } = resolveTargetDims(docAspect, isPreview, maxEdgeW, maxEdgeH);

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
          effectiveFilter
        );
      } catch {
        srcCanvas.width = 0;
        srcCanvas.height = 0;
        toast.error("تعذر استعدال المنظور — الحل: باعد بين الأركان الأربع ولا تجمعها في نقطة واحدة");
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
    [imgRef, fallbackFilter, fallbackRotation]
  );

  const handleTogglePreview = useCallback(
    (corners: Point[], aspect: DocumentAspectType) => {
      if (!isPreviewMode) {
        const warped = generateWarpedForDoc(corners, aspect, true);
        if (warped) {
          setPreviewSrc(warped.toDataURL("image/png"));
          setIsPreviewMode(true);
          warped.width = 0;
          warped.height = 0;
        } else {
          toast.error("حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط");
        }
      } else {
        setIsPreviewMode(false);
      }
    },
    [isPreviewMode, generateWarpedForDoc]
  );

  const handleApplyActive = useCallback(
    async (
      corners: Point[],
      aspect: DocumentAspectType,
      onSave: (base64: string | string[]) => void,
      onDone: () => void
    ) => {
      exportCancelRef.current = false;
      setIsExporting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const warped = generateWarpedForDoc(corners, aspect, false);
        if (exportCancelRef.current || !openRef.current) return;
        if (warped) {
          onSave(warped.toDataURL("image/png"));
          warped.width = 0;
          warped.height = 0;
          onDone();
        } else {
          toast.error("حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط");
        }
      } finally {
        setIsExporting(false);
      }
    },
    [generateWarpedForDoc]
  );

  const handleApplySelected = useCallback(
    async (
      docsToExport: { corners: Point[]; aspectType: DocumentAspectType; rotation?: number; filterMode?: ScannerFilterMode }[],
      onSave: (result: string | string[]) => void,
      onDone: () => void
    ) => {
      if (docsToExport.length === 0) {
        toast.error("يرجى تحديد مستند واحد على الأقل للإدراج");
        return;
      }

      exportCancelRef.current = false;
      setIsExporting(true);
      setExportProgress({ done: 0, total: docsToExport.length });
      try {
        const results: string[] = [];
        for (let i = 0; i < docsToExport.length; i++) {
          if (exportCancelRef.current || !openRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, 30)); // Yield to UI
          const doc = docsToExport[i];
          const warped = generateWarpedForDoc(
            doc.corners,
            doc.aspectType,
            false,
            doc.rotation,
            doc.filterMode
          );
          if (warped) {
            results.push(warped.toDataURL("image/png"));
            warped.width = 0;
            warped.height = 0;
          }
          setExportProgress({ done: i + 1, total: docsToExport.length });
        }

        if (exportCancelRef.current || !openRef.current) return;
        if (results.length > 0) {
          onSave(results.length === 1 ? results[0] : results);
          onDone();
        } else {
          toast.error("فشل معالجة المستندات المحددة");
        }
      } finally {
        setIsExporting(false);
        setExportProgress(null);
      }
    },
    [generateWarpedForDoc]
  );

  const resetPreview = useCallback(() => {
    setIsPreviewMode(false);
    setPreviewSrc(null);
  }, []);

  const resetProcessorState = useCallback(() => {
    exportCancelRef.current = true;
    setIsExporting(false);
    setIsPreviewMode(false);
    setPreviewSrc(null);
    setExportProgress(null);
  }, []);

  return {
    isExporting,
    isPreviewMode,
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
