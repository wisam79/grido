import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Point,
  DocumentAspectType,
  ScannerFilterMode,
  warpPerspective,
  rotateCanvas,
} from "../core";

/**
 * 🧭 معالجة الماسح النهائية: استعدال المنظور بأبعاد حقيقية ديناميكية لكل
 * نوع مستند (A4/بطاقة/مربع)، التدوير، المعاينة السريعة، والتصدير المفرد/المتعدد.
 * كانت هذه الكتلة (generateWarpedForDoc + handlers) مضمّنة في Dialog.
 */
export function useScannerProcessor(
  imgRef: React.RefObject<HTMLImageElement | null>,
  fallbackFilter: ScannerFilterMode,
  fallbackRotation: number
) {
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

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

      let targetW: number | undefined;
      let targetH: number | undefined;

      if (isPreview) {
        const maxDim = 800;
        const s = Math.min(1, maxDim / Math.max(maxEdgeW, maxEdgeH, 1));
        targetW = Math.round(maxEdgeW * s);
        targetH = Math.round(maxEdgeH * s);
      } else {
        targetW = maxEdgeW;
        targetH = maxEdgeH;
      }

      if (docAspect === "a4_p") {
        if (isPreview) {
          targetW = 620;
          targetH = 877;
        } else {
          const baseW = Math.max(1400, maxEdgeW);
          targetW = baseW;
          targetH = Math.round(baseW * Math.SQRT2);
        }
      } else if (docAspect === "a4_l") {
        if (isPreview) {
          targetW = 877;
          targetH = 620;
        } else {
          const baseW = Math.max(1980, maxEdgeW);
          targetW = baseW;
          targetH = Math.round(baseW / Math.SQRT2);
        }
      } else if (docAspect === "id_card") {
        if (isPreview) {
          targetW = 500;
          targetH = 315;
        } else {
          const baseW = Math.max(1200, maxEdgeW);
          targetW = baseW;
          targetH = Math.round(baseW / (85.60 / 53.98));
        }
      } else if (docAspect === "square") {
        const avg = isPreview ? 600 : Math.max(1200, Math.round((maxEdgeW + maxEdgeH) / 2));
        targetW = avg;
        targetH = avg;
      }

      const effectiveFilter = docFilter || fallbackFilter;
      const resCanvas = warpPerspective(
        srcCtx,
        img.naturalWidth,
        img.naturalHeight,
        docCorners,
        targetW,
        targetH,
        effectiveFilter
      );

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
      setIsExporting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const warped = generateWarpedForDoc(corners, aspect, false);
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

      setIsExporting(true);
      try {
        const results: string[] = [];
        for (const doc of docsToExport) {
          await new Promise((resolve) => setTimeout(resolve, 30)); // Yield to UI
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
        }

        if (results.length > 0) {
          onSave(results.length === 1 ? results[0] : results);
          onDone();
        } else {
          toast.error("فشل معالجة المستندات المحددة");
        }
      } finally {
        setIsExporting(false);
      }
    },
    [generateWarpedForDoc]
  );

  const resetPreview = useCallback(() => {
    setIsPreviewMode(false);
    setPreviewSrc(null);
  }, []);

  return {
    isExporting,
    isPreviewMode,
    previewSrc,
    setIsPreviewMode,
    generateWarpedForDoc,
    handleTogglePreview,
    handleApplyActive,
    handleApplySelected,
    resetPreview,
  };
}
