import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  ImageIcon, Type, Palette, Sparkles, Eye, RotateCw, FlipHorizontal, Square, 
  Paintbrush, Sliders, Move, Lock, Droplet
} from "lucide-react";
import { SliderControl, PopoverColorPicker } from "./shared-controls";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageStyleProperties, ImageAdjustProperties } from "./panels/image-properties";
import { TextProperties } from "./panels/text-properties";
import { ShapeProperties } from "./panels/shape-properties";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ElementProperties({
  element,
  onUpdate,
}: {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}) {
  const hasAdjustTab = element.type === "image";

  return (
    <div className="space-y-4">
      <div className="text-xs font-extrabold text-primary flex items-center gap-1.5 border-b border-border/15 pb-2.5">
        {element.type === "image" && (<><ImageIcon className="w-4 h-4 text-primary" /> <span>خصائص الصورة</span></>)}
        {element.type === "text" && (<><Type className="w-4 h-4 text-primary" /> <span>خصائص النص</span></>)}
        {element.type === "shape" && (<><Palette className="w-4 h-4 text-primary" /> <span>خصائص الشكل</span></>)}
      </div>

      {element.locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-semibold mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>هذا العنصر مقفل. إلغاء القفل للتعديل.</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              onUpdate(element.id, { locked: false });
              useEditorStore.getState().pushHistory();
            }}
            className="h-6 px-2 text-[10px] bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 rounded-md transition-colors cursor-pointer text-amber-700 dark:text-amber-300 font-bold"
          >
            إلغاء القفل
          </Button>
        </div>
      )}

      <div className={cn(element.locked && "pointer-events-none opacity-50 select-none")}>
        <TooltipProvider delayDuration={150}>
          <Tabs defaultValue="style" className="w-full">
            <TabsList className={cn(
              "grid w-full h-10 p-[3px] bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/40 backdrop-blur-xs",
              hasAdjustTab ? "grid-cols-4" : "grid-cols-3"
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="style" className="rounded-lg py-1.5 cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground shadow-2xs">
                    <Paintbrush className="w-4 h-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold">التنسيق والأدوات</TooltipContent>
              </Tooltip>

              {hasAdjustTab && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="adjust" className="rounded-lg py-1.5 cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground shadow-2xs">
                      <Sliders className="w-4 h-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-bold">تعديل الألوان والسطوع</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="effects" className="rounded-lg py-1.5 cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold">التأثيرات والظلال</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="arrange" className="rounded-lg py-1.5 cursor-pointer transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground shadow-2xs">
                    <Move className="w-4 h-4" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold">الموضع والترتيب</TooltipContent>
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
                <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3 animate-in fade-in duration-200">
                  <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تعديل الألوان</Label>
                  <ImageAdjustProperties element={element} onUpdate={onUpdate} showReset={true} />
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="arrange" className="mt-3.5 space-y-3.5">
            <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">التحويل والموضع</Label>
              <SliderControl
                label="التدوير"
                icon={<RotateCw className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={element.rotation}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={(v) => onUpdate(element.id, { rotation: v })}
              />
              <SliderControl
                label="الشفافية"
                icon={<Eye className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={Math.round(element.opacity * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => onUpdate(element.id, { opacity: v / 100 })}
              />
              
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onUpdate(element.id, { rotation: (element.rotation + 90) % 360 });
                    useEditorStore.getState().pushHistory();
                  }}
                  title="تدوير 90 درجة"
                  className="h-8 w-8 border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center"
                >
                  <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    onUpdate(element.id, { flipX: !element.flipX });
                    useEditorStore.getState().pushHistory();
                  }}
                  title="قلب أفقي"
                  className="h-8 w-8 border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="الإحداثي الأفقي X">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">X:</span>
                  <input
                    type="number"
                    value={Math.round(element.x * 100)}
                    onChange={(e) => onUpdate(element.id, { x: Number(e.target.value) / 100 })}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="الإحداثي العمودي Y">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">Y:</span>
                  <input
                    type="number"
                    value={Math.round(element.y * 100)}
                    onChange={(e) => onUpdate(element.id, { y: Number(e.target.value) / 100 })}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="نسبة العرض W">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">W:</span>
                  <input
                    type="number"
                    value={Math.round(element.width * 100)}
                    onChange={(e) => onUpdate(element.id, { width: Math.max(0.05, Number(e.target.value) / 100) })}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-8 shadow-xs" title="نسبة الارتفاع H">
                  <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">H:</span>
                  <input
                    type="number"
                    value={Math.round(element.height * 100)}
                    onChange={(e) => onUpdate(element.id, { height: Math.max(0.05, Number(e.target.value) / 100) })}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="effects" className="mt-3.5 space-y-3.5">
            <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">الظلال (Drop Shadow)</Label>
              
              <div className="flex items-center justify-between gap-4" title="لون الظل">
                <span className="text-[11px] font-bold text-muted-foreground">لون الظل الأساسي:</span>
                <PopoverColorPicker
                  color={element.shadowColor || "#000000"}
                  onChange={(val) => onUpdate(element.id, { shadowColor: val })}
                  className="w-32 h-8"
                />
              </div>

              <SliderControl
                label="شفافية الظل"
                icon={<Eye className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={Math.round((element.shadowOpacity ?? 0) * 100)}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(v) => onUpdate(element.id, { shadowOpacity: v / 100 })}
              />
              
              <SliderControl
                label="تمويه الظل (Blur)"
                icon={<Droplet className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={element.shadowBlur || 0}
                min={0}
                max={50}
                step={1}
                unit="px"
                onChange={(v) => onUpdate(element.id, { shadowBlur: v })}
              />

              <SliderControl
                label="إزاحة الظل (X)"
                icon={<Move className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={element.shadowOffsetX || 0}
                min={-50}
                max={50}
                step={1}
                unit="px"
                onChange={(v) => onUpdate(element.id, { shadowOffsetX: v })}
              />

              <SliderControl
                label="إزاحة الظل (Y)"
                icon={<Move className="w-3.5 h-3.5 text-muted-foreground/75" />}
                value={element.shadowOffsetY || 0}
                min={-50}
                max={50}
                step={1}
                unit="px"
                onChange={(v) => onUpdate(element.id, { shadowOffsetY: v })}
              />
            </div>

            {(element.type === "image" || element.type === "shape") && (
              <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
                <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تدوير الزوايا</Label>
                <SliderControl
                  label="قطر الزاوية (Radius)"
                  icon={<Square className="w-3.5 h-3.5 text-muted-foreground/75" />}
                  value={element.cornerRadius || 0}
                  min={0}
                  max={200}
                  step={1}
                  unit="px"
                  onChange={(v) => onUpdate(element.id, { cornerRadius: v })}
                />
              </div>
            )}

            <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3.5 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">طريقة الدمج (Blend Mode)</Label>
              <div className="relative">
                <select
                  value={element.globalCompositeOperation || "source-over"}
                  onChange={(e) => {
                    onUpdate(element.id, { globalCompositeOperation: e.target.value });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  dir="ltr"
                >
                  <option value="source-over">عادي (Normal)</option>
                  <option value="multiply">مضاعفة (Multiply)</option>
                  <option value="screen">تفتيح (Screen)</option>
                  <option value="overlay">تراكب (Overlay)</option>
                  <option value="darken">تغميق (Darken)</option>
                  <option value="lighten">تفتيح (Lighten)</option>
                  <option value="color-dodge">حرق اللون (Color Dodge)</option>
                  <option value="color-burn">حرق اللون (Color Burn)</option>
                  <option value="hard-light">ضوء قاسي (Hard Light)</option>
                  <option value="soft-light">ضوء ناعم (Soft Light)</option>
                  <option value="difference">الفرق (Difference)</option>
                  <option value="exclusion">استبعاد (Exclusion)</option>
                  <option value="hue">صبغة (Hue)</option>
                  <option value="saturation">تشبع (Saturation)</option>
                  <option value="color">لون (Color)</option>
                  <option value="luminosity">إضاءة (Luminosity)</option>
                </select>
              </div>
            </div>
          </TabsContent>
          </Tabs>
        </TooltipProvider>
      </div>
    </div>
  );
}
