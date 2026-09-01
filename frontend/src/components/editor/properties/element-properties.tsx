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
  Square,
  PaintBrush,
  SlidersHorizontal,
  ArrowsOutCardinal,
  LockSimple,
  Drop,
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
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageStyleProperties, ImageAdjustProperties } from "./panels/image-properties";
import { TextProperties } from "./panels/text-properties";
import { ShapeProperties } from "./panels/shape-properties";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ElementProperties({
  element,
  onUpdate,
}: {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const [selectedTab, setSelectedTab] = useState<string>("style");
  const hasAdjustTab = element.type === "image";

  // اشتقاق آمن أثناء العرض: لو انتقل التحديد من صورة إلى نص/شكل وتبويب
  // "الضبط" نشط، نعيد التوجيه إلى "التنسيق" بدل البقاء في تبويب معطّل
  const activeTab = !hasAdjustTab && selectedTab === "adjust" ? "style" : selectedTab;
  const alignSelectedElements = useEditorStore((state) => state.alignSelectedElements);

  return (
    <div className="space-y-2.5 font-cairo">

      {element.locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-semibold mb-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
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
            {/* أربعة مواضع ثابتة دائماً — إخفاء تبويب "الضبط" للنصوص والأشكال كان
                يزيح التبويبات الأخرى ويكسر الذاكرة الحركية (تحسين الترتيب) */}
            <TabsList className="grid w-full h-10 p-1 bg-muted/60 dark:bg-black/25 backdrop-blur-xl rounded-xl border border-border/80 dark:border-white/10 shadow-inner grid-cols-4 gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="style"
                    className={cn(
                      "h-8 rounded-lg cursor-pointer transition-all duration-150 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center relative",
                      activeTab === "style"
                        ? "bg-card text-primary shadow-xs border border-border/80 dark:border-white/15 ring-1 ring-primary/30 scale-[1.02]"
                        : "text-muted-foreground/75 hover:text-foreground hover:bg-card/50 active:scale-95"
                    )}
                  >
                    <PaintBrush className="w-5 h-5 transition-transform" weight={activeTab === "style" ? "duotone" : "regular"} />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">التنسيق</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="adjust"
                    disabled={!hasAdjustTab}
                    title={!hasAdjustTab ? "للصور فقط" : undefined}
                    className={cn(
                      "h-8 rounded-lg transition-all duration-150 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center relative",
                      !hasAdjustTab && "opacity-30 cursor-not-allowed",
                      hasAdjustTab && "cursor-pointer",
                      activeTab === "adjust"
                        ? "bg-card text-primary shadow-xs border border-border/80 dark:border-white/15 ring-1 ring-primary/30 scale-[1.02]"
                        : "text-muted-foreground/75 enabled:hover:text-foreground enabled:hover:bg-card/50 active:scale-95"
                    )}
                  >
                    <SlidersHorizontal className="w-5 h-5 transition-transform" weight={activeTab === "adjust" ? "duotone" : "regular"} />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">
                  {hasAdjustTab ? "الألوان" : "للصور فقط"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="effects"
                    className={cn(
                      "h-8 rounded-lg cursor-pointer transition-all duration-150 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center relative",
                      activeTab === "effects"
                        ? "bg-card text-primary shadow-xs border border-border/80 dark:border-white/15 ring-1 ring-primary/30 scale-[1.02]"
                        : "text-muted-foreground/75 hover:text-foreground hover:bg-card/50 active:scale-95"
                    )}
                  >
                    <Sparkle className="w-5 h-5 transition-transform" weight={activeTab === "effects" ? "duotone" : "regular"} />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">التأثيرات</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value="arrange"
                    className={cn(
                      "h-8 rounded-lg cursor-pointer transition-all duration-150 text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center relative",
                      activeTab === "arrange"
                        ? "bg-card text-primary shadow-xs border border-border/80 dark:border-white/15 ring-1 ring-primary/30 scale-[1.02]"
                        : "text-muted-foreground/75 hover:text-foreground hover:bg-card/50 active:scale-95"
                    )}
                  >
                    <ArrowsOutCardinal className="w-5 h-5 transition-transform" weight={activeTab === "arrange" ? "duotone" : "regular"} />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">الترتيب</TooltipContent>
              </Tooltip>
            </TabsList>

          <TabsContent value="style" className="mt-3.5 space-y-3.5">
            {element.type === "image" && (
              <ImageStyleProperties element={element} onUpdate={onUpdate} />
            )}
            {element.type === "text" && (
              <TextProperties element={element} onUpdate={onUpdate} />
            )}
            {element.type === "shape" && (
              <ShapeProperties element={element} onUpdate={onUpdate} />
            )}
          </TabsContent>

          {hasAdjustTab && (
            <TabsContent value="adjust" className="mt-3.5 space-y-3.5">
              {element.type === "image" && (
                <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
                  <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تعديل الألوان</Label>
                  <ImageAdjustProperties element={element} onUpdate={onUpdate} showReset={true} />
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="arrange" className="mt-3.5 space-y-3">
            {/* بطاقة 1: الموضع والمحاذاة السريعة */}
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
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
                      <AlignLeftIcon className="w-4.5 h-4.5" />
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
                      <AlignCenterHorizontalIcon className="w-4.5 h-4.5" />
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
                      <AlignRightIcon className="w-4.5 h-4.5" />
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
                      <AlignTopIcon className="w-4.5 h-4.5" />
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
                      <AlignCenterVerticalIcon className="w-4.5 h-4.5" />
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
                      <AlignBottomIcon className="w-4.5 h-4.5" />
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

            {/* بطاقة 2: التدوير والشفافية */}
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                <ArrowClockwise className="w-3.5 h-3.5 text-primary" weight="duotone" />
                <span>التدوير والشفافية</span>
              </Label>

              <SliderControl
                label="التدوير"
                icon={<ArrowClockwise className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                value={element.rotation}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={(v) => onUpdate(element.id, { rotation: v })}
                onCommit={() => useEditorStore.getState().pushHistory()}
              />
              
              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onUpdate(element.id, { rotation: (element.rotation + 90) % 360 });
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

              <SliderControl
                label="الشفافية"
                icon={<Eye className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                value={Math.round(element.opacity * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
                onCommit={() => useEditorStore.getState().pushHistory()}
              />
            </div>
          </TabsContent>

          <TabsContent value="effects" className="mt-3.5 space-y-3">
            {/* بطاقة 1: الظل والإضاءة */}
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                <Sparkle className="w-3.5 h-3.5 text-primary" weight="duotone" />
                <span>الظل والوهج</span>
              </Label>
              
              <div className="flex items-center justify-between gap-4" title="لون الظل">
                <span className="text-[11px] font-semibold text-muted-foreground">لون الظل</span>
                <PopoverColorPicker
                  color={element.shadowColor || "#000000"}
                  onChange={(val) => onUpdate(element.id, { shadowColor: val })}
                  swatchOnly
                  className="w-8 h-8"
                />
              </div>

              <SliderControl
                label="الشفافية"
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
                icon={<ArrowsOutCardinal className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
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
                icon={<ArrowsOutCardinal className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                value={element.shadowOffsetY || 0}
                min={-50}
                max={50}
                step={1}
                unit="px"
                onChange={(v) => onUpdate(element.id, { shadowOffsetY: v })}
                onCommit={() => useEditorStore.getState().pushHistory()}
              />
            </div>

            {/* بطاقة 2: استدارة الحواف */}
            {(element.type === "image" || element.type === "shape") && (
              <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3 animate-in fade-in duration-200">
                <Label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1.5 border-b border-border/20 pb-1.5">
                  <Square className="w-3.5 h-3.5 text-primary" weight="duotone" />
                  <span>استدارة الحواف</span>
                </Label>
                <SliderControl
                  label="قطر الزاوية"
                  icon={<Square className="w-3.5 h-3.5 text-muted-foreground/75" weight="regular" />}
                  value={element.cornerRadius || 0}
                  min={0}
                  max={200}
                  step={1}
                  unit="px"
                  onChange={(v) => onUpdate(element.id, { cornerRadius: v })}
                  onCommit={() => useEditorStore.getState().pushHistory()}
                />
              </div>
            )}
          </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
