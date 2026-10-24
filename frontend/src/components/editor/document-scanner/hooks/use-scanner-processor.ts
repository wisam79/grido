import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { warpDocumentViaGo, formatScannerWarpError } from '../core/warp-client';

import type { Point, DocumentAspectType, ScannerFilterMode } from '../core';

/**
 * 🧭 معالجة الماسح النهائية — المرحلة 2 من خطة الترحيل
 * (docs/plans/neural-scanner-warp-migration-spec.md §7).
 *
 * الاستعدال يحدث حصراً في Go عبر `/api/scanner-warp`: الواجهة ترسل مسار
 * الوسائط والأركان فقط وتستقبل رابط `/local-image/` جاهزاً للعرض/الإدراج
 * (bitmap خارج V8). **لا يبقى أي مسار استعدال داخل V8** — لا كانفاس بدقة
 * المصدر على الخيط الرئيسي (إعدام C-5)، ولا Blob/ImageData كاملة (قاعدة B6:
 * صفر بكسل استعدال في V8). عقد onSave تحوّل من Blob إلى URL.
 */

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

  // روابط نتائج الاستعدال (media URLs تُديرها خدمة Go — لا revokeObjectURL).
  const previewUrlRef = useRef<string | null>(null);

  const revokePreviewUrl = useCallback(() => {
    // روابط /local-image/ ملفات دائمة على القرص تُنظّف دورياً بواسطة خدمة
    // الوسائط — لا نستدعي revoke (يخص blob: URLs حصراً) ونصفّر المرجع فقط.
    previewUrlRef.current = null;
  }, []);

  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
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
    }
  }, [open, revokePreviewUrl]);

  // 🧹 تفكيك: تصفير المراجع (لا عامل ويب يبقى بعد الترحيل — Go يحلّه).
  useEffect(
    () => () => {
      previewUrlRef.current = null;
    },
    [],
  );

  /**
   * 🔄 الاستعدال عبر Go — المسار الوحيد (خطة §4.2). يُرجع رابط وسائط محلي
   * جاهزاً للإدراج، أو null بعد عرض رسالة عربية قابلة للحل.
   */
  const generateWarpedUrlForDoc = useCallback(
    async (
      docCorners: Point[],
      docAspect: DocumentAspectType,
      isPreview = false,
      docRotation?: number,
      docFilter?: ScannerFilterMode,
    ): Promise<string | null> => {
      const img = imgRef.current;
      if (!img || docCorners.length !== 4) return null;

      const effectiveFilter = docFilter || fallbackFilter;
      const rotToApply = docRotation !== undefined ? docRotation : fallbackRotation;

      try {
        const result = await warpDocumentViaGo(
          img,
          docCorners,
          docAspect,
          isPreview,
          effectiveFilter,
          rotToApply,
        );
        return result.url;
      } catch (error) {
        if (!openRef.current || exportCancelRef.current) return null;
        toast.error(formatScannerWarpError(error));
        return null;
      }
    },
    [imgRef, fallbackFilter, fallbackRotation],
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
        const url = await generateWarpedUrlForDoc(corners, aspect, true);
        if (!url || !openRef.current) {
          if (!url && (corners.length !== 4 || !imgRef.current)) {
            toast.error('حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط');
          }
          return;
        }
        previewUrlRef.current = url;
        setPreviewSrc(url);
        setIsPreviewMode(true);
      } finally {
        setIsPreviewing(false);
      }
    },
    [isPreviewMode, isPreviewing, generateWarpedUrlForDoc, imgRef],
  );

  const handleApplyActive = useCallback(
    async (
      corners: Point[],
      aspect: DocumentAspectType,
      onSave: (url: string) => void,
      onDone: () => void,
    ) => {
      exportCancelRef.current = false;
      setIsExporting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const url = await generateWarpedUrlForDoc(corners, aspect, false);
        if (exportCancelRef.current || !openRef.current) return;
        if (url) {
          onSave(url);
          onDone();
        } else if (corners.length !== 4 || !imgRef.current) {
          toast.error('حدّد أركان المستند أولاً — اسحب النقاط أو اضغط إعادة ضبط');
        }
      } finally {
        setIsExporting(false);
      }
    },
    [generateWarpedUrlForDoc, imgRef],
  );

  const handleApplySelected = useCallback(
    async (
      docsToExport: {
        corners: Point[];
        aspectType: DocumentAspectType;
        rotation?: number;
        filterMode?: ScannerFilterMode;
      }[],
      onSave: (result: string | string[]) => void,
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
        const results: string[] = [];
        for (let i = 0; i < docsToExport.length; i++) {
          if (exportCancelRef.current || !openRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, 30)); // Yield to UI
          const doc = docsToExport[i];
          const url = await generateWarpedUrlForDoc(
            doc.corners,
            doc.aspectType,
            false,
            doc.rotation,
            doc.filterMode,
          );
          if (exportCancelRef.current || !openRef.current) break;
          if (url) {
            results.push(url);
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
    [generateWarpedUrlForDoc],
  );

  const resetPreview = useCallback(() => {
    setIsPreviewMode(false);
    setPreviewSrc(null);
    revokePreviewUrl();
  }, [revokePreviewUrl]);

  const resetProcessorState = useCallback(() => {
    exportCancelRef.current = true;
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
    generateWarpedUrlForDoc,
    handleTogglePreview,
    handleApplyActive,
    handleApplySelected,
    resetPreview,
    resetProcessorState,
  };
}
