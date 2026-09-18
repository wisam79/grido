import { useCallback } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import {
  ArrowClockwise,
  FlipHorizontal,
  FlipVertical,
  ArrowsOutCardinal,
} from "@phosphor-icons/react";
import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVerticalIcon,
  AlignBottomIcon,
} from "@/components/ui/alignment-icons";
import { scaleElementDecorations } from "@/lib/canvas/scale-decorations";
import { rotateElementAroundCenter } from "@/lib/canvas/element-geometry";
import { cn } from "@/lib/utils";
import { FluentSection, FluentSliderField } from "@/components/ui/blocks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface ElementArrangeTabProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ElementArrangeTab({ element, onUpdate }: ElementArrangeTabProps) {
  const alignSelectedElements = useEditorStore((state) => state.alignSelectedElements);

  const handleRotate90 = useCallback(() => {
    const currentRot = element.rotation || 0;
    const nextRot = (currentRot + 90) % 360;
    const { canvasWidth, canvasHeight } = useEditorStore.getState();
    const newPos = rotateElementAroundCenter(element, nextRot, canvasWidth, canvasHeight);
    onUpdate(element.id, {
      rotation: nextRot,
      x: newPos.x,
      y: newPos.y,
    });
    useEditorStore.getState().pushHistory();
  }, [element, onUpdate]);

  const handleFlipX = useCallback(() => {
    onUpdate(element.id, { flipX: !element.flipX });
    useEditorStore.getState().pushHistory();
  }, [element.id, element.flipX, onUpdate]);

  const handleFlipY = useCallback(() => {
    onUpdate(element.id, { flipY: !element.flipY });
    useEditorStore.getState().pushHistory();
  }, [element.id, element.flipY, onUpdate]);

  return (
    <div className="space-y-3 font-cairo">
      {/* بطاقة 1: الموضع والمحاذاة السريعة */}
      <FluentSection
        icon={<ArrowsOutCardinal className="w-4 h-4 text-primary" weight="duotone" />}
        title="الموضع والمحاذاة"
        collapsible
        defaultOpen={true}
      >
        {/* أزرار المحاذاة السريعة للكانفاس */}
        <div className="flex items-center justify-between bg-muted/40 p-1 rounded-lg border border-border/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alignSelectedElements("left")}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignLeftIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة لليسار
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alignSelectedElements("center")}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignCenterHorizontalIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة للوسط أفقياً
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alignSelectedElements("right")}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignRightIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة لليمين
            </TooltipContent>
          </Tooltip>

          <div className="w-[1px] h-4 bg-border/50" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alignSelectedElements("top")}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignTopIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة للأعلى
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alignSelectedElements("middle")}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignCenterVerticalIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة للمنتصف عمودياً
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alignSelectedElements("bottom")}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignBottomIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة للأسفل
            </TooltipContent>
          </Tooltip>
        </div>

        {/* شبكة الإحداثيات والأبعاد */}
        <div className="grid grid-cols-2 gap-2 text-mini">
          <div
            className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all"
            title="الإحداثي الأفقي X"
          >
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              X:
            </span>
            <input
              type="number"
              value={Math.round(element.x * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(v)) {
                  onUpdate(element.id, { x: Math.max(-1, Math.min(2, v / 100)) });
                }
              }}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>

          <div
            className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all"
            title="الإحداثي العمودي Y"
          >
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              Y:
            </span>
            <input
              type="number"
              value={Math.round(element.y * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(v)) {
                  onUpdate(element.id, { y: Math.max(-1, Math.min(2, v / 100)) });
                }
              }}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>

          <div
            className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all"
            title="نسبة العرض W"
          >
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              W:
            </span>
            <input
              type="number"
              value={Math.round(element.width * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value === "" || !Number.isFinite(v)) return;
                const newWidth = Math.max(0.05, v / 100);
                const deco =
                  element.type === "text"
                    ? {}
                    : scaleElementDecorations(element, newWidth / Math.max(1e-6, element.width), 1);
                onUpdate(element.id, { width: newWidth, ...deco });
              }}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>

          <div
            className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all"
            title="نسبة الارتفاع H"
          >
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              H:
            </span>
            <input
              type="number"
              value={Math.round(element.height * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value === "" || !Number.isFinite(v)) return;
                const newHeight = Math.max(0.05, v / 100);
                const deco =
                  element.type === "text"
                    ? {}
                    : scaleElementDecorations(
                        element,
                        1,
                        newHeight / Math.max(1e-6, element.height)
                      );
                onUpdate(element.id, { height: newHeight, ...deco });
              }}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>
        </div>
      </FluentSection>

      {/* بطاقة 2: التدوير والقلب */}
      <FluentSection
        icon={<ArrowClockwise className="w-4 h-4 text-primary" weight="duotone" />}
        title="التدوير والقلب"
        collapsible
        defaultOpen={true}
      >
        <FluentSliderField
          label="التدوير"
          icon={<ArrowClockwise className="w-3.5 h-3.5" weight="regular" />}
          value={(((element.rotation % 360) + 540) % 360) - 180}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onChange={(v) => {
            const { canvasWidth, canvasHeight } = useEditorStore.getState();
            const newPos = rotateElementAroundCenter(element, v, canvasWidth, canvasHeight);
            onUpdate(element.id, {
              rotation: v,
              x: newPos.x,
              y: newPos.y,
            });
          }}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        <div className="flex items-center gap-2 pt-0.5">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRotate90}
            title="تدوير 90 درجة"
            className="h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <ArrowClockwise className="w-3.5 h-3.5 text-muted-foreground" weight="regular" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleFlipX}
            title="قلب أفقي"
            className={cn(
              "h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              element.flipX && "bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40"
            )}
          >
            <FlipHorizontal
              className={cn("w-3.5 h-3.5", element.flipX ? "text-primary" : "text-muted-foreground")}
              weight={element.flipX ? "fill" : "regular"}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleFlipY}
            title="قلب عمودي"
            className={cn(
              "h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              element.flipY && "bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40"
            )}
          >
            <FlipVertical
              className={cn("w-3.5 h-3.5", element.flipY ? "text-primary" : "text-muted-foreground")}
              weight={element.flipY ? "fill" : "regular"}
            />
          </Button>
        </div>
      </FluentSection>
    </div>
  );
}
