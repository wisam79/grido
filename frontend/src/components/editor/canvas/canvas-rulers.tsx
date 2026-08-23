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
    <div className="flex h-6 w-full bg-card border-b border-border z-20 shrink-0 select-none" dir="ltr">
      <button
        type="button"
        onClick={onToggleRulerUnit}
        title="تبديل وحدة القياس (ملم / بكسل)"
        className="w-6 h-6 shrink-0 bg-card border-r border-border flex items-center justify-center text-[9px] text-muted-foreground/75 font-mono select-none z-30 cursor-pointer hover:text-primary hover:bg-accent/60 transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background font-bold"
      >
        {rulerUnit}
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
    <div className="w-6 h-full bg-card border-r border-border z-20 shrink-0 overflow-hidden relative select-none" dir="ltr">
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
