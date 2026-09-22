import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { FadersHorizontal } from "@phosphor-icons/react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { IMAGE_FILTERS } from "@/lib/templates";
import { useShallow } from "zustand/react/shallow";
import { FluentTooltip as TooltipBtn } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";

/** مرشحات الصورة المحددة (عنصر أو خانة كولاج) — تُستخدم داخل أدوات التحديد. */
export const ImageFiltersPopover = React.memo(function ImageFiltersPopover() {
  const { imageSrc, filter, mode, selectedId } = useEditorStore(useShallow((state) => {
    const selectedEl = state.elements.find((e) => e.id === state.selectedId);
    if (selectedEl?.type === "image") {
      return { imageSrc: selectedEl.imageSrc, filter: selectedEl.filter, mode: state.mode, selectedId: state.selectedId };
    }
    const selectedSlot = state.slots?.find((s) => s.id === state.selectedId);
    if (state.mode === "collage" && selectedSlot) {
      return { imageSrc: selectedSlot.imageSrc, filter: selectedSlot.filter, mode: state.mode, selectedId: state.selectedId };
    }
    return { imageSrc: undefined, filter: undefined, mode: state.mode, selectedId: state.selectedId };
  }));

  const updateElement = useEditorStore((state) => state.updateElement);
  const updateSlot = useEditorStore((state) => state.updateSlot);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  if (!selectedId) return null;

  return (
    <Popover>
      <TooltipBtn content="المرشحات">
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="المرشحات"
            className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
          >
            <FadersHorizontal className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
      </TooltipBtn>
      <PopoverContent align="start" dir="rtl" className="w-80 p-3 font-cairo bg-card/95 backdrop-blur-xl border border-border/80 dark:border-white/10 rounded-xl shadow-fluent-16 fluent-specular z-50">
        <div className="text-xs font-bold mb-2 text-foreground/80 text-start" dir="rtl">
          المرشحات
        </div>
        <div className="grid grid-cols-4 gap-1.5" dir="rtl">
          {IMAGE_FILTERS.map((f) => {
            const isActive = filter === f.id;

            return (
              <button
                key={f.id}
                onClick={() => {
                  if (mode !== "collage") {
                    updateElement(selectedId, { filter: f.id });
                  } else {
                    updateSlot(selectedId, { filter: f.id });
                  }
                  pushHistory();
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-1 rounded-md border transition-colors cursor-pointer",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  isActive
                    ? "border-primary bg-primary/10 text-primary shadow-xs shadow-primary/5 dark:bg-primary/20 dark:border-primary/50 font-bold"
                    : "border-border/60 bg-card hover:bg-accent text-muted-foreground"
                )}
              >
                <div className="w-full aspect-square rounded-md overflow-hidden shrink-0 border border-foreground/10 bg-muted relative">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: f.css }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500" style={{ filter: f.css }} />
                  )}
                </div>
                <span className="text-micro tracking-tight leading-tight truncate max-w-full text-center mt-0.5">{f.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});
