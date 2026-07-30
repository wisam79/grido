import React from "react";
import { HorizontalRuler, VerticalRuler, RulerUnit } from "../ruler";

interface ViewportFixedRulersProps {
  showRuler: boolean;
  printMode: boolean;
  displayW: number;
  displayH: number;
  widthMM: number;
  heightMM: number;
  /** بكسلات الكانفس الفعلية — لعرض وحدة px */
  canvasPxW: number;
  canvasPxH: number;
  rulerUnit: RulerUnit;
  onToggleRulerUnit: () => void;
  hRulerWrapperRef: React.RefObject<HTMLDivElement>;
  vRulerWrapperRef: React.RefObject<HTMLDivElement>;
}

export const ViewportFixedRulersHeader = React.memo(function ViewportFixedRulersHeader({
  showRuler,
  printMode,
  displayW,
  widthMM,
  canvasPxW,
  rulerUnit,
  onToggleRulerUnit,
  hRulerWrapperRef,
}: Omit<ViewportFixedRulersProps, "displayH" | "heightMM" | "canvasPxH" | "vRulerWrapperRef">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="flex h-6 w-full bg-card border-b border-border z-20 shrink-0">
      <button
        type="button"
        onClick={onToggleRulerUnit}
        title="تبديل وحدة القياس (ملم / بكسل)"
        className="w-6 h-6 shrink-0 bg-card border-b border-l border-border flex items-center justify-center text-[9px] text-muted-foreground/75 font-mono select-none z-30 cursor-pointer hover:text-primary hover:bg-accent/60 transition-colors"
      >
        {rulerUnit}
      </button>
      <div className="flex-1 overflow-hidden relative">
        <div ref={hRulerWrapperRef} className="absolute top-0 left-0">
          <HorizontalRuler width={displayW} mmWidth={widthMM} pxWidth={canvasPxW} unit={rulerUnit} />
        </div>
      </div>
    </div>
  );
});

export const ViewportFixedRulersSidebar = React.memo(function ViewportFixedRulersSidebar({
  showRuler,
  printMode,
  displayH,
  heightMM,
  canvasPxH,
  rulerUnit,
  vRulerWrapperRef,
}: Omit<ViewportFixedRulersProps, "displayW" | "widthMM" | "canvasPxW" | "onToggleRulerUnit" | "hRulerWrapperRef">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="w-6 h-full bg-card border-l border-border z-20 shrink-0 overflow-hidden relative">
      <div ref={vRulerWrapperRef} className="absolute top-0 left-0">
        <VerticalRuler height={displayH} mmHeight={heightMM} pxHeight={canvasPxH} unit={rulerUnit} />
      </div>
    </div>
  );
});
