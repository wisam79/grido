import React, { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import {
  Ruler,
  GridFour,
  Magnet,
  Columns,
  Scissors,
  Eye,
  EyeSlash,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  ArrowsOut,
  FileText,
  Keyboard,
  Check,
  CaretDown,
} from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CANVAS_FIT_LABELS,
  type CanvasFitMode,
} from "@/lib/canvas/fit";
import { useCanvasFitStatus } from "@/lib/ui/canvas-fit-status";
import { PageOrientationIcon } from "@/components/ui/image-icons";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FluentCapsuleButton } from "@/components/ui/blocks/fluent-capsule-button";
import { FluentKbd } from "@/components/ui/blocks/fluent-kbd";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PAPER_SIZES } from "@/lib/templates";
import { useCanvasZoom } from "@/hooks/use-canvas-zoom";
import { useCanvasContext, useCollageViewFlags, useGridControls } from "@/lib/store/selectors";
import { canvasMm, findPaperByMm, formatDimensions } from "@/lib/canvas/units";

export interface CanvasViewportDeckProps {
  className?: string;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const CanvasViewportDeck = React.memo(function CanvasViewportDeck({
  className,
  isZenMode = false,
  onToggleZenMode,
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
  } = useCanvasZoom();

  // أوضاع الملاءمة في قائمة واحدة — الفعل يعيّن الوضع ويرجع الزوم لـ 100%
  const fitModeActions: { mode: CanvasFitMode; run: () => void; hint: string }[] = [
    { mode: "auto", run: autoFitZoom, hint: "يختار الأنسب لهندسة النافذة" },
    { mode: "height", run: fitZoom, hint: "الورقة كاملة على الشاشة" },
    { mode: "width", run: fitWidthZoom, hint: "تملأ العرض ويُمرَّر الباقي" },
  ];
  const leftoverPercent = Math.round(fitLeftoverRatio * 100);
  const fitStatusLabel = resolvedFit === "width" ? "عرض" : "الكل";

  const isLandscape = canvasWidth > canvasHeight;

  const handleToggleOrientation = useCallback(() => {
    setCanvasSize(canvasHeight, canvasWidth);
  }, [canvasWidth, canvasHeight, setCanvasSize]);

  const currentDpi = template?.dpi || printSettings.dpi || 300;
  const { wMM, hMM } = canvasMm(canvasWidth, canvasHeight, currentDpi);
  const activePaper = findPaperByMm(wMM, hMM, PAPER_SIZES);
  const formattedDimensions = formatDimensions(canvasWidth, canvasHeight, currentDpi, rulerUnit);

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-3 select-none font-cairo text-xs",
        className
      )}
      dir="rtl"
    >
      {/* 1. الجانب الأيمن: كبسولة معلومات مساحة العمل والأبعاد */}
      <div className="flex items-center shrink-0">
        <div className="h-8 flex items-center gap-2 px-2.5 rounded-lg bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-2xs text-muted-foreground font-semibold fluent-specular">
          <FileText className="w-4 h-4 text-primary shrink-0" weight="duotone" />
          <span className="text-foreground font-bold text-xs">
            {activePaper ? activePaper.name.split(" (")[0] : "مخصص"}
          </span>
          <span className="text-xs text-muted-foreground/90 font-mono font-medium" dir="ltr">
            {formattedDimensions}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleToggleOrientation}
                aria-label={isLandscape ? "تبديل الاتجاه إلى رأسي" : "تبديل الاتجاه إلى أفقي"}
                className="w-7 h-7 rounded-md bg-muted/70 hover:bg-primary/15 text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/30 transition-all cursor-pointer flex items-center justify-center active:scale-95 group shadow-2xs"
              >
                <PageOrientationIcon
                  isLandscape={isLandscape}
                  className="w-3.5 h-3.5 text-muted-foreground/85 group-hover:text-primary transition-colors"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
              <span>{isLandscape ? "الاتجاه الحالي: أفقي (انقر للتحويل إلى رأسي)" : "الاتجاه الحالي: رأسي (انقر للتحويل إلى أفقي)"}</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. الوسط: كبسولة أدوات المحاذاة والرؤية الموحدة (Fluent 2 Icon Capsule) */}
      <div className="h-8 flex items-center gap-0.5 bg-card/90 dark:bg-card/75 backdrop-blur-xl p-0.5 rounded-lg border border-border/80 dark:border-white/10 shadow-2xs select-none fluent-specular">
        {/* زر المساطر */}
        <FluentCapsuleButton
          icon={<Ruler className="w-4 h-4" weight={showRuler ? "duotone" : "regular"} />}
          label="المساطر (Ctrl + R)"
          tooltip={showRuler ? "إخفاء المساطر" : "إظهار المساطر"}
          shortcut="Ctrl+R"
          active={showRuler}
          onClick={() => setShowRuler(!showRuler)}
          testId="canvas-ruler-toggle"
        />

        {/* زر الشبكة */}
        <FluentCapsuleButton
          icon={<GridFour className="w-4 h-4" weight={showGrid ? "duotone" : "regular"} />}
          label="الشبكة (Ctrl + ')"
          tooltip={showGrid ? "إخفاء شبكة المحاذاة" : "إظهار شبكة المحاذاة"}
          shortcut="Ctrl+'"
          active={showGrid}
          onClick={() => setShowGrid(!showGrid)}
        />

        {/* زر المغناطيس والمحاذاة الذكية */}
        <FluentCapsuleButton
          icon={<Magnet className="w-4 h-4" weight={snapToGrid ? "duotone" : "regular"} />}
          label="المغناطيس والمحاذاة الذكية"
          tooltip={snapToGrid ? "إيقاف الالتصاق المغناطيسي والمحاذاة الذكية" : "تفعيل الالتصاق المغناطيسي والمحاذاة الذكية"}
          active={snapToGrid}
          onClick={() => setSnapToGrid(!snapToGrid)}
        />

        {/* زر الخطوط الإرشادية للمستخدم */}
        <FluentCapsuleButton
          icon={<Columns className="w-4 h-4" weight={showUserGuides ? "duotone" : "regular"} />}
          label="الخطوط الإرشادية (Ctrl + ;)"
          tooltip={showUserGuides ? "إخفاء الخطوط الإرشادية" : "إظهار الخطوط الإرشادية"}
          shortcut="Ctrl+;"
          active={showUserGuides}
          onClick={() => setShowUserGuides(!showUserGuides)}
        />

        {/* زر خطوط القص (يظهر في الكولاج) */}
        {mode === "collage" && (
          <FluentCapsuleButton
            icon={<Scissors className="w-4 h-4" weight={collageShowCutLines ? "duotone" : "regular"} />}
            label="خطوط القص للطباعة"
            tooltip={collageShowCutLines ? "إخفاء علامات وخطوط قص الصور" : "إظهار علامات وخطوط قص الصور للطباعة"}
            active={collageShowCutLines}
            onClick={() => setCollageShowCutLines(!collageShowCutLines)}
          />
        )}

        {/* زر وضع التركيز / المعاينة النظيفة */}
        {onToggleZenMode && (
          <FluentCapsuleButton
            icon={isZenMode ? <EyeSlash className="w-4 h-4" weight="fill" /> : <Eye className="w-4 h-4" weight="regular" />}
            label={isZenMode ? "استعادة الألواح الجانبية" : "وضع التركيز"}
            tooltip={isZenMode ? "استعادة الألواح الجانبية" : "وضع التركيز (إخفاء الألواح الجانبية)"}
            active={isZenMode}
            onClick={onToggleZenMode}
          />
        )}
      </div>

      {/* 3. الجانب الأيسر: كبسولة الزوم واختصارات المفاتيح المدمجة بالكامل */}
      <div className="flex items-center shrink-0">
        <div
          className="h-8 flex items-center gap-0.5 bg-card/90 dark:bg-card/75 backdrop-blur-xl p-0.5 rounded-lg border border-border/80 dark:border-white/10 shadow-2xs select-none font-cairo fluent-specular"
          dir="ltr"
        >
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
                className="h-7 min-w-[46px] px-1.5 text-xs font-mono font-bold text-center select-none cursor-pointer hover:bg-muted/60 hover:text-primary rounded-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={resetZoom}
                aria-label="إعادة تعيين المقياس إلى 100%"
              >
                {percentLabel}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
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

          {/* إرجاع المضاعف إلى 100% — بلا تغيير في أساس الملاءمة */}
          <FluentCapsuleButton
            icon={<ArrowsOut className="w-4 h-4" weight="regular" />}
            label="إعادة الملاءمة إلى 100%"
            tooltip="إعادة المضاعف إلى 100% (حجم الملاءمة)"
            shortcut="Ctrl+1"
            onClick={resetZoom}
          />

          {/* ملاءمة الورقة: نقرة = ملاءمة الكل، والسهم يفتح بقية الأوضاع */}
          <div className="flex items-center" dir="rtl">
            <FluentCapsuleButton
              icon={
                <FileText
                  className="w-4 h-4"
                  weight={resolvedFit === "height" ? "duotone" : "regular"}
                />
              }
              label="ملاءمة الكل"
              tooltip={`ملاءمة الكل (${CANVAS_FIT_LABELS.height}) — الورقة كاملة على الشاشة`}
              shortcut="Ctrl+0"
              active={resolvedFit === "height"}
              onClick={fitZoom}
              testId="canvas-fit-all"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="canvas-fit-menu"
                  aria-label="أوضاع ملاءمة الورقة"
                  className="h-7 w-5 flex items-center justify-center rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <CaretDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 font-cairo text-xs z-(--z-menu) rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16"
              >
                <div dir="rtl">
                  <DropdownMenuLabel className="text-micro text-muted-foreground font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" weight="duotone" />
                    <span>ملاءمة الورقة</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {fitModeActions.map((item) => (
                    <DropdownMenuItem
                      key={item.mode}
                      data-testid={`canvas-fit-${item.mode}`}
                      onClick={item.run}
                      className="flex items-center justify-between cursor-pointer py-1.5 font-semibold group"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs">{CANVAS_FIT_LABELS[item.mode]}</span>
                        <span className="text-micro text-muted-foreground font-normal">{item.hint}</span>
                      </div>
                      {canvasFitMode === item.mode && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" weight="bold" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* مؤشر الوضع الفعّال + كمية الفراغ التي يعالجها الوضع الآخر */}
            {resolvedFit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    data-testid="canvas-fit-status"
                    data-fit-mode={resolvedFit}
                    className="h-7 flex items-center px-1.5 text-micro font-bold text-muted-foreground/90 select-none cursor-default"
                  >
                    {fitStatusLabel}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  align="center"
                  className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8"
                >
                  <span>
                    {resolvedFit === "width"
                      ? `ملاءمة العرض — تُمرَّر الورقة رأسياً (الفراغ الجانبي ${leftoverPercent}% في وضع الكل)`
                      : leftoverPercent > 20
                        ? `ملاءمة الكل — الفراغ الجانبي ${leftoverPercent}% من العرض، جرّب ملاءمة العرض`
                        : "ملاءمة الكل — الورقة تملأ منطقة العمل"}
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

          {/* زر اختصارات لوحة المفاتيح المدمج داخل الكبسولة */}
          <FluentCapsuleButton
            icon={<Keyboard className="w-4 h-4" weight="regular" />}
            label="اختصارات لوحة المفاتيح"
            tooltip="اختصارات لوحة المفاتيح"
            shortcut="Ctrl+/"
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-shortcuts"))}
            testId="canvas-shortcuts"
          />
        </div>
      </div>
    </div>
  );
});

CanvasViewportDeck.displayName = "CanvasViewportDeck";
