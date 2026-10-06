import { useState, useEffect, useRef, useCallback } from 'react';
import type Konva from 'konva';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
  ArrowRight,
  Gear,
  Sparkle,
  Scissors,
  Crosshair,
  ArrowUpLeft,
  SquaresFour,
  Rows,
  Columns,
  Plus,
  Minus,
} from '@/components/ui/icons';
import { PageOrientationIcon } from '@/components/ui/image-icons';
import { PAPER_SIZES } from '@/lib/templates/constants';
import { calculateOptimalSheetImposition } from '@/lib/print/print-layout-math';
import { SheetPreview } from '../print/print-preview';
import { useShallow } from 'zustand/react/shallow';
import { usePrintExport } from '../print/use-print-export';
import { GetPrinters, OpenPrinterPreferences } from '../../../../wailsjs/go/handlers/PrintHandler';
import type { domain } from '../../../../wailsjs/go/models';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toast } from 'sonner';

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
  const [colorSpace, setColorSpace] = useState<'sRGB' | 'CMYK'>('sRGB');
  const [exportFormat, setExportFormat] = useState<'image' | 'pdf'>('image');
  const [previewImageSrc, setPreviewImageSrc] = useState<string>('');
  const savedSelectionRef = useRef<string[] | null>(null);

  // قائمة الطابعات الحقيقية من النظام
  const [printers, setPrinters] = useState<domain.PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  const [lastNonZeroMargin, setLastNonZeroMargin] = useState<number>(() =>
    printSettings.marginMM > 0 ? printSettings.marginMM : DEFAULT_PRINT_SETTINGS.marginMM || 5,
  );

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
    exportFormat,
  });
  const { isExporting } = exporter;

  // استعلام الطابعات الحقيقية من نظام التشغيل عند فتح الشاشة
  useEffect(() => {
    if (!open) return;
    let active = true;

    if (wailsIsDesktop() && typeof GetPrinters === 'function') {
      GetPrinters()
        .then((res) => {
          if (!active) return;
          if (res && res.success && res.printers && res.printers.length > 0) {
            setPrinters(res.printers);
            const def = res.printers.find((p) => p.isDefault);
            setSelectedPrinter(def ? def.name : res.printers[0].name);
          } else {
            const fallback = [{ name: 'طابعة النظام الافتراضية', isDefault: true }];
            setPrinters(fallback);
            setSelectedPrinter('طابعة النظام الافتراضية');
          }
        })
        .catch((err) => {
          if (!active) return;
          console.error('Failed to get system printers:', err);
          const fallback = [{ name: 'طابعة النظام الافتراضية', isDefault: true }];
          setPrinters(fallback);
          setSelectedPrinter('طابعة النظام الافتراضية');
        });
    } else {
      const fallback = [
        { name: 'Brother DCP-T520W', isDefault: true },
        { name: 'EPSON L805 Series', isDefault: false },
        { name: 'Microsoft Print to PDF', isDefault: false },
      ];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrinters(fallback);
      setSelectedPrinter('Brother DCP-T520W');
    }

    return () => {
      active = false;
    };
  }, [open]);

  // فتح تفضيلات الطابعة الرسمية للشركة المصنعة (Canon/Epson/Brother)
  const handleOpenPreferences = useCallback(async () => {
    if (!selectedPrinter) {
      toast.error('يرجى تحديد طابعة أولاً');
      return;
    }
    if (!wailsIsDesktop() || typeof OpenPrinterPreferences !== 'function') {
      toast.info('تفضيلات الطابعة الأصلية متاحة في بيئة سطح المكتب');
      return;
    }
    try {
      toast.info(`جاري فتح خصائص الطابعة: ${selectedPrinter}...`);
      const res = await OpenPrinterPreferences(selectedPrinter);
      if (res && !res.success) {
        toast.error('تعذر فتح تفضيلات الطابعة: ' + (res.error || 'خطأ غير معروف'));
      }
    } catch (err) {
      toast.error('تعذر فتح خصائص الطابعة: ' + String(err));
    }
  }, [selectedPrinter]);

  // مونتاج تلقائي للشيت
  const handleAutoImpose = useCallback(() => {
    if (!imageWidthMM || !imageHeightMM) {
      toast.error('تعذر قراءة مقاس التصميم');
      return;
    }
    const { showBleedGuides, bleedMarginMM } = useEditorStore.getState();
    const bleed = showBleedGuides && bleedMarginMM > 0 ? bleedMarginMM : 0;

    const targetPaper =
      printSettings.paperId === 'canvas'
        ? PAPER_SIZES.find((p) => p.id === 'a4') || { widthMM: 210, heightMM: 297 }
        : {
            widthMM: printSettings.paperWidthMM || 210,
            heightMM: printSettings.paperHeightMM || 297,
          };

    const result = calculateOptimalSheetImposition({
      paperWidthMM: targetPaper.widthMM,
      paperHeightMM: targetPaper.heightMM,
      itemWidthMM: imageWidthMM,
      itemHeightMM: imageHeightMM,
      marginMM: printSettings.marginMM ?? 5,
      gapMM: printSettings.gapMM ?? 2,
      bleedMM: bleed,
    });

    const storedWidth = targetPaper.widthMM;
    const orientation: 'portrait' | 'landscape' =
      Math.abs(result.paperWidthMM - storedWidth) < 0.01 ? 'portrait' : 'landscape';

    setPrintSettings({
      paperId: printSettings.paperId === 'canvas' ? 'a4' : printSettings.paperId,
      paperWidthMM: targetPaper.widthMM,
      paperHeightMM: targetPaper.heightMM,
      orientation,
      copiesPerSheet: result.maxCopies,
      repeatMode: 'all',
      showCutLines: true,
    });

    toast.success(
      `تم المونتاج: ${result.maxCopies} نسخة (${result.cols} أعمدة × ${result.rows} صفوف) - الهدر ${result.wastePercentage}%`,
    );
  }, [imageWidthMM, imageHeightMM, printSettings, setPrintSettings]);

  useEffect(() => {
    exporter.setIsExporting(false);
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setZoom(1);
      const st = useEditorStore.getState();
      savedSelectionRef.current = [...(st.selectedIds ?? [])];
      st.selectElement(null);
    } else {
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
  }, [open, exporter]);

  useEffect(() => {
    if (printSettings.marginMM > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastNonZeroMargin(printSettings.marginMM);
    }
  }, [printSettings.marginMM]);

  const hasContent =
    mode === 'collage' ? slots.some((s) => Boolean(s.imageSrc)) : elements.length > 0;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exporter.setIsExporting(false);
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.pointerEvents = '';
        }
        onOpenChange(false);
      } else if (e.key === 'Enter' && !isExporting && hasContent) {
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('input, select, textarea, button, [role="combobox"]')) return;
        e.preventDefault();
        exporter.handlePrintRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isExporting, hasContent, onOpenChange, exporter]);

  useEffect(() => {
    exporter.setPrintInvocation({
      colorSpace,
      previewImageSrc,
      effectiveMarginMM,
      onDone: () => onOpenChange(false),
    });
  }, [exporter, colorSpace, previewImageSrc, effectiveMarginMM, onOpenChange]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewImageSrc('');
      return;
    }

    if (mode === 'collage') {
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
      try {
        const targetWidth = 400;
        const pRatio = Math.min(1, targetWidth / Math.max(stage.width(), 1));

        transformers.forEach((tr: Konva.Node) => tr.hide());
        gridLayers.forEach((gl: Konva.Node) => gl.hide());
        columnsLayers.forEach((cl: Konva.Node) => cl.hide());
        guideLayers.forEach((gl: Konva.Node) => gl.hide());
        stage.batchDraw();

        const previewUrl = stage.toDataURL({
          pixelRatio: pRatio,
          mimeType: 'image/jpeg',
          quality: 0.8,
        });

        if (cancelled) return;
        if (previewUrl) {
          setPreviewImageSrc(previewUrl);
        }
      } catch (err) {
        console.error('Failed to generate print preview image:', err);
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
  const maxCopiesPerSheet = Math.max(1, (grid.safeCols ?? 1) * (grid.actualRows ?? 10));

  const currentPaperObj =
    printSettings.paperId === 'canvas'
      ? { name: 'مقاس الكانفاس', widthMM: imageWidthMM, heightMM: imageHeightMM }
      : PAPER_SIZES.find((p) => p.id === printSettings.paperId) || {
          name: 'A4',
          widthMM: 210,
          heightMM: 297,
        };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          exporter.setIsExporting(false);
          if (typeof document !== 'undefined' && document.body) {
            document.body.style.pointerEvents = '';
          }
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 w-screen h-screen max-w-none max-h-none translate-x-0 translate-y-0 rounded-none border-0 p-0 m-0 z-50 flex flex-col bg-background/98 backdrop-blur-3xl overflow-hidden gap-0 duration-150 fluent-specular"
        style={{
          transform: 'none',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
          padding: 0,
          margin: 0,
        }}
        dir="rtl"
      >
        <DialogDescription className="sr-only">
          استوديو الطباعة الاحترافي — معاينة وضبط الورقة والطابعات والمونتاج
        </DialogDescription>

        {/* ── الشريط العلوي لاستوديو الطباعة (Backstage Top Bar) ── */}
        <header className="h-14 shrink-0 px-5 border-b border-border/40 bg-card/70 backdrop-blur-xl flex items-center justify-between select-none z-20">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 gap-2 font-semibold text-xs cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg"
              title="العودة للمحرر (Esc)"
            >
              <ArrowRight className="w-4 h-4 shrink-0" />
              <span>العودة للمحرر</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-micro font-mono bg-muted text-muted-foreground rounded border border-border/40">
                Esc
              </kbd>
            </Button>

            <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2 min-w-0">
              <Printer className="text-primary w-5 h-5 shrink-0" weight="duotone" />
              <DialogTitle className="text-sm font-bold tracking-tight text-foreground truncate">
                استوديو الطباعة
              </DialogTitle>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-micro font-bold bg-primary/10 text-primary border border-primary/20">
                300+ DPI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-md border border-border/30">
              <span className="font-semibold text-foreground">{currentPaperObj.name}</span>
              <span>•</span>
              <span className="font-mono">
                {Math.round(paperWidth)}×{Math.round(paperHeight)} مم
              </span>
              <span>•</span>
              <span>{printSettings.orientation === 'landscape' ? 'أفقي' : 'رأسي'}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3.5 text-xs font-semibold cursor-pointer rounded-lg"
            >
              إلغاء
            </Button>
            <Button
              onClick={() =>
                exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () =>
                  onOpenChange(false),
                )
              }
              disabled={isExporting || !hasContent}
              title="طباعة (Enter)"
              aria-keyshortcuts="Enter"
              className="h-8 px-4 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs cursor-pointer rounded-lg shadow-xs"
            >
              {isExporting ? (
                <>
                  <Spinner className="w-3.5 h-3.5" size={14} /> <span>جاري التجهيز...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 shrink-0" weight="bold" /> <span>طباعة</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* ── جسم الشاشة المقسم (Backstage Split View) ── */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* العمود الأيمن: لوحة التحكم الرأسية الشاملة */}
          <aside className="w-full md:w-[380px] lg:w-[400px] shrink-0 border-l border-border/40 bg-card/40 backdrop-blur-md flex flex-col min-h-0 select-none">
            <div className="overflow-y-auto p-4 flex flex-col gap-4 text-xs flex-1">
              {/* بطاقة زر الطباعة الرئيسي */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-card border border-border/50 shadow-2xs">
                <Button
                  onClick={() =>
                    exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () =>
                      onOpenChange(false),
                    )
                  }
                  disabled={isExporting || !hasContent}
                  className="w-full h-11 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm cursor-pointer"
                  title="طباعة (Enter)"
                >
                  {isExporting ? (
                    <>
                      <Spinner className="w-4 h-4" size={16} />
                      <span>جاري إرسال الورقة للطابعة...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 shrink-0" weight="bold" />
                      <span>طباعة فورية</span>
                      <span className="font-mono text-micro opacity-80">(Enter)</span>
                    </>
                  )}
                </Button>
              </div>

              {/* قسم اختيار الطابعة الحقيقية */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-primary" weight="duotone" />
                    <span>الطابعة</span>
                  </Label>
                  <span className="text-micro font-medium text-muted-foreground">
                    {printers.length > 0 ? `${printers.length} متوفرة` : 'جاري الكشف...'}
                  </span>
                </div>

                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger className="h-9 text-xs font-semibold bg-background border-border/60 shadow-2xs">
                    <SelectValue placeholder="اختر الطابعة..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="z-(--z-print-toolbar)">
                    {printers.map((p) => (
                      <SelectItem
                        key={p.name}
                        value={p.name}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="truncate">{p.name}</span>
                          {p.isDefault && (
                            <span className="text-micro px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold shrink-0">
                              افتراضية
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenPreferences}
                  className="h-7 px-2 text-micro font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 cursor-pointer self-start"
                  title="فتح نافذة درايفر الشركة المصنعة"
                >
                  <Gear className="w-3.5 h-3.5 shrink-0" />
                  <span>خصائص الطابعة (Driver Settings)</span>
                </Button>
              </div>

              {/* قسم الورقة والاتجاه */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-card border border-border/50 shadow-2xs">
                <div className="text-xs font-bold text-foreground">إعدادات الورقة</div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-micro font-semibold text-muted-foreground">
                      مقاس الورقة
                    </Label>
                    <Select
                      value={printSettings.paperId || 'canvas'}
                      onValueChange={(val) => {
                        if (val === 'canvas') {
                          setPrintSettings({
                            paperId: 'canvas',
                            paperWidthMM: imageWidthMM || 210,
                            paperHeightMM: imageHeightMM || 297,
                            marginMM: 0,
                          });
                          return;
                        }
                        const selected = PAPER_SIZES.find((p) => p.id === val);
                        if (selected) {
                          setPrintSettings({
                            paperId: selected.id,
                            paperWidthMM: selected.widthMM,
                            paperHeightMM: selected.heightMM,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border/50 shadow-2xs">
                        <SelectValue placeholder="مقاس الورقة" />
                      </SelectTrigger>
                      <SelectContent className="z-(--z-print-toolbar)" dir="rtl">
                        <SelectItem
                          value="canvas"
                          className="text-xs font-bold text-primary cursor-pointer"
                        >
                          {`مقاس الكانفاس (${Math.round(imageWidthMM || 0)}×${Math.round(imageHeightMM || 0)} مم)`}
                        </SelectItem>
                        {PAPER_SIZES.map((size) => (
                          <SelectItem
                            key={size.id}
                            value={size.id}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-micro font-semibold text-muted-foreground">
                      الاتجاه
                    </Label>
                    <button
                      type="button"
                      onClick={() =>
                        setPrintSettings({
                          orientation:
                            printSettings.orientation === 'landscape' ? 'portrait' : 'landscape',
                        })
                      }
                      className={cn(
                        'w-full h-8 px-2 flex items-center justify-center gap-1.5',
                        'rounded-md text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 bg-primary text-primary-foreground shadow-2xs font-bold',
                      )}
                    >
                      <PageOrientationIcon
                        isLandscape={printSettings.orientation === 'landscape'}
                        className="w-3.5 h-3.5 text-primary-foreground"
                      />
                      <span>{printSettings.orientation === 'landscape' ? 'أفقي' : 'رأسي'}</span>
                    </button>
                  </div>
                </div>

                {/* خيارات المونتاج للوضع المفرد */}
                {mode !== 'collage' && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-micro font-semibold text-muted-foreground">
                        عدد النسخ في الورقة
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-md cursor-pointer hover:bg-muted"
                          aria-label="إنقاص عدد النسخ"
                          disabled={
                            (printSettings.repeatMode ?? 'all') !== 'all' ||
                            (printSettings.copiesPerSheet ?? 1) <= 1
                          }
                          onClick={() =>
                            setPrintSettings({
                              copiesPerSheet: Math.max(1, (printSettings.copiesPerSheet ?? 1) - 1),
                            })
                          }
                        >
                          <Minus className="w-3 h-3 shrink-0" weight="bold" />
                        </Button>
                        <span
                          className="text-xs font-mono font-bold w-6 text-center text-foreground"
                          title={`المطبوع على الورقة: ${actualCopies}`}
                        >
                          {printSettings.copiesPerSheet ?? 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-md cursor-pointer hover:bg-muted"
                          aria-label="زيادة عدد النسخ"
                          disabled={
                            (printSettings.repeatMode ?? 'all') !== 'all' ||
                            (printSettings.copiesPerSheet ?? 1) >= maxCopiesPerSheet
                          }
                          onClick={() =>
                            setPrintSettings({
                              copiesPerSheet: (printSettings.copiesPerSheet ?? 1) + 1,
                            })
                          }
                        >
                          <Plus className="w-3 h-3 shrink-0" weight="bold" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-micro font-semibold text-muted-foreground">
                        المسافة بين النسخ (مم)
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-md cursor-pointer hover:bg-muted"
                          aria-label="إنقاص المسافة بين النسخ"
                          disabled={(printSettings.gapMM ?? 2) <= 0}
                          onClick={() =>
                            setPrintSettings({
                              gapMM: Math.max(0, (printSettings.gapMM ?? 2) - 1),
                            })
                          }
                        >
                          <Minus className="w-3 h-3 shrink-0" weight="bold" />
                        </Button>
                        <span className="text-xs font-mono font-bold w-6 text-center text-foreground">
                          {printSettings.gapMM ?? 2}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-md cursor-pointer hover:bg-muted"
                          aria-label="زيادة المسافة بين النسخ"
                          disabled={(printSettings.gapMM ?? 2) >= 20}
                          onClick={() =>
                            setPrintSettings({
                              gapMM: Math.min(20, (printSettings.gapMM ?? 2) + 1),
                            })
                          }
                        >
                          <Plus className="w-3 h-3 shrink-0" weight="bold" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-micro font-semibold text-muted-foreground">
                        نمط التوزيع
                      </span>
                      <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/30">
                        {(
                          [
                            { id: 'all', icon: SquaresFour, label: 'تعبئة' },
                            { id: 'row', icon: Rows, label: 'صف' },
                            { id: 'column', icon: Columns, label: 'عمود' },
                          ] as const
                        ).map(({ id, icon: Icon, label }) => (
                          <Tooltip key={id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setPrintSettings({ repeatMode: id })}
                                aria-pressed={(printSettings.repeatMode ?? 'all') === id}
                                className={cn(
                                  'h-7 w-7 rounded-md flex items-center justify-center',
                                  toggleButtonClassName((printSettings.repeatMode ?? 'all') === id),
                                )}
                                aria-label={label}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-semibold">
                              {label}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoImpose}
                      className="w-full mt-1 h-8 rounded-md border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold gap-1.5 cursor-pointer flex items-center justify-center transition-all"
                    >
                      <Sparkle className="w-3.5 h-3.5 shrink-0" weight="fill" />
                      <span>مونتاج تلقائي للشيت (تعبئة ذكية)</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* قسم القص والهوامش والألوان */}
              <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-card border border-border/50 shadow-2xs">
                <div className="text-xs font-bold text-foreground">خيارات الإنهاء والألوان</div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="backstage-borderless"
                    className="text-xs font-medium cursor-pointer"
                  >
                    طباعة بدون هوامش
                  </Label>
                  <Switch
                    id="backstage-borderless"
                    checked={printSettings.marginMM === 0}
                    onCheckedChange={(checked) => {
                      if (checked && printSettings.marginMM > 0) {
                        setLastNonZeroMargin(printSettings.marginMM);
                      }
                      setPrintSettings({ marginMM: checked ? 0 : lastNonZeroMargin });
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="backstage-cutlines"
                    className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Scissors className="text-primary/80 w-3.5 h-3.5 shrink-0" weight="duotone" />
                    <span>خطوط القص</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    {cutLinesActive && (
                      <Select
                        value={printSettings.cutLineStyle || 'dashed'}
                        onValueChange={(val) =>
                          setPrintSettings({
                            cutLineStyle: val as typeof printSettings.cutLineStyle,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-[82px] px-2 py-0 text-micro font-semibold bg-background border-border/50 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl" className="z-(--z-print-toolbar)">
                          <SelectItem
                            value="dashed"
                            className="text-xs font-semibold cursor-pointer"
                          >
                            متقطع
                          </SelectItem>
                          <SelectItem
                            value="dotted"
                            className="text-xs font-semibold cursor-pointer"
                          >
                            منقط
                          </SelectItem>
                          <SelectItem
                            value="solid"
                            className="text-xs font-semibold cursor-pointer"
                          >
                            متصل
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Switch
                      id="backstage-cutlines"
                      checked={cutLinesActive}
                      onCheckedChange={(checked) => {
                        setPrintSettings({ showCutLines: checked });
                        if (mode === 'collage') {
                          useEditorStore.getState().setCollageShowCutLines(checked);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <span className="text-micro font-semibold text-muted-foreground">
                    وضع الألوان
                  </span>
                  <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                    <button
                      type="button"
                      onClick={() => setColorSpace('sRGB')}
                      className={cn('px-2.5 py-1', toggleButtonClassName(colorSpace === 'sRGB'))}
                    >
                      sRGB
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorSpace('CMYK')}
                      className={cn('px-2.5 py-1', toggleButtonClassName(colorSpace === 'CMYK'))}
                    >
                      CMYK
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-micro font-semibold text-muted-foreground">
                    صيغة الإخراج
                  </span>
                  <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                    <button
                      type="button"
                      onClick={() => setExportFormat('image')}
                      className={cn('px-2.5 py-1', toggleButtonClassName(exportFormat === 'image'))}
                    >
                      صورة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (colorSpace === 'CMYK') setColorSpace('sRGB');
                        setExportFormat('pdf');
                      }}
                      className={cn('px-2.5 py-1', toggleButtonClassName(exportFormat === 'pdf'))}
                    >
                      PDF
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-micro font-semibold text-muted-foreground">
                    محاذاة الشبكة
                  </span>
                  <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                    <button
                      type="button"
                      onClick={() => setPrintSettings({ gridAlign: 'top-left' })}
                      className={cn(
                        'px-2 py-1 flex items-center gap-1',
                        toggleButtonClassName(
                          (printSettings.gridAlign || 'top-left') === 'top-left',
                        ),
                      )}
                    >
                      <ArrowUpLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>زاوية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintSettings({ gridAlign: 'center' })}
                      className={cn(
                        'px-2 py-1 flex items-center gap-1',
                        toggleButtonClassName(printSettings.gridAlign === 'center'),
                      )}
                    >
                      <Crosshair className="w-3.5 h-3.5 shrink-0" />
                      <span>توسيط</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── مسار حوار النظام الأصلي (System Print Dialog Link) ── */}
              <div className="mt-auto pt-2">
                <button
                  type="button"
                  onClick={() =>
                    exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () =>
                      onOpenChange(false),
                    )
                  }
                  disabled={isExporting || !hasContent}
                  className="w-full text-right p-3 rounded-xl border border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group flex items-start gap-2.5 select-none"
                >
                  <Printer className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      الطباعة باستخدام حوار النظام (System Dialog)
                    </div>
                    <div className="text-micro text-muted-foreground mt-0.5 leading-relaxed">
                      استدعاء نافذة ويندوز الرسمية للتحكم المتقدم في جودة ونوع الورق الفاخر
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          {/* العمود الأيسر: مساحة المعاينة الفسيحة (Spacious Lightbox Canvas) */}
          <main className="flex-1 flex flex-col bg-[#141416] dark:bg-[#0c0c0e] min-w-0 min-h-0 relative overflow-hidden shadow-inner select-none">
            {/* شريط أدوات المعاينة العلوي */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/40 backdrop-blur-md select-none z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isOverflowing ? 'bg-destructive animate-ping' : 'bg-primary',
                  )}
                  role={isOverflowing ? 'alert' : undefined}
                />
                <span className="text-xs font-bold text-neutral-200">معاينة الورقة المطبوعة</span>
                <span className="text-micro text-neutral-400 font-mono hidden sm:inline">
                  ({Math.round(paperWidth)}×{Math.round(paperHeight)} مم)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(1)}
                  className="h-7 px-2 text-xs text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer font-medium"
                >
                  إعادة ضبط
                </Button>
                <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-md border border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                    aria-label="تصغير المعاينة"
                    className="h-7 w-7 p-0 text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <MagnifyingGlassMinus className="w-3.5 h-3.5 shrink-0" />
                  </Button>
                  <span className="text-micro w-10 text-center font-mono font-semibold text-neutral-200">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                    aria-label="تكبير المعاينة"
                    className="h-7 w-7 p-0 text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <MagnifyingGlassPlus className="w-3.5 h-3.5 shrink-0" />
                  </Button>
                </div>
              </div>
            </div>

            {/* طاولة الكانفاس الحرة للورقة الممركزة */}
            <div className="flex-1 overflow-auto p-6 md:p-8 flex items-center justify-center select-none workspace-grid relative">
              <div
                className="bg-white rounded-md relative border border-print-paper-border shadow-[0_16px_50px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.85)] dark:ring-1 dark:ring-white/10 transition-all duration-200"
                style={{
                  width: paperWidth * scaleFactor * zoom,
                  height: paperHeight * scaleFactor * zoom,
                }}
              >
                {/* خط الهامش الداخلي الآمن */}
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

            {/* الشريط السفلي للمواصفات الفيزيائية */}
            <footer className="h-8 px-4 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between text-micro text-neutral-400 select-none shrink-0 font-medium">
              <div className="flex items-center gap-2">
                <span>أبعاد الإخراج:</span>
                <span className="font-mono text-neutral-300">
                  {Math.round((paperWidth / 25.4) * (printSettings.dpi || 300))} ×{' '}
                  {Math.round((paperHeight / 25.4) * (printSettings.dpi || 300))} بكسل
                </span>
                <span>({printSettings.dpi || 300} DPI)</span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span>صفحة 1 من 1</span>
                <span>•</span>
                <span className="text-primary font-bold">{colorSpace}</span>
              </div>
            </footer>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
