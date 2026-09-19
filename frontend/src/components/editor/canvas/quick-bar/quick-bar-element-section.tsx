import React from "react";
import { ArrowUp, ArrowDown, ArrowClockwise, FlipHorizontal, ArrowCounterClockwise, Eye } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@/lib/editor-store";
import type { CanvasElement } from "@/lib/store/types";
import { rotateElementAroundCenter } from "@/lib/canvas/element-geometry";

/**
 * QuickBarElementSection — قسم العنصر الفردي في وضع التعديل الحر.
 *
 * 🧭 نطاق هذا الشريط هو **موضع العنصر على الورقة** فقط: ترتيب الطبقة،
 * التدوير، القلب، ومقارنة الصورة بالأصل. أما ما يخص خصائص العنصر
 * (التكرار، الحذف، المحاذاة، التجميع، المرشحات، أدوات AI) فموطنه
 * الشريط العلوي — وكان مكرراً هنا في مكانين فاختار المستخدم تفريقه.
 */
interface QuickBarElementSectionProps {
  element: CanvasElement;
}

export const QuickBarElementSection = React.memo(function QuickBarElementSection({
  element,
}: QuickBarElementSectionProps) {
  const { updateElement, bringToFront, sendToBack } = useEditorStore(
    useShallow((s) => ({
      updateElement: s.updateElement,
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
            <ArrowUp className="w-4 h-4" weight="bold" />
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
            <ArrowDown className="w-4 h-4" weight="bold" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">إرسال للخلف</TooltipContent>
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
            <ArrowClockwise className="w-4 h-4" weight="bold" />
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
            <FlipHorizontal className="w-4 h-4" weight={element.flipX ? "fill" : "bold"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">قلب أفقي</TooltipContent>
      </Tooltip>

      {element.type === "image" && element.imageSrc && (
        <>
          {element.originalImageSrc && (
            <Separator orientation="vertical" className="h-4 bg-border/40" />
          )}

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
                      toast.success("تمت الاستعادة");
                    }}
                    className="h-7 w-7 p-0 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    <ArrowCounterClockwise className="w-4 h-4" weight="regular" />
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
                    <Eye className="w-4 h-4" weight="regular" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">اضغط مطولاً للمعاينة</TooltipContent>
              </Tooltip>
            </>
          )}
        </>
      )}
    </>
  );
});
