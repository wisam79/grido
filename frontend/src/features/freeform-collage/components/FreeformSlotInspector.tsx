import React from "react";
import type { FreeformSlot, PhotoPresetType, SlotAlignment } from "../types";
import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from "../lib/freeform-math";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRotateClockwise20Filled,
  LockClosed20Filled,
  LockOpen20Filled,
  Copy20Filled,
  Delete20Regular,
  AlignCenterHorizontal20Filled,
  AlignCenterVertical20Filled,
  ArrowMove20Filled,
  SlideSize20Filled,
  Options20Filled,
  ChevronDown20Filled,
} from "@fluentui/react-icons";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FreeformSlotInspectorProps {
  slot: FreeformSlot | undefined;
  paperWidthMM: number;
  paperHeightMM: number;
  onUpdateSlot: (updated: Partial<FreeformSlot>) => void;
  onRotateSlot: () => void;
  onDuplicateSlot: () => void;
  onRemoveSlot: () => void;
  onAlignSlot: (alignment: SlotAlignment) => void;
}

export const FreeformSlotInspector: React.FC<FreeformSlotInspectorProps> = React.memo(function FreeformSlotInspector({
  slot,
  paperWidthMM,
  paperHeightMM,
  onUpdateSlot,
  onRotateSlot,
  onDuplicateSlot,
  onRemoveSlot,
  onAlignSlot,
}) {
  if (!slot) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center rounded-xl bg-card/60 border border-border/70 fluent-specular shadow-2xs h-full min-h-[160px] text-muted-foreground select-none">
        <Options20Filled className="w-6 h-6 mb-1.5 opacity-40 text-primary" />
        <span className="text-xs font-bold text-foreground/80">لم يتم تحديد أي خلية</span>
        <span className="text-[10.5px] text-muted-foreground mt-0.5">
          انقر فوق أي خلية على مساحة العمل لتعديل أبعادها وموقعها بالمليمتر
        </span>
      </div>
    );
  }

  // حساب الأبعاد الفيزيائية الحالية بالمليمتر
  const xMM = Math.round(slot.x * paperWidthMM * 10) / 10;
  const yMM = Math.round(slot.y * paperHeightMM * 10) / 10;
  const wMM = Math.round(slot.w * paperWidthMM * 10) / 10;
  const hMM = Math.round(slot.h * paperHeightMM * 10) / 10;

  const handleWidthChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num) || num <= 0) return;
    const clampedMM = Math.min(paperWidthMM - xMM, Math.max(5, num));
    const newWRel = clampedMM / paperWidthMM;
    if (slot.lockAspect && slot.w > 0) {
      const aspect = (slot.w * paperWidthMM) / (slot.h * paperHeightMM);
      const newHRel = (clampedMM / aspect) / paperHeightMM;
      onUpdateSlot({ w: newWRel, h: Math.min(1 - slot.y, newHRel) });
    } else {
      onUpdateSlot({ w: newWRel });
    }
  };

  const handleHeightChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num) || num <= 0) return;
    const clampedMM = Math.min(paperHeightMM - yMM, Math.max(5, num));
    const newHRel = clampedMM / paperHeightMM;
    if (slot.lockAspect && slot.h > 0) {
      const aspect = (slot.w * paperWidthMM) / (slot.h * paperHeightMM);
      const newWRel = (clampedMM * aspect) / paperWidthMM;
      onUpdateSlot({ h: newHRel, w: Math.min(1 - slot.x, newWRel) });
    } else {
      onUpdateSlot({ h: newHRel });
    }
  };

  const handleXChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    const maxMM = paperWidthMM - wMM;
    const clampedMM = Math.min(maxMM, Math.max(0, num));
    onUpdateSlot({ x: clampedMM / paperWidthMM });
  };

  const handleYChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    const maxMM = paperHeightMM - hMM;
    const clampedMM = Math.min(maxMM, Math.max(0, num));
    onUpdateSlot({ y: clampedMM / paperHeightMM });
  };

  const handleSelectPreset = (presetKey: PhotoPresetType) => {
    const dims = PHOTO_PRESET_DIMENSIONS_MM[presetKey];
    if (!dims) return;
    const newWRel = Math.min(1 - slot.x, dims.w / paperWidthMM);
    const newHRel = Math.min(1 - slot.y, dims.h / paperHeightMM);
    onUpdateSlot({
      presetType: presetKey,
      label: PHOTO_PRESET_LABELS[presetKey],
      w: newWRel,
      h: newHRel,
    });
  };

  const toggleAspectLock = () => {
    onUpdateSlot({ lockAspect: !slot.lockAspect });
  };

  return (
    <div className="space-y-2.5 p-3 rounded-xl bg-card/75 border border-border/80 dark:border-white/10 fluent-specular shadow-2xs text-xs font-cairo" dir="rtl">
      {/* الرأس: نوع الخلية والتسمية */}
      <div className="flex items-center justify-between gap-1.5 border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="font-bold text-foreground truncate text-xs">
            {slot.label || "خلية مخصصة"}
          </span>
        </div>

        {/* قائمة تغيير المقاس القياسي المباشر */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6.5 px-2 text-[10.5px] gap-1 rounded-md border-border/70 hover:border-primary/40 cursor-pointer"
            >
              <span>{PHOTO_PRESET_LABELS[slot.presetType || "custom"] || "تغيير المقاس"}</span>
              <ChevronDown20Filled className="w-3 h-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 font-cairo text-xs">
            {Object.entries(PHOTO_PRESET_DIMENSIONS_MM).map(([key, dims]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => handleSelectPreset(key as PhotoPresetType)}
                className="flex items-center justify-between cursor-pointer py-1.5"
              >
                <span>{PHOTO_PRESET_LABELS[key as PhotoPresetType]}</span>
                <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                  {dims.w}×{dims.h} mm
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* صف المقاسات: العرض والارتفاع بالمليمتر مع قفل النسبة */}
      <div className="grid grid-cols-2 gap-2 items-center">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground font-semibold">
            <span className="flex items-center gap-1">
              <SlideSize20Filled className="w-3 h-3 text-primary/80" />
              العرض (مم)
            </span>
          </div>
          <Input
            type="number"
            step="0.5"
            min="5"
            max={paperWidthMM}
            value={wMM}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="h-8 text-center font-mono text-xs rounded-md bg-input/50"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground font-semibold">
            <span className="flex items-center gap-1">
              <SlideSize20Filled className="w-3 h-3 text-primary/80 rotate-90" />
              الارتفاع (مم)
            </span>
            <button
              type="button"
              onClick={toggleAspectLock}
              className={cn(
                "cursor-pointer p-0.5 rounded transition-all",
                slot.lockAspect ? "text-primary font-bold" : "text-muted-foreground/60 hover:text-foreground"
              )}
              title={slot.lockAspect ? "فك قفل نسبة الأبعاد" : "قفل نسبة العرض إلى الارتفاع"}
            >
              {slot.lockAspect ? <LockClosed20Filled className="w-3 h-3 text-primary" /> : <LockOpen20Filled className="w-3 h-3" />}
            </button>
          </div>
          <Input
            type="number"
            step="0.5"
            min="5"
            max={paperHeightMM}
            value={hMM}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="h-8 text-center font-mono text-xs rounded-md bg-input/50"
            dir="ltr"
          />
        </div>
      </div>

      {/* صف الإحداثيات: X و Y بالمليمتر */}
      <div className="grid grid-cols-2 gap-2 items-center">
        <div className="space-y-1">
          <span className="text-[10.5px] text-muted-foreground font-semibold flex items-center gap-1">
            <ArrowMove20Filled className="w-3 h-3 text-muted-foreground/70" />
            الموقع X (مم)
          </span>
          <Input
            type="number"
            step="0.5"
            min="0"
            max={paperWidthMM - wMM}
            value={xMM}
            onChange={(e) => handleXChange(e.target.value)}
            className="h-8 text-center font-mono text-xs rounded-md bg-input/50"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[10.5px] text-muted-foreground font-semibold flex items-center gap-1">
            <ArrowMove20Filled className="w-3 h-3 text-muted-foreground/70 rotate-90" />
            الموقع Y (مم)
          </span>
          <Input
            type="number"
            step="0.5"
            min="0"
            max={paperHeightMM - hMM}
            value={yMM}
            onChange={(e) => handleYChange(e.target.value)}
            className="h-8 text-center font-mono text-xs rounded-md bg-input/50"
            dir="ltr"
          />
        </div>
      </div>

      {/* صف الإجراءات السريعة والمحاذاة للخلية */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={onRotateSlot}
              >
                <ArrowRotateClockwise20Filled className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">تدوير الخلية 90°</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={() => onAlignSlot("top-left")}
              >
                <span className="text-[10px] font-bold">TL</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">محاذاة أعلى اليسار (قص فوري)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={() => onAlignSlot("center-h")}
              >
                <AlignCenterHorizontal20Filled className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">توسيط أفقياً</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={() => onAlignSlot("center-v")}
              >
                <AlignCenterVertical20Filled className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">توسيط عمودياً</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={onDuplicateSlot}
              >
                <Copy20Filled className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">مضاعفة الخلية (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                onClick={onRemoveSlot}
              >
                <Delete20Regular className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">حذف الخلية (Del)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
