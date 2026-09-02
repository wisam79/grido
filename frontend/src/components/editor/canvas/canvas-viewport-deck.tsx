import React, { useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
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
} from "@phosphor-icons/react";
import { PageOrientationIcon } from "@/components/ui/image-icons";
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
      {/* 1. الجانب الأيمن: كبسولة معلومات مساحة العمل والأبعاد */}
      <div className="flex items-center shrink-0">
        <div className="h-8 flex items-center gap-2 px-2.5 rounded-lg bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-2xs text-muted-foreground font-semibold fluent-specular">
          <FileText className="w-4 h-4 text-primary shrink-0" weight="duotone" />
          <span className="text-foreground font-bold text-xs">
            {activePaper ? activePaper.name.split(" (")[0] : "مخصص"}
          </span>
          <span className="text-[11px] text-muted-foreground/90 font-mono font-medium" dir="ltr">
            {Math.round((canvasWidth / currentDpi) * 25.4)} × {Math.round((canvasHeight / currentDpi) * 25.4)} mm
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleToggleOrientation}
                aria-label={isLandscape ? "تبديل الاتجاه إلى رأسي" : "تبديل الاتجاه إلى أفقي"}
                className="w-6 h-6 rounded-md bg-muted/70 hover:bg-primary/15 text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/30 transition-all cursor-pointer flex items-center justify-center active:scale-95 group shadow-2xs"
              >
                <PageOrientationIcon
                  isLandscape={isLandscape}
                  className="w-3.5 h-3.5 text-muted-foreground/85 group-hover:text-primary transition-colors"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <span>{isLandscape ? "الاتجاه الحالي: أفقي (انقر للتحويل إلى رأسي)" : "الاتجاه الحالي: رأسي (انقر للتحويل إلى أفقي)"}</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 2. الوسط: كبسولة أدوات المحاذاة والرؤية الموحدة (Fluent 2 Icon Capsule) */}
      <div className="h-8 flex items-center gap-0.5 bg-card/90 dark:bg-card/75 backdrop-blur-xl p-0.5 rounded-lg border border-border/80 dark:border-white/10 shadow-2xs select-none fluent-specular">
        {/* زر المساطر */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowRuler(!showRuler)}
              aria-label="المساطر (Ctrl + R)"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showRuler
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Ruler className="w-4 h-4" weight={showRuler ? "duotone" : "regular"} />
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
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showGrid
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <GridFour className="w-4 h-4" weight={showGrid ? "duotone" : "regular"} />
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
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                snapToGrid
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Magnet className="w-4 h-4" weight={snapToGrid ? "duotone" : "regular"} />
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
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                showUserGuides
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Columns className="w-4 h-4" weight={showUserGuides ? "duotone" : "regular"} />
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
                  "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                  collageShowCutLines
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Scissors className="w-4 h-4" weight={collageShowCutLines ? "duotone" : "regular"} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              {collageShowCutLines ? "إخفاء علامات وخطوط قص الصور" : "إظهار علامات وخطوط قص الصور للطباعة"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* زر وضع التركيز / المعاينة النظيفة */}
        {onToggleZenMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleZenMode}
                aria-label={isZenMode ? "استعادة الألواح الجانبية" : "وضع التركيز"}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none active:scale-95",
                  isZenMode
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isZenMode ? <EyeSlash className="w-4 h-4" weight="fill" /> : <Eye className="w-4 h-4" weight="regular" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              {isZenMode ? "استعادة الألواح الجانبية" : "وضع التركيز (إخفاء الألواح الجانبية)"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* 3. الجانب الأيسر: كبسولة الزوم واختصارات المفاتيح المدمجة بالكامل */}
      <div className="flex items-center shrink-0">
        <div
          className="h-8 flex items-center gap-0.5 bg-card/90 dark:bg-card/75 backdrop-blur-xl p-0.5 rounded-lg border border-border/80 dark:border-white/10 shadow-2xs select-none font-cairo fluent-specular"
          dir="ltr"
        >
          {/* زر تصغير */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/60 hover:text-foreground rounded-md transition-all duration-150 cursor-pointer text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 border border-transparent"
                onClick={handleZoomOut}
                aria-label="تصغير"
              >
                <MagnifyingGlassMinus className="w-4 h-4" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span>تصغير</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+-</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* نسبة الزوم الرقمية */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-7 min-w-[46px] px-1.5 text-[11px] font-mono font-bold text-center select-none cursor-pointer hover:bg-muted/60 hover:text-primary rounded-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
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

          {/* زر تكبير */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/60 hover:text-foreground rounded-md transition-all duration-150 cursor-pointer text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 border border-transparent"
                onClick={handleZoomIn}
                aria-label="تكبير"
              >
                <MagnifyingGlassPlus className="w-4 h-4" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span>تكبير</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl++</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* زر ملاءمة حجم الورقة */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/60 hover:text-foreground rounded-md transition-all duration-150 cursor-pointer text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 border border-transparent"
                onClick={handleResetZoom}
                aria-label="ملاءمة حجم الورقة"
              >
                <ArrowsOut className="w-4 h-4" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              ملاءمة حجم الورقة للمركز (100%)
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 bg-border/60 mx-0.5" />

          {/* زر اختصارات لوحة المفاتيح المدمج داخل الكبسولة */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center text-muted-foreground/80 hover:text-foreground hover:bg-muted/60 rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 border border-transparent"
                onClick={() => window.dispatchEvent(new CustomEvent("grido:open-shortcuts"))}
                aria-label="اختصارات لوحة المفاتيح"
              >
                <Keyboard className="w-4 h-4" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-md">
              <div className="flex items-center gap-1.5">
                <span>اختصارات لوحة المفاتيح</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+/</kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

CanvasViewportDeck.displayName = "CanvasViewportDeck";
