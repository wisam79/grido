import React, { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { HugeIcon } from "@/components/ui/huge-icon";
import {
  RulerIcon,
  Grid02Icon,
  Magnet01Icon,
  TableColumnsSplitIcon,
  Scissor01Icon,
  RotateClockwiseIcon,
  ViewIcon,
  ViewOffIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize01Icon,
  File01Icon,
  KeyboardIcon,
} from "@hugeicons/core-free-icons";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PAPER_SIZES } from "@/lib/templates";

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
  const {
    showRuler,
    setShowRuler,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    showUserGuides,
    setShowUserGuides,
    collageShowCutLines,
    setCollageShowCutLines,
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    canvasZoom,
    setCanvasZoom,
    mode,
    template,
    printSettings,
  } = useEditorStore(
    useShallow((state) => ({
      showRuler: state.showRuler,
      setShowRuler: state.setShowRuler,
      showGrid: state.showGrid,
      setShowGrid: state.setShowGrid,
      snapToGrid: state.snapToGrid,
      setSnapToGrid: state.setSnapToGrid,
      showUserGuides: state.showUserGuides,
      setShowUserGuides: state.setShowUserGuides,
      collageShowCutLines: state.collageShowCutLines,
      setCollageShowCutLines: state.setCollageShowCutLines,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      setCanvasSize: state.setCanvasSize,
      canvasZoom: state.canvasZoom,
      setCanvasZoom: state.setCanvasZoom,
      mode: state.mode,
      template: state.template,
      printSettings: state.printSettings,
    }))
  );

  const isLandscape = canvasWidth > canvasHeight;

  const handleToggleOrientation = useCallback(() => {
    setCanvasSize(canvasHeight, canvasWidth);
  }, [canvasWidth, canvasHeight, setCanvasSize]);

  const handleZoomOut = useCallback(() => {
    setCanvasZoom((prev) => Math.max(0.1, parseFloat((prev - 0.1).toFixed(2))));
  }, [setCanvasZoom]);

  const handleZoomIn = useCallback(() => {
    setCanvasZoom((prev) => Math.min(5, parseFloat((prev + 0.1).toFixed(2))));
  }, [setCanvasZoom]);

  const handleResetZoom = useCallback(() => {
    setCanvasZoom(1);
  }, [setCanvasZoom]);

  const currentDpi = template?.dpi || printSettings.dpi || 300;
  const activePaper = PAPER_SIZES.find((p) => {
    return (
      (Math.round((canvasWidth / currentDpi) * 25.4) === p.widthMM && Math.round((canvasHeight / currentDpi) * 25.4) === p.heightMM) ||
      (Math.round((canvasWidth / currentDpi) * 25.4) === p.heightMM && Math.round((canvasHeight / currentDpi) * 25.4) === p.widthMM)
    );
  });

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-3 select-none font-cairo text-xs",
        className
      )}
      dir="rtl"
    >
      {/* 1. الجانب الأيمن: شارة معلومات مساحة العمل والأبعاد */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-card/80 dark:bg-sidebar/80 border border-border/80 text-muted-foreground font-semibold shadow-2xs">
          <HugeIcon icon={File01Icon} size={15} className="text-primary shrink-0" />
          <span className="text-foreground font-bold text-xs">
            {activePaper ? activePaper.name.split(" (")[0] : "مخصص"}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono font-medium" dir="ltr">
            ({Math.round((canvasWidth / currentDpi) * 25.4)} × {Math.round((canvasHeight / currentDpi) * 25.4)} mm)
          </span>
          <span className="text-[10px] text-muted-foreground/80 font-mono px-1 py-0.5 rounded bg-muted/60 border border-border/50">
            {isLandscape ? "أفقي" : "رأسي"}
          </span>
        </div>
      </div>

      {/* 2. الوسط: أدوات الرؤية والمحاذاة الذكية (Fluent 2 Icon Capsule) */}
      <div className="flex items-center gap-0.5 bg-card/90 dark:bg-card/70 backdrop-blur-md p-0.5 rounded-lg border border-border/80 shadow-2xs">
        {/* زر المساطر */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowRuler(!showRuler)}
              aria-label="المساطر (Ctrl + R)"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showRuler
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <HugeIcon icon={RulerIcon} size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <span>{showRuler ? "إخفاء المساطر" : "إظهار المساطر"}</span>
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+R</kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* زر الشبكة */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              aria-label="الشبكة (Ctrl + ')"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showGrid
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <HugeIcon icon={Grid02Icon} size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <span>{showGrid ? "إخفاء شبكة المحاذاة" : "إظهار شبكة المحاذاة"}</span>
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+'</kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* زر المغناطيس والمحاذاة الذكية */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setSnapToGrid(!snapToGrid)}
              aria-label="المغناطيس والمحاذاة الذكية"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                snapToGrid
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <HugeIcon icon={Magnet01Icon} size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            {snapToGrid ? "إيقاف الالتصاق المغناطيسي والمحاذاة الذكية" : "تفعيل الالتصاق المغناطيسي والمحاذاة الذكية"}
          </TooltipContent>
        </Tooltip>

        {/* زر الخطوط الإرشادية للمستخدم */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowUserGuides(!showUserGuides)}
              aria-label="الخطوط الإرشادية (Ctrl + ;)"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showUserGuides
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <HugeIcon icon={TableColumnsSplitIcon} size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <span>{showUserGuides ? "إخفاء الخطوط الإرشادية" : "إظهار الخطوط الإرشادية"}</span>
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+;</kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* زر خطوط القص (يظهر في الكولاج) */}
        {mode === "collage" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setCollageShowCutLines(!collageShowCutLines)}
                aria-label="خطوط القص للطباعة"
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                  collageShowCutLines
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                <HugeIcon icon={Scissor01Icon} size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              {collageShowCutLines ? "إخفاء علامات وخطوط قص الصور" : "إظهار علامات وخطوط قص الصور للطباعة"}
            </TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-4 bg-border/60 mx-1" />

        {/* زر تدوير وتبديل اتجاه الورقة */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleToggleOrientation}
              aria-label="تبديل اتجاه الورقة"
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
            >
              <HugeIcon icon={RotateClockwiseIcon} size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            تبديل اتجاه الورقة ({isLandscape ? "أفقي → رأسي" : "رأسي → أفقي"})
          </TooltipContent>
        </Tooltip>

        {/* زر وضع التركيز / المعاينة النظيفة */}
        {onToggleZenMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleZenMode}
                aria-label={isZenMode ? "استعادة الألواح الجانبية" : "وضع التركيز"}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                  isZenMode
                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                {isZenMode ? <HugeIcon icon={ViewOffIcon} size={16} /> : <HugeIcon icon={ViewIcon} size={16} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              {isZenMode ? "استعادة الألواح الجانبية" : "وضع التركيز (إخفاء الألواح الجانبية)"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 3. الجانب الأيسر: أدوات التكبير والتصغير واختصارات المفاتيح */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* زر اختصارات لوحة المفاتيح الأنيق */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/90 rounded-md border border-transparent hover:border-border/80 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
              onClick={() => window.dispatchEvent(new CustomEvent("grido:open-shortcuts"))}
              aria-label="اختصارات لوحة المفاتيح"
            >
              <HugeIcon icon={KeyboardIcon} size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            <div className="flex items-center gap-1.5">
              <span>اختصارات لوحة المفاتيح</span>
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+/</kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

        {/* مجموعة أدوات الزوم والملاءمة */}
        <div
          className="flex items-center gap-0.5 bg-card/90 dark:bg-card/70 backdrop-blur-md p-0.5 rounded-lg border border-border/80 shadow-2xs select-none font-cairo"
          dir="ltr"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/70 hover:text-foreground rounded-md transition-all cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleZoomOut}
                aria-label="تصغير"
              >
                <HugeIcon icon={ZoomOutIcon} size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span>تصغير</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+-</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-7 px-2 text-[11px] font-mono font-bold text-center select-none cursor-pointer hover:bg-muted/70 hover:text-primary rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleResetZoom}
                aria-label="إعادة تعيين المقياس إلى 100%"
              >
                {Math.round(canvasZoom * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span>إعادة تعيين المقياس إلى 100%</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+0</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/70 hover:text-foreground rounded-md transition-all cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleZoomIn}
                aria-label="تكبير"
              >
                <HugeIcon icon={ZoomInIcon} size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span>تكبير</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl++</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/70 hover:text-foreground rounded-md transition-all cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleResetZoom}
                aria-label="ملاءمة حجم الورقة"
              >
                <HugeIcon icon={Maximize01Icon} size={15} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              ملاءمة حجم الورقة للمركز (100%)
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

CanvasViewportDeck.displayName = "CanvasViewportDeck";
