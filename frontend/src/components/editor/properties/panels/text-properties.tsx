import React from "react";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { 
  Shrink, Palette, ChevronDown, Square, Sparkles, PaintBucket,
  AlignRight, AlignCenter, AlignLeft, Bold, Italic, Underline, Strikethrough,
  Minus, Plus, Hash, MoveVertical, MoveHorizontal
} from "lucide-react";
import { PopoverColorPicker } from "../shared-controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GradientPicker, gradientAngleFromPoints, gradientPointsFromAngle } from "../gradient-picker";

// Sub-components
import { TextFontSelector } from "./text/text-font-selector";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

const WEIGHT_OPTIONS = [
  { value: 300, label: "300 خفيف" },
  { value: 400, label: "400 عادي" },
  { value: 600, label: "600 متوسط" },
  { value: 700, label: "700 عريض" },
  { value: 900, label: "900 أسود" },
];

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  const isBold = (element.fontWeight || 400) >= 700;
  const isItalic = element.fontStyle === "italic";
  const isUnderline = element.textDecoration === "underline";
  const isLineThrough = element.textDecoration === "line-through";
  const textAlign = element.textAlign || "center";
  const isArabicNumerals = element.arabicNumerals === true;
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(element.text || "");

  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const hasShadow = (element.shadowBlur ?? 0) > 0 || (element.shadowOpacity ?? 0) > 0;
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";

  const currentFontSize = element.fontSize ?? 32;
  const currentLineHeight = element.lineHeight ?? 1.2;

  const changeFontSize = (delta: number) => {
    const next = Math.max(8, Math.min(200, currentFontSize + delta));
    onUpdate(element.id, { fontSize: next });
    useEditorStore.getState().pushHistory();
  };

  const changeLineHeight = (delta: number) => {
    const next = Math.max(0.8, Math.min(3.0, Math.round((currentLineHeight + delta) * 10) / 10));
    onUpdate(element.id, { lineHeight: next });
    useEditorStore.getState().pushHistory();
  };

  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-200 w-full min-w-0">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* بطاقة 1: النص والخط والتنسيق (Precision Figma-Grade Card) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-card/40 dark:bg-card/25 border border-border/40 backdrop-blur-md rounded-xl p-2.5 space-y-2 shadow-2xs">
        
        {/* السطر 1: حقل النص مع زر ملاءمة العرض */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={element.text || ""}
              onChange={(e) => onUpdate(element.id, { text: e.target.value })}
              onBlur={() => useEditorStore.getState().pushHistory()}
              className="w-full h-8 bg-background/80 hover:bg-background focus:bg-background border border-border/50 hover:border-primary/40 focus:border-primary rounded-lg px-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/50 outline-hidden transition-all shadow-2xs"
              placeholder="اكتب النص هنا..."
            />
          </div>
          <button
            type="button"
            onClick={() => useEditorStore.getState().autoFitTextWidth(element.id)}
            className="h-8 px-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
            title="ملاءمة عرض الصندوق للنص"
          >
            <Shrink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* السطر 2: نوع الخط */}
        <TextFontSelector element={element} onUpdate={onUpdate} />

        {/* السطر 3: سمك الخط وحجم الخط */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* سمك الخط Dropdown */}
          <div className="relative">
            <select
              value={element.fontWeight || 700}
              onChange={(e) => {
                onUpdate(element.id, { fontWeight: Number(e.target.value) });
                useEditorStore.getState().pushHistory();
              }}
              className="w-full h-8 bg-background/80 hover:bg-background border border-border/50 hover:border-primary/40 focus:border-primary rounded-lg px-2.5 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-2xs"
            >
              {WEIGHT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* حجم الخط Stepper */}
          <div className="flex items-center justify-between h-8 bg-background/80 border border-border/50 rounded-lg px-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => changeFontSize(-2)}
              className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
              title="تصغير الخط"
            >
              <Minus className="w-3 h-3" />
            </button>
            <div className="flex items-center justify-center gap-0.5">
              <input
                type="number"
                value={currentFontSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onUpdate(element.id, { fontSize: Math.max(8, Math.min(200, val)) });
                }}
                onBlur={() => useEditorStore.getState().pushHistory()}
                className="w-9 text-center text-xs font-bold text-foreground bg-transparent outline-hidden font-mono"
              />
              <span className="text-[10px] text-muted-foreground/80 font-semibold">px</span>
            </div>
            <button
              type="button"
              onClick={() => changeFontSize(2)}
              className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
              title="تكبير الخط"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* السطر 4: تباعد الأسطر والكلمات */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* تباعد الأسطر */}
          <div className="flex items-center justify-between h-8 bg-background/80 border border-border/50 rounded-lg px-2 shadow-2xs">
            <span className="text-[10.5px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
              <MoveVertical className="w-3 h-3 text-primary/70" />
              <span>الأسطر</span>
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => changeLineHeight(-0.1)}
                className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="w-6 text-center text-[11px] font-bold text-foreground font-mono">
                {currentLineHeight}
              </span>
              <button
                type="button"
                onClick={() => changeLineHeight(0.1)}
                className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* تباعد الكلمات/الحروف */}
          <div className="flex items-center justify-between h-8 bg-background/80 border border-border/50 rounded-lg px-2 shadow-2xs">
            <span className="text-[10.5px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
              <MoveHorizontal className="w-3 h-3 text-primary/70" />
              <span>{isArabic ? "الكلمات" : "الحروف"}</span>
            </span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(-5, (element.letterSpacing ?? 0) - 1);
                  onUpdate(element.id, { letterSpacing: next });
                  useEditorStore.getState().pushHistory();
                }}
                className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <span className="w-6 text-center text-[11px] font-bold text-foreground font-mono">
                {element.letterSpacing ?? 0}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(30, (element.letterSpacing ?? 0) + 1);
                  onUpdate(element.id, { letterSpacing: next });
                  useEditorStore.getState().pushHistory();
                }}
                className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* السطر 5: شريط النمط والمحاذاة (Segmented Bar) */}
        <div className="flex items-center justify-between p-0.5 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/40 shadow-2xs">
          {/* أزرار النمط */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { fontWeight: isBold ? 400 : 800 });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs font-bold",
                isBold
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="عريض (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { fontStyle: isItalic ? "normal" : "italic" });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                isItalic
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="مائل (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textDecoration: isUnderline ? "none" : "underline" });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                isUnderline
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="تحته خط (Underline)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textDecoration: isLineThrough ? "none" : "line-through" });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                isLineThrough
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="شطب (Strikethrough)"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-3.5 bg-border/60 mx-0.5" />

          {/* أزرار المحاذاة */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textAlign: "right" });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                textAlign === "right"
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="محاذاة لليمين"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textAlign: "center" });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                textAlign === "center"
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="توسيط"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textAlign: "left" });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "w-6.5 h-6.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                textAlign === "left"
                  ? "bg-background text-foreground shadow-2xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="محاذاة لليسار"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-px h-3.5 bg-border/60 mx-0.5" />

          {/* زر الأرقام المشرقية */}
          <button
            type="button"
            onClick={() => {
              onUpdate(element.id, { arabicNumerals: !isArabicNumerals });
              useEditorStore.getState().pushHistory();
            }}
            className={cn(
              "h-6.5 px-1.5 rounded-md flex items-center justify-center gap-0.5 transition-all cursor-pointer text-[10px] font-bold",
              isArabicNumerals
                ? "bg-background text-foreground shadow-2xs font-extrabold"
                : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
            )}
            title="تحويل الأرقام إلى (١ ٢ ٣)"
          >
            <Hash className="w-3 h-3" />
            <span>١٢٣</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* بطاقة 2: المظهر والتأثيرات (Clean Studio Property Rows) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-card/40 dark:bg-card/25 border border-border/40 backdrop-blur-md rounded-xl p-2 space-y-1 shadow-2xs">
        
        {/* صف 1: تعبئة ولون النص */}
        <div className="flex items-center justify-between h-8 px-2 rounded-lg bg-background/40 hover:bg-background/70 border border-border/30 transition-colors">
          <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary/80" />
            <span>تعبئة النص</span>
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-6 h-6 rounded-md border border-border/80 p-0.5 bg-background hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
                title="تغيير لون وتعبئة النص"
              >
                <div
                  className="w-full h-full rounded-[4px] border border-black/10 dark:border-white/10 shadow-2xs"
                  style={{
                    background:
                      element.fillType === "linear" || element.fillType === "radial"
                        ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                        : element.color || "#000000",
                  }}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" className="w-64 p-3 font-cairo shadow-2xl rounded-xl border-border/60">
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
                angle={gradientAngleFromPoints(
                  element.fillLinearGradientStartPoint,
                  element.fillLinearGradientEndPoint
                )}
                onChangeAngle={(deg) => {
                  const { start, end } = gradientPointsFromAngle(deg);
                  onUpdate(element.id, {
                    fillLinearGradientStartPoint: start,
                    fillLinearGradientEndPoint: end,
                  });
                }}
                onCommitAngle={() => useEditorStore.getState().pushHistory()}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* صف 2: خلفية وتظليل النص */}
        <div className="flex items-center justify-between h-8 px-2 rounded-lg bg-background/40 hover:bg-background/70 border border-border/30 transition-colors">
          <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
            <PaintBucket className="w-3.5 h-3.5 text-primary/80" />
            <span>خلفية النص</span>
          </span>

          <div className="flex items-center gap-1.5">
            {hasBadge && (
              <>
                <PopoverColorPicker
                  color={element.textBgColor || "#2563eb"}
                  onChange={(val: string) => {
                    onUpdate(element.id, { textBgColor: val });
                    useEditorStore.getState().pushHistory();
                  }}
                  swatchOnly
                />

                {/* استدارة الحواف Stepper */}
                <div className="flex items-center h-6 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="استدارة الحواف">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, (element.textBgRadius ?? 6) - 2);
                      onUpdate(element.id, { textBgRadius: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="w-2 h-2" />
                  </button>
                  <span className="text-[9.5px] font-bold font-mono text-foreground w-3.5 text-center">
                    {element.textBgRadius ?? 6}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(30, (element.textBgRadius ?? 6) + 2);
                      onUpdate(element.id, { textBgRadius: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="w-2 h-2" />
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                if (hasBadge) {
                  onUpdate(element.id, { textBgColor: "transparent", textBgBorderWidth: 0 });
                } else {
                  onUpdate(element.id, {
                    textBgColor: "#2563eb",
                    textBgRadius: element.textBgRadius ?? 6,
                    textBgPadding: element.textBgPadding ?? 6,
                  });
                }
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "h-6 px-2 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                hasBadge
                  ? "bg-foreground/10 text-foreground border-border/80 font-bold"
                  : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              {hasBadge ? "مفعّلة" : "إضافة"}
            </button>
          </div>
        </div>

        {/* صف 3: إطار النص */}
        <div className="flex items-center justify-between h-8 px-2 rounded-lg bg-background/40 hover:bg-background/70 border border-border/30 transition-colors">
          <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
            <Square className="w-3.5 h-3.5 text-primary/80" />
            <span>إطار النص</span>
          </span>

          <div className="flex items-center gap-1.5">
            {hasStroke && (
              <>
                <PopoverColorPicker
                  color={element.stroke || "#000000"}
                  onChange={(val: string) => {
                    onUpdate(element.id, { stroke: val });
                    useEditorStore.getState().pushHistory();
                  }}
                  swatchOnly
                />

                {/* سمك الإطار Stepper */}
                <div className="flex items-center h-6 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="سمك الإطار">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0.5, (element.strokeWidth ?? 2) - 0.5);
                      onUpdate(element.id, { strokeWidth: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="w-2 h-2" />
                  </button>
                  <span className="text-[9.5px] font-bold font-mono text-foreground w-5 text-center">
                    {element.strokeWidth ?? 2}px
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(20, (element.strokeWidth ?? 2) + 0.5);
                      onUpdate(element.id, { strokeWidth: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="w-2 h-2" />
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                if (hasStroke) {
                  onUpdate(element.id, { strokeWidth: 0 });
                } else {
                  onUpdate(element.id, { stroke: element.stroke || "#000000", strokeWidth: 2 });
                }
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "h-6 px-2 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                hasStroke
                  ? "bg-foreground/10 text-foreground border-border/80 font-bold"
                  : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              {hasStroke ? "مفعّل" : "إضافة"}
            </button>
          </div>
        </div>

        {/* صف 4: ظل النص */}
        <div className="flex items-center justify-between h-8 px-2 rounded-lg bg-background/40 hover:bg-background/70 border border-border/30 transition-colors">
          <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary/80" />
            <span>ظل النص</span>
          </span>

          <div className="flex items-center gap-1.5">
            {hasShadow && (
              <>
                <PopoverColorPicker
                  color={element.shadowColor || "#000000"}
                  onChange={(val: string) => {
                    onUpdate(element.id, { shadowColor: val });
                    useEditorStore.getState().pushHistory();
                  }}
                  swatchOnly
                />

                {/* تمويه الظل Stepper */}
                <div className="flex items-center h-6 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="تمويه الظل">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, (element.shadowBlur ?? 8) - 2);
                      onUpdate(element.id, { shadowBlur: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="w-2 h-2" />
                  </button>
                  <span className="text-[9.5px] font-bold font-mono text-foreground w-5 text-center">
                    {element.shadowBlur ?? 8}px
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(40, (element.shadowBlur ?? 8) + 2);
                      onUpdate(element.id, { shadowBlur: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="w-2 h-2" />
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                if (hasShadow) {
                  onUpdate(element.id, { shadowBlur: 0, shadowOpacity: 0 });
                } else {
                  onUpdate(element.id, { 
                    shadowColor: element.shadowColor || "#000000",
                    shadowBlur: 8,
                    shadowOpacity: 0.6,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                  });
                }
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "h-6 px-2 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                hasShadow
                  ? "bg-foreground/10 text-foreground border-border/80 font-bold"
                  : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
            >
              {hasShadow ? "مفعّل" : "إضافة"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
