import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { MagnifyingGlassPlus, MagnifyingGlassMinus, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ZoomControlsProps {
  className?: string;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  showResetIcon?: boolean;
}

export const ZoomControls = React.memo(function ZoomControls({
  className = "",
  minZoom = 0.1,
  maxZoom = 5,
  step = 0.1,
  showResetIcon = false,
}: ZoomControlsProps) {
  const { canvasZoom, setCanvasZoom } = useEditorStore(
    useShallow((state) => ({
      canvasZoom: state.canvasZoom,
      setCanvasZoom: state.setCanvasZoom,
    }))
  );

  const handleZoomOut = () => {
    setCanvasZoom(Math.max(minZoom, parseFloat((canvasZoom - step).toFixed(2))));
  };

  const handleZoomIn = () => {
    setCanvasZoom(Math.min(maxZoom, parseFloat((canvasZoom + step).toFixed(2))));
  };

  const handleResetZoom = () => {
    setCanvasZoom(1);
  };

  return (
    <div
      className={`flex items-center gap-0.5 bg-muted/50 dark:bg-muted/30 border border-black/5 dark:border-white/10 rounded-lg p-0.5 shadow-2xs select-none font-cairo fluent-specular ${className}`}
      dir="ltr"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 flex items-center justify-center hover:bg-background hover:text-foreground rounded-md transition-colors cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={handleZoomOut}
            aria-label="تصغير (Zoom Out)"
          >
            <MagnifyingGlassMinus className="w-3.5 h-3.5" weight="regular" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={10} align="center" className="font-cairo text-[11px] font-semibold py-1 px-2.5 shadow-md">
          تصغير (Ctrl + عجلة الماوس)
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-7 px-2 text-[11px] font-mono font-bold text-center select-none cursor-pointer hover:bg-background hover:text-primary rounded-md transition-all border border-transparent hover:border-border/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={handleResetZoom}
            aria-label="إعادة ضبط المقياس إلى 100%"
          >
            {Math.round(canvasZoom * 100)}%
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={10} align="center" className="font-cairo text-[11px] font-semibold py-1 px-2.5 shadow-md">
          إعادة ضبط المقياس إلى 100%
        </TooltipContent>
      </Tooltip>

      {showResetIcon && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="h-7 w-7 flex items-center justify-center hover:bg-background hover:text-foreground rounded-md transition-colors cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              onClick={handleResetZoom}
              aria-label="إعادة تعيين 100%"
            >
              <ArrowCounterClockwise className="w-3.5 h-3.5" weight="regular" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={10} align="center" className="font-cairo text-[11px] font-semibold py-1 px-2.5 shadow-md">
            إعادة تعيين (100%)
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 flex items-center justify-center hover:bg-background hover:text-foreground rounded-md transition-colors cursor-pointer text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            onClick={handleZoomIn}
            aria-label="تكبير (Zoom In)"
          >
            <MagnifyingGlassPlus className="w-3.5 h-3.5" weight="regular" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={10} align="center" className="font-cairo text-[11px] font-semibold py-1 px-2.5 shadow-md">
          تكبير (Ctrl + عجلة الماوس)
        </TooltipContent>
      </Tooltip>
    </div>
  );
});
