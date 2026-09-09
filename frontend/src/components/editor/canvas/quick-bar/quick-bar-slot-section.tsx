import React from "react";
import { ImageSquare, GridFour, Rows, Columns, ArrowClockwise, FlipHorizontal, ArrowCounterClockwise, Eye, Broom } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/lib/editor-store";
import type { CanvasSlot } from "@/lib/store/types";
import { QuickBarAiActions } from "./quick-bar-ai-actions";

/**
 * QuickBarSlotSection — قسم الخلية المحددة في وضع الكولاج (تعبئة/تدوير/أدوات AI)
 * 🧭 كان مضمّناً بالكامل في canvas-quick-bar (كان الشريط 798 سطراً).
 */
interface QuickBarSlotSectionProps {
  slot: CanvasSlot;
  licenseActive: boolean;
  isRemovingBg: boolean;
  bgProgress: number;
  isFraming: boolean;
  isEnhancing: boolean;
  remainingQuota: number;
  dailyLimit: number;
  onOpenFileForSlot: () => void;
  onRemoveBg: () => void;
  onFrameFace: () => void;
  onCancelFrame: () => void;
  onEnhance: () => void;
}

export const QuickBarSlotSection = React.memo(function QuickBarSlotSection({
  slot,
  licenseActive,
  isRemovingBg,
  bgProgress,
  isFraming,
  isEnhancing,
  remainingQuota,
  dailyLimit,
  onOpenFileForSlot,
  onRemoveBg,
  onFrameFace,
  onCancelFrame,
  onEnhance,
}: QuickBarSlotSectionProps) {
  const { fillAllSlots, fillRowSlots, fillColumnSlots, updateSlot, rotateSlot, flipSlotX } = useEditorStore(
    useShallow((s) => ({
      fillAllSlots: s.fillAllSlots,
      fillRowSlots: s.fillRowSlots,
      fillColumnSlots: s.fillColumnSlots,
      updateSlot: s.updateSlot,
      rotateSlot: s.rotateSlot,
      flipSlotX: s.flipSlotX,
    }))
  );

  return (
    <>
      <div className="flex items-center gap-1 text-xs font-bold px-1.5 text-primary">
        <span>خلية كولاج</span>
      </div>

      <Separator orientation="vertical" className="h-4 bg-border/40" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenFileForSlot}
            className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
          >
            <ImageSquare className="w-4.5 h-4.5" weight="regular" />
            <span>تغيير</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">رفع صورة جديدة للخلية</TooltipContent>
      </Tooltip>

      {slot.imageSrc && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fillAllSlots(slot.imageSrc!, slot.id)}
                className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
              >
                <GridFour className="w-4.5 h-4.5" weight="regular" />
                <span>كل الورقة</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">تكرار الصورة بجميع خلايا الورقة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fillRowSlots(slot.id, slot.imageSrc!)}
                className="h-7 px-2 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
              >
                <Rows className="w-4.5 h-4.5" weight="regular" />
                <span>الصف</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">تعبئة الصف الحالي بهذه الصورة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fillColumnSlots(slot.id, slot.imageSrc!)}
                className="h-7 px-2 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
              >
                <Columns className="w-4.5 h-4.5" weight="regular" />
                <span>العمود</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">تعبئة العمود الحالي بهذه الصورة</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 bg-border/40" />

          <QuickBarAiActions
            isRemovingBg={isRemovingBg}
            bgProgress={bgProgress}
            isFraming={isFraming}
            isEnhancing={isEnhancing}
            remainingQuota={remainingQuota}
            dailyLimit={dailyLimit}
            licenseActive={licenseActive}
            onRemoveBg={onRemoveBg}
            onFrameFace={onFrameFace}
            onCancelFrame={onCancelFrame}
            onEnhance={onEnhance}
            removeBgTooltip="عزل التحديد وتفريغ خلفية الصورة"
          />

          <Separator orientation="vertical" className="h-4 bg-border/40" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => rotateSlot(slot.id, 90)}
                className="h-7 w-7 p-0 rounded-md hover:bg-accent"
              >
                <ArrowClockwise className="w-4.5 h-4.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">تدوير 90 درجة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => flipSlotX(slot.id)}
                className="h-7 w-7 p-0 rounded-md hover:bg-accent"
              >
                <FlipHorizontal className="w-4.5 h-4.5" weight="bold" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">قلب أفقي</TooltipContent>
          </Tooltip>

          {slot.originalImageSrc && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateSlot(slot.id, {
                        imageSrc: slot.originalImageSrc,
                        originalImageSrc: undefined,
                        bgColor: undefined
                      });
                      useEditorStore.getState().pushHistory();
                      toast.success("تمت استعادة الصورة الأصلية");
                    }}
                    className="h-7 w-7 p-0 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    <ArrowCounterClockwise className="w-4.5 h-4.5" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">استعادة الصورة الأصلية</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseDown={() => {
                      const curr = slot.imageSrc;
                      updateSlot(slot.id, { imageSrc: slot.originalImageSrc });
                      const restore = () => {
                        updateSlot(slot.id, { imageSrc: curr });
                        window.removeEventListener("mouseup", restore);
                      };
                      window.addEventListener("mouseup", restore);
                    }}
                    className="h-7 w-7 p-0 rounded-md text-primary hover:bg-primary/10 select-none active:bg-primary active:text-primary-foreground"
                  >
                    <Eye className="w-4.5 h-4.5" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">اضغط مطولاً لمعاينة الأصل</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateSlot(slot.id, { imageSrc: undefined, originalImageSrc: undefined });
                  useEditorStore.getState().pushHistory();
                }}
                className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
              >
                <Broom className="w-4.5 h-4.5" weight="regular" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">تفريغ هذه الخلية</TooltipContent>
          </Tooltip>
        </>
      )}
    </>
  );
});
