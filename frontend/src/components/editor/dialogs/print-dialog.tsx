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
import { Printer, MagnifyingGlassPlus, MagnifyingGlassMinus, Gear } from '@/components/ui/icons';
import { SheetPreview } from '../print/print-preview';
import { useShallow } from 'zustand/react/shallow';
import { PrintSettingsToolbar } from '../print/print-settings-toolbar';
import { usePrintExport } from '../print/use-print-export';
import { GetPrinters, OpenPrinterPreferences } from '../../../../wailsjs/go/handlers/PrintHandler';
import type { domain } from '../../../../wailsjs/go/models';
import { wailsIsDesktop } from '@/lib/wails-env';
import { toast } from 'sonner';

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
        className="w-[95vw] sm:max-w-[940px] h-[90vh] sm:max-h-[88vh] overflow-hidden flex flex-col border border-border dark:border-white/10 bg-card rounded-2xl shadow-fluent-28 p-0 gap-0 fluent-specular fluent-acrylic"
        dir="rtl"
      >
        {/* 1. رأس النافذة القياسي المتكامل (Standard Dialog Header) */}
        <DialogHeader className="px-5 py-3 border-b border-border/40 bg-card shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <Printer className="text-primary w-5 h-5 shrink-0" weight="duotone" />
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground truncate">
                  إعدادات ومعاينة الطباعة
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                  معاينة دقيقة للورقة، ضبط الطابعة، الألوان، وهوامش القص
                </DialogDescription>
              </div>
            </div>

            {/* سطر الطابعة المدمج داخل الرأس + زر الإغلاق */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/40">
                <Printer className="w-3.5 h-3.5 text-primary shrink-0" />
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger className="h-7 text-xs font-semibold border-0 bg-transparent shadow-none px-1 py-0 w-[160px] focus:ring-0">
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

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenPreferences}
                      aria-label="خصائص درايفر الطابعة"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                    >
                      <Gear className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-semibold">
                    خصائص وتفضيلات درايفر الطابعة
                  </TooltipContent>
                </Tooltip>
              </div>

              <DialogCloseButton onClick={() => onOpenChange(false)} />
            </div>
          </div>
        </DialogHeader>

        {/* 2. جسم النافذة الرئيسي (Body): شريط الإعدادات المدمج + مساحة المعاينة */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col gap-3 min-h-0">
          {/* شريط الإعدادات الأنيق والمضغوط */}
          <PrintSettingsToolbar
            mode={mode}
            printSettings={printSettings}
            setPrintSettings={setPrintSettings}
            colorSpace={colorSpace}
            onColorSpaceChange={setColorSpace}
            exportFormat={exportFormat}
            onExportFormatChange={setExportFormat}
            collageShowCutLines={collageShowCutLines}
            onCutLinesChange={(checked) => {
              setPrintSettings({ showCutLines: checked });
              if (mode === 'collage') {
                useEditorStore.getState().setCollageShowCutLines(checked);
              }
            }}
            actualCopies={actualCopies}
            grid={grid}
            onMarginlessToggle={(checked) => {
              if (checked && printSettings.marginMM > 0) {
                setLastNonZeroMargin(printSettings.marginMM);
              }
              setPrintSettings({ marginMM: checked ? 0 : lastNonZeroMargin });
            }}
            imageWidthMM={imageWidthMM}
            imageHeightMM={imageHeightMM}
          />

          {/* مساحة المعاينة التفاعلية المباشرة */}
          <div className="border border-border/50 rounded-xl overflow-hidden bg-print-surface flex flex-col flex-1 shadow-inner relative">
            {/* شريط عنوان وتكبير المعاينة */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-print-header-border bg-print-header backdrop-blur-md select-none z-10">
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
                    'absolute border border-dashed pointer-events-none transition-colors',
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
                    showCutLines={
                      mode === 'collage' ? collageShowCutLines : printSettings.showCutLines
                    }
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

            {/* مسار حوار النظام المزدوج */}
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
              title="استدعاء معالج طباعة ويندوز الرسمي للتحكم بدرايفر الطابعة"
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
