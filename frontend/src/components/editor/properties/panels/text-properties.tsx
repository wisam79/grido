import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { 
  AlignLeft, AlignCenter, AlignRight, Type, PaintBucket
} from "lucide-react";
import { SliderControl, PopoverColorPicker } from "../shared-controls";
import { GradientPicker } from "../gradient-picker";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-2">
        <Label className="text-[11px] font-bold text-foreground/80 block">محتوى النص</Label>
        <Textarea
          value={element.text || ""}
          onChange={(e) => onUpdate(element.id, { text: e.target.value })}
          onBlur={() => useEditorStore.getState().pushHistory()}
          className="text-xs min-h-[60px] resize-none bg-background animate-none"
          placeholder="اكتب النص هنا..."
        />
      </div>

      <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
        <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-1">تنسيق الخط</Label>
        
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">نوع الخط</Label>
          <select
            value={element.fontFamily || "var(--font-cairo)"}
            onChange={(e) => {
              onUpdate(element.id, { fontFamily: e.target.value });
              useEditorStore.getState().pushHistory();
            }}
            className="w-full bg-background border border-border/60 rounded-md p-1.5 text-xs text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-hidden cursor-pointer"
          >
            <option value="var(--font-cairo)">افتراضي (Cairo)</option>
            <option value="'Cairo', sans-serif">كايرو (Cairo)</option>
            <option value="'Tajawal', sans-serif">تاجوال (Tajawal)</option>
            <option value="'IBM Plex Sans Arabic', sans-serif">ديواني (IBM Plex Arabic)</option>
            <option value="'Lemonada', cursive">ليمونادة (Lemonada)</option>
            <option value="'Amiri', serif">أميري (Amiri)</option>
            <option value="'Almarai', sans-serif">المراعي (Almarai)</option>
          </select>
        </div>

        <SliderControl
          label="حجم الخط"
          value={element.fontSize ?? 32}
          min={8}
          max={120}
          step={1}
          unit="px"
          onChange={(v) => onUpdate(element.id, { fontSize: v })}
        />

        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">سمك الخط</Label>
            <div className="grid grid-cols-4 gap-1">
              {[300, 400, 600, 800].map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    onUpdate(element.id, { fontWeight: w });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "h-8 text-xs rounded-md border transition-all text-center font-bold",
                    element.fontWeight === w
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-card hover:bg-accent/80 hover:text-foreground text-muted-foreground"
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
            <Label className="text-[10px] text-muted-foreground">المحاذاة</Label>
            <div className="grid grid-cols-3 gap-1">
              {(["right", "center", "left"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    onUpdate(element.id, { textAlign: a });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "h-8 rounded-md border transition-all text-center flex items-center justify-center",
                    element.textAlign === a
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 bg-card hover:bg-accent/80 hover:text-foreground text-muted-foreground"
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

      <div className="bg-muted/30 dark:bg-muted/10 p-3 rounded-xl border border-border/30 space-y-3">
        <Label className="text-[11px] font-bold text-foreground/80 block border-b border-border/20 pb-1.5 mb-2">اللون والخلفية</Label>
        
        <div className="space-y-3">
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

          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <PaintBucket className="w-3.5 h-3.5 text-primary/70" />
              <span>خلفية النص</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdate(element.id, { 
                  textBgColor: element.textBgColor === "transparent" ? "#ffffff" : "transparent" 
                })}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg border transition-all shrink-0 cursor-pointer",
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
        </div>
      </div>
    </div>
  );
}
