import React from "react";
import { HorizontalRuler, VerticalRuler, RulerUnit, SelectionBoundsProjection } from "./ruler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HugeIcon } from "@/components/ui/huge-icon";
import { Tick01Icon, Delete02Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";

export interface ViewportFixedRulersProps {
  showRuler: boolean;
  printMode: boolean;
  viewportWidth: number;
  viewportHeight: number;
  originX: number;
  originY: number;
  displayW: number;
  displayH: number;
  widthMM: number;
  heightMM: number;
  canvasPxW: number;
  canvasPxH: number;
  rulerUnit: RulerUnit;
  onChangeRulerUnit: (unit: RulerUnit) => void;
  selectionBoundsX?: SelectionBoundsProjection | null;
  selectionBoundsY?: SelectionBoundsProjection | null;
  onStartDragHGuide?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onStartDragVGuide?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onClearGuides?: () => void;
  hasGuides?: boolean;
  showUserGuides?: boolean;
  onToggleShowGuides?: () => void;
}

const RULER_UNITS: { id: RulerUnit; label: string; sub: string }[] = [
  { id: "mm", label: "مليمتر (mm)", sub: "قياسي للهويات" },
  { id: "cm", label: "سنتيمتر (cm)", sub: "للطباعة والبوسترات" },
  { id: "in", label: "بوصة (in)", sub: "إنش - للطباعة الدولية" },
  { id: "px", label: "بكسل (px)", sub: "بكسلات الشاشة الفعلية" },
];

export const ViewportFixedRulersHeader = React.memo(function ViewportFixedRulersHeader({
  showRuler,
  printMode,
  viewportWidth,
  originX,
  displayW,
  widthMM,
  canvasPxW,
  rulerUnit,
  onChangeRulerUnit,
  selectionBoundsX,
  onStartDragHGuide,
  onClearGuides,
  hasGuides,
  showUserGuides,
  onToggleShowGuides,
}: Omit<ViewportFixedRulersProps, "viewportHeight" | "originY" | "displayH" | "heightMM" | "canvasPxH" | "selectionBoundsY" | "onStartDragVGuide">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="flex h-6 w-full bg-card/95 backdrop-blur-md border-b border-border/80 z-20 shrink-0 select-none fluent-specular shadow-2xs" dir="ltr">
      {/* مربع الزاوية: زر اختيار وحدة القياس والتحكم في الخطوط الإرشادية */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="انقر لتغيير وحدة القياس أو إدارة الخطوط الإرشادية"
            aria-label="خيارات وحدة قياس المسطرة"
            className="w-6 h-6 shrink-0 bg-muted/50 hover:bg-primary/15 border-r border-border/80 flex flex-col items-center justify-center font-mono select-none z-30 cursor-pointer transition-all outline-none group active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 relative"
          >
            <span className="text-[9px] font-black text-primary uppercase tracking-tighter group-hover:scale-105 transition-transform">
              {rulerUnit}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 font-cairo text-xs z-[100] rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <div dir="rtl">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold">
              وحدة قياس المسطرة
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {RULER_UNITS.map((u) => {
              const isSelected = rulerUnit === u.id;
              return (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => onChangeRulerUnit(u.id)}
                  className="flex items-center justify-between cursor-pointer py-1.5 font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">{u.id}</span>
                    <span className="text-xs">{u.label}</span>
                  </div>
                  {isSelected && <HugeIcon icon={Tick01Icon} size={14} className="text-primary" />}
                </DropdownMenuItem>
              );
            })}

            {(hasGuides || onToggleShowGuides) && (
              <>
                <DropdownMenuSeparator />
                {onToggleShowGuides && (
                  <DropdownMenuItem
                    onClick={onToggleShowGuides}
                    className="flex items-center gap-2 cursor-pointer py-1.5 font-semibold text-xs"
                  >
                    <HugeIcon icon={showUserGuides ? ViewOffIcon : ViewIcon} size={14} className="text-muted-foreground" />
                    <span>{showUserGuides ? "إخفاء الخطوط الإرشادية" : "إظهار الخطوط الإرشادية"}</span>
                  </DropdownMenuItem>
                )}
                {hasGuides && onClearGuides && (
                  <DropdownMenuItem
                    onClick={onClearGuides}
                    className="flex items-center gap-2 cursor-pointer py-1.5 font-semibold text-destructive hover:bg-destructive/10 text-xs"
                  >
                    <HugeIcon icon={Delete02Icon} size={14} />
                    <span>مسح كافة الخطوط الإرشادية</span>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 overflow-hidden relative">
        <HorizontalRuler
          viewportWidth={viewportWidth}
          originX={originX}
          displayW={displayW}
          mmWidth={widthMM}
          pxWidth={canvasPxW}
          unit={rulerUnit}
          selectionBounds={selectionBoundsX}
          onPointerDown={onStartDragHGuide}
        />
      </div>
    </div>
  );
});

export const ViewportFixedRulersSidebar = React.memo(function ViewportFixedRulersSidebar({
  showRuler,
  printMode,
  viewportHeight,
  originY,
  displayH,
  heightMM,
  canvasPxH,
  rulerUnit,
  selectionBoundsY,
  onStartDragVGuide,
}: Omit<ViewportFixedRulersProps, "viewportWidth" | "originX" | "displayW" | "widthMM" | "canvasPxW" | "onChangeRulerUnit" | "onClearGuides" | "hasGuides" | "showUserGuides" | "onToggleShowGuides">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="w-6 h-full bg-card/95 backdrop-blur-md border-r border-border/80 z-20 shrink-0 select-none fluent-specular shadow-2xs" dir="ltr">
      <VerticalRuler
        viewportHeight={viewportHeight}
        originY={originY}
        displayH={displayH}
        mmHeight={heightMM}
        pxHeight={canvasPxH}
        unit={rulerUnit}
        selectionBounds={selectionBoundsY}
        onPointerDown={onStartDragVGuide}
      />
    </div>
  );
});

