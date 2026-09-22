import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { ArrowUUpLeft, ArrowUUpRight } from "@phosphor-icons/react";
import { FluentTooltip as TooltipBtn } from "@/components/ui/blocks";

/** التراجع/الإعادة. */
export const ToolbarHistoryTools = React.memo(function ToolbarHistoryTools() {
  const canUndo = useEditorStore((state) => state.historyIndex > 0);
  const canRedo = useEditorStore((state) => state.historyIndex < state.history.length - 1);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <div className="fluent-command-group shadow-2xs">
      <TooltipBtn content="تراجع">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          data-testid="toolbar-undo"
          aria-label="تراجع"
          className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ArrowUUpLeft className="w-5 h-5" />
        </Button>
      </TooltipBtn>
      <TooltipBtn content="إعادة">
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          data-testid="toolbar-redo"
          aria-label="إعادة"
          className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ArrowUUpRight className="w-5 h-5" />
        </Button>
      </TooltipBtn>
    </div>
  );
});
