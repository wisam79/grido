import { useState } from "react";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  ImageIcon, Type, Palette, Sparkles, Eye, RotateCw, FlipHorizontal, FlipVertical, Square,
  Paintbrush, Sliders, Move, Lock, Droplet
} from "lucide-react";
import { SliderControl, PopoverColorPicker } from "./shared-controls";
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
  const [activeTab, setActiveTab] = useState<string>("style");
  const hasAdjustTab = element.type === "image";

  return (
    <div className="space-y-3 font-cairo">
      <div className="text-xs font-bold text-foreground/90 flex items-center gap-1.5 border-b border-border/25 pb-2">
        {element.type === "image" && (<><ImageIcon className="w-3.5 h-3.5 text-primary/80" /> <span>خصائص الصورة</span></>)}
        {element.type === "text" && (<><Type className="w-3.5 h-3.5 text-primary/80" /> <span>خصائص النص</span></>)}
        {element.type === "shape" && (<><Palette className="w-3.5 h-3.5 text-primary/80" /> <span>خصائص الشكل</span></>)}
      </div>

      {element.locked && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-semibold mb-1 animate-in fade-in slide-in-from-top-1 duration-200 fluent-specular">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>عنصر مقفل</span>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(
              "grid w-full h-8 p-0.5 bg-muted/60 dark:bg-muted/30 rounded-lg border border-border/40",
              hasAdjustTab ? "grid-cols-4" : "grid-cols-3"
            )}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="style" 
                    className={cn(
                      "h-7 rounded-md cursor-pointer transition-all text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center",
                      activeTab === "style"
                        ? "bg-background text-primary shadow-xs border border-border/80 ring-1 ring-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">التنسيق والأدوات</TooltipContent>
              </Tooltip>

              {hasAdjustTab && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger 
                      value="adjust" 
                      className={cn(
                        "h-7 rounded-md cursor-pointer transition-all text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center",
                        activeTab === "adjust"
                          ? "bg-background text-primary shadow-xs border border-border/80 ring-1 ring-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      )}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-bold font-cairo">تعديل الألوان والسطوع</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="effects" 
                    className={cn(
                      "h-7 rounded-md cursor-pointer transition-all text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center",
                      activeTab === "effects"
                        ? "bg-background text-primary shadow-xs border border-border/80 ring-1 ring-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">التأثيرات والظلال</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="arrange" 
                    className={cn(
                      "h-7 rounded-md cursor-pointer transition-all text-xs font-bold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center",
                      activeTab === "arrange"
                        ? "bg-background text-primary shadow-xs border border-border/80 ring-1 ring-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    )}
                  >
                    <Move className="w-3.5 h-3.5" />
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-bold font-cairo">الموضع والترتيب</TooltipContent>
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

          <TabsContent value="arrange" className="mt-3.5 space-y-3.5">
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3.5 animate-in fade-in duration-200">
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
                onCommit={() => useEditorStore.getState().pushHistory()}
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
                onCommit={() => useEditorStore.getState().pushHistory()}
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
                  className="h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
                  className={cn(
                    "h-8 w-8 rounded-md border-border/60 hover:border-primary/45 transition-all cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    element.flipX && "bg-primary/10 border-primary/50 text-primary"
                  )}
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
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
                  <FlipVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
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
                    onChange={(e) => onUpdate(element.id, { width: Math.max(0.05, Number(e.target.value) / 100) })}
                    onBlur={() => useEditorStore.getState().pushHistory()}
                    className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-all" title="نسبة الارتفاع H">
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
            <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3.5 animate-in fade-in duration-200">
              <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">الظلال (Drop Shadow)</Label>
              
              <div className="flex items-center justify-between gap-4" title="لون الظل">
                <span className="text-[11px] font-bold text-muted-foreground">لون الظل الأساسي:</span>
                <PopoverColorPicker
                  color={element.shadowColor || "#000000"}
                  onChange={(val) => onUpdate(element.id, { shadowColor: val })}
                  className="w-32 h-8 rounded-md"
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
                onCommit={() => useEditorStore.getState().pushHistory()}
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
                onCommit={() => useEditorStore.getState().pushHistory()}
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
                onCommit={() => useEditorStore.getState().pushHistory()}
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
                onCommit={() => useEditorStore.getState().pushHistory()}
              />
            </div>

            {(element.type === "image" || element.type === "shape") && (
              <div className="bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs fluent-specular space-y-3.5 animate-in fade-in duration-200">
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
