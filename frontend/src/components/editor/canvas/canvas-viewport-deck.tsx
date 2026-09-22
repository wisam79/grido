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
} from "@phosphor-icons/react";
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
  const { percentLabel, zoomIn, zoomOut, resetZoom, fitZoom } = useCanvasZoom();

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
                className="w-6 h-6 rounded-md bg-muted/70 hover:bg-primary/15 text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/30 transition-all cursor-pointer flex items-center justify-center active:scale-95 group shadow-2xs"
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

          {/* نسبة الزوم الرقمية */}
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
                <span>المقياس الفعلي (100%)</span>
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

          {/* زر الحجم الفعلي 100% */}
          <FluentCapsuleButton
            icon={<ArrowsOut className="w-4 h-4" weight="regular" />}
            label="الحجم الفعلي 100%"
            tooltip="الحجم الفعلي 100%"
            shortcut="Ctrl+1"
            onClick={resetZoom}
          />

          {/* زر ملاءمة الورقة للشاشة (Fit) — منفصل عن 100% */}
          <FluentCapsuleButton
            icon={<FileText className="w-4 h-4" weight="regular" />}
            label="ملاءمة الورقة للشاشة"
            tooltip="ملاءمة الورقة للشاشة"
            shortcut="Ctrl+0"
            onClick={fitZoom}
          />

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
