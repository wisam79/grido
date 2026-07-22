import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { 
  AlignLeft, AlignCenter, AlignRight, Type, PaintBucket, Shrink, Palette, SlidersHorizontal
} from "lucide-react";
import { SliderControl, PopoverColorPicker } from "../shared-controls";
import { GradientPicker } from "../gradient-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Sub-components (Modular Architecture)
import { TextFontSelector } from "./text/text-font-selector";
import { TextSpacingControls } from "./text/text-spacing-controls";
import { TextStrokeControls } from "./text/text-stroke-controls";
import { TextStyleControls } from "./text/text-style-controls";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  return (
    <div className="space-y-3 font-cairo animate-in fade-in duration-200 w-full min-w-0 max-w-full overflow-x-hidden">
      <Tabs defaultValue="font" className="w-full min-w-0 max-w-full overflow-x-hidden">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl h-10 border border-border/40 mb-3 shadow-2xs">
          <TabsTrigger 
            value="font" 
            className="rounded-lg text-[11px] font-bold py-1.5 cursor-pointer flex items-center justify-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white shadow-sm transition-all"
          >
            <Type className="w-3.5 h-3.5" />
            <span>الخط</span>
          </TabsTrigger>
          <TabsTrigger 
            value="spacing" 
            className="rounded-lg text-[11px] font-bold py-1.5 cursor-pointer flex items-center justify-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white shadow-sm transition-all"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>التباعد</span>
          </TabsTrigger>
          <TabsTrigger 
            value="color" 
            className="rounded-lg text-[11px] font-bold py-1.5 cursor-pointer flex items-center justify-center gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 dark:data-[state=active]:text-white shadow-sm transition-all"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>الألوان</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: المحتوى والخط */}
        <TabsContent value="font" className="space-y-3 mt-0 focus-visible:outline-hidden w-full min-w-0 max-w-full overflow-x-hidden">
          {/* محتوى النص */}
          <div className="bg-card/70 dark:bg-muted/10 p-3 rounded-xl border border-border/40 space-y-2 shadow-2xs w-full min-w-0 max-w-full overflow-x-hidden">
            <div className="flex items-center justify-between gap-2 w-full min-w-0">
              <Label className="text-[11px] font-bold text-foreground/90 block truncate">محتوى النص</Label>
              <button
                type="button"
                onClick={() => useEditorStore.getState().autoFitTextWidth(element.id)}
                className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md border border-primary/30 flex items-center gap-1 cursor-pointer transition-all shadow-2xs shrink-0 whitespace-nowrap"
                title="إزالة المساحات الفارغة الزائدة وملاءمة عرض المربع مع الكلمات"
              >
                <Shrink className="w-3 h-3" />
                <span>ملاءمة المربع</span>
              </button>
            </div>
            <Textarea
              value={element.text || ""}
              onChange={(e) => {
                onUpdate(element.id, { text: e.target.value });
              }}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="text-xs min-h-[60px] max-h-[110px] resize-none bg-background/80 font-medium w-full min-w-0 max-w-full break-all overflow-y-auto custom-scrollbar"
              placeholder="اكتب النص هنا..."
            />
          </div>

          {/* اختيار الخط الحجم والسمك والمحاذاة */}
          <div className="bg-card/70 dark:bg-muted/10 p-3 rounded-xl border border-border/40 space-y-3 shadow-2xs">
            <TextFontSelector element={element} onUpdate={onUpdate} />

            <SliderControl
              label="حجم الخط"
              value={element.fontSize ?? 32}
              min={8}
              max={120}
              step={1}
              unit="px"
              onChange={(v) => onUpdate(element.id, { fontSize: v })}
              onCommit={() => useEditorStore.getState().pushHistory()}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground font-semibold">سمك الخط</Label>
                <div className="grid grid-cols-4 gap-1">
                  {[300, 400, 600, 800].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        onUpdate(element.id, { fontWeight: w });
                        useEditorStore.getState().pushHistory();
                      }}
                      className={cn(
                        "h-8 text-xs rounded-md border transition-all text-center font-bold shadow-2xs cursor-pointer",
                        element.fontWeight === w
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 bg-background hover:bg-accent/80 text-muted-foreground"
                      )}
                      style={{ fontWeight: w }}
                      title={w === 300 ? "خفيف" : w === 400 ? "عادي" : w === 600 ? "متوسط" : "عريض"}
                    >
                      {w === 300 ? "L" : w === 400 ? "R" : w === 600 ? "M" : "B"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground font-semibold">المحاذاة</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["right", "center", "left"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        onUpdate(element.id, { textAlign: a });
                        useEditorStore.getState().pushHistory();
                      }}
                      className={cn(
                        "h-8 rounded-md border transition-all text-center flex items-center justify-center shadow-2xs cursor-pointer",
                        element.textAlign === a
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 bg-background hover:bg-accent/80 text-muted-foreground"
                      )}
                      title={a === "right" ? "يمين" : a === "center" ? "وسط" : "يسار"}
                    >
                      {a === "right" && <AlignRight className="w-4 h-4" />}
                      {a === "center" && <AlignCenter className="w-4 h-4" />}
                      {a === "left" && <AlignLeft className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: التباعد والنمط */}
        <TabsContent value="spacing" className="space-y-3 mt-0 focus-visible:outline-hidden">
          <div className="bg-card/70 dark:bg-muted/10 p-3.5 rounded-xl border border-border/40 space-y-4 shadow-2xs">
            <TextStyleControls element={element} onUpdate={onUpdate} />
            <TextSpacingControls element={element} onUpdate={onUpdate} />
          </div>
        </TabsContent>

        {/* Tab 3: الألوان والإطار والخلفية */}
        <TabsContent value="color" className="space-y-3 mt-0 focus-visible:outline-hidden">
          <div className="bg-card/70 dark:bg-muted/10 p-3.5 rounded-xl border border-border/40 space-y-4 shadow-2xs">
            {/* لون وتعبئة النص */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Type className="w-3 h-3 text-primary/70" />
                <span>لون وتعبئة النص</span>
              </span>
              <GradientPicker
                fillType={element.fillType || "solid"}
                color={element.color || "#000000"}
                colorStops={element.fillLinearGradientColorStops || element.fillRadialGradientColorStops || [0, "#3b82f6", 1, "#8b5cf6"]}
                onChangeType={(type) => {
                  onUpdate(element.id, { fillType: type });
                  useEditorStore.getState().pushHistory();
                }}
                onChangeSolidColor={(col) => {
                  onUpdate(element.id, { color: col });
                  useEditorStore.getState().pushHistory();
                }}
                onChangeColorStops={(stops) => {
                  onUpdate(element.id, {
                    fillLinearGradientColorStops: stops,
                    fillRadialGradientColorStops: stops,
                  });
                  useEditorStore.getState().pushHistory();
                }}
              />
            </div>

            {/* خلفية النص */}
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/20">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <PaintBucket className="w-3.5 h-3.5 text-primary/70" />
                <span>خلفية النص</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate(element.id, { 
                    textBgColor: element.textBgColor === "transparent" ? "#ffffff" : "transparent" 
                  })}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg border transition-all shrink-0 cursor-pointer shadow-2xs",
                    element.textBgColor === "transparent" ? "border-border/60 bg-background text-muted-foreground hover:bg-muted" : "border-primary/50 bg-primary/10 text-primary"
                  )}
                  title={element.textBgColor === "transparent" ? "تفعيل لون الخلفية" : "إلغاء الخلفية"}
                >
                  <PaintBucket className="w-3.5 h-3.5" />
                </button>
                <PopoverColorPicker
                  color={element.textBgColor && element.textBgColor !== "transparent" ? element.textBgColor : "#ffffff"}
                  onChange={(val) => onUpdate(element.id, { textBgColor: val })}
                  disabled={element.textBgColor === "transparent"}
                  className="w-32 h-8"
                />
              </div>
            </div>

            {/* إطار وحدود النص */}
            <TextStrokeControls element={element} onUpdate={onUpdate} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
