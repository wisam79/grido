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
import {
  Checkmark20Regular,
  Delete20Regular,
  Eye20Regular,
  EyeOff20Regular,
  EyeOff20Filled,
  LockClosed20Regular,
  LockClosed20Filled,
  LockOpen20Regular,
  Ruler20Regular,
} from "@fluentui/react-icons";

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
  marginPxX?: number;
  marginPxY?: number;
  onChangeRulerUnit: (unit: RulerUnit) => void;
  selectionBoundsX?: SelectionBoundsProjection | null;
  selectionBoundsY?: SelectionBoundsProjection | null;
  onStartDragHGuide?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onStartDragVGuide?: (e: React.PointerEvent<SVGSVGElement>) => void;
  onClearGuides?: () => void;
  hasGuides?: boolean;
  showUserGuides?: boolean;
  onToggleShowGuides?: () => void;
  lockUserGuides?: boolean;
  onToggleLockGuides?: () => void;
}

const RULER_UNITS: { id: RulerUnit; label: string; sub: string }[] = [
  { id: "mm", label: "مليمتر (mm)", sub: "قياسي لصور الهوية والجوازات" },
  { id: "cm", label: "سنتيمتر (cm)", sub: "للطباعة والبوسترات" },
  { id: "in", label: "بوصة (in)", sub: "إنش - معايير الطباعة الدولية" },
  { id: "px", label: "بكسل (px)", sub: "بكسلات الشاشة الرقمية" },
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
  marginPxX = 0,
  onChangeRulerUnit,
  selectionBoundsX,
  onStartDragHGuide,
  onClearGuides,
  hasGuides,
  showUserGuides,
  onToggleShowGuides,
  lockUserGuides,
  onToggleLockGuides,
}: Omit<ViewportFixedRulersProps, "viewportHeight" | "originY" | "displayH" | "heightMM" | "canvasPxH" | "selectionBoundsY" | "onStartDragVGuide" | "marginPxY">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="flex h-[22px] w-full bg-neutral-200 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-700 z-20 shrink-0 select-none shadow-2xs" dir="ltr">
      {/* 🧭 مربع الزاوية الكلاسيكي بنمط Microsoft Word (Tab Stop & Unit Box) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="انقر لتغيير وحدة القياس أو إدارة الخطوط الإرشادية (Ctrl+R)"
            aria-label="خيارات وحدة قياس المسطرة"
            className="w-[22px] h-[22px] shrink-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-r border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center select-none z-30 cursor-pointer transition-all outline-none group active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 relative"
          >
            <span className="text-[9px] font-black text-neutral-800 dark:text-neutral-200 leading-none group-hover:text-primary transition-colors">
              ∟
            </span>
            <span className="text-[6.5px] font-bold text-primary font-mono leading-none tracking-tighter">
              {rulerUnit}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 font-cairo text-xs z-[100] rounded-xl backdrop-blur-xl fluent-acrylic fluent-specular shadow-fluent-16">
          <div dir="rtl">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Ruler20Regular className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>وحدة قياس المسطرة</span>
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-mono">Ctrl+R</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {RULER_UNITS.map((u) => {
              const isSelected = rulerUnit === u.id;
              return (
                <DropdownMenuItem
                  key={u.id}
                  onClick={() => onChangeRulerUnit(u.id)}
                  className="flex items-center justify-between cursor-pointer py-1.5 font-semibold group"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-primary font-bold">{u.id}</span>
                      <span className="text-xs">{u.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">{u.sub}</span>
                  </div>
                  {isSelected && <Checkmark20Regular className="w-3.5 h-3.5 text-primary shrink-0" />}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold">
              الخطوط الإرشادية (Guides)
            </DropdownMenuLabel>

            {onToggleShowGuides && (
              <DropdownMenuItem
                onClick={onToggleShowGuides}
                className="flex items-center justify-between cursor-pointer py-1.5 font-semibold text-xs"
              >
                <div className="flex items-center gap-2">
                  {showUserGuides ? (
                    <EyeOff20Filled className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <Eye20Regular className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span>{showUserGuides ? "إخفاء الخطوط الإرشادية" : "إظهار الخطوط الإرشادية"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-mono">Ctrl+;</span>
              </DropdownMenuItem>
            )}

            {hasGuides && onToggleLockGuides && (
              <DropdownMenuItem
                onClick={onToggleLockGuides}
                className="flex items-center gap-2 cursor-pointer py-1.5 font-semibold text-xs"
              >
                {lockUserGuides ? (
                  <LockOpen20Regular className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <LockClosed20Filled className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span>{lockUserGuides ? "إلغاء قفل الخطوط الإرشادية" : "قفل الخطوط الإرشادية"}</span>
              </DropdownMenuItem>
            )}

            {hasGuides && onClearGuides && (
              <DropdownMenuItem
                onClick={onClearGuides}
                className="flex items-center gap-2 cursor-pointer py-1.5 font-semibold text-destructive hover:bg-destructive/10 text-xs"
              >
                <Delete20Regular className="w-3.5 h-3.5 shrink-0" />
                <span>مسح كافة الخطوط الإرشادية</span>
              </DropdownMenuItem>
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
          marginPx={marginPxX}
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
  marginPxY = 0,
  selectionBoundsY,
  onStartDragVGuide,
}: Omit<ViewportFixedRulersProps, "viewportWidth" | "originX" | "displayW" | "widthMM" | "canvasPxW" | "onChangeRulerUnit" | "onClearGuides" | "hasGuides" | "showUserGuides" | "onToggleShowGuides" | "lockUserGuides" | "onToggleLockGuides" | "marginPxX">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="w-[22px] h-full bg-neutral-200 dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-700 z-20 shrink-0 select-none shadow-2xs" dir="ltr">
      <VerticalRuler
        viewportHeight={viewportHeight}
        originY={originY}
        displayH={displayH}
        mmHeight={heightMM}
        pxHeight={canvasPxH}
        unit={rulerUnit}
        marginPx={marginPxY}
        selectionBounds={selectionBoundsY}
        onPointerDown={onStartDragVGuide}
      />
    </div>
  );
});
