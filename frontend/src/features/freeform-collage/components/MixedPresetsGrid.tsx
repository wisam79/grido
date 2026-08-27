import React from "react";
import { MIXED_COLLAGE_PRESETS } from "../lib/mixed-presets";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HugeIcon } from "@/components/ui/huge-icon";
import {
  Tick01Icon,
  Grid02Icon,
  TableRowsSplitIcon,
  TableColumnsSplitIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { MixedPreset } from "../types";

interface MixedPresetsGridProps {
  activePresetId: string | null;
  onSelectPreset: (preset: MixedPreset) => void;
}

function getPresetIcon(iconName: string) {
  if (iconName === "Columns") return TableColumnsSplitIcon;
  if (iconName === "Rows") return TableRowsSplitIcon;
  return Grid02Icon;
}

export const MixedPresetsGrid: React.FC<MixedPresetsGridProps> = React.memo(function MixedPresetsGrid({ activePresetId, onSelectPreset }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none font-cairo">
      <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground me-1 shrink-0 select-none">
        <HugeIcon icon={SparklesIcon} size={14} className="text-amber-500" />
        <span>القوالب:</span>
      </div>

      {MIXED_COLLAGE_PRESETS.map((preset) => {
        const isActive = preset.id === activePresetId;
        const icon = getPresetIcon(preset.iconName);

        return (
          <Tooltip key={preset.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={cn(
                  "flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-bold transition-all cursor-pointer select-none shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/30 shadow-xs"
                    : "border-border/80 dark:border-white/10 bg-card/60 hover:bg-card hover:border-primary/40 text-foreground/80 hover:text-foreground shadow-2xs"
                )}
              >
                {isActive ? (
                  <HugeIcon icon={Tick01Icon} size={14} className="text-primary shrink-0" />
                ) : (
                  <HugeIcon icon={icon} size={14} className="text-muted-foreground/70 shrink-0" />
                )}
                <span>{preset.nameAr}</span>
                <span className={cn("text-[9.5px] font-mono px-1 rounded-sm bg-background/60 border border-border/30", isActive ? "text-primary/90 font-bold" : "text-muted-foreground/70")} dir="ltr">
                  {preset.paperWidthMM}×{preset.paperHeightMM}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-center font-cairo rounded-xl border-border/60 shadow-lg">
              <p className="font-bold text-[11px]">{preset.nameAr}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</p>
              <p className="text-[9.5px] font-mono mt-0.5 text-primary font-bold" dir="ltr">
                {preset.slots.length} صور — {preset.paperWidthMM}×{preset.paperHeightMM} مم
              </p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
});
