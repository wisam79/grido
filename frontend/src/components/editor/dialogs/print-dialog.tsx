import { useState, useEffect, useRef } from 'react';
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
} from '@/components/ui/icons';
import { PageOrientationIcon } from '@/components/ui/image-icons';
import { PAPER_SIZES } from '@/lib/templates/constants';
import { SheetPreview } from '../print/print-preview';
import { useShallow } from 'zustand/react/shallow';
import { usePrintExport } from '../print/use-print-export';

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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        cancelExport();
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.pointerEvents = '';
        }
        onOpenChange(false);
      } else if (e.key === 'Enter' && !isExporting && hasContent) {
        if (e.defaultPrevented) return;
        const t = e.target as HTMLElement | null;
        if (t?.closest?.('input, select, textarea, button, [role="combobox"]')) return;
        e.preventDefault();
        exporter.handlePrintRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isExporting, hasContent, onOpenChange, cancelExport, exporter]);

  useEffect(() => {
    exporter.setPrintInvocation({
      effectiveMarginMM,
      onDone: () => onOpenChange(false),
    });
  }, [exporter, effectiveMarginMM, onOpenChange]);

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelExport();
          if (typeof document !== 'undefined' && document.body) {
            document.body.style.pointerEvents = '';
          }
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] sm:max-w-[1060px] h-[92vh] sm:max-h-[860px] overflow-hidden flex flex-col border border-border dark:border-white/10 bg-card rounded-2xl shadow-fluent-28 p-0 gap-0 fluent-specular fluent-acrylic pointer-events-auto"
        dir="rtl"
        onEscapeKeyDown={(e) => {
          if (e.defaultPrevented) return;
          cancelExport();
          if (typeof document !== 'undefined' && document.body) {
            document.body.style.pointerEvents = '';
          }
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
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <Printer className="w-4 h-4" weight="duotone" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold tracking-tight text-foreground truncate flex items-center gap-2">
                  <span>إعداد ومعاينة الطباعة</span>
                  <span className="text-micro font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    300+ DPI
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                  معاينة الورقة بدقة ميكرومترية • محاكاة حقيقية 1:1 • تجهيز الطباعة
                </DialogDescription>
              </div>
            </div>

            <DialogCloseButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancelExport();
                if (typeof document !== 'undefined' && document.body) {
                  document.body.style.pointerEvents = '';
                }
                onOpenChange(false);
              }}
            />
          </div>
        </DialogHeader>

        {/* 2. جسم النافذة الرئيسي المقسم إلى بلوكات ومساحة معاينة (Bento Blocks & Canvas) */}
        <div className="flex-1 overflow-hidden p-3.5 flex flex-col md:flex-row gap-3 min-h-0">
          {/* العمود الأيمن: لوحة البلوكات المنظمة (Bento Sidebar Panel) */}
          <aside className="w-full md:w-[348px] shrink-0 flex flex-col gap-2.5 overflow-y-auto pl-0.5 select-none min-h-0">
            {/* بلوك 1: الورقة والاتجاه (Paper & Orientation Block) */}
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs p-3 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-micro font-bold text-muted-foreground">الورقة والاتجاه</span>
                <span className="text-micro font-mono text-muted-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/50 border border-border/30">
                  {Math.round(paperWidth)} × {Math.round(paperHeight)} مم
                </span>
              </div>

              <Select
                value={printSettings.paperId || 'canvas'}
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
                <SelectTrigger className="h-8.5 text-xs font-semibold bg-background border-border/60 shadow-2xs rounded-lg w-full">
                  <SelectValue placeholder="مقاس الورقة" />
                </SelectTrigger>
                <SelectContent className="z-(--z-print-toolbar)" dir="rtl">
                  <SelectItem
                    value="canvas"
                    className="text-xs font-bold text-primary cursor-pointer"
                  >
                    {`الكانفاس الأصلي (${Math.round(imageWidthMM || 0)} × ${Math.round(imageHeightMM || 0)} مم)`}
                  </SelectItem>
                  {PAPER_SIZES.map((size) => (
                    <SelectItem
                      key={size.id}
                      value={size.id}
                      className="text-xs font-semibold cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{size.name}</span>
                        <span className="text-micro font-mono text-muted-foreground">
                          {size.widthMM} × {size.heightMM} مم
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* مبدل الاتجاه المنقسم (Segmented Orientation Control) */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-muted/60 border border-border/40 gap-1">
                <button
                  type="button"
                  onClick={() => setPrintSettings({ orientation: 'portrait' })}
                  className={cn(
                    'h-7.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
                    printSettings.orientation !== 'landscape'
                      ? 'bg-background text-foreground shadow-2xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
                  )}
                  title="اتجاه رأسي (عمودي)"
                >
                  <PageOrientationIcon isLandscape={false} className="w-3.5 h-3.5" />
                  <span>رأسي (Portrait)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSettings({ orientation: 'landscape' })}
                  className={cn(
                    'h-7.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none',
                    printSettings.orientation === 'landscape'
                      ? 'bg-background text-foreground shadow-2xs font-bold border border-border/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40',
                  )}
                  title="اتجاه أفقي (عرضي)"
                >
                  <PageOrientationIcon isLandscape={true} className="w-3.5 h-3.5" />
                  <span>أفقي (Landscape)</span>
                </button>
              </div>
            </div>

            {/* بلوك 2: الإنهاء والطباعة (Finishing & Printing Block) */}
            <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs p-3 flex flex-col gap-2.5 shadow-2xs">
              <span className="text-micro font-bold text-muted-foreground">الإنهاء والطباعة</span>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label
                    htmlFor="block-borderless"
                    className="text-xs font-semibold cursor-pointer"
                  >
                    طباعة بدون هوامش
                  </Label>
                  <span className="text-micro text-muted-foreground">
                    تمديد حتى أطراف الورقة (يتطلب دعماً من الطابعة والدرايفر)
                  </span>
                </div>
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

              <div className="flex items-center justify-between pt-1 border-t border-border/30">
                <div className="flex flex-col">
                  <Label
                    htmlFor="block-cutlines"
                    className="text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Scissors className="text-primary w-3.5 h-3.5 shrink-0" weight="duotone" />
                    <span>خطوط وعلامات القص</span>
                  </Label>
                  <span className="text-micro text-muted-foreground">
                    أدلة إرشادية لتقطيع الورقة
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {cutLinesActive && (
                    <Select
                      value={printSettings.cutLineStyle || 'dashed'}
                      onValueChange={(val) =>
                        setPrintSettings({ cutLineStyle: val as typeof printSettings.cutLineStyle })
                      }
                    >
                      <SelectTrigger className="h-7 w-[82px] px-2 py-0 text-micro font-semibold bg-background border-border/60 shadow-2xs rounded-lg">
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
                    isOverflowing ? 'bg-destructive animate-ping' : 'bg-primary',
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
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>
                  {Math.round((paperWidth / 25.4) * (printSettings.dpi || 300))} ×{' '}
                  {Math.round((paperHeight / 25.4) * (printSettings.dpi || 300))} px (
                  {printSettings.dpi || 300} DPI)
                </span>
              </span>
              <span>جاهز للطباعة • دقة 1:1</span>
            </div>
          </main>
        </div>

        {/* 3. ذيل النافذة القياسي المتطور */}
        <DialogFooter className="px-5 py-3 border-t border-border/40 bg-card/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-micro text-muted-foreground font-mono hidden sm:flex">
            <span className="font-semibold text-foreground">
              {Math.round(paperWidth)}×{Math.round(paperHeight)} مم
            </span>
            <span>•</span>
            <span className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-sans font-medium text-micro border border-border/30">
              طباعة ورقية
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                cancelExport();
                if (typeof document !== 'undefined' && document.body) {
                  document.body.style.pointerEvents = '';
                }
                onOpenChange(false);
              }}
              className="h-8 px-4 text-xs font-semibold cursor-pointer rounded-lg hover:bg-muted/80"
            >
              إلغاء
            </Button>

            <Button
              onClick={() => handlePrint(effectiveMarginMM, () => onOpenChange(false))}
              title="طباعة (Enter)"
              aria-keyshortcuts="Enter"
              className="h-8 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all duration-150 cursor-pointer rounded-lg shadow-sm hover:shadow active:scale-98"
              disabled={isExporting || !hasContent}
            >
              {isExporting ? (
                <>
                  <Spinner className="w-3.5 h-3.5" size={14} /> <span>جاري التجهيز...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 shrink-0" weight="bold" />{' '}
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
