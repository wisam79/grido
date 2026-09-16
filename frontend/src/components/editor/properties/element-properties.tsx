import { useState } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sparkle,
  Eye,
  ArrowClockwise,
  FlipHorizontal,
  FlipVertical,
  PaintBrush,
  ArrowsOutCardinal,
  ArrowsLeftRight,
  ArrowsDownUp,
  LockSimple,
  Drop,
  Palette,
} from "@phosphor-icons/react";
import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVerticalIcon,
  AlignBottomIcon,
} from "@/components/ui/alignment-icons";
import { SliderControl, PopoverColorPicker } from "./shared-controls";
import { scaleElementDecorations } from "@/lib/canvas/scale-decorations";
import { rotateElementAroundCenter } from "@/lib/canvas/element-geometry";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FluentSegmentedControl } from "@/components/ui/blocks";
import { ImageStyleProperties, ImageAdjustProperties } from "./panels/image-properties";
import { TextStyleProperties, TextColorProperties, TextEffectsProperties } from "./panels/text-properties";
import { ShapeStyleProperties, ShapeColorProperties } from "./panels/shape-properties";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ElementProperties({
  element,
  onUpdate,
}: {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const [selectedTab, setSelectedTab] = useState<string>("style");
  const activeTab = selectedTab;
  const alignSelectedElements = useEditorStore((state) => state.alignSelectedElements);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const isMulti = selectedIds.length > 1 && selectedIds.includes(element.id);

  return (
    <div className="space-y-2.5 font-cairo">
      {isMulti && (
        <div className="bg-primary/10 border border-primary/20 text-primary p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold mb-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
          <div className="flex items-center gap-2">
            <Sparkle className="w-3.5 h-3.5 shrink-0 text-primary" weight="fill" />
            <span>تحديد متعدد ({selectedIds.length} عناصر)</span>
          </div>
          <span className="text-[10px] text-muted-foreground/90 font-medium">التنسيق يُبث للجميع</span>
        </div>
      )}

      {element.locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold mb-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
          <div className="flex items-center gap-2">
            <LockSimple className="w-3.5 h-3.5 shrink-0" weight="fill" />
            <span>عنصر مقفل</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              onUpdate(element.id, { locked: false });
              useEditorStore.getState().pushHistory();
            }}
            className="h-7 px-2 text-[10px] bg-amber-500/15 enabled:hover:bg-amber-500/25 border border-amber-500/20 rounded-md transition-colors cursor-pointer text-amber-700 dark:text-amber-300 font-bold"
          >
            إلغاء القفل
          </Button>
        </div>
      )}

      <div className={cn("overflow-hidden", element.locked && "pointer-events-none opacity-50 select-none")}>
        <Tabs value={activeTab} onValueChange={setSelectedTab} className="w-full">
            {/* أربعة مواضع ثابتة دائماً بنمط مكدس وموحد مع Framer Motion */}
            <FluentSegmentedControl<string>
              layoutId="element-properties-tabs"
              value={activeTab}
              onChange={setSelectedTab}
              stacked={true}
              options={[
                {
                  id: "style",
                  label: "التنسيق",
                  icon: <PaintBrush className="w-3.5 h-3.5 shrink-0 transition-transform" weight={activeTab === "style" ? "duotone" : "regular"} />,
                  tooltip: "التنسيق",
                },
                {
                  id: "adjust",
                  label: "الألوان",
                  icon: <Palette className="w-3.5 h-3.5 shrink-0 transition-transform" weight={activeTab === "adjust" ? "duotone" : "regular"} />,
                  tooltip: element.type === "image" ? "تعديلات ألوان وفلاتر الصورة" : "الألوان والتعبئة والتدرجات",
                },
                {
                  id: "effects",
                  label: "التأثيرات",
                  icon: <Sparkle className="w-3.5 h-3.5 shrink-0 transition-transform" weight={activeTab === "effects" ? "duotone" : "regular"} />,
                  tooltip: "التأثيرات والظلال",
                },
                {
                  id: "arrange",
                  label: "الترتيب",
                  icon: <ArrowsOutCardinal className="w-3.5 h-3.5 shrink-0 transition-transform" weight={activeTab === "arrange" ? "duotone" : "regular"} />,
                  tooltip: "الترتيب والمحاذاة",
                },
              ]}
            />

          <TabsContent value="style" className={cn("mt-3.5 space-y-3.5", element.locked && "pointer-events-none opacity-50 select-none")}>
            {element.type === "image" && (
              <ImageStyleProperties element={element} onUpdate={onUpdate} />
            )}
            {element.type === "text" && (
              <TextStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={setSelectedTab} />
            )}
            {element.type === "shape" && (
              <ShapeStyleProperties element={element} onUpdate={onUpdate} onNavigateTab={setSelectedTab} />
            )}
          </TabsContent>

          <TabsContent value="adjust" className={cn("mt-3.5 space-y-3.5", element.locked && "pointer-events-none opacity-50 select-none")}>
            {element.type === "image" && (
              <ImageAdjustProperties element={element} onUpdate={onUpdate} showReset={true} />
            )}
            {element.type === "text" && (
              <TextColorProperties element={element} onUpdate={onUpdate} onNavigateTab={setSelectedTab} />
            )}
            {element.type === "shape" && (
              <ShapeColorProperties element={element} onUpdate={onUpdate} onNavigateTab={setSelectedTab} />
            )}
          </TabsContent>

          <TabsContent value="effects" className={cn("mt-3.5 space-y-3", element.locked && "pointer-events-none opacity-50 select-none")}>
            {element.type === "text" ? (
              <TextEffectsProperties element={element} onUpdate={onUpdate} onNavigateTab={setSelectedTab} />
            ) : (
              /* بطاقة: الظل والوهج */
              <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
                <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                  <Sparkle className="w-3.5 h-3.5 text-primary" weight="duotone" />
                  <span>الظل</span>
                </Label>
                
                <div className="flex items-center justify-between gap-4" title="لون الظل">
                  <span className="text-xs font-semibold text-muted-foreground">لون الظل</span>
                  <PopoverColorPicker
                    color={element.shadowColor || "#000000"}
                    onChange={(val) => onUpdate(element.id, { shadowColor: val })}
                    swatchOnly
                    className="w-8 h-8"
                  />
                </div>

                <SliderControl
                  label="شدة الظل"
                  icon={<Eye className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                  value={Math.round((element.shadowOpacity ?? 0) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onChange={(v) => onUpdate(element.id, { shadowOpacity: v / 100 })}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                />
                
                <SliderControl
                  label="التمويه"
                  icon={<Drop className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                  value={element.shadowBlur || 0}
                  min={0}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={(v) => onUpdate(element.id, { shadowBlur: v })}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                />

                <SliderControl
                  label="إزاحة أفقية"
                  icon={<ArrowsLeftRight className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                  value={element.shadowOffsetX || 0}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={(v) => onUpdate(element.id, { shadowOffsetX: v })}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                />

                <SliderControl
                  label="إزاحة عمودية"
                  icon={<ArrowsDownUp className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                  value={element.shadowOffsetY || 0}
                  min={-50}
                  max={50}
                  step={1}
                  unit="px"
                  onChange={(v) => onUpdate(element.id, { shadowOffsetY: v })}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="arrange" className={cn("mt-3.5 space-y-3", element.locked && "pointer-events-none opacity-50 select-none")}>
            {/* بطاقة 1: الموضع والمحاذاة السريعة */}
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
              <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                <ArrowsOutCardinal className="w-4 h-4 text-primary" weight="duotone" />
                <span>الموضع والمحاذاة</span>
              </Label>

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
                  <TooltipContent side="bottom" className="text-xs font-cairo">محاذاة لليسار</TooltipContent>
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
                  <TooltipContent side="bottom" className="text-xs font-cairo">محاذاة للوسط أفقياً</TooltipContent>
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
                  <TooltipContent side="bottom" className="text-xs font-cairo">محاذاة لليمين</TooltipContent>
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
                  <TooltipContent side="bottom" className="text-xs font-cairo">محاذاة للأعلى</TooltipContent>
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
                  <TooltipContent side="bottom" className="text-xs font-cairo">محاذاة للمنتصف عمودياً</TooltipContent>
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
                  <TooltipContent side="bottom" className="text-xs font-cairo">محاذاة للأسفل</TooltipContent>
                </Tooltip>
              </div>

              {/* شبكة الإحداثيات والأبعاد */}
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all" title="الإحداثي الأفقي X">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">X:</span>
                  <input
                    type="number"
                    value={Math.round(element.x * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (e.target.value !== "" && Number.isFinite(v)) onUpdate(element.id, { x: Math.max(-1, Math.min(2, v / 100)) });
                    }}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all" title="الإحداثي العمودي Y">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">Y:</span>
                  <input
                    type="number"
                    value={Math.round(element.y * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (e.target.value !== "" && Number.isFinite(v)) onUpdate(element.id, { y: Math.max(-1, Math.min(2, v / 100)) });
                    }}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all" title="نسبة العرض W">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">W:</span>
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
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all" title="نسبة الارتفاع H">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">H:</span>
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
                          : scaleElementDecorations(element, 1, newHeight / Math.max(1e-6, element.height));
                      onUpdate(element.id, { height: newHeight, ...deco });
                    }}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* بطاقة 2: التدوير والقلب */}
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
              <Label className="text-xs font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                <ArrowClockwise className="w-3.5 h-3.5 text-primary" weight="duotone" />
                <span>التدوير والقلب</span>
              </Label>

              <SliderControl
                label="التدوير"
                icon={<ArrowClockwise className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                value={((element.rotation % 360) + 540) % 360 - 180}
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
                  onClick={() => {
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
                  }}
                  title="تدوير 90 درجة"
                  className="h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <ArrowClockwise className="w-3.5 h-3.5 text-muted-foreground" weight="regular" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onUpdate(element.id, { flipX: !element.flipX });
                    useEditorStore.getState().pushHistory();
                  }}
                  title="قلب أفقي"
                  className={cn(
                    "h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    element.flipX && "bg-primary/10 border-primary/50 text-primary"
                  )}
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-muted-foreground" weight={element.flipX ? "fill" : "regular"} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onUpdate(element.id, { flipY: !element.flipY });
                    useEditorStore.getState().pushHistory();
                  }}
                  title="قلب عمودي"
                  className={cn(
                    "h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    element.flipY && "bg-primary/10 border-primary/50 text-primary"
                  )}
                >
                  <FlipVertical className="w-3.5 h-3.5 text-muted-foreground" weight={element.flipY ? "fill" : "regular"} />
                </Button>
              </div>
            </div>
          </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
