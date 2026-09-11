import React from "react";
import type { FreeformSlot, PhotoPresetType, SlotAlignment } from "../types";
import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from "../lib/freeform-math";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowClockwise,
  LockSimple,
  LockSimpleOpen,
  Copy,
  Trash,
  AlignCenterHorizontal,
  AlignCenterVertical,
  Cursor,
  Ruler,
  SlidersHorizontal,
  CaretDown,
  ArrowsOut,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FreeformSlotInspectorProps {
  slot: FreeformSlot | undefined;
  multiSelectedCount?: number;
  paperWidthMM: number;
  paperHeightMM: number;
  onUpdateSlot: (updated: Partial<FreeformSlot>) => void;
  onRotateSlot: () => void;
  onDuplicateSlot: () => void;
  onRemoveSlot: () => void;
  onAlignSlot: (alignment: SlotAlignment) => void;
}

/** حقل رقم ملمي مصمم — ملصق أيقوني مدمج + وحدة مم */
function MmField({
  icon,
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" title={label}>
        {icon}
      </span>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pr-7 pl-7 text-center font-mono text-[11px] font-bold rounded-md bg-input/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
        dir="ltr"
        aria-label={label}
      />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/70 pointer-events-none font-mono">
        مم
      </span>
    </div>
  );
}

export const FreeformSlotInspector: React.FC<FreeformSlotInspectorProps> = React.memo(function FreeformSlotInspector({
  slot,
  multiSelectedCount = 1,
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
      <div className="flex flex-col items-center justify-center p-4 text-center rounded-xl bg-card/60 border border-dashed border-border/70 fluent-specular shadow-2xs h-full min-h-[160px] text-muted-foreground select-none gap-1.5">
        <SlidersHorizontal className="w-6 h-6 opacity-30 text-primary" weight="duotone" />
        <span className="text-xs font-bold text-foreground/75">لا توجد خلية محددة</span>
        <span className="text-[10px] leading-relaxed text-muted-foreground">
          انقر خلية لضبط مقاسها وموقعها بالمليمتر
        </span>
      </div>
    );
  }

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
    const clampedMM = Math.min(paperWidthMM - wMM, Math.max(0, num));
    onUpdateSlot({ x: clampedMM / paperWidthMM });
  };

  const handleYChange = (valStr: string) => {
    const num = parseFloat(valStr);
    if (isNaN(num)) return;
    const clampedMM = Math.min(paperHeightMM - hMM, Math.max(0, num));
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
      {/* شريط التحديد الجماعي */}
      {multiSelectedCount > 1 && (
        <div className="flex items-center justify-between gap-1.5 rounded-lg bg-primary/10 border border-primary/25 px-2 py-1.5">
          <span className="flex items-center gap-1.5 font-bold text-primary text-[10.5px]">
            <Copy className="w-3 h-3" weight="bold" />
            أدوات جماعية
          </span>
          <span className="font-mono text-[10px] font-black text-primary bg-background/70 border border-primary/20 rounded px-1.5 py-0.5" dir="ltr">
            ×{multiSelectedCount}
          </span>
        </div>
      )}

      {/* الرأس: التسمية + قائمة المقاسات */}
      <div className="flex items-center justify-between gap-1.5 border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <span className="font-bold text-foreground truncate text-[11.5px]">
            {slot.label || "خلية مخصصة"}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6.5 px-2 text-[10.5px] gap-1 rounded-md border-border/70 hover:border-primary/40 cursor-pointer shrink-0 font-bold"
            >
              <ArrowsOut className="w-3 h-3 text-primary/70" weight="bold" />
              {PHOTO_PRESET_LABELS[slot.presetType || "custom"]?.split(" ")[0] || "مقاس"}
              <CaretDown className="w-2.5 h-2.5 opacity-60" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 font-cairo text-xs z-(--z-print-toolbar)">
            {Object.entries(PHOTO_PRESET_DIMENSIONS_MM).map(([key, dims]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => handleSelectPreset(key as PhotoPresetType)}
                className="flex items-center justify-between cursor-pointer py-1.5"
              >
                <span>{PHOTO_PRESET_LABELS[key as PhotoPresetType]}</span>
                <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                  {dims.w}×{dims.h}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* الأبعاد: العرض × الارتفاع مع قفل النسبة */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
          <span className="flex items-center gap-1">
            <Ruler className="w-3 h-3 text-primary/70" weight="bold" />
            الأبعاد
          </span>
          <button
            type="button"
            onClick={toggleAspectLock}
            className={cn(
              "cursor-pointer p-0.5 rounded transition-all",
              slot.lockAspect ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
            )}
            title={slot.lockAspect ? "فك قفل النسبة" : "قفل نسبة الأبعاد"}
          >
            {slot.lockAspect ? (
              <LockSimple className="w-3 h-3 text-primary" weight="fill" />
            ) : (
              <LockSimpleOpen className="w-3 h-3" weight="bold" />
            )}
          </button>
        </div>
        <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-1.5" dir="ltr">
          <MmField
            icon={<Ruler className="w-3 h-3" weight="bold" />}
            label="العرض بالمليمتر"
            value={wMM}
            min={5}
            max={paperWidthMM}
            step={0.5}
            onChange={handleWidthChange}
          />
          <span className="text-[10px] font-bold text-muted-foreground/60 text-center">×</span>
          <MmField
            icon={<Ruler className="w-3 h-3 rotate-90" weight="bold" />}
            label="الارتفاع بالمليمتر"
            value={hMM}
            min={5}
            max={paperHeightMM}
            step={0.5}
            onChange={handleHeightChange}
          />
        </div>
      </div>

      {/* الموقع: X , Y */}
      <div className="space-y-1.5">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
          <Cursor className="w-3 h-3 text-primary/70" weight="bold" />
          الموقع من الزاوية (0,0)
        </span>
        <div className="grid grid-cols-[1fr_20px_1fr] items-center gap-1.5" dir="ltr">
          <MmField
            icon={<Cursor className="w-3 h-3" weight="bold" />}
            label="الموقع X بالمليمتر"
            value={xMM}
            min={0}
            max={paperWidthMM - wMM}
            step={0.5}
            onChange={handleXChange}
          />
          <span className="text-[10px] font-bold text-muted-foreground/60 text-center">,</span>
          <MmField
            icon={<Cursor className="w-3 h-3 rotate-90" weight="bold" />}
            label="الموقع Y بالمليمتر"
            value={yMM}
            min={0}
            max={paperHeightMM - hMM}
            step={0.5}
            onChange={handleYChange}
          />
        </div>
      </div>

      {/* الإجراءات السريعة */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={onRotateSlot}
              >
                <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">تدوير 90°</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={() => onAlignSlot("top-left")}
              >
                <span className="text-[10px] font-black text-primary leading-none">TL</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">زاوية القص</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={() => onAlignSlot("center-h")}
              >
                <AlignCenterHorizontal className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">توسيط أفقي</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={() => onAlignSlot("center-v")}
              >
                <AlignCenterVertical className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">توسيط عمودي</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer hover:bg-accent/60"
                onClick={onDuplicateSlot}
              >
                <Copy className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">تكرار (Ctrl+D)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                onClick={onRemoveSlot}
              >
                <Trash className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">حذف (Del)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
