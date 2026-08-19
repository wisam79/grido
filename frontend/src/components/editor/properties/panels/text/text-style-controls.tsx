import React from "react";
import { Label } from "@/components/ui/label";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { Italic, Underline, Strikethrough, CaseSensitive, AlignRight, AlignCenter, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextStyleControlsProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextStyleControls = React.memo(function TextStyleControls({
  element,
  onUpdate,
}: TextStyleControlsProps) {
  const isItalic = element.fontStyle === "italic";
  const isUnderline = element.textDecoration === "underline";
  const isLineThrough = element.textDecoration === "line-through";
  const isUppercase = element.textTransform === "uppercase";
  const textAlign = element.textAlign || "center";

  return (
    <div className="space-y-3 font-cairo">
      {/* نمط الخط والزخرفة */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground font-semibold">تنسيق النمط والشطب</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {/* Italic */}
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, { fontStyle: isItalic ? "normal" : "italic" });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-extrabold text-xs shadow-2xs",
              isItalic
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="خط مائل (Italic)"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, {
                textDecoration: isUnderline ? "none" : "underline",
              });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-extrabold text-xs shadow-2xs",
              isUnderline
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="تحته خط (Underline)"
          >
            <Underline className="w-4 h-4" />
          </button>

          {/* Line-through */}
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, {
                textDecoration: isLineThrough ? "none" : "line-through",
              });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-extrabold text-xs shadow-2xs",
              isLineThrough
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="شطب (Line-through)"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          {/* Uppercase / Caps */}
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, {
                textTransform: isUppercase ? "none" : "uppercase",
              });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-extrabold text-xs shadow-2xs",
              isUppercase
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="أحرف كبيرة (Uppercase - AA)"
          >
            <CaseSensitive className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* محاذاة النص */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground font-semibold">محاذاة النص</Label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, { textAlign: "right" });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-semibold text-xs shadow-2xs",
              textAlign === "right"
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="محاذاة لليمين"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, { textAlign: "center" });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-semibold text-xs shadow-2xs",
              textAlign === "center"
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="توسيط"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, { textAlign: "left" });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer font-semibold text-xs shadow-2xs",
              textAlign === "left"
                ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                : "border-border/60 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="محاذاة لليسار"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
