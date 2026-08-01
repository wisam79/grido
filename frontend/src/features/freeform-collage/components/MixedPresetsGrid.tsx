import React from "react";
import { MIXED_COLLAGE_PRESETS } from "../lib/mixed-presets";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, Grid2x2, Columns, Rows, Sparkles } from "lucide-react";
import type { MixedPreset } from "../types";

interface MixedPresetsGridProps {
  activePresetId: string | null;
  onSelectPreset: (preset: MixedPreset) => void;
}

function getPresetIcon(iconName: string) {
  if (iconName === "Columns") return Columns;
  if (iconName === "Rows") return Rows;
  return Grid2x2;
}

export const MixedPresetsGrid: React.FC<MixedPresetsGridProps> = ({ activePresetId, onSelectPreset }) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
      <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground me-1 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span>القوالب:</span>
      </div>

      {MIXED_COLLAGE_PRESETS.map((preset) => {
        const isActive = preset.id === activePresetId;
        const IconComp = getPresetIcon(preset.iconName);

        return (
          <Tooltip key={preset.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={cn(
                  "flex items-center gap-1.5 h-7.5 px-3 rounded-xl border text-[11px] font-bold transition-all cursor-pointer select-none shrink-0",
                  isActive
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30 shadow-xs"
                    : "border-border/60 bg-muted/30 hover:bg-muted/60 text-foreground/80 hover:text-foreground hover:border-primary/40"
                )}
              >
                {isActive ? (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <IconComp className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                )}
                <span>{preset.nameAr}</span>
                <span className={cn("text-[9.5px] font-mono px-1 rounded bg-background/50", isActive ? "text-primary/90 font-bold" : "text-muted-foreground/60")} dir="ltr">
                  {preset.paperWidthMM}×{preset.paperHeightMM}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-center font-cairo">
              <p className="font-bold text-[11px]">{preset.nameAr}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</p>
              <p className="text-[9.5px] font-mono mt-0.5 text-primary font-bold" dir="ltr">
                {preset.slots.length} صور — {preset.paperWidthMM}×{preset.paperHeightMM} mm
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
