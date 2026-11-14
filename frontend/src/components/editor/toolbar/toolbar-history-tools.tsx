import React from 'react';

import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { ArrowUUpLeft, ArrowUUpRight } from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';

/** التراجع/الإعادة. */
export const ToolbarHistoryTools = React.memo(function ToolbarHistoryTools() {
  const canUndo = useEditorStore((state) => state.historyIndex > 0);
  const canRedo = useEditorStore((state) => state.historyIndex < state.history.length - 1);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <div className="flex items-center gap-0.5">
      {/* 🛡️ الزر المعطّل لا يُظهر Tooltip مخصصاً — title الأصلي يشرح السبب */}
      <TooltipBtn content={canUndo ? 'تراجع' : 'لا شيء للتراجع عنه'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          data-testid="toolbar-undo"
          aria-label="تراجع"
          title={!canUndo ? 'لا شيء للتراجع عنه' : undefined}
          className="coarse-touch-target h-8 w-8 p-0 text-foreground/80 hover:text-foreground hover:bg-accent cursor-pointer"
        >
          <ArrowUUpLeft className="w-4 h-4" />
        </Button>
      </TooltipBtn>
      <TooltipBtn content={canRedo ? 'إعادة' : 'لا شيء لإعادته'}>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          data-testid="toolbar-redo"
          aria-label="إعادة"
          title={!canRedo ? 'لا شيء لإعادته' : undefined}
          className="coarse-touch-target h-8 w-8 p-0 text-foreground/80 hover:text-foreground hover:bg-accent cursor-pointer"
        >
          <ArrowUUpRight className="w-4 h-4" />
        </Button>
      </TooltipBtn>
    </div>
  );
});
