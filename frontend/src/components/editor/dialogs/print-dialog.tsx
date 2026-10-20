import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type Konva from 'konva';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogCloseButton,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditorStore } from '@/lib/editor-store';
import { DEFAULT_PRINT_SETTINGS } from '@/lib/store/slices/print-slice';
import { useStageRef } from '@/lib/canvas/stage-context';
import { usePrintLayout } from '@/hooks/use-print-layout';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/huge-icon';
import {
  Printer,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Scissors,
  Gear,
  FileText,
  FloppyDisk,
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { createLogger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/wails-error';
import { triggerMemoryTrim } from '@/lib/memory-trim';
import {
  GetPrinters,
  GetDefaultPrinterName,
  OpenPrinterPreferences,
  GetSupportedPapers,
} from '../../../../wailsjs/go/handlers/PrintHandler';
import type { SupportedPaperInfo } from '@bindings/grido/internal/core/domain';
import { PageOrientationIcon } from '@/components/ui/image-icons';
import { PAPER_SIZES, ADVANCED_PAPER_SIZES } from '@/lib/templates/constants';
import { SheetPreview } from '../print/print-preview';

const ALL_PRINT_PAPER_SIZES = [...PAPER_SIZES, ...ADVANCED_PAPER_SIZES];
import { useShallow } from 'zustand/react/shallow';
import { usePrintExport } from '../print/use-print-export';

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

const toggleButtonClassName = (active: boolean) =>
  cn(
    'rounded-md text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
    active
      ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
      : 'text-muted-foreground hover:text-foreground hover:bg-background/70',
  );

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
  const { isExporting, setIsExporting, cancelExport, handlePrint } = exporter;

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
      const std = ALL_PRINT_PAPER_SIZES.find((p) => p.id === currentId);
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

    if (ALL_PRINT_PAPER_SIZES.some((p) => p.id === currentId)) {
      return currentId;
    }

    return 'canvas';
  }, [
    printSettings.paperId,
    printSettings.paperWidthMM,
    printSettings.paperHeightMM,
    sanitizedDriverPapers,
  ]);

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

  const scaleFactor = Math.min(1.4, 420 / Math.max(paperHeight, 1));
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
        className="w-[96vw] sm:max-w-[1060px] h-[92vh] sm:max-h-[860px] overflow-hidden flex flex-col border border-border dark:border-white/10 bg-card rounded-2xl shadow-fluent-28 p-0 gap-0 fluent-specular fluent-acrylic pointer-events-auto data-[state=closed]:duration-75"
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
        {/* 1. رأس النافذة القياسي المتكامل (Standard Dialog Header) */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card/70 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
                <Printer className="w-4 h-4 text-foreground/80" weight="duotone" />
              </div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold tracking-tight text-foreground truncate">
                  إعداد ومعاينة الطباعة
                </DialogTitle>
                <span className="text-micro font-mono font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                  {printSettings.dpi || 300} DPI
                </span>
                <DialogDescription className="sr-only">
                  إعداد ومعاينة ورقة الطباعة
                </DialogDescription>
              </div>
            </div>

            <DialogCloseButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
            />
          </div>
        </DialogHeader>

        {/* 2. جسم النافذة الرئيسي المقسم إلى بلوكات ومساحة معاينة (Bento Blocks & Canvas) */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col md:flex-row gap-3 min-h-0">
          {/* العمود الأيمن: لوحة البلوكات المنظمة (Bento Sidebar Panel) */}
          <aside className="w-full md:w-[356px] shrink-0 flex flex-col gap-3 overflow-y-auto pl-0.5 select-none min-h-0">
            {/* بلوك 1: الطابعة (Printer Block) */}
            <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-md p-3 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/30">
                <span className="text-micro font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />
                  <span>الطابعة</span>
                </span>
              </div>

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
                      className="h-8 text-xs font-semibold bg-background border-border/60 shadow-2xs rounded-lg w-full"
                    >
                      <SelectValue
                        placeholder={isLoadingPrinters ? 'جاري البحث ...' : 'اختر الطابعة'}
                      />
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
                  className="h-8 px-3 text-xs font-semibold shrink-0 gap-1.5 bg-background hover:bg-muted border-border/60 rounded-lg shadow-2xs cursor-pointer active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {matchedPaper.isBorderless ? 'بدون حواف' : 'قد لا يدعم الحواف الصفرية'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* بلوك 2: الورقة والاتجاه (Paper & Orientation Block) */}
            <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-md p-3 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/30">
                <span className="text-micro font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />
                  <span>الورقة والاتجاه</span>
                </span>
                <span className="text-micro font-mono text-muted-foreground/80 font-medium px-1.5 py-0.2 rounded bg-muted/60 border border-border/30">
                  {Math.round(paperWidth)} × {Math.round(paperHeight)} مم
                </span>
              </div>

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

                  const selected = ALL_PRINT_PAPER_SIZES.find((p) => p.id === val);
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
                  className="h-8 text-xs font-semibold bg-background border-border/60 shadow-2xs rounded-lg w-full"
                >
                  <SelectValue placeholder="مقاس الورقة" />
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
                    : ALL_PRINT_PAPER_SIZES.map((size) => (
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
              <div className="grid grid-cols-2 p-0.5 rounded-lg bg-muted/50 border border-border/40 gap-1">
                <button
                  type="button"
                  onClick={() => setPrintSettings({ orientation: 'portrait' })}
                  title="اتجاه رأسي (عمودي)"
                  aria-label="اتجاه رأسي (عمودي)"
                  aria-pressed={printSettings.orientation !== 'landscape'}
                  className={cn(
                    'h-7 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
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
                    'h-7 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    printSettings.orientation === 'landscape'
                      ? 'bg-background text-foreground shadow-2xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
                  )}
                >
                  <PageOrientationIcon isLandscape={true} className="w-3.5 h-3.5" />
                  <span>أفقي</span>
                </button>
              </div>
            </div>

            {/* بلوك 3: خيارات الطباعة (Print Options Block) */}
            <div className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-md p-3 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/30">
                <span className="text-micro font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />
                  <span>خيارات الطباعة</span>
                </span>
              </div>

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
                  <div className="flex items-center justify-between bg-muted/40 p-1 rounded-md border border-border/30">
                    <span className="text-micro text-muted-foreground font-medium px-1">النمط</span>
                    <Select
                      value={printSettings.cutLineStyle || 'dashed'}
                      onValueChange={(val) =>
                        setPrintSettings({ cutLineStyle: val as typeof printSettings.cutLineStyle })
                      }
                    >
                      <SelectTrigger
                        aria-label="نمط خطوط القص"
                        className="h-7 w-[84px] px-2 py-0 text-micro font-semibold bg-background border-border/50 shadow-2xs rounded"
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
                        className="h-7 w-[98px] px-2 py-0 text-micro font-semibold bg-background border-border/50 shadow-2xs rounded"
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
                    <p className="text-micro leading-relaxed text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1">
                      سيُحفظ الملف TIFF بفصل أحبار حقيقي للمطابع — افتحه مباشرة في الطابعة.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* العمود الأيسر: مساحة المعاينة التفاعلية المباشرة (Preview Lightbox Canvas) */}
          <main className="flex-1 border border-border/60 rounded-2xl overflow-hidden bg-print-surface flex flex-col shadow-inner relative min-w-0">
            {/* شريط عنوان وتكبير المعاينة */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-print-header-border bg-print-header backdrop-blur-md select-none z-10 shrink-0">
              <span className="text-xs font-bold text-print-header-title flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isOverflowing ? 'bg-destructive animate-ping' : 'bg-emerald-500',
                  )}
                  role={isOverflowing ? 'alert' : undefined}
                  aria-label={
                    isOverflowing ? 'تحذير: المحتوى يتجاوز حدود الورقة' : 'المعاينة مطابقة للورقة'
                  }
                />
                <span>معاينة الورقة المطبوعة</span>
                <span className="text-micro font-mono text-muted-foreground hidden sm:inline px-1.5 py-0.2 rounded bg-muted/40 border border-border/20">
                  {Math.round(paperWidth)}×{Math.round(paperHeight)} مم
                </span>
              </span>

              {/* أدوات التحكم بالـ Zoom */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(1)}
                  className="h-7 px-2 text-xs text-print-header-muted hover:text-print-header-title hover:bg-print-zoom-hover cursor-pointer font-medium rounded-lg"
                >
                  إعادة ضبط
                </Button>
                <div className="flex items-center gap-1 bg-print-zoom-capsule p-0.5 rounded-lg border border-print-zoom-capsule-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                    aria-label="تصغير المعاينة"
                    className="h-7 w-7 p-0 text-print-zoom-text hover:text-print-header-title hover:bg-print-zoom-hover cursor-pointer rounded-md"
                  >
                    <MagnifyingGlassMinus className="w-3.5 h-3.5 shrink-0" />
                  </Button>
                  <span className="text-micro w-11 text-center font-mono font-bold text-print-zoom-text">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                    aria-label="تكبير المعاينة"
                    className="h-7 w-7 p-0 text-print-zoom-text hover:text-print-header-title hover:bg-print-zoom-hover cursor-pointer rounded-md"
                  >
                    <MagnifyingGlassPlus className="w-3.5 h-3.5 shrink-0" />
                  </Button>
                </div>
              </div>
            </div>

            {/* لوحة الورقة البيضاء الممركزة داخل مساحة العمل */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center select-none workspace-grid relative">
              <div
                className="bg-white rounded-md relative border border-print-paper-border shadow-[0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.9),0_4px_20px_rgba(0,0,0,0.7)] dark:ring-1 dark:ring-white/12 transition-all duration-200"
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
                <div className="absolute inset-0 overflow-hidden rounded-md">
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

            {/* شريط المواصفات السفلي */}
            <div className="px-4 py-2 border-t border-print-header-border bg-print-header backdrop-blur-md flex items-center justify-between text-micro text-print-header-muted select-none shrink-0 font-medium font-mono">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>
                  {Math.round((paperWidth / 25.4) * (printSettings.dpi || 300))} ×{' '}
                  {Math.round((paperHeight / 25.4) * (printSettings.dpi || 300))} px (
                  {printSettings.dpi || 300} DPI)
                </span>
              </span>
              <span>1:1</span>
            </div>
          </main>
        </div>

        {/* 3. ذيل النافذة القياسي المتطور */}
        <DialogFooter className="px-5 py-3 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-micro text-muted-foreground font-mono hidden sm:flex">
            <span className="font-semibold text-foreground">
              {Math.round(paperWidth)} × {Math.round(paperHeight)} مم
            </span>
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
              className="h-8 px-4 text-xs font-semibold cursor-pointer rounded-lg hover:bg-muted/80"
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
              className="h-8 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all duration-150 cursor-pointer rounded-lg shadow-sm hover:shadow active:scale-98"
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
