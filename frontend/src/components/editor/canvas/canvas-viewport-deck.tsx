import React, { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { HugeIcon } from "@/components/ui/huge-icon";
import {
  RulerIcon,
  Grid02Icon,
  Magnet01Icon,
  Scissor01Icon,
  RotateClockwiseIcon,
  ViewIcon,
  ViewOffIcon,
  ZoomInIcon,
  ZoomOutIcon,
  Maximize01Icon,
  File01Icon,
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
      {/* 1. الجانب الأيمن: شارة معلومات مساحة العمل (Icon + Dimensions) */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-card border border-border text-muted-foreground font-semibold shadow-2xs">
          <HugeIcon icon={File01Icon} size={16} className="text-primary shrink-0" />
          <span className="text-foreground font-bold text-xs">
            {activePaper ? activePaper.name.split(" (")[0] : "مخصص"}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono font-medium" dir="ltr">
            ({Math.round((canvasWidth / currentDpi) * 25.4)}×{Math.round((canvasHeight / currentDpi) * 25.4)} mm)
          </span>
        </div>
      </div>

      {/* 2. الوسط: أدوات الرؤية والمحاذاة الذكية (Icon-Driven UI بالكامل) */}
      <div className="flex items-center gap-1 bg-card p-0.5 rounded-lg border border-border shadow-2xs">
        {/* زر المساطر */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowRuler(!showRuler)}
              aria-label="المساطر (Ctrl + R)"
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showRuler
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <HugeIcon icon={RulerIcon} size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            {showRuler ? "إخفاء المساطر (Ctrl + R)" : "إظهار المساطر (Ctrl + R)"}
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
                "w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showGrid
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <HugeIcon icon={Grid02Icon} size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            {showGrid ? "إخفاء شبكة المحاذاة (Ctrl + ')" : "إظهار شبكة المحاذاة (Ctrl + ')"}
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
                "w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                snapToGrid
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <HugeIcon icon={Magnet01Icon} size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            {snapToGrid ? "إيقاف الالتصاق بالمغناطيس" : "تفعيل الالتصاق بالشبكة والمحاذاة الذكية"}
          </TooltipContent>
        </Tooltip>

        {/* زر الخطوط الإرشادية */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowUserGuides(!showUserGuides)}
              aria-label="الخطوط الإرشادية (Ctrl + ;)"
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showUserGuides
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <HugeIcon icon={ViewIcon} size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            {showUserGuides ? "إخفاء الخطوط الإرشادية (Ctrl + ;)" : "إظهار الخطوط الإرشادية (Ctrl + ;)"}
          </TooltipContent>
        </Tooltip>

        {/* زر خطوط القص (يظهر في الكولاج) */}
        {mode === "collage" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setCollageShowCutLines(!collageShowCutLines)}
                aria-label="خطوط القص"
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                  collageShowCutLines
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <HugeIcon icon={Scissor01Icon} size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              {collageShowCutLines ? "إخفاء خطوط وعلامات قص الصور" : "إظهار خطوط وعلامات قص الصور للطباعة"}
            </TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-5 bg-border/60 mx-0.5" />

        {/* زر تدوير وتبديل اتجاه الورقة */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleToggleOrientation}
              aria-label="تبديل اتجاه الورقة"
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
            >
              <HugeIcon icon={RotateClockwiseIcon} size={18} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            تبديل اتجاه الورقة ({isLandscape ? "أفقي → رأسي" : "رأسي → أفقي"})
          </TooltipContent>
        </Tooltip>

        {/* زر المعاينة الصافية (Zen View) */}
        {onToggleZenMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleZenMode}
                aria-label={isZenMode ? "إظهار الألواح الجانبية" : "معاينة نظيفة"}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                  isZenMode
                    ? "bg-emerald-500 text-white shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isZenMode ? <HugeIcon icon={ViewOffIcon} size={18} /> : <HugeIcon icon={ViewIcon} size={18} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              {isZenMode ? "استعادة الألواح الجانبية" : "معاينة نظيفة للطباعة بدون أشرطة جانبية"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 3. الجانب الأيسر: أدوات التكبير والتصغير والمساعدة */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* زر اختصارات لوحة المفاتيح */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 font-mono"
              onClick={() => window.dispatchEvent(new CustomEvent("grido:open-shortcuts"))}
              aria-label="اختصارات لوحة المفاتيح"
            >
              <kbd className="text-xs font-bold">?</kbd>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
            اختصارات لوحة المفاتيح (Ctrl + /)
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5 bg-border/60 mx-0.5" />

        {/* مجموعة أدوات الزوم والملاءمة */}
        <div
          className="flex items-center gap-0.5 bg-card p-0.5 rounded-lg border border-border shadow-2xs select-none font-cairo"
          dir="ltr"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center hover:bg-muted hover:text-foreground rounded-md transition-all cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleZoomOut}
                aria-label="تصغير"
              >
                <HugeIcon icon={ZoomOutIcon} size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              تصغير (Ctrl + عجلة الماوس)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-8 px-2.5 text-xs font-mono font-bold text-center select-none cursor-pointer hover:bg-muted hover:text-primary rounded-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleResetZoom}
                aria-label="إعادة تعيين المقياس إلى 100%"
              >
                {Math.round(canvasZoom * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              إعادة تعيين المقياس إلى 100%
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center hover:bg-muted hover:text-foreground rounded-md transition-all cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleZoomIn}
                aria-label="تكبير"
              >
                <HugeIcon icon={ZoomInIcon} size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              تكبير (Ctrl + عجلة الماوس)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center hover:bg-muted hover:text-foreground rounded-md transition-all cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleResetZoom}
                aria-label="ملاءمة حجم الورقة"
              >
                <HugeIcon icon={Maximize01Icon} size={18} />
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
