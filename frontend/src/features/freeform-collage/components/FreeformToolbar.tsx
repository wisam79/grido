import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Columns,
  Rows,
  Plus,
  Trash2,
  ShieldCheck,
  CreditCard,
  FileText,
  RotateCw,
  Copy,
  Undo2,
  Redo2,
  AlignCenter,
  AlignVerticalJustifyCenter,
  Plane,
  IdCard,
  BadgeCheck,
} from "lucide-react";
import type { PhotoPresetType } from "../types";
import type { SlotAlignment } from "../lib/freeform-math";
import { cn } from "@/lib/utils";

interface FreeformToolbarProps {
  selectedSlotId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  onAddSlot: () => void;
  onRemoveSlot: () => void;
  onRotateSlot: () => void;
  onDuplicateSlot: () => void;
  onAlignSlot: (alignment: SlotAlignment) => void;
  onChangePresetType: (type: PhotoPresetType) => void;
  currentPresetType?: PhotoPresetType;
}

export const FreeformToolbar: React.FC<FreeformToolbarProps> = ({
  selectedSlotId,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSplitHorizontal,
  onSplitVertical,
  onAddSlot,
  onRemoveSlot,
  onRotateSlot,
  onDuplicateSlot,
  onAlignSlot,
  onChangePresetType,
  currentPresetType,
}) => {
  const presetButtons: { type: PhotoPresetType; icon: typeof ShieldCheck; tip: string }[] = [
    { type: "passport", icon: ShieldCheck, tip: "جواز سفر (50×50 مم)" },
    { type: "id", icon: BadgeCheck, tip: "هوية قياسية (35×45 مم)" },
    { type: "iq-national-id", icon: CreditCard, tip: "بطاقة / جنسية (35×45 مم)" },
    { type: "iq-civil-id", icon: IdCard, tip: "هوية أحوال (35×45 مم)" },
    { type: "iq-transactions", icon: FileText, tip: "معاملة سريعة (30×40 مم)" },
    { type: "visa", icon: Plane, tip: "فيزا (35×45 مم)" },
  ];

  return (
    <div className="flex items-center justify-between gap-1 p-1 bg-card border rounded-xl shadow-xs flex-wrap font-cairo">
      {/* التراجع والتكرار + الإضافة والحذف */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تراجع (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">إعادة (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onSplitHorizontal}
              disabled={!selectedSlotId}
            >
              <Columns className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تقسيم أفقي (يمين ويسار)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onSplitVertical}
              disabled={!selectedSlotId}
            >
              <Rows className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تقسيم رأسي (أعلى وأسفل)</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onAddSlot}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">إضافة خلية جديدة</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onDuplicateSlot}
              disabled={!selectedSlotId}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">مضاعفة الخلية المحددة (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={onRotateSlot}
              disabled={!selectedSlotId}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تدوير الخلية 90 درجة</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              onClick={onRemoveSlot}
              disabled={!selectedSlotId}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">حذف الخلية (Delete)</TooltipContent>
        </Tooltip>
      </div>

      {/* أدوات المحاذاة والموضع */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={() => onAlignSlot("center-h")}
              disabled={!selectedSlotId}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">توسيع أفقياً في الورقة</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg cursor-pointer"
              onClick={() => onAlignSlot("center-v")}
              disabled={!selectedSlotId}
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">توسيط رأسي في الورقة</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border/60 mx-0.5" />

        {/* قياس الخلية */}
        {presetButtons.map(({ type, icon: Icon, tip }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Button
                variant={currentPresetType === type ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-7 w-7 rounded-lg cursor-pointer transition-all",
                  currentPresetType === type && "shadow-xs font-bold"
                )}
                onClick={() => onChangePresetType(type)}
                disabled={!selectedSlotId}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{tip}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
