import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PushPin,
  ArrowUUpLeft,
  ArrowUUpRight,
  Plus,
  FilePlus,
  Lightning,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignTop,
  Columns,
  Rows,
  Scissors,
  ArrowClockwise,
  Copy,
  Trash,
  CaretDown,
  ArrowsIn,
  ArrowsOut,
  Broom,
  SquaresFour,
  Ruler,
  ArrowsOutCardinal,
} from "@phosphor-icons/react";
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

export type MultiAlignMode = "left" | "right" | "top" | "bottom" | "center-h" | "center-v" | "same-size";

interface FreeformToolbarProps {
  selectedSlotId: string | null;
  multiSelectedCount: number;
  canUndo: boolean;
  canRedo: boolean;
  showCutLines: boolean;
  enableSnapping: boolean;
  packGapMM: number;
  packMarginMM: number;
  onPackGapChange: (mm: number) => void;
  onPackMarginChange: (mm: number) => void;
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
  onAlignSelectionToEachOther: (alignment: MultiAlignMode) => void;
  onScaleSelection: (factor: number) => void;
  onResolveOverlaps: () => void;
  onDistributeSlots: (axis: DistributionAxis) => void;
  onToggleCutLines: () => void;
  onToggleSnapping: () => void;
}

/** زر أيقونة موحد Fluent 2 compact (28px) مع Tooltip */
const ToolBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  destructive?: boolean;
}> = ({ onClick, disabled, active, title, children, destructive }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant={active ? "secondary" : "ghost"}
        size="icon"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "h-7 w-7 rounded-md cursor-pointer shrink-0 transition-all duration-150",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
          active && "text-primary bg-primary/15 border border-primary/40 font-bold",
          destructive &&
            "text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
        )}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="font-cairo text-[11px]">{title}</TooltipContent>
  </Tooltip>
);

const Divider = () => <div className="w-[1px] h-4 bg-border/60 mx-0.5 shrink-0" />;

export const FreeformToolbar: React.FC<FreeformToolbarProps> = React.memo(function FreeformToolbar({
  selectedSlotId,
  multiSelectedCount,
  canUndo,
  canRedo,
  showCutLines,
  enableSnapping,
  packGapMM,
  packMarginMM,
  onPackGapChange,
  onPackMarginChange,
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
  onAlignSelectionToEachOther,
  onScaleSelection,
  onResolveOverlaps,
  onDistributeSlots,
  onToggleCutLines,
  onToggleSnapping,
}) {
  const isMulti = multiSelectedCount > 1;

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl bg-card/95 backdrop-blur-sm border border-border/80 dark:border-white/10 shadow-2xs fluent-specular font-cairo select-none"
      dir="rtl"
    >
      {/* ── مجموعة 1: المحفوظات والإضافة ── */}
      <ToolBtn onClick={onUndo} disabled={!canUndo} title="تراجع (Ctrl+Z)">
        <ArrowUUpLeft className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={onRedo} disabled={!canRedo} title="إعادة (Ctrl+Y)">
        <ArrowUUpRight className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>

      <Divider />

      {/* إضافة خلية مخصصة */}
      <ToolBtn onClick={onAddSlot} title="إضافة خلية">
        <Plus className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>

      {/* إدراج مقاس جاهز */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <FilePlus className="w-3.5 h-3.5 text-primary" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-cairo text-[11px]">إدراج مقاس معتمد</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-52 font-cairo text-xs z-(--z-print-toolbar)">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold text-center">
            مقاسات الاستوديو (مم)
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
                {dims.w}×{dims.h}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* التعبئة الذكية */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="h-7 px-2.5 gap-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer font-bold shadow-xs shrink-0"
          >
            <Lightning className="w-3.5 h-3.5" weight="fill" />
            <span className="text-[11px]">تعبئة</span>
            <CaretDown className="w-2.5 h-2.5 opacity-80" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 font-cairo text-xs z-(--z-print-toolbar)">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold text-center">
            أقصى استغلال للورقة
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAutoPack("id-max")} className="cursor-pointer py-1.5 font-semibold">
            <span className="flex-1">بطاقات 35×45</span>
            <span className="text-[10px] text-muted-foreground font-mono">ID</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoPack("passport-max")} className="cursor-pointer py-1.5 font-semibold">
            <span className="flex-1">جوازات 50×50</span>
            <span className="text-[10px] text-muted-foreground font-mono">PP</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoPack("transactions-max")} className="cursor-pointer py-1.5 font-semibold">
            <span className="flex-1">معاملات 30×40</span>
            <span className="text-[10px] text-muted-foreground font-mono">TR</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoPack("wallet-max")} className="cursor-pointer py-1.5 font-semibold">
            <span className="flex-1">محفظة 54×86</span>
            <span className="text-[10px] text-muted-foreground font-mono">WL</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAutoPack("combo-standard")} className="cursor-pointer py-1.5 font-semibold">
            <span className="flex-1">مزيج جوازات + بطاقات</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAutoPack("combo-family")} className="cursor-pointer py-1.5 font-semibold">
            <span className="flex-1">عائلية (بورتريه + بطاقات)</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* الفجوة والهامش */}
          <div className="px-2 py-1.5 flex flex-col gap-1.5 bg-muted/30 rounded-b-md">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <Ruler className="w-3 h-3 text-primary/70" weight="bold" />
                الفجوة
              </span>
              <div className="flex items-center gap-0.5" dir="ltr">
                <button
                  type="button"
                  onClick={() => onPackGapChange(Math.max(0, packGapMM - 1))}
                  className="w-5 h-5 rounded text-[11px] font-black bg-background border border-border/60 hover:bg-muted cursor-pointer"
                >
                  −
                </button>
                <span className="w-8 text-center font-mono text-[10px] font-bold" dir="ltr">{packGapMM} مم</span>
                <button
                  type="button"
                  onClick={() => onPackGapChange(Math.min(10, packGapMM + 1))}
                  className="w-5 h-5 rounded text-[11px] font-black bg-background border border-border/60 hover:bg-muted cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                <ArrowsOutCardinal className="w-3 h-3 text-primary/70" weight="bold" />
                الهامش
              </span>
              <div className="flex items-center gap-0.5" dir="ltr">
                <button
                  type="button"
                  onClick={() => onPackMarginChange(Math.max(0, packMarginMM - 1))}
                  className="w-5 h-5 rounded text-[11px] font-black bg-background border border-border/60 hover:bg-muted cursor-pointer"
                >
                  −
                </button>
                <span className="w-8 text-center font-mono text-[10px] font-bold" dir="ltr">{packMarginMM} مم</span>
                <button
                  type="button"
                  onClick={() => onPackMarginChange(Math.min(15, packMarginMM + 1))}
                  className="w-5 h-5 rounded text-[11px] font-black bg-background border border-border/60 hover:bg-muted cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      {/* ── مجموعة 2: المحاذاة والتقسيم ── */}
      <ToolBtn onClick={() => onAlignSlot("top-left")} disabled={!selectedSlotId} title="زاوية القص (أعلى اليسار)">
        <span className="text-[10px] font-black text-primary leading-none">TL</span>
      </ToolBtn>
      <ToolBtn onClick={() => onAlignSlot("center-h")} disabled={!selectedSlotId} title="توسيط أفقي على الورقة">
        <AlignCenterHorizontal className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={() => onAlignSlot("center-v")} disabled={!selectedSlotId} title="توسيط عمودي على الورقة">
        <AlignCenterVertical className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={() => onDistributeSlots("horizontal")} title="توزيع أفقي متساوٍ">
        <AlignLeft className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={() => onDistributeSlots("vertical")} title="توزيع عمودي متساوٍ">
        <AlignTop className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={onSplitVertical} disabled={!selectedSlotId} title="تقسيم لصفين">
        <Rows className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={onSplitHorizontal} disabled={!selectedSlotId} title="تقسيم لعمودين">
        <Columns className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>

      {/* المحاذاة الجماعية بين الخلايا */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isMulti ? "secondary" : "ghost"}
                size="icon"
                disabled={!selectedSlotId}
                className={cn(
                  "h-7 w-7 rounded-md cursor-pointer shrink-0 relative",
                  isMulti && "text-primary bg-primary/15 border border-primary/40"
                )}
              >
                <SquaresFour className="w-3.5 h-3.5" weight="bold" />
                {isMulti && (
                  <span
                    className="absolute -top-1 -left-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-black flex items-center justify-center"
                    dir="ltr"
                  >
                    {multiSelectedCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-cairo text-[11px]">
            محاذاة جماعية {isMulti ? `(${multiSelectedCount} خلايا)` : "(حدد بـ Shift+نقرة)"}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-48 font-cairo text-xs z-(--z-print-toolbar)">
          <DropdownMenuLabel className="text-[10px] text-muted-foreground font-bold text-center">
            {isMulti ? `محاذاة ${multiSelectedCount} خلايا فيما بينها` : "حدد خليتين أو أكثر"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("left")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            الحواف اليسرى
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("right")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            الحواف اليمنى
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("top")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            الحواف العلوية
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("bottom")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            الحواف السفلية
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("center-h")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            توسيط أفقي مشترك
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("center-v")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            توسيط عمودي مشترك
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onAlignSelectionToEachOther("same-size")} disabled={!isMulti} className="cursor-pointer py-1.5 font-semibold">
            توحيد المقاس
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      {/* ── مجموعة 3: التحرير والعرض ── */}
      <ToolBtn onClick={() => onScaleSelection(1.1)} disabled={!selectedSlotId} title="تكبير التحديد 10%">
        <ArrowsOut className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={() => onScaleSelection(1 / 1.1)} disabled={!selectedSlotId} title="تصغير التحديد 10%">
        <ArrowsIn className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={onResolveOverlaps} title="إزالة كل التداخلات">
        <Broom className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={onRotateSlot} disabled={!selectedSlotId} title="تدوير 90°">
        <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={onDuplicateSlot} disabled={!selectedSlotId} title="تكرار (Ctrl+D)">
        <Copy className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={onRemoveSlot} disabled={!selectedSlotId} title="حذف (Del)" destructive>
        <Trash className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={onToggleCutLines} active={showCutLines} title={showCutLines ? "إخفاء خطوط القص" : "خطوط القص"}>
        <Scissors className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
      <ToolBtn onClick={onToggleSnapping} active={enableSnapping} title={enableSnapping ? "تعطيل المغناطيس" : "المغناطيس الذكي"}>
        <PushPin className="w-3.5 h-3.5" weight="bold" />
      </ToolBtn>
    </div>
  );
});
