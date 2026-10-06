import { useState, useEffect, useRef, useCallback } from 'react';
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
  Gear,
  Sparkle,
  Scissors,
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

  // فتح تفضيلات درايفر الشركة المصنعة (Canon/Epson/Brother)
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

  const currentPrinterObj = printers.find((p) => p.name === selectedPrinter);

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
        className="w-[96vw] sm:max-w-[1000px] h-[90vh] sm:max-h-[86vh] overflow-hidden flex flex-col border border-border dark:border-white/10 bg-card rounded-2xl shadow-fluent-28 p-0 gap-0 fluent-specular fluent-acrylic"
        dir="rtl"
      >
        {/* 1. رأس النافذة القياسي المتكامل (Standard Dialog Header) */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card/70 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <Printer className="text-primary w-5 h-5 shrink-0" weight="duotone" />
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground truncate">
                  إعدادات ومعاينة الطباعة
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                  معاينة مطابقة للورقة 1:1 • دقة 300+ DPI • كشف تلقائي للطابعات
                </DialogDescription>
              </div>
            </div>

            <DialogCloseButton onClick={() => onOpenChange(false)} />
          </div>
        </DialogHeader>

        {/* 2. جسم النافذة الرئيسي المقسم إلى بلوكات ومساحة معاينة (Bento Blocks & Canvas) */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col md:flex-row gap-3 min-h-0">
          {/* العمود الأيمن: لوحة البلوكات المنظمة (Bento Sidebar Panel) */}
          <aside className="w-full md:w-[340px] shrink-0 flex flex-col gap-2.5 overflow-y-auto pl-0.5 select-none min-h-0">
            {/* بلوك 1: الطابعة الذكي (Printer Block) */}
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-primary" weight="duotone" />
                  <span>الطابعة المحددة</span>
                </Label>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {currentPrinterObj?.isDefault && (
                    <span className="text-micro font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                      افتراضية
                    </span>
                  )}
                </div>
              </div>

              <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                <SelectTrigger className="h-8 text-xs font-semibold bg-background border-border/60 shadow-2xs">
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
                          <span className="text-micro px-1 py-0.2 rounded bg-primary/10 text-primary font-bold shrink-0">
                            افتراضية
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between pt-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenPreferences}
                  className="h-7 px-2 text-micro font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1.5 cursor-pointer rounded-md"
                  title="فتح نافذة درايفر الشركة المصنعة (نوع الورق والجودة)"
                >
                  <Gear className="w-3.5 h-3.5 shrink-0" />
                  <span>خصائص الدرايفر</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () =>
                      onOpenChange(false),
                    )
                  }
                  disabled={isExporting || !hasContent}
                  className="h-7 px-2 text-micro font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1 rounded-md"
                  title="استدعاء معالج طباعة ويندوز الرسمي"
                >
                  <Printer className="w-3 h-3" />
                  <span>معالج ويندوز</span>
                </Button>
              </div>
            </div>

            {/* بلوك 2: الورقة والاتجاه (Paper & Orientation Block) */}
            <div className="rounded-xl border border-border/50 bg-card p-3 flex flex-col gap-2 shadow-2xs">
              <span className="text-micro font-bold text-muted-foreground">الورقة والاتجاه</span>

              <div className="grid grid-cols-2 gap-2">
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
                      {`الكانفاس (${Math.round(imageWidthMM || 0)}×${Math.round(imageHeightMM || 0)} مم)`}
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
                  title="تبديل الاتجاه"
                >
                  <PageOrientationIcon
                    isLandscape={printSettings.orientation === 'landscape'}
                    className="w-3.5 h-3.5 text-primary-foreground"
                  />
                  <span>{printSettings.orientation === 'landscape' ? 'أفقي' : 'رأسي'}</span>
                </button>
              </div>
            </div>

            {/* بلوك 3: المونتاج والتوزيع (Imposition & Copies Block) */}
            {mode !== 'collage' && (
              <div className="rounded-xl border border-border/50 bg-card p-3 flex flex-col gap-2.5 shadow-2xs">
                <span className="text-micro font-bold text-muted-foreground">
                  المونتاج والتوزيع
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-muted/40 rounded-lg p-1.5 border border-border/30">
                    <span className="text-micro font-semibold text-muted-foreground">نسخ/ورقة</span>
                    <div className="flex items-center gap-0.5">
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
                      <span className="text-xs font-mono font-bold w-5 text-center text-foreground">
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

                  <div className="flex items-center justify-between bg-muted/40 rounded-lg p-1.5 border border-border/30">
                    <span className="text-micro font-semibold text-muted-foreground">
                      المسافة (مم)
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-md cursor-pointer hover:bg-muted"
                        aria-label="إنقاص المسافة"
                        disabled={(printSettings.gapMM ?? 2) <= 0}
                        onClick={() =>
                          setPrintSettings({
                            gapMM: Math.max(0, (printSettings.gapMM ?? 2) - 1),
                          })
                        }
                      >
                        <Minus className="w-3 h-3 shrink-0" weight="bold" />
                      </Button>
                      <span className="text-xs font-mono font-bold w-5 text-center text-foreground">
                        {printSettings.gapMM ?? 2}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-md cursor-pointer hover:bg-muted"
                        aria-label="زيادة المسافة"
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
                </div>

                <div className="flex items-center justify-between pt-0.5">
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoImpose}
                    className="h-7 rounded-md border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-micro font-bold gap-1 cursor-pointer flex items-center"
                    title="تعبئة ذكية للشيت بأقصى عدد نسخ"
                  >
                    <Sparkle className="w-3 h-3 shrink-0" weight="fill" />
                    <span>مونتاج تلقائي</span>
                  </Button>
                </div>
              </div>
            )}

            {/* بلوك 4: الإنهاء والألوان (Finishing & Colors Block) */}
            <div className="rounded-xl border border-border/50 bg-card p-3 flex flex-col gap-2.5 shadow-2xs">
              <span className="text-micro font-bold text-muted-foreground">الإنهاء والألوان</span>

              <div className="flex items-center justify-between">
                <Label htmlFor="block-borderless" className="text-xs font-medium cursor-pointer">
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

              <div className="flex items-center justify-between">
                <Label
                  htmlFor="block-cutlines"
                  className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <Scissors className="text-primary/80 w-3.5 h-3.5 shrink-0" weight="duotone" />
                  <span>خطوط القص</span>
                </Label>
                <div className="flex items-center gap-1.5">
                  {cutLinesActive && (
                    <Select
                      value={printSettings.cutLineStyle || 'dashed'}
                      onValueChange={(val) =>
                        setPrintSettings({ cutLineStyle: val as typeof printSettings.cutLineStyle })
                      }
                    >
                      <SelectTrigger className="h-7 w-[78px] px-2 py-0 text-micro font-semibold bg-background border-border/50 shadow-none">
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
                  )}
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
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/30">
                <span className="text-micro font-semibold text-muted-foreground">وضع الألوان</span>
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/40">
                  <button
                    type="button"
                    onClick={() => setColorSpace('sRGB')}
                    className={cn(
                      'px-2 py-0.5 text-micro',
                      toggleButtonClassName(colorSpace === 'sRGB'),
                    )}
                  >
                    sRGB
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorSpace('CMYK')}
                    className={cn(
                      'px-2 py-0.5 text-micro',
                      toggleButtonClassName(colorSpace === 'CMYK'),
                    )}
                  >
                    CMYK
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-micro font-semibold text-muted-foreground">صيغة الإخراج</span>
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/40">
                  <button
                    type="button"
                    onClick={() => setExportFormat('image')}
                    className={cn(
                      'px-2 py-0.5 text-micro',
                      toggleButtonClassName(exportFormat === 'image'),
                    )}
                  >
                    صورة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (colorSpace === 'CMYK') setColorSpace('sRGB');
                      setExportFormat('pdf');
                    }}
                    className={cn(
                      'px-2 py-0.5 text-micro',
                      toggleButtonClassName(exportFormat === 'pdf'),
                    )}
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* العمود الأيسر: مساحة المعاينة التفاعلية المباشرة (Preview Lightbox Canvas) */}
          <main className="flex-1 border border-border/50 rounded-xl overflow-hidden bg-print-surface flex flex-col shadow-inner relative min-w-0">
            {/* شريط عنوان وتكبير المعاينة */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-print-header-border bg-print-header backdrop-blur-md select-none z-10 shrink-0">
              <span className="text-xs font-bold text-print-header-title flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isOverflowing ? 'bg-destructive animate-ping' : 'bg-primary',
                  )}
                  role={isOverflowing ? 'alert' : undefined}
                  aria-label={
                    isOverflowing ? 'تحذير: المحتوى يتجاوز حدود الورقة' : 'المعاينة مطابقة للورقة'
                  }
                />
                معاينة الورقة المطبوعة
                <span className="text-micro font-mono text-muted-foreground hidden sm:inline">
                  ({Math.round(paperWidth)}×{Math.round(paperHeight)} مم)
                </span>
              </span>

              {/* أدوات التحكم بالـ Zoom */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(1)}
                  className="h-7 px-2 text-xs text-print-header-muted hover:text-white hover:bg-print-zoom-capsule cursor-pointer font-medium"
                >
                  إعادة ضبط
                </Button>
                <div className="flex items-center gap-1 bg-print-zoom-capsule p-0.5 rounded-md border border-print-zoom-capsule-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                    aria-label="تصغير المعاينة"
                    className="h-7 w-7 p-0 text-print-zoom-text hover:text-white hover:bg-print-zoom-hover cursor-pointer"
                  >
                    <MagnifyingGlassMinus className="w-3 h-3 shrink-0" />
                  </Button>
                  <span className="text-micro w-10 text-center font-mono font-semibold text-print-zoom-text">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                    aria-label="تكبير المعاينة"
                    className="h-7 w-7 p-0 text-print-zoom-text hover:text-white hover:bg-print-zoom-hover cursor-pointer"
                  >
                    <MagnifyingGlassPlus className="w-3 h-3 shrink-0" />
                  </Button>
                </div>
              </div>
            </div>

            {/* لوحة الورقة البيضاء الممركزة داخل مساحة العمل */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center select-none workspace-grid relative">
              <div
                className="bg-white rounded-md relative border border-print-paper-border shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.85),0_4px_16px_rgba(0,0,0,0.6)] dark:ring-1 dark:ring-white/12 transition-all duration-200"
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
            <div className="px-3 py-1.5 border-t border-print-header-border bg-print-header/50 flex items-center justify-between text-micro text-muted-foreground select-none shrink-0 font-medium font-mono">
              <span>
                {Math.round((paperWidth / 25.4) * (printSettings.dpi || 300))} ×{' '}
                {Math.round((paperHeight / 25.4) * (printSettings.dpi || 300))} px (300 DPI)
              </span>
              <span>
                {actualCopies} نسخ • {colorSpace}
              </span>
            </div>
          </main>
        </div>

        {/* 3. ذيل النافذة القياسي: زر الإلغاء، حوار النظام، وزر الطباعة المباشر */}
        <DialogFooter className="px-5 py-3 border-t border-border/40 bg-card flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exporter.setIsExporting(false);
                if (typeof document !== 'undefined' && document.body) {
                  document.body.style.pointerEvents = '';
                }
                onOpenChange(false);
              }}
              className="h-8 px-4 text-xs font-semibold cursor-pointer"
            >
              إلغاء
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () =>
                  onOpenChange(false),
                )
              }
              disabled={isExporting || !hasContent}
              className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
              title="الطباعة باستخدام معالج ويندوز الرسمي"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>حوار النظام</span>
            </Button>
          </div>

          <Button
            onClick={() =>
              exporter.handlePrint(colorSpace, previewImageSrc, effectiveMarginMM, () =>
                onOpenChange(false),
              )
            }
            title="طباعة (Enter)"
            aria-keyshortcuts="Enter"
            className="h-8 px-5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all duration-150 cursor-pointer rounded-md shadow-xs"
            disabled={isExporting || !hasContent}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
