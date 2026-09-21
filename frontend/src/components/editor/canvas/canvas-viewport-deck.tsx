import React, { useCallback, useMemo } from "react";
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
import { ZOOM_DEFAULT, stepZoom } from "@/lib/canvas/zoom";

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
    rulerUnit,
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
      rulerUnit: state.rulerUnit,
      printSettings: state.printSettings,
    }))
  );

  const isLandscape = canvasWidth > canvasHeight;

  const handleToggleOrientation = useCallback(() => {
    setCanvasSize(canvasHeight, canvasWidth);
  }, [canvasWidth, canvasHeight, setCanvasSize]);

  const handleZoomOut = useCallback(() => {
    setCanvasZoom((prev) => stepZoom(prev, -1));
  }, [setCanvasZoom]);

  const handleZoomIn = useCallback(() => {
    setCanvasZoom((prev) => stepZoom(prev, 1));
  }, [setCanvasZoom]);

  const handleResetZoom = useCallback(() => {
    setCanvasZoom(ZOOM_DEFAULT);
  }, [setCanvasZoom]);

  const currentDpi = template?.dpi || printSettings.dpi || 300;
  const activePaper = PAPER_SIZES.find((p) => {
    return (
      (Math.round((canvasWidth / currentDpi) * 25.4) === p.widthMM && Math.round((canvasHeight / currentDpi) * 25.4) === p.heightMM) ||
      (Math.round((canvasWidth / currentDpi) * 25.4) === p.heightMM && Math.round((canvasHeight / currentDpi) * 25.4) === p.widthMM)
    );
  });

  const formattedDimensions = useMemo(() => {
    if (rulerUnit === "px") {
      return `${Math.round(canvasWidth)} × ${Math.round(canvasHeight)} px`;
    }
    const wMM = (canvasWidth / currentDpi) * 25.4;
    const hMM = (canvasHeight / currentDpi) * 25.4;
    if (rulerUnit === "cm") {
      return `${(wMM / 10).toFixed(1)} × ${(hMM / 10).toFixed(1)} cm`;
    }
    if (rulerUnit === "in") {
      return `${(wMM / 25.4).toFixed(2)} × ${(hMM / 25.4).toFixed(2)} in`;
    }
    return `${Math.round(wMM)} × ${Math.round(hMM)} mm`;
  }, [rulerUnit, canvasWidth, canvasHeight, currentDpi]);

  return (
    <div
      className={cn(
        "w-full flex items-center justify-between gap-2 select-none font-cairo text-xs",
        className
      )}
      dir="rtl"
    >
      {/* 1. الجانب الأيمن: كبسولة معلومات مساحة العمل والأبعاد */}
      <div className="flex items-center shrink-0">
        <div className="h-8 flex items-center gap-1.5 px-2 rounded-lg bg-card/90 dark:bg-card/75 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-2xs text-muted-foreground font-semibold fluent-specular">
          <FileText className="w-5 h-5 text-primary shrink-0" weight="duotone" />
          <span className="text-foreground font-bold text-xs">
            {activePaper ? activePaper.name.split(" (")[0] : "مخصص"}
          </span>
          {/* الأبعاد تُخفى في النوافذ الضيقة (نافذة 1024 مع لوح جانبي)
              لمنع فيض الشريط السفلي واختفاء أزرار الزوم خلف الحافة */}
          <span className="hidden min-[1200px]:inline text-xs text-muted-foreground/90 font-mono font-medium" dir="ltr">
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
                  className="w-4 h-4 text-muted-foreground/85 group-hover:text-primary transition-colors"
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
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setShowRuler(!showRuler)}
              data-testid="canvas-ruler-toggle"
              aria-label="المساطر (Ctrl + R)"
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95",
                showRuler
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Ruler className="w-5 h-5" weight={showRuler ? "duotone" : "regular"} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
            <div className="flex items-center gap-1.5">
              <span>{showRuler ? "إخفاء المساطر" : "إظهار المساطر"}</span>
              <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+R</kbd>
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
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95",
                showGrid
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <GridFour className="w-5 h-5" weight={showGrid ? "duotone" : "regular"} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
            <div className="flex items-center gap-1.5">
              <span>{showGrid ? "إخفاء شبكة المحاذاة" : "إظهار شبكة المحاذاة"}</span>
              <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+'</kbd>
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
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95",
                snapToGrid
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Magnet className="w-5 h-5" weight={snapToGrid ? "duotone" : "regular"} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
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
                "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95",
                showUserGuides
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Columns className="w-5 h-5" weight={showUserGuides ? "duotone" : "regular"} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
            <div className="flex items-center gap-1.5">
              <span>{showUserGuides ? "إخفاء الخطوط الإرشادية" : "إظهار الخطوط الإرشادية"}</span>
              <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+;</kbd>
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
                  "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95",
                  collageShowCutLines
                    ? "text-primary bg-primary/10 hover:bg-primary/15"
                    : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Scissors className="w-5 h-5" weight={collageShowCutLines ? "duotone" : "regular"} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
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
                  "w-7 h-7 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-95",
                  isZenMode
                    ? "text-primary bg-primary/10 hover:bg-primary/15"
                    : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60"
                )}
              >
                {isZenMode ? <EyeSlash className="w-5 h-5" weight="fill" /> : <Eye className="w-5 h-5" weight="regular" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
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
                data-testid="canvas-zoom-out"
                aria-label="تصغير"
              >
                <MagnifyingGlassMinus className="w-5 h-5" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
              <div className="flex items-center gap-1.5">
                <span>تصغير</span>
                <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+-</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* نسبة الزوم الرقمية */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-7 min-w-[46px] px-1.5 text-xs font-mono font-bold text-center select-none cursor-pointer hover:bg-muted/60 hover:text-primary rounded-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95"
                onClick={handleResetZoom}
                aria-label="إعادة تعيين المقياس إلى 100%"
              >
                {Math.round(canvasZoom * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
              <div className="flex items-center gap-1.5">
                <span>المقياس الفعلي (100%)</span>
                <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+0</kbd>
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
                data-testid="canvas-zoom-in"
                aria-label="تكبير"
              >
                <MagnifyingGlassPlus className="w-5 h-5" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
              <div className="flex items-center gap-1.5">
                <span>تكبير</span>
                <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl++</kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* زر ملاءمة الورقة للشاشة (Zoom = 100% = Fit) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center hover:bg-muted/60 hover:text-foreground rounded-md transition-all duration-150 cursor-pointer text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 border border-transparent"
                onClick={handleResetZoom}
                aria-label="ملاءمة الورقة للشاشة"
              >
                <ArrowsOut className="w-5 h-5" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
              <div className="flex items-center gap-1.5">
                <span>ملاءمة الورقة للشاشة</span>
                <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+0</kbd>
              </div>
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
                data-testid="canvas-shortcuts"
                aria-label="اختصارات لوحة المفاتيح"
              >
                <Keyboard className="w-5 h-5" weight="regular" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} align="center" className="font-cairo text-xs font-semibold py-1 px-2.5 shadow-fluent-8">
              <div className="flex items-center gap-1.5">
                <span>اختصارات لوحة المفاتيح</span>
                <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+/</kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});

CanvasViewportDeck.displayName = "CanvasViewportDeck";
