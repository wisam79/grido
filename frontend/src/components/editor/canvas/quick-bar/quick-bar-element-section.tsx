import React from "react";
import { ArrowUp, ArrowDown, Copy, ArrowClockwise, FlipHorizontal, ArrowCounterClockwise, Eye, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/lib/editor-store";
import type { CanvasElement } from "@/lib/store/types";
import { rotateElementAroundCenter } from "@/lib/canvas/element-geometry";
import { QuickBarAiActions } from "./quick-bar-ai-actions";

/**
 * QuickBarElementSection — قسم العنصر الفردي في وضع التعديل الحر
 * (ترتيب/تدوير/أدوات AI للصور/حذف) — 🧭 كان مضمّناً بالكامل في canvas-quick-bar.
 */
interface QuickBarElementSectionProps {
  element: CanvasElement;
  licenseActive: boolean;
  isRemovingBg: boolean;
  bgProgress: number;
  isFraming: boolean;
  isEnhancing: boolean;
  remainingQuota: number;
  dailyLimit: number;
  onRemoveBg: () => void;
  onFrameFace: () => void;
  onCancelFrame: () => void;
  onEnhance: () => void;
}

export const QuickBarElementSection = React.memo(function QuickBarElementSection({
  element,
  licenseActive,
  isRemovingBg,
  bgProgress,
  isFraming,
  isEnhancing,
  remainingQuota,
  dailyLimit,
  onRemoveBg,
  onFrameFace,
  onCancelFrame,
  onEnhance,
}: QuickBarElementSectionProps) {
  const { updateElement, removeElement, duplicateElement, bringToFront, sendToBack } = useEditorStore(
    useShallow((s) => ({
      updateElement: s.updateElement,
      removeElement: s.removeElement,
      duplicateElement: s.duplicateElement,
      bringToFront: s.bringToFront,
      sendToBack: s.sendToBack,
    }))
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => bringToFront(element.id)}
            className="h-7 w-7 p-0 rounded-md hover:bg-accent"
          >
            <ArrowUp className="w-4.5 h-4.5" weight="bold" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">إحضار للأمام</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => sendToBack(element.id)}
            className="h-7 w-7 p-0 rounded-md hover:bg-accent"
          >
            <ArrowDown className="w-4.5 h-4.5" weight="bold" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">إرسال للخلف</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => duplicateElement(element.id)}
            className="h-7 w-7 p-0 rounded-md hover:bg-accent"
          >
            <Copy className="w-4.5 h-4.5" weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">تكرار العنصر</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const currentRot = element.rotation || 0;
              const nextRot = (currentRot + 90) % 360;
              const { canvasWidth, canvasHeight } = useEditorStore.getState();
              const newPos = rotateElementAroundCenter(element, nextRot, canvasWidth, canvasHeight);
              updateElement(element.id, {
                rotation: nextRot,
                x: newPos.x,
                y: newPos.y,
              });
              useEditorStore.getState().pushHistory();
            }}
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
            onClick={() => {
              updateElement(element.id, { flipX: !element.flipX });
              useEditorStore.getState().pushHistory();
            }}
            className={cn("h-7 w-7 p-0 rounded-md hover:bg-accent", element.flipX && "bg-primary/10 text-primary")}
          >
            <FlipHorizontal className="w-4.5 h-4.5" weight={element.flipX ? "fill" : "bold"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">قلب أفقي</TooltipContent>
      </Tooltip>

      {element.type === "image" && element.imageSrc && (
        <>
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
            removeBgTooltip="عزل وتفريغ خلفية الصورة"
          />

          {element.originalImageSrc && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      updateElement(element.id, {
                        imageSrc: element.originalImageSrc,
                        originalImageSrc: undefined,
                        bgColor: "transparent"
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
                      const curr = element.imageSrc;
                      updateElement(element.id, { imageSrc: element.originalImageSrc });
                      const restore = () => {
                        updateElement(element.id, { imageSrc: curr });
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
        </>
      )}

      <Separator orientation="vertical" className="h-4 bg-border/40" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeElement(element.id)}
            className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash className="w-4.5 h-4.5" weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">حذف العنصر</TooltipContent>
      </Tooltip>
    </>
  );
});
