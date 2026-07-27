import React from "react";
import { HorizontalRuler, VerticalRuler } from "../ruler";

interface ViewportFixedRulersProps {
  showRuler: boolean;
  printMode: boolean;
  displayW: number;
  displayH: number;
  widthMM: number;
  heightMM: number;
  hRulerWrapperRef: React.RefObject<HTMLDivElement>;
  vRulerWrapperRef: React.RefObject<HTMLDivElement>;
}

export const ViewportFixedRulersHeader = React.memo(function ViewportFixedRulersHeader({
  showRuler,
  printMode,
  displayW,
  widthMM,
  hRulerWrapperRef,
}: Omit<ViewportFixedRulersProps, "displayH" | "heightMM" | "vRulerWrapperRef">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="flex h-6 w-full bg-card border-b border-border z-20 shrink-0">
      <div className="w-6 h-6 shrink-0 bg-card border-b border-l border-border flex items-center justify-center text-[9px] text-muted-foreground/75 font-mono select-none z-30">
        mm
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div ref={hRulerWrapperRef} className="absolute top-0 left-0">
          <HorizontalRuler width={displayW} mmWidth={widthMM} />
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
  vRulerWrapperRef,
}: Omit<ViewportFixedRulersProps, "displayW" | "widthMM" | "hRulerWrapperRef">) {
  if (!showRuler || printMode) return null;

  return (
    <div className="w-6 h-full bg-card border-l border-border z-20 shrink-0 overflow-hidden relative">
      <div ref={vRulerWrapperRef} className="absolute top-0 left-0">
        <VerticalRuler height={displayH} mmHeight={heightMM} />
      </div>
    </div>
  );
});
