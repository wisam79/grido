import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Pin16Regular,
  ArrowUndo16Regular,
  ArrowRedo16Regular,
  Add16Regular,
  DocumentAdd16Regular,
  Flash16Regular,
  AlignCenterHorizontal16Regular,
  AlignCenterVertical16Regular,
  AlignDistributeLeft16Regular,
  AlignDistributeTop16Regular,
  LayoutColumnTwo16Regular,
  LayoutRowTwo16Regular,
  Cut16Regular,
  ArrowClockwise16Regular,
  Copy16Regular,
  Delete16Regular,
  ChevronDown12Regular,
} from "@fluentui/react-icons";
import type { PhotoPresetType, SlotAlignment, DistributionAxis, AutoPackStrategy } from "../types";
import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from "../lib/freeform-math";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface FreeformToolbarProps {
  selectedSlotId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  showCutLines: boolean;
  enableSnapping: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  onAddSlot: () => void;
  onAddPresetSlot: (presetType: PhotoPresetType) => void;
  onAutoPack: (strategy: AutoPackStrategy) => void;
  onRemoveSlot: () => void;
  onRotateSlot: () => void;
  onDuplicateSlot: () => void;
  onAlignSlot: (alignment: SlotAlignment) => void;
  onDistributeSlots: (axis: DistributionAxis) => void;
  onToggleCutLines: () => void;
  onToggleSnapping: () => void;
}

export const FreeformToolbar: React.FC<FreeformToolbarProps> = React.memo(function FreeformToolbar({
  selectedSlotId,
  canUndo,
  canRedo,
  showCutLines,
  enableSnapping,
  onUndo,
  onRedo,
  onSplitHorizontal,
  onSplitVertical,
  onAddSlot,
  onAddPresetSlot,
  onAutoPack,
  onRemoveSlot,
  onRotateSlot,
  onDuplicateSlot,
  onAlignSlot,
  onDistributeSlots,
  onToggleCutLines,
  onToggleSnapping,
}) {
  return (
    <div className="flex items-center justify-between gap-1 p-1 bg-card border border-border/80 dark:border-white/10 rounded-xl shadow-2xs fluent-specular flex-wrap font-cairo" dir="rtl">
      {/* قسم 1: التراجع والتكرار والإضافة والتعبئة الذكية */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <ArrowUndo16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تراجع (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <ArrowRedo16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">إعادة (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />

        {/* زر إضافة خلية عادية */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onAddSlot}
            >
              <Add16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">إضافة خلية جديدة</TooltipContent>
        </Tooltip>

        {/* قائمة منسدلة لإضافة قياس وثيقة مباشر */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] gap-1 rounded-md border-border/70 hover:border-primary/40 bg-input/40 cursor-pointer font-bold"
            >
              <DocumentAdd16Regular className="w-3.5 h-3.5 text-primary" />
              <span>إدراج قياس</span>
              <ChevronDown12Regular className="w-3 h-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 font-cairo text-xs">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold">
              إدراج خلية بقياس استوديو معتمد:
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(PHOTO_PRESET_DIMENSIONS_MM).map(([key, dims]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onAddPresetSlot(key as PhotoPresetType)}
                className="flex items-center justify-between cursor-pointer py-1.5"
              >
                <span className="font-semibold">{PHOTO_PRESET_LABELS[key as PhotoPresetType]}</span>
                <span className="font-mono text-[10px] text-muted-foreground" dir="ltr">
                  {dims.w}×{dims.h} مم
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* قائمة التعبئة الذكية للورقة بأكملها */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2.5 text-[11px] gap-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer font-bold shadow-xs"
            >
              <Flash16Regular className="w-3.5 h-3.5" />
              <span>تعبئة الورقة</span>
              <ChevronDown12Regular className="w-3 h-3 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 font-cairo text-xs">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold">
              تعبئة تلقائية ذكية بأقصى استغلال:
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAutoPack("id-max")}
              className="cursor-pointer py-1.5 font-semibold"
            >
              🔹 أقصى عدد لصور البطاقة (35×45 مم)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAutoPack("passport-max")}
              className="cursor-pointer py-1.5 font-semibold"
            >
              🛡️ أقصى عدد لصور الجواز (50×50 مم)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAutoPack("transactions-max")}
              className="cursor-pointer py-1.5 font-semibold"
            >
              📄 أقصى عدد للمعاملات (30×40 مم)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAutoPack("combo-standard")}
              className="cursor-pointer py-1.5 font-semibold"
            >
              ✨ طبعة مشتركة (جوازات + بطاقات)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAutoPack("combo-family")}
              className="cursor-pointer py-1.5 font-semibold"
            >
              🖼️ طبعة عائلية (بورتريه رئيسي + بطاقات)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* قسم 2: المحاذاة والتوزيع والتقسيم */}
      <div className="flex items-center gap-0.5">
        <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onAlignSlot("top-left")}
              disabled={!selectedSlotId}
            >
              <span className="text-[10px] font-black text-primary">TL</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">محاذاة لأعلى اليسار (للقص السريع)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onAlignSlot("center-h")}
              disabled={!selectedSlotId}
            >
              <AlignCenterHorizontal16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">توسيط أفقياً في منتصف الورقة</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onAlignSlot("center-v")}
              disabled={!selectedSlotId}
            >
              <AlignCenterVertical16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">توسيط عمودياً في منتصف الورقة</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onDistributeSlots("horizontal")}
            >
              <AlignDistributeLeft16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">توزيع المسافات بالتساوي أفقياً</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => onDistributeSlots("vertical")}
            >
              <AlignDistributeTop16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">توزيع المسافات بالتساوي عمودياً</TooltipContent>
        </Tooltip>

        <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />

        {/* تقسيم إلى صفين (أعلى وأسفل) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onSplitVertical}
              disabled={!selectedSlotId}
            >
              <LayoutRowTwo16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تقسيم إلى صفين (أعلى وأسفل)</TooltipContent>
        </Tooltip>

        {/* تقسيم إلى عمودين (يمين ويسار) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onSplitHorizontal}
              disabled={!selectedSlotId}
            >
              <LayoutColumnTwo16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تقسيم إلى عمودين (يمين ويسار)</TooltipContent>
        </Tooltip>
      </div>

      {/* قسم 3: أدوات المعاينة والمغناطيس والتدوير والحذف */}
      <div className="flex items-center gap-0.5">
        <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showCutLines ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                showCutLines ? "text-primary bg-primary/15 border border-primary/40 font-bold" : ""
              )}
              onClick={onToggleCutLines}
            >
              <Cut16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {showCutLines ? "إخفاء خطوط القص الإرشادية" : "معاينة خطوط القص الإرشادية"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={enableSnapping ? "secondary" : "ghost"}
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                enableSnapping ? "text-primary bg-primary/15 border border-primary/40 font-bold" : ""
              )}
              onClick={onToggleSnapping}
            >
              <Pin16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {enableSnapping ? "تعطيل المغناطيس الذكي" : "تفعيل المغناطيس الذكي"}
          </TooltipContent>
        </Tooltip>

        <div className="w-[1px] h-4 bg-border/60 mx-1 shrink-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onRotateSlot}
              disabled={!selectedSlotId}
            >
              <ArrowClockwise16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تدوير الخلية 90°</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={onDuplicateSlot}
              disabled={!selectedSlotId}
            >
              <Copy16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">مضاعفة الخلية (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20 cursor-pointer transition-all duration-150 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
              onClick={onRemoveSlot}
              disabled={!selectedSlotId}
            >
              <Delete16Regular className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">حذف الخلية (Del)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});
