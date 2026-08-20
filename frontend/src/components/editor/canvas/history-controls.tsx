import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface HistoryControlsProps {
  className?: string;
  size?: "default" | "sm" | "icon" | "icon-sm";
  variant?: "ghost" | "outline" | "default" | "subtle";
}

export const HistoryControls = React.memo(function HistoryControls({
  className = "",
  size = "sm",
  variant = "ghost",
}: HistoryControlsProps) {
  const { canUndo, canRedo, undo, redo } = useEditorStore(
    useShallow((state) => ({
      canUndo: state.historyIndex > 0,
      canRedo: state.historyIndex < state.history.length - 1,
      undo: state.undo,
      redo: state.redo,
    }))
  );

  return (
    <div
      className={`fluent-command-group shadow-2xs select-none font-cairo ${className}`}
      dir="rtl"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={undo}
            disabled={!canUndo}
            aria-label="تراجع (Ctrl+Z)"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="font-cairo text-[11px] py-1.5 px-3 bg-primary text-primary-foreground border-0 shadow-md rounded-md font-medium"
        >
          تراجع (Ctrl+Z)
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={redo}
            disabled={!canRedo}
            aria-label="إعادة (Ctrl+Y)"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-40"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="font-cairo text-[11px] py-1.5 px-3 bg-primary text-primary-foreground border-0 shadow-md rounded-md font-medium"
        >
          إعادة (Ctrl+Y)
        </TooltipContent>
      </Tooltip>
    </div>
  );
});
