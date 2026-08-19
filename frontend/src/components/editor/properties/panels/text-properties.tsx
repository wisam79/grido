import React, { useState, useEffect } from "react";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import { 
  Shrink, Palette, ChevronDown, Square, Sparkles, PaintBucket,
  AlignRight, AlignCenter, AlignLeft, Bold, Italic, Underline, Strikethrough,
  Minus, Plus, Hash, MoveVertical, MoveHorizontal, RotateCw, Heading1, Heading2,
  FileText, CircleDot, RotateCcw, Sliders, Check, Type
} from "lucide-react";
import { PopoverColorPicker } from "../shared-controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GradientPicker, gradientAngleFromPoints, gradientPointsFromAngle } from "../gradient-picker";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

// Sub-components
import { TextFontSelector } from "./text/text-font-selector";
import { loadGoogleFont } from "@/lib/io/fonts";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

const WEIGHT_OPTIONS = [
  { value: 200, label: "200 فائق النحافة (Extra Light)" },
  { value: 300, label: "300 خفيف (Light)" },
  { value: 400, label: "400 عادي (Regular)" },
  { value: 500, label: "500 متوسط (Medium)" },
  { value: 600, label: "600 شبه عريض (SemiBold)" },
  { value: 700, label: "700 عريض (Bold)" },
  { value: 800, label: "800 عريض جداً (ExtraBold)" },
  { value: 900, label: "900 أسود (Black)" },
];

const STUDIO_PALETTE = [
  { label: "أبيض ناصع", color: "#ffffff" },
  { label: "أسود داكن", color: "#000000" },
  { label: "أزرق رسمي", color: "#2563eb" },
  { label: "ذهبي ملكي", color: "#d97706" },
  { label: "زمردي استوديو", color: "#059669" },
  { label: "قرمزي فخم", color: "#dc2626" },
  { label: "بنفسجي حديث", color: "#7c3aed" },
  { label: "رمادي هادئ", color: "#4b5563" },
];

type TextSubTab = "type" | "color" | "effects";

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  const [activeTab, setActiveTab] = useState<TextSubTab>("type");

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
  const hasCurve = typeof element.curve === "number" && element.curve !== 0;

  const currentFontSize = element.fontSize ?? 32;
  const currentLineHeight = element.lineHeight ?? 1.2;

  const [fontSizeInput, setFontSizeInput] = useState<string>(String(currentFontSize));
  const [showSizeSlider, setShowSizeSlider] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontSizeInput(String(currentFontSize));
  }, [currentFontSize]);

  const commitFontSize = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(8, Math.min(200, val));
      onUpdate(element.id, { fontSize: clamped });
      setFontSizeInput(String(clamped));
      useEditorStore.getState().pushHistory();
    } else {
      setFontSizeInput(String(currentFontSize));
    }
  };

  const changeFontSize = (delta: number) => {
    const next = Math.max(8, Math.min(200, currentFontSize + delta));
    onUpdate(element.id, { fontSize: next });
    setFontSizeInput(String(next));
    useEditorStore.getState().pushHistory();
  };

  const changeLineHeight = (delta: number) => {
    const next = Math.max(0.8, Math.min(3.0, Math.round((currentLineHeight + delta) * 10) / 10));
    onUpdate(element.id, { lineHeight: next });
    useEditorStore.getState().pushHistory();
  };

  const applyPreset = (type: "heading" | "subheading" | "body" | "badge" | "stamp") => {
    if (type === "heading") {
      onUpdate(element.id, { fontSize: 48, fontWeight: 900, lineHeight: 1.1, curve: 0 });
    } else if (type === "subheading") {
      onUpdate(element.id, { fontSize: 28, fontWeight: 700, lineHeight: 1.2, curve: 0 });
    } else if (type === "body") {
      onUpdate(element.id, { fontSize: 18, fontWeight: 400, lineHeight: 1.35, curve: 0 });
    } else if (type === "badge") {
      onUpdate(element.id, {
        fontSize: 22,
        fontWeight: 700,
        textBgColor: element.textBgColor && element.textBgColor !== "transparent" ? element.textBgColor : "#2563eb",
        color: "#ffffff",
        textBgRadius: 8,
        textBgPadding: 8,
        textBgPaddingX: 8,
        textBgPaddingY: 8,
        curve: 0,
      });
    } else if (type === "stamp") {
      onUpdate(element.id, {
        fontSize: 24,
        fontWeight: 700,
        color: element.color || "#dc2626",
        stroke: element.color || "#dc2626",
        strokeWidth: 0.8,
        curve: 60,
      });
    }
    useEditorStore.getState().pushHistory();
  };

  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-200 w-full min-w-0">
      
      {/* ───────────────────────────────────────────────────────────── */}
      {/* شريط التبويبات الثلاثي النظيف (Spacious Sub-Tabs) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-muted/40 dark:bg-muted/20 border border-border/50 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("type")}
          className={cn(
            "py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs",
            activeTab === "type"
              ? "bg-background text-foreground shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Type className="w-3.5 h-3.5" />
          <span>الخط والنمط</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("color")}
          className={cn(
            "py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs",
            activeTab === "color"
              ? "bg-background text-foreground shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>الألوان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={cn(
            "py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs relative",
            activeTab === "effects"
              ? "bg-background text-foreground shadow-xs font-extrabold"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>التأثيرات</span>
          {(hasBadge || hasStroke || hasShadow || hasCurve) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-1.5 left-1.5" />
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* تبويب 1: الخط والطباعة (Type & Formatting) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "type" && (
        <div className="bg-card/60 dark:bg-card/35 border border-border/60 backdrop-blur-xl rounded-xl p-3 space-y-3 shadow-xs animate-in fade-in duration-150">
          
          {/* أزرار القوالب النصية السريعة */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              النمط السريع
            </span>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
              {[
                { id: "heading" as const, label: "عنوان رئيسي", icon: Heading1 },
                { id: "subheading" as const, label: "عنوان فرعي", icon: Heading2 },
                { id: "body" as const, label: "نص عادي", icon: FileText },
                { id: "badge" as const, label: "شارة", icon: CircleDot },
                { id: "stamp" as const, label: "ختم دائري", icon: RotateCw },
              ].map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className="px-2 py-1 bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/50 rounded-lg text-muted-foreground font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Icon className="w-3 h-3" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* حقل محتوى النص مع زر ملاءمة العرض */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
              <span>محتوى النص</span>
              <span className="font-mono text-[9.5px]">{(element.text || "").length} حرف</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={element.text || ""}
                  onChange={(e) => onUpdate(element.id, { text: e.target.value })}
                  onBlur={() => useEditorStore.getState().pushHistory()}
                  className="w-full h-8.5 bg-background/90 hover:bg-background focus:bg-background border border-border/60 hover:border-primary/50 focus:border-primary rounded-lg px-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground/50 outline-hidden transition-all shadow-2xs"
                  placeholder="اكتب النص هنا..."
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => useEditorStore.getState().autoFitTextWidth(element.id)}
                    className="h-8.5 px-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                    aria-label="ملاءمة عرض الصندوق للنص"
                  >
                    <Shrink className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-bold">ملاءمة عرض الصندوق للنص</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* نوع الخط المنسدل */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground block">
              نوع الخط
            </span>
            <TextFontSelector element={element} onUpdate={onUpdate} />
          </div>

          {/* سمك الخط وحجم الخط */}
          <div className="grid grid-cols-2 gap-2">
            {/* سمك الخط Dropdown */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground block">
                سماكة الخط
              </span>
              <div className="relative">
                <select
                  value={element.fontWeight || 700}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    loadGoogleFont(element.fontFamily || "Cairo");
                    onUpdate(element.id, { fontWeight: val });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="w-full h-8 bg-background/90 hover:bg-background border border-border/60 hover:border-primary/50 focus:border-primary rounded-lg px-2.5 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-2xs"
                >
                  {WEIGHT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* حجم الخط Stepper */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">
                  حجم الخط
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeSlider(!showSizeSlider)}
                  className="text-[9.5px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Sliders className="w-2.5 h-2.5" />
                  <span>{showSizeSlider ? "إخفاء" : "مؤشر"}</span>
                </button>
              </div>
              <div className="flex items-center justify-between h-8 bg-background/90 border border-border/60 rounded-lg px-1.5 shadow-2xs">
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={fontSizeInput}
                    onChange={(e) => setFontSizeInput(e.target.value)}
                    onBlur={() => commitFontSize(fontSizeInput)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitFontSize(fontSizeInput);
                      }
                    }}
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
          </div>

          {/* منزلق حجم الخط التفاعلي الاختياري */}
          {showSizeSlider && (
            <div className="p-2 bg-muted/30 border border-border/40 rounded-lg space-y-1 animate-in fade-in duration-150">
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>8px</span>
                <span className="font-bold text-foreground">{currentFontSize}px</span>
                <span>200px</span>
              </div>
              <Slider
                value={[currentFontSize]}
                min={8}
                max={200}
                step={1}
                onValueChange={(val) => {
                  onUpdate(element.id, { fontSize: val[0] });
                  setFontSizeInput(String(val[0]));
                }}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-1"
              />
            </div>
          )}

          {/* تباعد الأسطر والكلمات */}
          <div className="grid grid-cols-2 gap-2">
            {/* تباعد الأسطر */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground block">
                ارتفاع الأسطر
              </span>
              <div className="flex items-center justify-between h-8 bg-background/90 border border-border/60 rounded-lg px-2 shadow-2xs">
                <span className="text-[10.5px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                  <MoveVertical className="w-3 h-3 text-primary/70" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeLineHeight(-0.1)}
                    className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                    title="تقليل تباعد الأسطر"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </button>
                  <span className="w-7 text-center text-[11px] font-bold text-foreground font-mono">
                    {currentLineHeight}x
                  </span>
                  <button
                    type="button"
                    onClick={() => changeLineHeight(0.1)}
                    className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                    title="زيادة تباعد الأسطر"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* تباعد الكلمات/الحروف */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground block">
                {isArabic ? "تباعد الكلمات" : "تباعد الحروف"}
              </span>
              <div className="flex items-center justify-between h-8 bg-background/90 border border-border/60 rounded-lg px-2 shadow-2xs">
                <span className="text-[10.5px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                  <MoveHorizontal className="w-3 h-3 text-primary/70" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const minSpacing = isArabic ? 0 : -5;
                      const next = Math.max(minSpacing, (element.letterSpacing ?? 0) - 1);
                      onUpdate(element.id, { letterSpacing: next });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-4.5 h-4.5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                    title="تقليل التباعد"
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
                    title="زيادة التباعد"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* شريط النمط والمحاذاة (Fluent Segmented Bar) */}
          <div className="flex items-center justify-between p-1 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50 shadow-2xs">
            {/* أزرار النمط */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  const nextWeight = isBold ? 400 : 700;
                  loadGoogleFont(element.fontFamily || "Cairo");
                  onUpdate(element.id, { fontWeight: nextWeight });
                  useEditorStore.getState().pushHistory();
                }}
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs font-bold",
                  isBold
                    ? "bg-background text-foreground shadow-xs font-extrabold"
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
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                  isItalic
                    ? "bg-background text-foreground shadow-xs font-extrabold"
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
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                  isUnderline
                    ? "bg-background text-foreground shadow-xs font-extrabold"
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
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                  isLineThrough
                    ? "bg-background text-foreground shadow-xs font-extrabold"
                    : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                )}
                title="شطب (Strikethrough)"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            {/* أزرار المحاذاة */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  onUpdate(element.id, { textAlign: "right" });
                  useEditorStore.getState().pushHistory();
                }}
                className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                  textAlign === "right"
                    ? "bg-background text-foreground shadow-xs font-extrabold"
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
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                  textAlign === "center"
                    ? "bg-background text-foreground shadow-xs font-extrabold"
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
                  "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs",
                  textAlign === "left"
                    ? "bg-background text-foreground shadow-xs font-extrabold"
                    : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                )}
                title="محاذاة لليسار"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            {/* زر الأرقام المشرقية */}
            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { arabicNumerals: !isArabicNumerals });
                useEditorStore.getState().pushHistory();
              }}
              className={cn(
                "h-7 px-2 rounded-md flex items-center justify-center gap-0.5 transition-all cursor-pointer text-[10px] font-bold",
                isArabicNumerals
                  ? "bg-background text-foreground shadow-xs font-extrabold"
                  : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
              )}
              title="تحويل الأرقام إلى (١ ٢ ٣)"
            >
              <Hash className="w-3 h-3" />
              <span>١٢٣</span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* تبويب 2: الألوان والتعبئة (Colors & Gradients) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "color" && (
        <div className="bg-card/60 dark:bg-card/35 border border-border/60 backdrop-blur-xl rounded-xl p-3 space-y-3 shadow-xs animate-in fade-in duration-150">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span>لون وتعبئة النص</span>
              </span>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-7 px-2.5 rounded-lg border border-border/80 bg-background hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0"
                    title="تغيير لون وتعبئة النص"
                  >
                    <div
                      className="w-4 h-4 rounded-md border border-black/10 dark:border-white/10 shadow-2xs"
                      style={{
                        background:
                          element.fillType === "linear" || element.fillType === "radial"
                            ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                            : element.color || "#000000",
                      }}
                    />
                    <span className="text-[10px] font-bold font-mono text-muted-foreground">
                      {element.fillType === "linear" ? "تدرج خطي" : element.fillType === "radial" ? "تدرج دائري" : (element.color || "#000000").toUpperCase()}
                    </span>
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

            {/* باليت ألوان استوديو سريعة */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-muted-foreground block">
                ألوان الاستوديو المقترحة
              </span>
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {STUDIO_PALETTE.map((c) => {
                  const isCurrent = (element.color || "#000000").toLowerCase() === c.color.toLowerCase() && (element.fillType === "solid" || !element.fillType);
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        onUpdate(element.id, { color: c.color, fillType: "solid" });
                        useEditorStore.getState().pushHistory();
                      }}
                      className={cn(
                        "h-8 rounded-lg border p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 px-2",
                        isCurrent ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border/60 bg-background/60 hover:bg-background"
                      )}
                      title={c.label}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center shadow-2xs" 
                        style={{ backgroundColor: c.color }} 
                      >
                        {isCurrent && (
                          <Check className={cn("w-2.5 h-2.5", c.color === "#ffffff" ? "text-black" : "text-white")} />
                        )}
                      </div>
                      <span className="text-[10px] font-bold truncate text-foreground/80">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* تبويب 3: التأثيرات والشارات والأختام (Effects & Badges) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "effects" && (
        <div className="bg-card/60 dark:bg-card/35 border border-border/60 backdrop-blur-xl rounded-xl p-3 space-y-2.5 shadow-xs animate-in fade-in duration-150">
          
          {/* صف 1: خلفية وشارة النص */}
          <div className="flex items-center justify-between h-9 px-2.5 rounded-lg bg-background/50 hover:bg-background/80 border border-border/40 transition-colors">
            <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
              <PaintBucket className="w-3.5 h-3.5 text-primary/80" />
              <span>شارة وخلفية</span>
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
                  <div className="flex items-center h-6.5 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="استدارة الحواف (Radius)">
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
                    <span className="text-[9px] font-bold font-mono text-foreground w-3.5 text-center">
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

                  {/* حشو وهوامش الخلفية Stepper */}
                  <div className="flex items-center h-6.5 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="حشو وهوامش الخلفية (Padding)">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, (element.textBgPadding ?? 6) - 2);
                        onUpdate(element.id, { textBgPadding: next, textBgPaddingX: next, textBgPaddingY: next });
                        useEditorStore.getState().pushHistory();
                      }}
                      className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Minus className="w-2 h-2" />
                    </button>
                    <span className="text-[9px] font-bold font-mono text-foreground w-3.5 text-center">
                      {element.textBgPadding ?? 6}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(40, (element.textBgPadding ?? 6) + 2);
                        onUpdate(element.id, { textBgPadding: next, textBgPaddingX: next, textBgPaddingY: next });
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
                      textBgPaddingX: element.textBgPaddingX ?? 6,
                      textBgPaddingY: element.textBgPaddingY ?? 6,
                    });
                  }
                  useEditorStore.getState().pushHistory();
                }}
                className={cn(
                  "h-6.5 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                  hasBadge
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                {hasBadge ? "مفعّلة" : "إضافة"}
              </button>
            </div>
          </div>

          {/* صف 2: إطار وحدود النص */}
          <div className="flex items-center justify-between h-9 px-2.5 rounded-lg bg-background/50 hover:bg-background/80 border border-border/40 transition-colors">
            <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5 text-primary/80" />
              <span>إطار وحدود</span>
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
                  <div className="flex items-center h-6.5 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="سمك الإطار">
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
                  "h-6.5 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                  hasStroke
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                {hasStroke ? "مفعّل" : "إضافة"}
              </button>
            </div>
          </div>

          {/* صف 3: ظل وتوهج النص */}
          <div className="flex items-center justify-between h-9 px-2.5 rounded-lg bg-background/50 hover:bg-background/80 border border-border/40 transition-colors">
            <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary/80" />
              <span>ظل وتوهج</span>
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
                  <div className="flex items-center h-6.5 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="تمويه الظل (Blur)">
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
                  "h-6.5 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                  hasShadow
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                {hasShadow ? "مفعّل" : "إضافة"}
              </button>
            </div>
          </div>

          {/* صف 4: تقويس النص (Curved Text) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between h-9 px-2.5 rounded-lg bg-background/50 hover:bg-background/80 border border-border/40 transition-colors">
              <span className="text-[11px] font-bold text-foreground/85 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-primary/80" />
                <span>تقويس النص</span>
              </span>

              <div className="flex items-center gap-1.5">
                {hasCurve && (
                  <div className="flex items-center h-6.5 bg-background border border-border/60 rounded-md px-1 gap-0.5 shadow-2xs" title="درجة انحناء القوس">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(-100, (element.curve ?? 60) - 10);
                        onUpdate(element.id, { curve: next });
                        useEditorStore.getState().pushHistory();
                      }}
                      className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      title="تقليل الانحناء"
                    >
                      <Minus className="w-2 h-2" />
                    </button>
                    <span className="text-[9.5px] font-bold font-mono text-foreground w-6 text-center">
                      {element.curve ?? 60}°
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(100, (element.curve ?? 60) + 10);
                        onUpdate(element.id, { curve: next });
                        useEditorStore.getState().pushHistory();
                      }}
                      className="w-3.5 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      title="زيادة الانحناء"
                    >
                      <Plus className="w-2 h-2" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (hasCurve) {
                      onUpdate(element.id, { curve: 0 });
                    } else {
                      onUpdate(element.id, { curve: 60 });
                    }
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "h-6.5 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs",
                    hasCurve
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  {hasCurve ? "مفعّل" : "إضافة"}
                </button>
              </div>
            </div>

            {/* منزلق انحناء القوس المباشر عند التفعيل */}
            {hasCurve && (
              <div className="p-2.5 bg-muted/30 border border-border/40 rounded-lg space-y-1.5 animate-in fade-in duration-150">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                  <span>-100° (مقعر)</span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate(element.id, { curve: 0 });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="px-1.5 py-0.5 bg-background border border-border/60 hover:border-primary/40 rounded text-[9.5px] text-foreground font-bold cursor-pointer flex items-center gap-1"
                    title="استقامة النص"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>تصفير</span>
                  </button>
                  <span>+100° (محدب)</span>
                </div>
                <Slider
                  value={[element.curve ?? 60]}
                  min={-100}
                  max={100}
                  step={5}
                  onValueChange={(val) => onUpdate(element.id, { curve: val[0] })}
                  onPointerUp={() => useEditorStore.getState().pushHistory()}
                  className="py-1"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

