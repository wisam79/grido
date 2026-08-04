import React from "react";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const PRESET_BG_COLORS = [
  { id: "white", label: "أبيض", value: "#ffffff" },
  { id: "black", label: "أسود", value: "#000000" },
  { id: "gray", label: "رمادي", value: "#f3f4f6" },
  { id: "blue", label: "أزرق", value: "#2563eb" },
  { id: "cream", label: "كريمي", value: "#fffbe6" },
  { id: "transparent", label: "شفاف", value: "transparent" },
];

export const CanvasBackgroundPanel = React.memo(function CanvasBackgroundPanel() {
  const { backgroundColor, setBackgroundColor, pushHistory } = useEditorStore(
    useShallow((state) => ({
      backgroundColor: state.backgroundColor,
      setBackgroundColor: state.setBackgroundColor,
      pushHistory: state.pushHistory,
    }))
  );

  const handleColorSelect = (color: string) => {
    setBackgroundColor(color);
    pushHistory();
  };

  return (
    <div className="space-y-3 bg-card/40 dark:bg-card/20 border border-border/50 p-3.5 rounded-2xl shadow-xs font-cairo">
      <div className="flex items-center justify-between border-b border-border/25 pb-2">
        <Label className="text-xs font-extrabold text-foreground flex items-center gap-2 select-none">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Palette className="w-3.5 h-3.5" />
          </div>
          <span>لون خلفية الورقة (Page Background)</span>
        </Label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_BG_COLORS.map((preset) => {
            const isActive = backgroundColor.toLowerCase() === preset.value.toLowerCase();
            return (
              <Tooltip key={preset.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleColorSelect(preset.value)}
                    className={cn(
                      "w-7 h-7 rounded-xl border border-border/60 flex items-center justify-center cursor-pointer transition-all duration-150 relative shadow-2xs hover:scale-105 active:scale-95",
                      isActive && "ring-2 ring-primary ring-offset-1 border-primary font-bold"
                    )}
                    style={{
                      backgroundColor: preset.value === "transparent" ? undefined : preset.value,
                      backgroundImage: preset.value === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)" : undefined,
                      backgroundSize: preset.value === "transparent" ? "8px 8px" : undefined,
                      backgroundPosition: preset.value === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0px" : undefined,
                    }}
                  >
                    {isActive && (
                      <Check className={cn("w-3.5 h-3.5 stroke-[3]", preset.value === "#ffffff" || preset.value === "#fffbe6" || preset.value === "#f3f4f6" ? "text-slate-900" : "text-white")} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{preset.label}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* Custom Color Input */}
          <div className="flex items-center gap-1.5 border border-border/60 rounded-xl px-2 py-0.5 bg-background/60 dark:bg-background/40">
            <input
              type="color"
              value={backgroundColor === "transparent" ? "#ffffff" : backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              onBlur={() => pushHistory()}
              className="w-5 h-5 rounded-md cursor-pointer border-0 bg-transparent p-0 shrink-0"
              title="اختيار لون مخصص"
            />
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
              {backgroundColor === "transparent" ? "شفاف" : backgroundColor}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
