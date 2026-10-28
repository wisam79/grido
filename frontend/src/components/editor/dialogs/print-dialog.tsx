import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/huge-icon';
import {
  Printer,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Gear,
  FloppyDisk,
  WarningCircle,
} from '@/components/ui/icons';
import { PageOrientationIcon } from '@/components/ui/image-icons';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrintLayout } from '@/hooks/use-print-layout';
import { useStageRef } from '@/lib/canvas/stage-context';
import { useEditorStore } from '@/lib/editor-store';
import { createLogger } from '@/lib/logger';
import { triggerMemoryTrim } from '@/lib/memory-trim';
import { DEFAULT_PRINT_SETTINGS } from '@/lib/store/slices/print-slice';
import { ALL_PAPER_SIZES } from '@/lib/templates/constants';
import { cn } from '@/lib/utils';
import { toErrorMessage } from '@/lib/wails-error';
import {
  GetPrinters,
  GetDefaultPrinterName,
  OpenPrinterPreferences,
  GetSupportedPapers,
} from '../../../../wailsjs/go/handlers/PrintHandler';
import { SheetPreview } from '../print/print-preview';
import { usePrintExport } from '../print/use-print-export';
import type { SupportedPaperInfo } from '@bindings/grido/internal/core/domain';
import type Konva from 'konva';

const logger = createLogger('print-dialog');

/** مفتاح حفظ الطابعة المختارة بين الجلسات (هدف «الخصائص» والطباعة المباشرة). */
const PRINT_PRINTER_STORAGE_KEY = 'grido-print-selected-printer';

function readStoredPrinter(): string {
  try {
    return localStorage.getItem(PRINT_PRINTER_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storePrinter(name: string): void {
  try {
    localStorage.setItem(PRINT_PRINTER_STORAGE_KEY, name);
  } catch {
    /* التخزين غير متاح — لا نُفشل الاختيار */
  }
}

function getDriverPaperKey(p: SupportedPaperInfo): string {
  return `driver:${p.id}:${p.name}`;
}

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintDialog({ open, onOpenChange }: PrintDialogProps) {
  const stageRef = useStageRef();
  const {
    template,
    canvasWidth,
    canvasHeight,
    printSettings,
    setPrintSettings,
    elements,
    slots,
    mode,
    backgroundColor,
    backgroundGradientColor2,
    backgroundGradientAngle,
    collageTemplate,
    collageMargin,
    collageGap,
    collageRadius,
    collageStrokeWidth,
    collageStrokeColor,
    collageShowCutLines,
    collageShowEndCutLine,
  } = useEditorStore(
    useShallow((state) => ({
      template: state.template,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
      setPrintSettings: state.setPrintSettings,
      elements: state.elements,
      slots: state.slots,
      mode: state.mode,
      backgroundColor: state.backgroundColor,
      backgroundGradientColor2: state.backgroundGradientColor2,
      backgroundGradientAngle: state.backgroundGradientAngle,
      collageTemplate: state.collageTemplate,
      collageMargin: state.collageMargin,
      collageGap: state.collageGap,
      collageRadius: state.collageRadius,
      collageStrokeWidth: state.collageStrokeWidth,
      collageStrokeColor: state.collageStrokeColor,
      collageShowCutLines: state.collageShowCutLines,
      collageShowEndCutLine: state.collageShowEndCutLine,
    })),
  );

  const [zoom, setZoom] = useState(1);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [previewImageSrc, setPreviewImageSrc] = useState<string>('');
  const savedSelectionRef = useRef<string[] | null>(null);

  const [lastNonZeroMargin, setLastNonZeroMargin] = useState<number>(() =>
    printSettings.marginMM > 0 ? printSettings.marginMM : DEFAULT_PRINT_SETTINGS.marginMM || 5,
  );

  const [printers, setPrinters] = useState<Array<{ name: string; isDefault: boolean }>>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isOpeningPrefs, setIsOpeningPrefs] = useState(false);
  // 🖨️ فضاء ألوان CMYK يُصدَّر TIFF بفصل أحبار للمطابع بدل الإرسال لطابور GDI
  const isCmykPrint = (printSettings.colorSpace || 'sRGB') === 'CMYK';

  const [supportedPapers, setSupportedPapers] = useState<SupportedPaperInfo[]>([]);

  // استعلام قوالب الورق المدعومة من الطابعة المختارة لاستخراج اسم القالب الأنسب
  useEffect(() => {
    if (!open || !selectedPrinter || typeof GetSupportedPapers !== 'function') {
      return;
    }
    let cancelled = false;
    GetSupportedPapers(selectedPrinter)
      .then((res) => {
        if (!cancelled && res?.success && Array.isArray(res.papers)) {
          setSupportedPapers(res.papers);
        }
      })
      .catch((err) => {
        logger.warn('Failed to query supported papers:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedPrinter]);

  // 🖨️ التحديد المبدئي يطابق طابعة النظام الافتراضية — الاختيار هنا يحدد هدف
  // زر «الخصائص» وهدف الطباعة المباشرة معاً؛ الطباعة العادية تُمرَّر لحوار النظام.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (typeof GetPrinters === 'function') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingPrinters(true);
      GetPrinters()
        .then(async (res) => {
          if (cancelled) return;
          if (res?.success && Array.isArray(res.printers) && res.printers.length > 0) {
            setPrinters(res.printers);
            const names = new Set(res.printers.map((p) => p.name));
            let next = '';
            // أولوية الاحتفاظ: اختيار محفوظ من جلسة سابقة، ثم وسم isDefault
            const stored = readStoredPrinter();
            if (stored && names.has(stored)) next = stored;
            if (!next) {
              const def = res.printers.find((p) => p.isDefault);
              if (def) next = def.name;
            }
            // بعض السائقين لا تحمل وسم isDefault — نطابق طابعة النظام بالاسم
            if (!next && typeof GetDefaultPrinterName === 'function') {
              try {
                const sysDefault = await GetDefaultPrinterName();
                if (cancelled) return;
                if (sysDefault && names.has(sysDefault)) next = sysDefault;
              } catch {
                /* تجاهل: لا نُفشل الحوار لأجل المزامنة */
              }
            }
            if (!next) next = res.printers[0].name;
            setSelectedPrinter((prev) => (prev && names.has(prev) ? prev : next));
          } else if (typeof GetDefaultPrinterName === 'function') {
            // فشل استعلام القائمة: نعرض الطابعة الافتراضية وحدها بدل قائمة فارغة صامتة
            try {
              const sysDefault = await GetDefaultPrinterName();
              if (cancelled) return;
              if (sysDefault) {
                setPrinters([{ name: sysDefault, isDefault: true }]);
                setSelectedPrinter((prev) => prev || sysDefault);
              }
            } catch {
              /* تجاهل */
            }
          }
        })
        .catch((err) => {
          logger.error('Failed to query system printers:', err);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingPrinters(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handlePrinterChange = (name: string) => {
    setSelectedPrinter(name);
    storePrinter(name);
  };

  const handleOpenPreferences = async () => {
    if (typeof OpenPrinterPreferences !== 'function') return;
    try {
      setIsOpeningPrefs(true);
      const res = await OpenPrinterPreferences(selectedPrinter);
      if (res && !res.success) {
        toast.error('تعذر فتح تفضيلات الطابعة: ' + (res.error || 'خطأ غير معروف'));
      }
    } catch (err) {
      logger.error('Failed to open printer preferences:', err);
      toast.error(toErrorMessage(err, 'حدث خطأ أثناء محاولة فتح تفضيلات الطابعة'));
    } finally {
      setIsOpeningPrefs(false);
    }
  };

  const layout = usePrintLayout({
    template,
    printSettings,
    canvasWidth,
    canvasHeight,
    mode,
    collageTemplate,
  });

  const {
    imageWidthMM,
    imageHeightMM,
    gapMM,
    actualCopies,
    availableWidthMM,
    availableHeightMM,
    effectiveMarginMM,
    grid,
    paperWidth,
    paperHeight,
  } = layout;

  const exporter = usePrintExport({
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
    printDpi: printSettings.dpi,
    printShowCutLines: printSettings.showCutLines,
    printShowEndCutLine: printSettings.showEndCutLine,
    printCutLineStyle: printSettings.cutLineStyle || 'dashed',
    printOrientation: printSettings.orientation,
    printColorSpace: printSettings.colorSpace || 'sRGB',
  });
  const { isExporting, cancelExport, handlePrint } = exporter;

  useEffect(() => {
    if (open) {
      if (typeof window !== 'undefined') {
        const win = window as Window & { __gridoPrintCleanup?: (() => void) | null };
        win.__gridoPrintCleanup?.();
      }
      cancelExport();
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.pointerEvents = '';
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setZoom(1);
      const st = useEditorStore.getState();
      savedSelectionRef.current = [...(st.selectedIds ?? [])];
      st.selectElement(null);

      // 🧭 ملاءمة ذكية لاتجاه الورقة مع أبعاد الكانفاس الحالية عند الفتح
      const isCanvasLandscape = st.canvasWidth > st.canvasHeight;
      const targetOrientation = isCanvasLandscape ? 'landscape' : 'portrait';
      if (
        st.printSettings.paperId === 'canvas' &&
        st.printSettings.orientation !== targetOrientation
      ) {
        st.setPrintSettings({
          orientation: targetOrientation,
        });
      }
    } else {
      cancelExport();
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.pointerEvents = '';
      }
      const saved = savedSelectionRef.current;
      savedSelectionRef.current = null;
      if (saved && saved.length > 0) {
        const st = useEditorStore.getState();
        const alive = saved.filter((id) => st.elements.some((el) => el.id === id));
        if (alive.length > 0) st.setSelectedIds(alive);
      }
    }
  }, [open, cancelExport]);

  // ضمان تحرير أي قفل pointer-events عند تفكيك المكون
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.pointerEvents = '';
      }
    };
  }, []);

  useEffect(() => {
    if (printSettings.marginMM > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastNonZeroMargin(printSettings.marginMM);
    }
  }, [printSettings.marginMM]);

  const hasContent =
    mode === 'collage' ? slots.some((s) => Boolean(s.imageSrc)) : elements.length > 0;

  // 🛡️ بلا جراحة DOM: الإزالة اليدوية عبر querySelector كانت تحذف عقدة
  // أول حوار في المستند — مع تكديس المودالات قد تمحو حواراً آخر وتكسر
  // مصالحة React (البوابة + unmount الخاص بـ Radix يكفيان).
  const handleDismiss = useCallback(() => {
    cancelExport();
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.pointerEvents = '';
    }
    onOpenChange(false);
  }, [cancelExport, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🛡️ بلا فرع Escape هنا: ضغطة واحدة كانت تُطلق الإغلاق 2-3 مرات
      // (المستمع + onEscapeKeyDown + onOpenChange) — Escape حصرياً لـ Radix.
      if (e.key === 'Enter' && !isExporting && hasContent) {
        if (e.defaultPrevented) return;
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('input, select, textarea, button, [role="combobox"]')) return;
        e.preventDefault();
        exporter.handlePrintRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isExporting, hasContent, exporter]);

  // تطهير وإلغاء تكرار قوالب الورق المسترجعة من درايفر الطابعة
  const sanitizedDriverPapers = useMemo(() => {
    if (!supportedPapers || supportedPapers.length === 0) return [];
    const seen = new Set<string>();
    return supportedPapers.filter((p) => {
      if (!p.name || p.widthMM <= 10 || p.heightMM <= 10) return false;
      const key = `${p.id}:${p.name.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [supportedPapers]);

  // مطابقة قالب الورق المدعوم من الطابعة مع مقاس الورقة الحالي
  const matchedPaper = useMemo(() => {
    if (!supportedPapers.length) return null;

    if (printSettings.paperId?.startsWith('driver:')) {
      const directMatch = supportedPapers.find(
        (p) => getDriverPaperKey(p) === printSettings.paperId,
      );
      if (directMatch) return directMatch;
    }

    const targetW = paperWidth;
    const targetH = paperHeight;
    const isBorderless = effectiveMarginMM === 0;

    const matches = supportedPapers.filter((p) => {
      return (
        (Math.abs(p.widthMM - targetW) <= 2.5 && Math.abs(p.heightMM - targetH) <= 2.5) ||
        (Math.abs(p.widthMM - targetH) <= 2.5 && Math.abs(p.heightMM - targetW) <= 2.5)
      );
    });

    if (isBorderless) {
      const borderlessMatch = matches.find((p) => p.isBorderless);
      if (borderlessMatch) return borderlessMatch;
    }
    return matches[0] || null;
  }, [supportedPapers, printSettings.paperId, paperWidth, paperHeight, effectiveMarginMM]);

  // استنتاج القيمة المحددة في قائمة اختيار مقاس الورق
  const selectedPaperValue = useMemo(() => {
    const currentId = printSettings.paperId || 'canvas';
    if (currentId === 'canvas') return 'canvas';

    if (currentId.startsWith('driver:')) {
      const exists = sanitizedDriverPapers.some((p) => getDriverPaperKey(p) === currentId);
      if (exists) return currentId;
    }

    if (sanitizedDriverPapers.length > 0) {
      const std = ALL_PAPER_SIZES.find((p) => p.id === currentId);
      const targetW = std ? std.widthMM : printSettings.paperWidthMM;
      const targetH = std ? std.heightMM : printSettings.paperHeightMM;

      const matched = sanitizedDriverPapers.find((p) => {
        if (currentId === 'a4' && (p.id === 9 || p.name.trim().toLowerCase() === 'a4')) {
          return true;
        }
        if (currentId === 'letter' && (p.id === 1 || p.name.trim().toLowerCase() === 'letter')) {
          return true;
        }
        if (currentId === 'a3' && (p.id === 8 || p.name.trim().toLowerCase() === 'a3')) {
          return true;
        }
        if (currentId === 'a5' && (p.id === 11 || p.name.trim().toLowerCase() === 'a5')) {
          return true;
        }
        return (
          (Math.abs(p.widthMM - targetW) <= 2.5 && Math.abs(p.heightMM - targetH) <= 2.5) ||
          (Math.abs(p.widthMM - targetH) <= 2.5 && Math.abs(p.heightMM - targetW) <= 2.5)
        );
      });
      if (matched) return getDriverPaperKey(matched);
    }

    if (ALL_PAPER_SIZES.some((p) => p.id === currentId)) {
      return currentId;
    }

    return 'canvas';
  }, [
    printSettings.paperId,
    printSettings.paperWidthMM,
    printSettings.paperHeightMM,
    sanitizedDriverPapers,
  ]);

  const selectedPaperLabel =
    selectedPaperValue === 'canvas'
      ? 'مقاس التصميم'
      : (sanitizedDriverPapers.find((paper) => getDriverPaperKey(paper) === selectedPaperValue)
          ?.name ?? ALL_PAPER_SIZES.find((paper) => paper.id === selectedPaperValue)?.name);

  useEffect(() => {
    exporter.setPrintInvocation({
      effectiveMarginMM,
      onDone: () => onOpenChange(false),
      options: {
        printerName: selectedPrinter,
        formName: matchedPaper?.name,
        paperId: matchedPaper?.id,
        borderless: matchedPaper?.isBorderless ?? false,
      },
    });
  }, [exporter, effectiveMarginMM, onOpenChange, selectedPrinter, matchedPaper]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'collage') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewImageSrc('');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const generatePreview = () => {
      if (cancelled) return;
      const stage = stageRef.current;
      if (!stage || stage.width() <= 0) {
        if (attempts < 3) {
          attempts++;
          retryTimer = setTimeout(generatePreview, 80);
        } else {
          const freshElements = useEditorStore.getState().elements;
          const firstImg = freshElements.find(
            (el): el is import('@/lib/store/types').ImageElement =>
              el.type === 'image' && Boolean(el.imageSrc),
          );
          if (firstImg?.imageSrc) {
            setPreviewImageSrc(firstImg.imageSrc);
          }
        }
        return;
      }

      const transformers = stage.find('Transformer');
      const gridLayers = stage.find('.grid-layer');
      const columnsLayers = stage.find('.columns-layer');
      const guideLayers = stage.find('.guides-layer, .guide-line, .user-guide-line');
      const paperShadows = stage.find('.paper-shadow-rect');
      const overlayTools = stage.find('.overlay-tools-layer');

      const prevPos = { x: stage.x(), y: stage.y() };
      const prevScale = { x: stage.scaleX(), y: stage.scaleY() };
      stage.position({ x: 0, y: 0 });
      stage.scale({ x: 1, y: 1 });

      try {
        const { canvasWidth: cw, canvasHeight: ch } = useEditorStore.getState();
        const paperW = Math.max(cw || 1, 1);
        const paperH = Math.max(ch || 1, 1);
        const targetWidth = 400;
        const pRatio = Math.min(1, targetWidth / paperW);

        transformers.forEach((tr: Konva.Node) => tr.hide());
        gridLayers.forEach((gl: Konva.Node) => gl.hide());
        columnsLayers.forEach((cl: Konva.Node) => cl.hide());
        guideLayers.forEach((gl: Konva.Node) => gl.hide());
        paperShadows.forEach((ps: Konva.Node) => ps.hide());
        overlayTools.forEach((ot: Konva.Node) => ot.hide());
        stage.batchDraw();

        const previewUrl = stage.toDataURL({
          x: 0,
          y: 0,
          width: paperW,
          height: paperH,
          pixelRatio: pRatio,
          mimeType: 'image/jpeg',
          quality: 0.8,
        });

        if (cancelled) return;
        if (previewUrl) {
          setPreviewImageSrc(previewUrl);
        }
      } catch (err) {
        logger.error('Failed to generate print preview image:', err);
        const freshElements = useEditorStore.getState().elements;
        const firstImg = freshElements.find(
          (el): el is import('@/lib/store/types').ImageElement =>
            el.type === 'image' && Boolean(el.imageSrc),
        );
        if (firstImg?.imageSrc) {
          setPreviewImageSrc(firstImg.imageSrc);
        }
      } finally {
        transformers.forEach((tr: Konva.Node) => tr.show());
        gridLayers.forEach((gl: Konva.Node) => gl.show());
        columnsLayers.forEach((cl: Konva.Node) => cl.show());
        guideLayers.forEach((gl: Konva.Node) => gl.show());
        paperShadows.forEach((ps: Konva.Node) => ps.show());
        overlayTools.forEach((ot: Konva.Node) => ot.show());
        stage.position(prevPos);
        stage.scale(prevScale);
        stage.batchDraw();
      }
    };

    const timer = setTimeout(generatePreview, 30);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [open, stageRef, mode]);

  const spaceUsedPercent = Math.round(
    ((actualCopies * imageWidthMM * imageHeightMM) / (availableWidthMM * availableHeightMM)) * 100,
  );
  const isOverflowing =
    spaceUsedPercent > 101 ||
    imageWidthMM > availableWidthMM + 0.5 ||
    imageHeightMM > availableHeightMM + 0.5;

  const attachPreviewViewport = useCallback((node: HTMLDivElement | null) => {
    previewViewportRef.current = node;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setPreviewSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      previewViewportRef.current = null;
    };
  }, []);

  const scaleFactor =
    previewSize.width > 0 && previewSize.height > 0
      ? Math.min(
          Math.max(1, previewSize.width - 64) / Math.max(paperWidth, 1),
          Math.max(1, previewSize.height - 64) / Math.max(paperHeight, 1),
        )
      : Math.min(1.4, 420 / Math.max(paperHeight, 1));
  const cutLinesActive = mode === 'collage' ? collageShowCutLines : printSettings.showCutLines;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelExport();
          if (typeof document !== 'undefined' && document.body) {
            document.body.style.pointerEvents = '';
          }
          triggerMemoryTrim();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-24px)] sm:max-w-[1280px] h-[calc(100dvh-32px)] sm:max-h-[920px] overflow-hidden flex flex-col border border-border/60 bg-card rounded-xl shadow-fluent-16 p-0 gap-0 font-cairo pointer-events-auto data-[state=closed]:duration-75"
        dir="rtl"
        onEscapeKeyDown={(e) => {
          if (e.defaultPrevented) return;
          handleDismiss();
        }}
        onPointerDownOutside={(e) => {
          if (isExporting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="px-4 h-12 justify-center border-b border-border/60 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-sm font-semibold text-foreground truncate">
              إعداد ومعاينة الطباعة
            </DialogTitle>
            <DialogDescription className="sr-only">
              اختيار الطابعة وتجهيز الورقة ومراجعتها قبل الطباعة
            </DialogDescription>

            <DialogCloseButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-1 md:grid-cols-[304px_minmax(0,1fr)] overflow-hidden">
          <aside
            aria-label="إعدادات الطباعة"
            className="order-2 md:order-none min-h-0 overflow-y-auto border-t md:border-t-0 md:border-e border-border/60 bg-card select-none"
          >
            <section className="p-4 flex flex-col gap-3 border-b border-border/60">
              <h3 className="text-xs font-semibold">الطابعة</h3>

              {/* صف اختيار الطابعة وزر الخصائص جنباً إلى جنب */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedPrinter}
                    onValueChange={handlePrinterChange}
                    disabled={isLoadingPrinters || printers.length === 0}
                  >
                    <SelectTrigger
                      aria-label="اختيار الطابعة"
                      className="h-8 text-xs bg-background border-border/60 shadow-none rounded-md w-full"
                    >
                      <SelectValue
                        placeholder={isLoadingPrinters ? 'جاري البحث ...' : 'اختر الطابعة'}
                      >
                        {selectedPrinter || undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-(--z-print-toolbar)" dir="rtl">
                      {printers.map((p) => (
                        <SelectItem
                          key={p.name}
                          value={p.name}
                          className="text-xs font-semibold cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span className="truncate">{p.name}</span>
                            {p.isDefault && (
                              <span className="text-micro font-normal px-1 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                                افتراضية
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPreferences}
                  disabled={isOpeningPrefs || !selectedPrinter}
                  aria-label="الخصائص: نوع الورق والجودة"
                  title="الخصائص: نوع الورق والجودة"
                  className="h-8 px-2 text-xs shrink-0 gap-1.5 bg-background hover:bg-muted border-border/60 rounded-md shadow-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  {isOpeningPrefs ? (
                    <Spinner className="w-3.5 h-3.5 text-muted-foreground" size={14} />
                  ) : (
                    <Gear className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />
                  )}
                  <span>الخصائص</span>
                </Button>
              </div>

              {matchedPaper && (
                <div className="flex items-center gap-1.5 text-micro text-muted-foreground/80 px-0.5">
                  <span className="font-semibold text-foreground/80">قالب الطابعة:</span>
                  <span className="truncate">{matchedPaper.name}</span>
                  {effectiveMarginMM === 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded text-micro font-medium shrink-0',
                        matchedPaper.isBorderless
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning',
                      )}
                    >
                      {matchedPaper.isBorderless ? 'بدون حواف' : 'قد لا يدعم الحواف الصفرية'}
                    </span>
                  )}
                </div>
              )}
              {!isLoadingPrinters && printers.length === 0 && (
                <p className="text-mini text-muted-foreground" role="status">
                  قائمة الطابعات غير متاحة
                </p>
              )}
            </section>

            <section className="p-4 flex flex-col gap-3 border-b border-border/60">
              <h3 className="text-xs font-semibold">الورقة والاتجاه</h3>

              <Select
                value={selectedPaperValue}
                onValueChange={(val) => {
                  if (val === 'canvas') {
                    const isCanvasLandscape = (imageWidthMM || 210) > (imageHeightMM || 297);
                    setPrintSettings({
                      paperId: 'canvas',
                      paperWidthMM: imageWidthMM || 210,
                      paperHeightMM: imageHeightMM || 297,
                      orientation: isCanvasLandscape ? 'landscape' : 'portrait',
                      marginMM: 0,
                    });
                    return;
                  }

                  if (val.startsWith('driver:')) {
                    const driverPaper = sanitizedDriverPapers.find(
                      (p) => getDriverPaperKey(p) === val,
                    );
                    if (driverPaper) {
                      setPrintSettings({
                        paperId: val,
                        paperWidthMM: driverPaper.widthMM,
                        paperHeightMM: driverPaper.heightMM,
                        ...(driverPaper.isBorderless ? { marginMM: 0 } : {}),
                      });
                      return;
                    }
                  }

                  const selected = ALL_PAPER_SIZES.find((p) => p.id === val);
                  if (selected) {
                    setPrintSettings({
                      paperId: selected.id,
                      paperWidthMM: selected.widthMM,
                      paperHeightMM: selected.heightMM,
                    });
                  }
                }}
              >
                <SelectTrigger
                  aria-label="مقاس الورقة"
                  className="h-8 text-xs bg-background border-border/60 shadow-none rounded-md w-full"
                >
                  <SelectValue placeholder="مقاس الورقة">{selectedPaperLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="z-(--z-print-toolbar) max-h-72" dir="rtl">
                  <SelectItem
                    value="canvas"
                    className="text-xs font-bold text-primary cursor-pointer"
                  >
                    {`الكانفاس (${Math.round(imageWidthMM || 0)} × ${Math.round(imageHeightMM || 0)} مم)`}
                  </SelectItem>

                  {sanitizedDriverPapers.length > 0
                    ? sanitizedDriverPapers.map((paper) => {
                        const val = getDriverPaperKey(paper);
                        return (
                          <SelectItem
                            key={val}
                            value={val}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span>{paper.name}</span>
                                {paper.isBorderless && (
                                  <span className="text-micro font-medium bg-primary/10 text-primary px-1 rounded">
                                    بدون حواف
                                  </span>
                                )}
                              </div>
                              <span
                                className="text-micro font-mono text-muted-foreground shrink-0"
                                dir="ltr"
                              >
                                {paper.widthMM} × {paper.heightMM} مم
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })
                    : ALL_PAPER_SIZES.map((size) => (
                        <SelectItem
                          key={size.id}
                          value={size.id}
                          className="text-xs font-semibold cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{size.name}</span>
                            <span className="text-micro font-mono text-muted-foreground" dir="ltr">
                              {size.widthMM} × {size.heightMM} مم
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>

              {/* مبدل الاتجاه المنقسم (Segmented Orientation Control) */}
              <div className="grid grid-cols-2 p-0.5 rounded-md bg-muted/40 border border-border/40 gap-1">
                <button
                  type="button"
                  onClick={() => setPrintSettings({ orientation: 'portrait' })}
                  title="اتجاه رأسي (عمودي)"
                  aria-label="اتجاه رأسي (عمودي)"
                  aria-pressed={printSettings.orientation !== 'landscape'}
                  className={cn(
                    'h-7 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    printSettings.orientation !== 'landscape'
                      ? 'bg-background text-foreground shadow-2xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
                  )}
                >
                  <PageOrientationIcon isLandscape={false} className="w-3.5 h-3.5" />
                  <span>رأسي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSettings({ orientation: 'landscape' })}
                  title="اتجاه أفقي (عرضي)"
                  aria-label="اتجاه أفقي (عرضي)"
                  aria-pressed={printSettings.orientation === 'landscape'}
                  className={cn(
                    'h-7 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    printSettings.orientation === 'landscape'
                      ? 'bg-background text-foreground shadow-2xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
                  )}
                >
                  <PageOrientationIcon isLandscape={true} className="w-3.5 h-3.5" />
                  <span>أفقي</span>
                </button>
              </div>
            </section>

            <section className="p-4 flex flex-col gap-3">
              <h3 className="text-xs font-semibold">خيارات الطباعة</h3>

              {/* صف طباعة بدون هوامش */}
              <div className="flex items-center justify-between gap-2 py-0.5">
                <Label
                  htmlFor="block-borderless"
                  className="text-xs font-semibold cursor-pointer text-foreground"
                >
                  طباعة بدون هوامش
                </Label>
                <Switch
                  id="block-borderless"
                  checked={printSettings.marginMM === 0}
                  onCheckedChange={(checked) => {
                    if (checked && printSettings.marginMM > 0) {
                      setLastNonZeroMargin(printSettings.marginMM);
                    }
                    setPrintSettings({ marginMM: checked ? 0 : lastNonZeroMargin });
                  }}
                />
              </div>

              {/* صف خطوط وعلامات القص */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/30">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor="block-cutlines"
                    className="text-xs font-semibold cursor-pointer text-foreground"
                  >
                    خطوط وعلامات القص
                  </Label>
                  <Switch
                    id="block-cutlines"
                    checked={cutLinesActive}
                    onCheckedChange={(checked) => {
                      setPrintSettings({ showCutLines: checked });
                      if (mode === 'collage') {
                        useEditorStore.getState().setCollageShowCutLines(checked);
                      }
                    }}
                  />
                </div>

                {cutLinesActive && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-micro text-muted-foreground font-medium px-1">النمط</span>
                    <Select
                      value={printSettings.cutLineStyle || 'dashed'}
                      onValueChange={(val) =>
                        setPrintSettings({ cutLineStyle: val as typeof printSettings.cutLineStyle })
                      }
                    >
                      <SelectTrigger
                        aria-label="نمط خطوط القص"
                        className="h-8 w-28 px-2 text-xs bg-background border-border/60 shadow-none rounded-md"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="z-(--z-print-toolbar)">
                        <SelectItem value="dashed" className="text-xs font-semibold cursor-pointer">
                          متقطع
                        </SelectItem>
                        <SelectItem value="dotted" className="text-xs font-semibold cursor-pointer">
                          منقط
                        </SelectItem>
                        <SelectItem value="solid" className="text-xs font-semibold cursor-pointer">
                          متصل
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* صف فضاء الألوان — يفتح مسار CMYK الاحترافي المخفي */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-foreground">فضاء الألوان</Label>
                    <Select
                      value={printSettings.colorSpace || 'sRGB'}
                      onValueChange={(val) =>
                        setPrintSettings({ colorSpace: val as 'sRGB' | 'CMYK' })
                      }
                    >
                      <SelectTrigger
                        aria-label="مساحة اللون"
                        className="h-8 w-32 px-2 text-xs bg-background border-border/60 shadow-none rounded-md"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl" className="z-(--z-print-toolbar)">
                        <SelectItem value="sRGB" className="text-xs font-semibold cursor-pointer">
                          sRGB (رقمي)
                        </SelectItem>
                        <SelectItem value="CMYK" className="text-xs font-semibold cursor-pointer">
                          CMYK (مطابع)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(printSettings.colorSpace || 'sRGB') === 'CMYK' && (
                    <p className="text-mini leading-relaxed text-muted-foreground">
                      سيُحفظ الملف TIFF بفصل أحبار للمطبعة بدلاً من إرساله إلى الطابعة.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </aside>

          <main
            aria-label="معاينة الطباعة"
            className="order-1 md:order-none min-h-0 min-w-0 overflow-hidden bg-print-surface flex flex-col relative"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-print-header-border bg-print-header select-none shrink-0">
              <span className="text-xs font-semibold text-print-header-title">
                معاينة الورقة المطبوعة
              </span>
              <div
                className="flex items-center gap-1"
                role="group"
                aria-label="تكبير معاينة الطباعة"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setZoom(1);
                    previewViewportRef.current?.scrollTo({ top: 0, left: 0 });
                  }}
                  className="h-7 px-2 text-xs text-print-header-muted hover:text-print-header-title hover:bg-print-zoom-hover cursor-pointer font-medium rounded-md"
                >
                  ملاءمة
                </Button>
                <div className="flex items-center gap-1" dir="ltr">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10))
                        }
                        disabled={zoom <= 0.3}
                        aria-label="تصغير المعاينة"
                        className="h-7 w-7 p-0 text-print-zoom-text hover:text-print-header-title hover:bg-print-zoom-hover cursor-pointer rounded-md"
                      >
                        <MagnifyingGlassMinus className="w-3.5 h-3.5 shrink-0" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>تصغير المعاينة</TooltipContent>
                  </Tooltip>
                  <span className="text-micro w-11 text-center font-mono font-bold text-print-zoom-text">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10))}
                        disabled={zoom >= 3}
                        aria-label="تكبير المعاينة"
                        className="h-7 w-7 p-0 text-print-zoom-text hover:text-print-header-title hover:bg-print-zoom-hover cursor-pointer rounded-md"
                      >
                        <MagnifyingGlassPlus className="w-3.5 h-3.5 shrink-0" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>تكبير المعاينة</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {hasContent && isOverflowing && (
              <div
                role="alert"
                className="flex items-center gap-2 px-4 py-2 border-b border-warning/20 bg-warning/10 text-warning text-xs"
              >
                <WarningCircle className="size-4 shrink-0" />
                المحتوى يتجاوز حدود الورقة؛ راجع المقاس أو الهوامش.
              </div>
            )}
            {!hasContent && (
              <p
                role="status"
                className="px-4 py-2 text-xs text-print-header-muted border-b border-print-header-border"
              >
                لا يوجد محتوى للطباعة
              </p>
            )}
            <div
              ref={attachPreviewViewport}
              data-testid="print-preview-viewport"
              className="flex-1 min-h-0 overflow-auto select-none relative"
              dir="ltr"
            >
              <div className="grid place-items-center min-w-full min-h-full w-max p-8">
                <div
                  data-testid="print-preview-paper"
                  className="bg-white relative shrink-0 outline outline-print-paper-border shadow-fluent-8"
                  style={{
                    width: paperWidth * scaleFactor * zoom,
                    height: paperHeight * scaleFactor * zoom,
                  }}
                >
                  {/* حدود الهامش الداخلي */}
                  <div
                    className={cn(
                      'absolute border border-dashed pointer-events-none transition-colors z-30',
                      isOverflowing ? 'border-destructive' : 'border-print-margin-line',
                    )}
                    style={{
                      left: effectiveMarginMM * scaleFactor * zoom,
                      top: effectiveMarginMM * scaleFactor * zoom,
                      right: effectiveMarginMM * scaleFactor * zoom,
                      bottom: effectiveMarginMM * scaleFactor * zoom,
                    }}
                  />
                  <div className="absolute inset-0 overflow-hidden">
                    <SheetPreview
                      grid={grid}
                      count={actualCopies}
                      imageWidthMM={imageWidthMM}
                      imageHeightMM={imageHeightMM}
                      gapMM={gapMM}
                      zoom={zoom}
                      showCutLines={cutLinesActive}
                      showEndCutLine={
                        mode === 'collage'
                          ? collageShowEndCutLine !== false
                          : printSettings.showEndCutLine !== false
                      }
                      cutLineStyle={printSettings.cutLineStyle || 'dashed'}
                      mode={mode}
                      backgroundColor={backgroundColor}
                      backgroundGradientColor2={backgroundGradientColor2}
                      backgroundGradientAngle={backgroundGradientAngle}
                      previewImageSrc={previewImageSrc}
                      paperWidthMM={paperWidth}
                      paperHeightMM={paperHeight}
                      slots={slots}
                      collageGap={collageGap}
                      collageMargin={collageMargin}
                      collageRadius={collageRadius}
                      collageStrokeWidth={collageStrokeWidth}
                      collageStrokeColor={collageStrokeColor}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                      hasPhysical={!!collageTemplate?.physicalLayout}
                      scaleFactor={scaleFactor}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        <DialogFooter className="px-4 py-3 border-t border-border/60 bg-card flex-row flex-wrap items-center justify-between sm:justify-between gap-3 shrink-0">
          <div
            className="flex items-center gap-3 text-mini text-muted-foreground font-mono tabular-nums"
            aria-label="مواصفات ورقة الطباعة"
          >
            <span dir="ltr">
              {Math.round(paperWidth)} × {Math.round(paperHeight)} مم
            </span>
            <span dir="ltr">{printSettings.dpi || 300} DPI</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="h-8 px-4 text-xs font-semibold cursor-pointer rounded-md shadow-none hover:bg-muted/80"
            >
              إلغاء
            </Button>

            <Button
              onClick={() =>
                handlePrint(effectiveMarginMM, () => onOpenChange(false), {
                  printerName: selectedPrinter,
                  formName: matchedPaper?.name,
                  paperId: matchedPaper?.id,
                  borderless: matchedPaper?.isBorderless ?? false,
                })
              }
              title={
                isCmykPrint
                  ? 'تصدير ورقة الطباعة للمطبعة بصيغة TIFF CMYK (Enter)'
                  : 'طباعة مباشرة إلى الطابعة (Enter)'
              }
              aria-keyshortcuts="Enter"
              className="h-8 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors duration-150 cursor-pointer rounded-md"
              disabled={isExporting || !hasContent}
            >
              {isExporting ? (
                <>
                  <Spinner className="w-3.5 h-3.5" size={14} /> <span>جاري التجهيز ...</span>
                </>
              ) : isCmykPrint ? (
                <>
                  <FloppyDisk className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span>تصدير ملف المطبعة (TIFF)</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span>طباعة الورقة</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
