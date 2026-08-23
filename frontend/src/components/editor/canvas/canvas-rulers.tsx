import React from "react";
import { HorizontalRuler, VerticalRuler, RulerUnit } from "./ruler";

interface ViewportFixedRulersProps {
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
  onToggleRulerUnit: () => void;
}

export const ViewportFixedRulersHeader = React.memo(function ViewportFixedRulersHeader({
  showRuler,
  printMode,
  viewportWidth,
  originX,
  displayW,
  widthMM,
  canvasPxW,
  rulerUnit,
  onToggleRulerUnit,
}: Omit<ViewportFixedRulersProps, "viewportHeight" | "originY" | "displayH" | "heightMM" | "canvasPxH">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="flex h-6 w-full bg-card/95 backdrop-blur-md border-b border-border/80 z-20 shrink-0 select-none fluent-specular shadow-2xs" dir="ltr">
      <button
        type="button"
        onClick={onToggleRulerUnit}
        title={`وحدة القياس: ${rulerUnit === "mm" ? "مليمتر (انقر للتبديل لبكسل)" : "بكسل (انقر للتبديل لملم)"}`}
        aria-label="تبديل وحدة قياس المسطرة"
        className="w-6 h-6 shrink-0 bg-background/60 hover:bg-primary/15 border-r border-border/80 flex items-center justify-center font-mono select-none z-30 cursor-pointer transition-all outline-none group active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="text-[8.5px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
          {rulerUnit}
        </span>
      </button>
      <div className="flex-1 overflow-hidden relative">
        <HorizontalRuler
          viewportWidth={viewportWidth}
          originX={originX}
          displayW={displayW}
          mmWidth={widthMM}
          pxWidth={canvasPxW}
          unit={rulerUnit}
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
}: Omit<ViewportFixedRulersProps, "viewportWidth" | "originX" | "displayW" | "widthMM" | "canvasPxW" | "onToggleRulerUnit">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="w-6 h-full bg-card/95 backdrop-blur-md border-r border-border/80 z-20 shrink-0 overflow-hidden relative select-none fluent-specular shadow-2xs" dir="ltr">
      <VerticalRuler
        viewportHeight={viewportHeight}
        originY={originY}
        displayH={displayH}
        mmHeight={heightMM}
        pxHeight={canvasPxH}
        unit={rulerUnit}
      />
    </div>
  );
});

