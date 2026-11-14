import React, { useCallback } from 'react';

import { FluentCapsuleButton } from '@/components/ui/blocks/fluent-capsule-button';
import { FluentKbd } from '@/components/ui/blocks/fluent-kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  CaretDown,
  FileText,
  Ruler,
  GridFour,
  Magnet,
  Columns,
  Scissors,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Keyboard,
  ArrowsOut,
  ArrowsHorizontal,
  FrameCorners,
  CornersOut,
  Eye,
} from '@/components/ui/icons';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useCanvasZoom } from '@/hooks/use-canvas-zoom';
import { CANVAS_FIT_LABELS, type CanvasFitMode } from '@/lib/canvas/fit';
import { canvasMm, findPaperByMm, formatDimensions } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { useCanvasContext, useCollageViewFlags, useGridControls } from '@/lib/store/selectors';
import { ALL_PAPER_SIZES } from '@/lib/templates';
import { useCanvasFitStatus } from '@/lib/ui/canvas-fit-status';
import { cn } from '@/lib/utils';

export interface CanvasViewportDeckProps {
  className?: string;
}

export const CanvasViewportDeck = React.memo(function CanvasViewportDeck({
  className,
}: CanvasViewportDeckProps) {
  // الحالة عبر المحددات المشتركة (كانت 16 حقلاً في useShallow واحد هنا)
  const { template, canvasWidth, canvasHeight, mode, printSettings } = useCanvasContext();
  const {
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    showRuler,
    setShowRuler,
    showUserGuides,
    setShowUserGuides,
    userGuides,
    addUserGuide,
    rulerUnit,
  } = useGridControls();
  const { collageShowCutLines, setCollageShowCutLines } = useCollageViewFlags();
  const canvasFitMode = useEditorStore((s) => s.canvasFitMode);
  const resolvedFit = useCanvasFitStatus((s) => s.resolved);
  const fitLeftoverRatio = useCanvasFitStatus((s) => s.leftoverRatio);
  const viewIntent = useCanvasFitStatus((s) => s.intent);
  const {
    percentLabel,
    zoomIn,
    zoomOut,
    resetZoom,
    fitZoom,
    fitWidthZoom,
    autoFitZoom,
    actualSizeZoom,
  } = useCanvasZoom();

  // أوضاع الملاءمة في قائمة واحدة — الفعل يعيّن الوضع ويرجع الزوم لـ 100%
  const fitModeActions: {
    mode: CanvasFitMode;
    run: () => void;
    hint: string;
    icon: typeof ArrowsOut;
  }[] = [
    { mode: 'auto', run: autoFitZoom, hint: 'يختار الأنسب لهندسة النافذة', icon: CornersOut },
    { mode: 'height', run: fitZoom, hint: 'الورقة كاملة على الشاشة', icon: ArrowsOut },
    {
      mode: 'width',
      run: fitWidthZoom,
      hint: 'تملأ العرض ويُمرَّر الباقي',
      icon: ArrowsHorizontal,
    },
    {
      mode: 'actual',
      run: actualSizeZoom,
      hint: 'بكسل حقيقي 1:1 مع تمرير أفقي ورأسي',
      icon: FrameCorners,
    },
  ];
  const leftoverPercent = Math.round(fitLeftoverRatio * 100);
  const fitStatusLabel =
    viewIntent === 'manual'
      ? 'يدوي'
      : resolvedFit === 'width'
        ? 'عرض'
        : resolvedFit === 'actual'
          ? '1:1'
          : 'الكل';

  const currentDpi = template?.dpi || printSettings.dpi || 300;
  const { wMM, hMM } = canvasMm(canvasWidth, canvasHeight, currentDpi);
  const activePaper = findPaperByMm(wMM, hMM, ALL_PAPER_SIZES);
  const formattedDimensions = formatDimensions(canvasWidth, canvasHeight, currentDpi, rulerUnit);

  const handleToggleUserGuides = useCallback(() => {
    const next = !showUserGuides;
    setShowUserGuides(next);
    if (next && userGuides.length === 0) {
      setShowRuler(true);
      addUserGuide({ type: 'v', pos: 0.5 });
      addUserGuide({ type: 'h', pos: 0.5 });
    }
  }, [showUserGuides, userGuides.length, setShowUserGuides, setShowRuler, addUserGuide]);

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between gap-2 select-none font-cairo text-xs flex-nowrap overflow-x-auto scrollbar-none',
        className,
      )}
      dir="rtl"
    >
      {/* 1. الجانب الأيمن: ملخص صامت لمعلومات الورقة والدقة (التحكم الفعلي داخل تبويب الورقة بلا تكرار) */}
      <div className="flex items-center shrink-0">
        <div
          className="h-7 flex items-center gap-1.5 px-2 text-xs text-muted-foreground select-none"
          title={
            activePaper
              ? `${activePaper.name} (${formattedDimensions}) · ${currentDpi} DPI`
              : `مقاس مخصص (${formattedDimensions}) · ${currentDpi} DPI`
          }
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" weight="duotone" />
          <span className="text-foreground font-semibold">
            {activePaper ? activePaper.shortName || activePaper.name.split(' (')[0] : 'مخصص'}
          </span>
          <span className="text-border/80" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-mini tabular-nums" dir="ltr">
            {formattedDimensions} · {currentDpi} DPI
          </span>
        </div>
      </div>

      {/* 2. الوسط: كبسولة أدوات المحاذاة والرؤية الموحدة (Fluent 2 Icon Capsule) */}
      <div className="h-7 inline-flex items-center gap-0.5 p-0.5 rounded-md bg-muted border border-border/70 select-none">
        {/* زر المساطر */}
        <FluentCapsuleButton
          icon={<Ruler className="w-4 h-4" weight={showRuler ? 'duotone' : 'regular'} />}
          label="المساطر (Ctrl + R)"
          tooltip={showRuler ? 'إخفاء المساطر' : 'إظهار المساطر'}
          shortcut="Ctrl+R"
          active={showRuler}
          onClick={() => setShowRuler(!showRuler)}
          testId="canvas-ruler-toggle"
        />

        {/* زر الشبكة */}
        <FluentCapsuleButton
          icon={<GridFour className="w-4 h-4" weight={showGrid ? 'duotone' : 'regular'} />}
          label="الشبكة (Ctrl + ')"
          tooltip={showGrid ? 'إخفاء شبكة المحاذاة' : 'إظهار شبكة المحاذاة'}
          shortcut="Ctrl+'"
          active={showGrid}
          onClick={() => setShowGrid(!showGrid)}
        />

        {/* زر المغناطيس والمحاذاة الذكية */}
        <FluentCapsuleButton
          icon={<Magnet className="w-4 h-4" weight={snapToGrid ? 'duotone' : 'regular'} />}
          label="المغناطيس والمحاذاة الذكية"
          tooltip={
            snapToGrid
              ? 'إيقاف الالتصاق المغناطيسي والمحاذاة الذكية'
              : 'تفعيل الالتصاق المغناطيسي والمحاذاة الذكية'
          }
          active={snapToGrid}
          onClick={() => setSnapToGrid(!snapToGrid)}
        />

        {/* زر الخطوط الإرشادية للمستخدم */}
        <FluentCapsuleButton
          icon={<Columns className="w-4 h-4" weight={showUserGuides ? 'duotone' : 'regular'} />}
          label="الخطوط الإرشادية (Ctrl + ;)"
          tooltip={
            showUserGuides
              ? 'إخفاء الخطوط الإرشادية'
              : 'إظهار الخطوط الإرشادية (انقر لإضافة خطوط وسطية)'
          }
          shortcut="Ctrl+;"
          active={showUserGuides}
          onClick={handleToggleUserGuides}
        />

        {/* زر خطوط القص (يظهر في الكولاج) */}
        {mode === 'collage' && (
          <FluentCapsuleButton
            icon={
              <Scissors className="w-4 h-4" weight={collageShowCutLines ? 'duotone' : 'regular'} />
            }
            label="خطوط القص للطباعة"
            tooltip={
              collageShowCutLines
                ? 'إخفاء علامات وخطوط قص الصور'
                : 'إظهار علامات وخطوط قص الصور للطباعة'
            }
            active={collageShowCutLines}
            onClick={() => setCollageShowCutLines(!collageShowCutLines)}
          />
        )}

        <Separator orientation="vertical" className="h-3.5 bg-border/70 mx-0.5" />

        {/* زر وضع التركيز / إخفاء الألواح */}
        <FluentCapsuleButton
          icon={<Eye className="w-4 h-4" weight="regular" />}
          label="وضع التركيز (Ctrl + .)"
          tooltip="إخفاء أو استعادة الألواح الجانبية لمساحة رؤية كاملة"
          shortcut="Ctrl+."
          onClick={() => window.dispatchEvent(new CustomEvent('grido:toggle-zen-mode'))}
          testId="canvas-zen-mode-toggle"
        />
      </div>

      {/* 3. الجانب الأيسر: كبسولة الزوم واختصارات المفاتيح المدمجة بالكامل */}
      <div className="flex items-center shrink-0">
        <div className="h-7 flex items-center gap-0.5 select-none font-cairo" dir="ltr">
          <div className="h-7 inline-flex items-center gap-0.5 p-0.5 rounded-md bg-muted border border-border/70 select-none">
            {/* زر تصغير */}
            <FluentCapsuleButton
              icon={<MagnifyingGlassMinus className="w-4 h-4" weight="regular" />}
              label="تصغير"
              tooltip="تصغير"
              shortcut="Ctrl+-"
              onClick={zoomOut}
              testId="canvas-zoom-out"
            />

            {/* نسبة الزوم الرقمية — مضاعف فوق أساس الملاءمة (ليس مقياس طباعة) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="coarse-touch-target h-6 min-w-[42px] px-1.5 text-mini font-mono font-medium tabular-nums text-center select-none cursor-pointer hover:bg-accent text-foreground/90 hover:text-foreground rounded-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  onClick={resetZoom}
                  aria-label="إعادة تعيين المقياس إلى 100%"
                >
                  {percentLabel}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                align="center"
                className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
              >
                <div className="flex items-center gap-1.5">
                  <span>مضاعف الملاءمة (100% = حجم الملاءمة)</span>
                  <FluentKbd keys="Ctrl+1" />
                </div>
              </TooltipContent>
            </Tooltip>

            {/* زر تكبير */}
            <FluentCapsuleButton
              icon={<MagnifyingGlassPlus className="w-4 h-4" weight="regular" />}
              label="تكبير"
              tooltip="تكبير"
              shortcut="Ctrl++"
              onClick={zoomIn}
              testId="canvas-zoom-in"
            />
          </div>

          {/* كبسولة ملاءمة الورقة المدمجة (Fluent 2 Split Fit Control) */}
          <div className="flex items-center h-7 rounded-md border border-border/70 bg-muted p-0.5 mx-0.5 transition-colors">
            {/* زر ملاءمة الكل بنقرة واحدة (Ctrl+0) — أيقونة فصيحة حسب الوضع الفعّال مع إخفاء النص بصرياً */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-testid="canvas-fit-all"
                  onClick={fitZoom}
                  aria-label="ملاءمة الكل (Ctrl+0)"
                  className="coarse-touch-target h-6 w-6 flex items-center justify-center rounded-s-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {resolvedFit === 'width' ? (
                    <ArrowsHorizontal className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  ) : resolvedFit === 'actual' ? (
                    <FrameCorners className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  ) : canvasFitMode === 'auto' ? (
                    <CornersOut className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  ) : (
                    <ArrowsOut className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  )}
                  <span
                    data-testid="canvas-fit-status"
                    data-fit-mode={resolvedFit}
                    data-view-intent={viewIntent}
                    className="sr-only"
                  >
                    {fitStatusLabel}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                align="center"
                className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
              >
                <div className="flex items-center gap-1.5">
                  <span>
                    {viewIntent === 'manual'
                      ? 'عرض يدوي — انقر لملاءمة الكل'
                      : canvasFitMode === 'auto'
                        ? `ملاءمة تلقائية (${resolvedFit === 'width' ? 'ملاءمة العرض' : 'ملاءمة الكل'})`
                        : resolvedFit === 'actual'
                          ? 'الحجم الفعلي 1:1 — بكسل الورقة = بكسل الشاشة'
                          : resolvedFit === 'width'
                            ? `ملاءمة العرض — الفراغ الجانبي ${leftoverPercent}% في وضع الكل`
                            : 'ملاءمة الكل — الورقة كاملة على الشاشة'}
                  </span>
                  <FluentKbd keys="Ctrl+0" />
                </div>
              </TooltipContent>
            </Tooltip>

            {/* سهم القائمة المنسدلة لأوضاع الملاءمة الإضافية */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid="canvas-fit-menu"
                      aria-label="أوضاع ملاءمة الورقة"
                      className="coarse-touch-target h-6 min-w-5 px-1 flex items-center justify-center rounded-e-sm border-s border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent data-[state=open]:bg-accent data-[state=open]:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <CaretDown className="w-3 h-3 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  align="center"
                  className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
                >
                  <span>خيارات ملاءمة الورقة</span>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="start"
                className="w-64 font-cairo text-xs z-(--z-menu) rounded-lg backdrop-blur-xl fluent-specular shadow-fluent-16"
              >
                <div dir="rtl">
                  <DropdownMenuLabel className="text-micro text-muted-foreground font-bold flex items-center gap-1.5">
                    <ArrowsOut className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
                    <span>ملاءمة الورقة</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {fitModeActions.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.mode}
                        data-testid={`canvas-fit-${item.mode}`}
                        onClick={item.run}
                        className="flex items-center justify-between cursor-pointer py-1.5 font-semibold group gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ItemIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs">{CANVAS_FIT_LABELS[item.mode]}</span>
                            <span className="text-micro text-muted-foreground font-normal">
                              {item.hint}
                            </span>
                          </div>
                        </div>
                        {canvasFitMode === item.mode && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" weight="bold" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

          {/* زر اختصارات لوحة المفاتيح المدمج داخل الكبسولة */}
          <FluentCapsuleButton
            icon={<Keyboard className="w-4 h-4" weight="regular" />}
            label="اختصارات لوحة المفاتيح"
            tooltip="اختصارات لوحة المفاتيح"
            shortcut="Ctrl+/"
            onClick={() => window.dispatchEvent(new CustomEvent('grido:open-shortcuts'))}
            testId="canvas-shortcuts"
          />
        </div>
      </div>
    </div>
  );
});

CanvasViewportDeck.displayName = 'CanvasViewportDeck';
