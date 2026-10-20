import React, { useCallback } from 'react';
import { useEditorStore } from '@/lib/editor-store';
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
  Sparkle,
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CANVAS_FIT_LABELS, type CanvasFitMode } from '@/lib/canvas/fit';
import { useCanvasFitStatus } from '@/lib/ui/canvas-fit-status';
import { PageOrientationIcon } from '@/components/ui/image-icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { FluentCapsuleButton } from '@/components/ui/blocks/fluent-capsule-button';
import { FluentKbd } from '@/components/ui/blocks/fluent-kbd';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PAPER_SIZES, ADVANCED_PAPER_SIZES } from '@/lib/templates';
import { useCanvasZoom } from '@/hooks/use-canvas-zoom';
import { useCanvasContext, useCollageViewFlags, useGridControls } from '@/lib/store/selectors';
import { canvasMm, findPaperByMm, formatDimensions, mmToPx } from '@/lib/canvas/units';

// كل المقاسات المعروضة في قائمة تغيير المقاس — تُبحث أيضاً عند تحديد الورقة
// النشطة (كان اقتصر البحث على PAPER_SIZES فلا يظهر «Letter» مُحدداً بعد اختياره)
const ALL_PAPER_SIZES = [...PAPER_SIZES, ...ADVANCED_PAPER_SIZES];

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
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const canvasFitMode = useEditorStore((s) => s.canvasFitMode);
  const resolvedFit = useCanvasFitStatus((s) => s.resolved);
  const fitLeftoverRatio = useCanvasFitStatus((s) => s.leftoverRatio);
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
    { mode: 'auto', run: autoFitZoom, hint: 'يختار الأنسب لهندسة النافذة', icon: Sparkle },
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
    resolvedFit === 'width' ? 'عرض' : resolvedFit === 'actual' ? '1:1' : 'الكل';

  const isLandscape = canvasWidth > canvasHeight;

  const handleToggleOrientation = useCallback(() => {
    setCanvasSize(canvasHeight, canvasWidth);
  }, [canvasWidth, canvasHeight, setCanvasSize]);

  const currentDpi = template?.dpi || printSettings.dpi || 300;
  const { wMM, hMM } = canvasMm(canvasWidth, canvasHeight, currentDpi);
  const activePaper = findPaperByMm(wMM, hMM, ALL_PAPER_SIZES);
  const formattedDimensions = formatDimensions(canvasWidth, canvasHeight, currentDpi, rulerUnit);

  const handleSelectPaperSize = useCallback(
    (paperId: string) => {
      const paper = ALL_PAPER_SIZES.find((p) => p.id === paperId);
      if (!paper) return;

      let targetW = mmToPx(paper.widthMM, currentDpi);
      let targetH = mmToPx(paper.heightMM, currentDpi);

      if (isLandscape && targetW < targetH) {
        const tmp = targetW;
        targetW = targetH;
        targetH = tmp;
      }

      setCanvasSize(Math.round(targetW), Math.round(targetH));
      if (template) {
        useEditorStore.getState().setTemplate(null);
      }
    },
    [currentDpi, isLandscape, setCanvasSize, template],
  );

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
        'w-full flex items-center justify-between gap-3 select-none font-cairo text-xs flex-nowrap overflow-x-auto scrollbar-none',
        className,
      )}
      dir="rtl"
    >
      {/* 1. الجانب الأيمن: كبسولة معلومات مساحة العمل والأبعاد وتغيير المقاس */}
      <div className="flex items-center shrink-0">
        {/* شريط حالة سطح المكتب: مجموعات مسطّحة بلا كبسولات عائمة أو ظلال */}
        <div className="h-7 flex items-center gap-1 font-semibold">
          {/* زر تغيير المقاس التفاعلي */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="تغيير مقاس مساحة العمل"
                    className="h-7 flex items-center gap-1.5 px-2 rounded-md hover:bg-muted/80 text-foreground transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
                    <span className="text-foreground font-semibold text-xs">
                      {activePaper
                        ? activePaper.shortName || activePaper.name.split(' (')[0]
                        : 'مخصص'}
                    </span>
                    {!activePaper && (
                      <span
                        className="text-xs text-muted-foreground/90 font-mono font-medium"
                        dir="ltr"
                      >
                        {formattedDimensions}
                      </span>
                    )}
                    <CaretDown className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                sideOffset={8}
                align="center"
                className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
              >
                <span>
                  {activePaper
                    ? `${activePaper.name} (${formattedDimensions})`
                    : `مقاس مخصص (${formattedDimensions})`}
                </span>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="start"
              className="w-56 font-cairo text-xs z-(--z-menu) rounded-lg backdrop-blur-xl fluent-specular shadow-fluent-16 max-h-[60vh] overflow-y-auto"
            >
              <div dir="rtl">
                <DropdownMenuLabel className="text-micro text-muted-foreground font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                  <span>مقاسات الورق القياسية</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PAPER_SIZES.map((paper) => {
                  const isSelected = activePaper?.id === paper.id;
                  const label = paper.shortName || paper.name.split(' (')[0];
                  return (
                    <DropdownMenuItem
                      key={paper.id}
                      onClick={() => handleSelectPaperSize(paper.id)}
                      className="flex items-center justify-between cursor-pointer py-1.5 font-semibold group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{label}</span>
                        <span
                          className="text-micro text-muted-foreground font-mono font-normal"
                          dir="ltr"
                        >
                          {paper.widthMM} × {paper.heightMM} mm
                          {paper.inchLabel ? ` · ${paper.inchLabel}` : ''}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" weight="bold" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                {ADVANCED_PAPER_SIZES.map((paper) => {
                  const isSelected = activePaper?.id === paper.id;
                  const label = paper.shortName || paper.name.split(' (')[0];
                  return (
                    <DropdownMenuItem
                      key={paper.id}
                      onClick={() => handleSelectPaperSize(paper.id)}
                      className="flex items-center justify-between cursor-pointer py-1.5 font-semibold group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{label}</span>
                        <span
                          className="text-micro text-muted-foreground font-mono font-normal"
                          dir="ltr"
                        >
                          {paper.widthMM} × {paper.heightMM} mm
                          {paper.inchLabel ? ` · ${paper.inchLabel}` : ''}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" weight="bold" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

          {/* زر تبديل الاتجاه */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleToggleOrientation}
                aria-label={isLandscape ? 'تبديل الاتجاه إلى رأسي' : 'تبديل الاتجاه إلى أفقي'}
                className="w-7 h-7 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center active:scale-95 group"
              >
                <PageOrientationIcon
                  isLandscape={isLandscape}
                  className="w-3.5 h-3.5 text-muted-foreground/85 group-hover:text-primary transition-colors"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              align="center"
              className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
            >
              <span>
                {isLandscape
                  ? 'الاتجاه الحالي: أفقي (انقر للتحويل إلى رأسي)'
                  : 'الاتجاه الحالي: رأسي (انقر للتحويل إلى أفقي)'}
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. الوسط: كبسولة أدوات المحاذاة والرؤية الموحدة (Fluent 2 Icon Capsule) */}
      <div className="h-7 flex items-center gap-0.5 select-none border-x border-border/50 px-1.5">
        {/* زر المساطر */}
        <FluentCapsuleButton
          icon={<Ruler className="w-4 h-4" weight={showRuler ? 'fill' : 'regular'} />}
          label="المساطر (Ctrl + R)"
          tooltip={showRuler ? 'إخفاء المساطر' : 'إظهار المساطر'}
          shortcut="Ctrl+R"
          active={showRuler}
          onClick={() => setShowRuler(!showRuler)}
          testId="canvas-ruler-toggle"
        />

        {/* زر الشبكة */}
        <FluentCapsuleButton
          icon={<GridFour className="w-4 h-4" weight={showGrid ? 'fill' : 'regular'} />}
          label="الشبكة (Ctrl + ')"
          tooltip={showGrid ? 'إخفاء شبكة المحاذاة' : 'إظهار شبكة المحاذاة'}
          shortcut="Ctrl+'"
          active={showGrid}
          onClick={() => setShowGrid(!showGrid)}
        />

        {/* زر المغناطيس والمحاذاة الذكية */}
        <FluentCapsuleButton
          icon={<Magnet className="w-4 h-4" weight={snapToGrid ? 'fill' : 'regular'} />}
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
          icon={<Columns className="w-4 h-4" weight={showUserGuides ? 'fill' : 'regular'} />}
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
              <Scissors className="w-4 h-4" weight={collageShowCutLines ? 'fill' : 'regular'} />
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
      </div>

      {/* 3. الجانب الأيسر: كبسولة الزوم واختصارات المفاتيح المدمجة بالكامل */}
      <div className="flex items-center shrink-0">
        <div className="h-7 flex items-center gap-0.5 select-none font-cairo" dir="ltr">
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
                className="h-7 min-w-[44px] px-1.5 text-xs font-mono font-normal tabular-nums text-center select-none cursor-pointer hover:bg-muted/60 text-foreground/90 hover:text-foreground rounded-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
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

          {/* كبسولة ملاءمة الورقة المدمجة (Fluent 2 Split Fit Control) */}
          <div className="flex items-center h-7 rounded-sm bg-muted/30 hover:bg-muted/50 transition-colors mx-0.5">
            {/* زر ملاءمة الكل بنقرة واحدة (Ctrl+0) — أيقونة فصيحة حسب الوضع الفعّال مع إخفاء النص بصرياً */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-testid="canvas-fit-all"
                  onClick={fitZoom}
                  aria-label="ملاءمة الكل (Ctrl+0)"
                  className="h-full w-7 flex items-center justify-center rounded-s-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer select-none"
                >
                  {resolvedFit === 'width' ? (
                    <ArrowsHorizontal className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  ) : resolvedFit === 'actual' ? (
                    <FrameCorners className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  ) : canvasFitMode === 'auto' ? (
                    <Sparkle className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  ) : (
                    <ArrowsOut className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  )}
                  <span
                    data-testid="canvas-fit-status"
                    data-fit-mode={resolvedFit}
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
                    {canvasFitMode === 'auto'
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
                      className="h-full px-1 flex items-center justify-center rounded-e-md border-s border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
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
