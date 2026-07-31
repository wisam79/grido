import React, { useState } from "react";
import { useEditorStore, CanvasSlot } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { ChevronDown, Image as ImageIcon, LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function TooltipBtn({ content, children }: { content: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {React.cloneElement(children, { "aria-label": content })}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="font-cairo text-[10px] py-1 px-2.5 bg-primary text-primary-foreground border-0 shadow-sm rounded font-medium"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

const SlotItem = React.memo(
  function SlotItem({
    slot,
    isSelected,
    selectElement,
    clearSlot,
  }: {
    slot: CanvasSlot;
    isSelected: boolean;
    selectElement: (id: string | null) => void;
    clearSlot: (id: string, e: React.MouseEvent) => void;
  }) {
    const hasImage = !!slot.imageSrc;

    return (
      <div
        onClick={() => selectElement(slot.id)}
        className={`flex items-center justify-between p-2.5 rounded-lg border text-right cursor-pointer transition-colors duration-200 ${
          isSelected
            ? "border-primary/50 bg-primary/5 text-primary shadow-xs font-bold"
            : "border-transparent bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-muted-foreground/80 p-1.5 bg-muted/50 rounded-md">
            {hasImage ? <ImageIcon className="w-4 h-4 text-primary/70" /> : <LayoutGrid className="w-4 h-4 opacity-50" />}
          </span>
          <span className="text-xs font-semibold truncate max-w-[120px]">
            خانة {slot.cellIndex + 1} {hasImage ? "(صورة)" : "(فارغة)"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasImage && (
            <TooltipBtn content="إزالة الصورة">
              <Button
                variant="ghost"
                size="icon"
                className="w-7.5 h-7.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10"
                onClick={(e) => clearSlot(slot.id, e)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.slot.id === nextProps.slot.id &&
      prevProps.slot.imageSrc === nextProps.slot.imageSrc
    );
  }
);

export function SlotsList() {
  const { slots, selectedId, selectElement, updateSlot } = useEditorStore(useShallow((state) => ({
    slots: state.slots,
    selectedId: state.selectedId,
    selectElement: state.selectElement,
    updateSlot: state.updateSlot,
  })));

  const [expanded, setExpanded] = useState(true);

  if (slots.length === 0) return null;

  const clearSlot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateSlot(id, { imageSrc: undefined, originalImageSrc: undefined, filter: "none" });
  };

  return (
    <div className="space-y-1 font-cairo select-none mt-2">
      <div 
        className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-muted/30 rounded-md transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-bold text-foreground">خانات الكولاج</h3>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
            {slots.length}
          </span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", expanded ? "rotate-180" : "")} />
      </div>

      {expanded && (
        <div className="space-y-1 px-1">
          {slots.map((slot) => (
            <SlotItem
              key={slot.id}
              slot={slot}
              isSelected={selectedId === slot.id}
              selectElement={selectElement}
              clearSlot={clearSlot}
            />
          ))}
        </div>
      )}
    </div>
  );
}
