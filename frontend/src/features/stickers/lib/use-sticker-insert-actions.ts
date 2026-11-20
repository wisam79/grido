import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { resolveImageAspectRatio } from '@/lib/canvas/image-dimensions';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';
import { sanitizeSvgMarkup } from '@/lib/utils';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toErrorMessage } from '@/lib/wails-error';

import { generateStickerSheetBlob } from './sheet-generator';
import { stickerRasterSize } from './sticker-text';
import { renderSvgToPngBlob } from './svg-rasterizer';

import type { SheetGridConfig, StickerParams, StickerTemplate } from '../types';
import type { CanvasElement, StickerElementSource } from '@/lib/store/types';
import type { RefObject } from 'react';

const logger = createLogger('use-sticker-insert-actions');

/** ورق الشيت = أبعاد الطباعة الفعالة (A4 الافتراضي) مع احترام الاتجاه — لا مربع ثابت */
export function resolveStickerSheetMm(): { width: number; height: number } {
  const s = useEditorStore.getState().printSettings;
  let w = s.paperWidthMM > 0 ? s.paperWidthMM : 210;
  let h = s.paperHeightMM > 0 ? s.paperHeightMM : 297;
  if (s.orientation === 'landscape' && h > w) [w, h] = [h, w];
  else if (s.orientation === 'portrait' && w > h) [w, h] = [h, w];
  return { width: w, height: h };
}

interface UseStickerInsertActionsParams {
  open: boolean;
  editingElement: { id: string; source: StickerElementSource } | null;
  selectedTemplate: StickerTemplate;
  params: StickerParams;
  svgString: string;
  exportableSvg: string;
  /** حارس الإلغاء المشترك: لا إدراج ولا رسالة نجاح بعد إغلاق النافذة */
  cancelledRef: RefObject<boolean>;
  onOpenChange: (open: boolean) => void;
}

/**
 * مسارات الإدراج في استوديو الملصقات (فردي/شيت) — كانت متمركزة داخل
 * sticker-studio-dialog. المسار ثنائي أولاً: رفع Blob مباشر لخادم الوسائط على
 * سطح المكتب وارتداد Data URL على الويب، وتحديث العنصر نفسه في وضع إعادة
 * التحرير بدل إضافة جديد.
 */
export function useStickerInsertActions({
  open,
  editingElement,
  selectedTemplate,
  params,
  svgString,
  exportableSvg,
  cancelledRef,
  onOpenChange,
}: UseStickerInsertActionsParams) {
  const [isInserting, setIsInserting] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  const [gridConfig, setGridConfig] = useState<SheetGridConfig>({
    rows: 3,
    cols: 3,
    spacingMm: 4,
  });

  const attemptRef = useRef(0);
  const inFlightRef = useRef(false);
  useEffect(() => {
    attemptRef.current += 1;
    inFlightRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsInserting(false);
    setIsGeneratingSheet(false);
    return () => {
      attemptRef.current += 1;
      inFlightRef.current = false;
    };
  }, [open, editingElement?.id, selectedTemplate.id]);

  const beginAttempt = useCallback(() => {
    if (!open || cancelledRef.current || inFlightRef.current) return null;
    inFlightRef.current = true;
    const attempt = ++attemptRef.current;
    const session = getDocumentSession();
    const target = editingElement
      ? useEditorStore.getState().elements.find((e) => e.id === editingElement.id)
      : undefined;
    const isActive = () =>
      attempt === attemptRef.current && !cancelledRef.current && session === getDocumentSession();
    return { attempt, isActive, target };
  }, [open, cancelledRef, editingElement]);

  const handleInsertToCanvas = useCallback(
    async (
      png: Blob,
      isActive: () => boolean,
      target: CanvasElement | undefined,
      vectorSvg?: string,
      isSheet = false,
    ): Promise<boolean> => {
      if (!isActive()) return false;
      // مسار ثنائي أولاً: على سطح المكتب نرفع Blob مباشرة إلى خادم الوسائط
      // (صفر Base64 في V8). على الويب نعود إلى Data URL للتوافق مع الستور.
      let finalSrc: string;
      if (wailsIsDesktop()) {
        try {
          const uploaded = await uploadMediaBlob(png, `${selectedTemplate.id}.png`);
          if (!isActive()) return false;
          finalSrc = uploaded.imageSrc;
        } catch (e) {
          if (!isActive()) return false;
          // فشل خادم الوسائط والاحتياطي معاً لا يضيع عمل المستخدم — نرتد
          // إلى Data URL كما يفعل مسار VDP، والإدراج يكمل.
          logger.error('Failed to save sticker locally on desktop:', e);
          finalSrc = await blobToDataUrl(png);
        }
      } else {
        finalSrc = await blobToDataUrl(png);
      }
      if (!isActive()) return false;

      const aspect = await resolveImageAspectRatio(finalSrc);
      if (!isActive()) return false;
      let store = useEditorStore.getState();

      // وضع إعادة التحرير: نُحدّث صورة العنصر نفسه مع تحديث مصدر الملصق المُعاد ربطه (إلا عند إدراج شيت)
      if (editingElement && !isSheet) {
        const el = store.elements.find((e) => e.id === editingElement.id);
        if (
          !el ||
          el.type !== 'image' ||
          el.locked ||
          !target ||
          target.type !== 'image' ||
          el.imageSrc !== target.imageSrc ||
          el.stickerSource !== target.stickerSource
        ) {
          return false;
        }
        {
          // العنصر القيد إعادة تحريره قد يكون اختفى عن العرض لأن المستخدم دخل وضع
          // الكولاج بعد إدراجه (طبقة العناصر الحرة ترسم في single فقط). نعيده
          // للوضع الحر ليرا نتيجة تعديله فوراً بدل تحديث صامت غير مرئي.
          if (store.mode !== 'single') store.setMode('single');
          store = useEditorStore.getState();
          const canvasRatio = store.canvasHeight > 0 ? store.canvasWidth / store.canvasHeight : 1;
          const nextHeight =
            aspect > 0 && Number.isFinite(aspect) ? (el.width * canvasRatio) / aspect : el.height;
          store.updateElement(el.id, {
            imageSrc: finalSrc,
            height: nextHeight,
            stickerSource: {
              templateId: selectedTemplate.id,
              params: { ...params },
              ...(vectorSvg ? { svg: vectorSvg } : {}),
            },
          } as Partial<CanvasElement>);
          store.pushHistory();
          return true;
        }
      }

      // الإدراج في وضع الكولاج كان يضيف عنصراً غير مرئي (طبقة العناصر ترسم في
      // single فقط) ثم يُمسح صامتاً عند أي تبديل وضع (مسح عناصر الحر P1-19).
      // نفس علاج addImageFromSrc: ننتقل للوضع الحر قبل الإدراج ليبقى عمل المستخدم.
      if (store.mode !== 'single') {
        store.setMode('single');
        toast.info('انتقلت إلى وضع التعديل الحر لإدراج الملصق');
      }
      store.addImageElement(
        finalSrc,
        aspect,
        isSheet
          ? undefined
          : {
              templateId: selectedTemplate.id,
              params: { ...params },
              ...(vectorSvg ? { svg: vectorSvg } : {}),
            },
      );
      return true;
    },
    [editingElement, selectedTemplate.id, params],
  );

  const handleInsertSingle = useCallback(async () => {
    const request = beginAttempt();
    if (!request) return;
    const { attempt, isActive, target } = request;
    try {
      setIsInserting(true);
      const { width, height } = stickerRasterSize(
        selectedTemplate.aspectRatio,
        selectedTemplate.defaultMm,
      );
      const pngBlob = await renderSvgToPngBlob(
        svgString,
        width,
        height,
        [params.fontFamily || 'Cairo'],
        { dpi: 300 },
      );
      if (!isActive()) return;
      const safeSvg = exportableSvg || sanitizeSvgMarkup(svgString);
      const committed = await handleInsertToCanvas(pngBlob, isActive, target, safeSvg);
      if (!committed || !isActive()) return;
      toast.success('أُدرج الملصق');
      onOpenChange(false);
    } catch (err) {
      if (!isActive()) return;
      logger.error('Sticker insert failed:', err);
      toast.error(toErrorMessage(err, 'فشل الإدراج'));
    } finally {
      if (attempt === attemptRef.current) {
        inFlightRef.current = false;
        setIsInserting(false);
      }
    }
  }, [
    svgString,
    exportableSvg,
    selectedTemplate.aspectRatio,
    selectedTemplate.defaultMm,
    params.fontFamily,
    handleInsertToCanvas,
    beginAttempt,
    onOpenChange,
  ]);

  const handleInsertSheet = useCallback(async () => {
    const request = beginAttempt();
    if (!request) return;
    const { attempt, isActive, target } = request;
    const sheetMm = resolveStickerSheetMm();
    try {
      setIsGeneratingSheet(true);
      const { width, height } = stickerRasterSize(
        selectedTemplate.aspectRatio,
        selectedTemplate.defaultMm,
      );
      const singlePng = await renderSvgToPngBlob(
        svgString,
        width,
        height,
        [params.fontFamily || 'Cairo'],
        { dpi: 300 },
      );
      // شيت يطابق نسبة ورق الطباعة الحالية (A4 الافتراضي 210×297) بدل مربع ثابت —
      // يُدرج على الكانفس بلا هوامش فارغة، وعلامات القص بالمليمتر النظامي
      if (!isActive()) return;
      const sheetPng = await generateStickerSheetBlob(singlePng, {
        rows: gridConfig.rows,
        cols: gridConfig.cols,
        spacingMm: gridConfig.spacingMm,
        sheetWidthMm: sheetMm.width,
        sheetHeightMm: sheetMm.height,
        dpi: 300,
        // ✂️ السقف الفيزيائي: الملصق يُطبع بمقاسه المعلن لا بمقاس الخلية —
        // التمدد كان يكبّره فوق راستر 300DPI فيلين الحواف
        stickerWidthMm: selectedTemplate.defaultMm?.width,
        stickerHeightMm: selectedTemplate.defaultMm?.height,
      });
      if (!isActive()) return;
      const safeSvg = exportableSvg || sanitizeSvgMarkup(svgString);
      const committed = await handleInsertToCanvas(sheetPng, isActive, target, safeSvg, true);
      if (!committed || !isActive()) return;
      toast.success(`أُدرج شيت (${gridConfig.rows * gridConfig.cols} ملصقات)`);
      onOpenChange(false);
    } catch (err) {
      if (!isActive()) return;
      logger.error('Sticker sheet generation failed:', err);
      toast.error(toErrorMessage(err, 'فشل توليد الشيت'));
    } finally {
      if (attempt === attemptRef.current) {
        inFlightRef.current = false;
        setIsGeneratingSheet(false);
      }
    }
  }, [
    svgString,
    exportableSvg,
    selectedTemplate.aspectRatio,
    selectedTemplate.defaultMm,
    params.fontFamily,
    gridConfig,
    handleInsertToCanvas,
    beginAttempt,
    onOpenChange,
  ]);

  return {
    isInserting,
    isGeneratingSheet,
    gridConfig,
    setGridConfig,
    handleInsertSingle,
    handleInsertSheet,
  };
}
