import React, { useState } from "react";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import {
  TextCaseUppercase16Regular,
  Color16Regular,
  Sparkle16Regular,
  TextHeader120Regular,
  TextHeader220Regular,
  Document16Regular,
  Target16Regular,
  ArrowClockwise16Regular,
  ChevronDown12Regular,
  TextBold16Regular,
  TextItalic16Regular,
  TextUnderline16Regular,
  TextStrikethrough16Regular,
  TextAlignRight16Regular,
  TextAlignCenter16Regular,
  TextAlignLeft16Regular,
  NumberSymbol16Regular,
  ArrowAutofitContent20Regular,
  TextLineSpacing16Regular,
  TextWordCount20Regular,
  Eye12Regular,
  Checkmark12Regular,
  Square16Regular,
  ArrowReset20Regular,
} from "@fluentui/react-icons";
import { PopoverColorPicker } from "../shared-controls";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GradientPicker, gradientAngleFromPoints, gradientPointsFromAngle } from "../gradient-picker";
import { Slider } from "@/components/ui/slider";

// Sub-components
import { TextFontSelector } from "./text/text-font-selector";
import { loadGoogleFont } from "@/lib/io/fonts";

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

const WEIGHT_OPTIONS = [
  { value: 100, label: "رفيع 100" },
  { value: 200, label: "خفيف 200" },
  { value: 300, label: "ناعم 300" },
  { value: 400, label: "عادي 400" },
  { value: 500, label: "متوسط 500" },
  { value: 600, label: "شبه عريض 600" },
  { value: 700, label: "عريض 700" },
  { value: 800, label: "ثقيل 800" },
  { value: 900, label: "أسود 900" },
];

const MODULAR_FONT_SIZES = [
  10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 144, 180, 200
];

const LINE_HEIGHT_OPTIONS = [
  { value: 0.9, label: "0.9x" },
  { value: 1.0, label: "1.0x" },
  { value: 1.1, label: "1.1x" },
  { value: 1.2, label: "1.2x (افتراضي)" },
  { value: 1.3, label: "1.3x" },
  { value: 1.4, label: "1.4x" },
  { value: 1.5, label: "1.5x" },
  { value: 1.8, label: "1.8x" },
  { value: 2.0, label: "2.0x" },
];

const LETTER_SPACING_OPTIONS = [
  { value: -2, label: "-2px" },
  { value: -1, label: "-1px" },
  { value: 0, label: "0px (افتراضي)" },
  { value: 1, label: "+1px" },
  { value: 2, label: "+2px" },
  { value: 4, label: "+4px" },
  { value: 6, label: "+6px" },
  { value: 8, label: "+8px" },
  { value: 12, label: "+12px" },
  { value: 16, label: "+16px" },
];

const STUDIO_PALETTE = [
  { label: "أبيض", color: "#ffffff" },
  { label: "أسود", color: "#000000" },
  { label: "أزرق", color: "#2563eb" },
  { label: "ذهبي", color: "#d97706" },
  { label: "زمردي", color: "#059669" },
  { label: "أحمر", color: "#dc2626" },
  { label: "بنفسجي", color: "#7c3aed" },
  { label: "رمادي", color: "#4b5563" },
];

const SHADOW_PRESETS = [
  { id: "none", label: "بدون", color: "#000000", blur: 0, ox: 0, oy: 0, opacity: 0 },
  { id: "soft", label: "ناعم", color: "#000000", blur: 10, ox: 0, oy: 3, opacity: 0.35 },
  { id: "drop", label: "ساقط", color: "#000000", blur: 14, ox: 4, oy: 4, opacity: 0.6 },
  { id: "neon", label: "توهج", color: "#38bdf8", blur: 22, ox: 0, oy: 0, opacity: 0.9 },
  { id: "3d", label: "3D", color: "#000000", blur: 2, ox: 3, oy: 3, opacity: 0.85 },
];

const CURVE_PRESETS = [
  { label: "0°", value: 0 },
  { label: "30°", value: 30 },
  { label: "60°", value: 60 },
  { label: "-60°", value: -60 },
  { label: "100°", value: 100 },
];

type TextSubTab = "type" | "color" | "effects";

export function TextProperties({ element, onUpdate }: TextPropertiesProps) {
  const [activeTab, setActiveTab] = useState<TextSubTab>("type");

  const isBold = (element.fontWeight || 400) >= 700;
  const isItalic = element.fontStyle === "italic";
  const isUnderline = element.textDecoration === "underline";
  const isLineThrough = element.textDecoration === "line-through";
  const textAlign = element.textAlign || "center";
  const textTransform = element.textTransform || "none";
  const isArabicNumerals = element.arabicNumerals === true;
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(element.text || "");

  const hasStroke = (element.strokeWidth ?? 0) > 0;
  const hasShadow = (element.shadowBlur ?? 0) > 0 || (element.shadowOpacity ?? 0) > 0;
  const hasBadge = !!element.textBgColor && element.textBgColor !== "transparent";
  const hasCurve = typeof element.curve === "number" && element.curve !== 0;

  const currentFontSize = element.fontSize ?? 32;
  const currentLineHeight = element.lineHeight ?? 1.2;
  const currentSpacing = element.letterSpacing ?? 0;
  const currentOpacity = Math.round((element.opacity ?? 1) * 100);

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
        textBgPaddingX: 12,
        textBgPaddingY: 6,
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
      {/* شريط التبويبات الثلاثي (Fluent 2 Segmented Tabs) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-1 bg-muted/60 dark:bg-muted/30 p-1 rounded-lg border border-border/40 font-cairo shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("type")}
          className={cn(
            "h-8 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
            activeTab === "type"
              ? "bg-background text-primary shadow-xs font-extrabold border border-border/80 ring-1 ring-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40 active:scale-95"
          )}
        >
          <TextCaseUppercase16Regular className="w-3.5 h-3.5" />
          <span>الخط والنمط</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("color")}
          className={cn(
            "h-8 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
            activeTab === "color"
              ? "bg-background text-primary shadow-xs font-extrabold border border-border/80 ring-1 ring-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40 active:scale-95"
          )}
        >
          <Color16Regular className="w-3.5 h-3.5" />
          <span>الألوان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("effects")}
          className={cn(
            "h-8 px-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 relative focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
            activeTab === "effects"
              ? "bg-background text-primary shadow-xs font-extrabold border border-border/80 ring-1 ring-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-background/40 active:scale-95"
          )}
        >
          <Sparkle16Regular className="w-3.5 h-3.5" />
          {/* تمييز الاسم عن تبويب "التأثيرات والظلال" الخارجي لتفادي الالتباس */}
          <span>الظلال والتقويس</span>
          {(hasBadge || hasStroke || hasShadow || hasCurve) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-1.5 left-2" />
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* تبويب 1: الخط والطباعة (Cards Architecture) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "type" && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          
          {/* 🎴 بطاقة 1: نوع الخط والقياسات */}
          <div className="bg-card border border-border rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            {/* النمط السريع */}
            <div className="grid grid-cols-5 gap-1 text-[10px]">
              {[
                { id: "heading" as const, label: "رئيسي", icon: TextHeader120Regular },
                { id: "subheading" as const, label: "فرعي", icon: TextHeader220Regular },
                { id: "body" as const, label: "عادي", icon: Document16Regular },
                { id: "badge" as const, label: "شارة", icon: Target16Regular },
                { id: "stamp" as const, label: "ختم", icon: ArrowClockwise16Regular },
              ].map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className="h-7 px-1 bg-input hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border rounded-md text-muted-foreground font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none truncate"
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* نوع الخط */}
            <div className="space-y-1">
              <TextFontSelector element={element} onUpdate={onUpdate} />
            </div>

            {/* سماكة وحجم الخط */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground block">
                  السمك
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
                    className="w-full h-8 bg-input hover:bg-background border border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md px-2 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-inner"
                  >
                    {WEIGHT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown12Regular className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    الحجم
                  </span>
                  <span className="text-[10px] font-bold font-mono text-primary">{currentFontSize}px</span>
                </div>
                <div className="relative">
                  <select
                    value={currentFontSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdate(element.id, { fontSize: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-full h-8 bg-input hover:bg-background border border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md px-2 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-inner font-mono"
                  >
                    {!MODULAR_FONT_SIZES.includes(currentFontSize) && (
                      <option value={currentFontSize}>
                        {currentFontSize}px
                      </option>
                    )}
                    {MODULAR_FONT_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}px
                      </option>
                    ))}
                  </select>
                  <ChevronDown12Regular className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* مؤشر الحجم السريع */}
            <div className="p-2 bg-muted/20 border border-border/40 rounded-lg space-y-1">
              <div className="flex justify-between text-[9.5px] text-muted-foreground font-mono">
                <span>8px</span>
                <span className="font-bold text-foreground">{currentFontSize}px</span>
                <span>200px</span>
              </div>
              <Slider
                value={[currentFontSize]}
                min={8}
                max={200}
                step={1}
                onValueChange={(val) => onUpdate(element.id, { fontSize: val[0] })}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-0.5"
              />
            </div>
          </div>

          {/* 🎴 بطاقة 2: التنسيق والمحاذاة */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2 shadow-xs fluent-specular">
            {/* الصف 1: التنسيقات والمحاذاة والأرقام */}
            <div className="flex items-center justify-between p-1 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border/50 shadow-2xs">
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
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs font-bold active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    isBold
                       ? "bg-background text-primary shadow-xs font-extrabold"
                       : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="عريض (B)"
                >
                  <TextBold16Regular className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { fontStyle: isItalic ? "normal" : "italic" });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    isItalic
                      ? "bg-background text-primary shadow-xs font-extrabold"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="مائل (I)"
                >
                  <TextItalic16Regular className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { textDecoration: isUnderline ? "none" : "underline" });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    isUnderline
                      ? "bg-background text-primary shadow-xs font-extrabold"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="تسطير (U)"
                >
                  <TextUnderline16Regular className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { textDecoration: isLineThrough ? "none" : "line-through" });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    isLineThrough
                      ? "bg-background text-primary shadow-xs font-extrabold"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="شطب (S)"
                >
                  <TextStrikethrough16Regular className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-4 bg-border/60 mx-0.5" />

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { textAlign: "right" });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    textAlign === "right"
                      ? "bg-background text-primary shadow-xs font-extrabold"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="يمين"
                >
                  <TextAlignRight16Regular className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { textAlign: "center" });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    textAlign === "center"
                      ? "bg-background text-primary shadow-xs font-extrabold"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="توسيط"
                >
                  <TextAlignCenter16Regular className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, { textAlign: "left" });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                    textAlign === "left"
                      ? "bg-background text-primary shadow-xs font-extrabold"
                      : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  )}
                  title="يسار"
                >
                  <TextAlignLeft16Regular className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-4 bg-border/60 mx-0.5" />

              <button
                type="button"
                onClick={() => {
                  onUpdate(element.id, { arabicNumerals: !isArabicNumerals });
                  useEditorStore.getState().pushHistory();
                }}
                className={cn(
                  "h-7 px-2 rounded-md flex items-center justify-center gap-0.5 transition-all cursor-pointer text-[10px] font-bold active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
                  isArabicNumerals
                    ? "bg-background text-primary shadow-xs font-extrabold"
                    : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
                )}
                title="أرقام عربية (١٢٣)"
              >
                <NumberSymbol16Regular className="w-3 h-3" />
                <span>١٢٣</span>
              </button>
            </div>

            {/* الصف 2: حالة الأحرف وملاءمة العرض */}
            <div className="flex items-center justify-between p-1 bg-muted/25 rounded-lg border border-border/40 text-[10px] font-semibold">
              <div className="flex items-center gap-1">
                {[
                  { id: "none", label: "Aa" },
                  { id: "uppercase", label: "AA" },
                  { id: "lowercase", label: "aa" },
                  { id: "capitalize", label: "Abc" },
                ].map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      onUpdate(element.id, { textTransform: tr.id as "none" | "uppercase" | "lowercase" | "capitalize" });
                      useEditorStore.getState().pushHistory();
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                      element.textTransform === tr.id
                        ? "bg-background text-primary shadow-2xs font-extrabold"
                        : "hover:text-foreground text-muted-foreground hover:bg-background/40"
                    )}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => useEditorStore.getState().autoFitTextWidth(element.id)}
                className="px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md text-[9.5px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                title="ملاءمة عرض الصندوق للنص تلقائياً"
              >
                <ArrowAutofitContent20Regular className="w-3 h-3" />
                <span>ملاءمة العرض</span>
              </button>
            </div>
          </div>

          {/* 🎴 بطاقة 3: التباعد والمسافات */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2 shadow-xs fluent-specular">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <TextLineSpacing16Regular className="w-3 h-3 text-primary/70" />
                  <span>ارتفاع الأسطر</span>
                </span>
                <div className="relative">
                  <select
                    value={currentLineHeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdate(element.id, { lineHeight: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-full h-8 bg-background/90 hover:bg-background border border-border/60 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md px-2 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-2xs font-mono"
                  >
                    {!LINE_HEIGHT_OPTIONS.some((o) => o.value === currentLineHeight) && (
                      <option value={currentLineHeight}>
                        {currentLineHeight}x
                      </option>
                    )}
                    {LINE_HEIGHT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown12Regular className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                  <TextWordCount20Regular className="w-3 h-3 text-primary/70" />
                  <span>{isArabic ? "تباعد الكلمات" : "تباعد الحروف"}</span>
                </span>
                <div className="relative">
                  <select
                    value={currentSpacing}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdate(element.id, { letterSpacing: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    className="w-full h-8 bg-background/90 hover:bg-background border border-border/60 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md px-2 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-2xs font-mono"
                  >
                    {!LETTER_SPACING_OPTIONS.some((o) => o.value === currentSpacing) && (
                      <option value={currentSpacing}>
                        {currentSpacing}px
                      </option>
                    )}
                    {LETTER_SPACING_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown12Regular className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* تبويب 2: الألوان والتعبئة (Colors & Gradients) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "color" && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          {/* 🎴 بطاقة 1: لون النص والتعبئة */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Color16Regular className="w-3.5 h-3.5 text-primary" />
                <span>لون النص والتعبئة</span>
              </span>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 px-2.5 rounded-md border border-border/80 bg-background hover:border-primary/60 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
                      {element.fillType === "linear" ? "خطي" : element.fillType === "radial" ? "دائري" : (element.color || "#000000").toUpperCase()}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-72 sm:w-80 p-3 font-cairo shadow-lg rounded-xl border-border/60 fluent-specular z-50 overflow-hidden">
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
          </div>

          {/* 🎴 بطاقة 2: الشفافية والألوان السريعة */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            {/* الشفافية */}
            <div className="space-y-1 p-2 bg-muted/20 rounded-lg border border-border/30">
              <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye12Regular className="w-3 h-3 text-primary/70" />
                  <span>الشفافية</span>
                </span>
                <span className="font-mono text-foreground font-bold">{currentOpacity}%</span>
              </div>
              <Slider
                value={[currentOpacity]}
                min={10}
                max={100}
                step={5}
                onValueChange={(val) => onUpdate(element.id, { opacity: val[0] / 100 })}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="py-1"
              />
            </div>

            {/* ألوان سريعة */}
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
                      "h-7 rounded-md border p-1 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 px-2",
                      isCurrent ? "border-primary ring-2 ring-primary ring-offset-1 bg-primary/5" : "border-border/60 bg-background/60 hover:bg-background"
                    )}
                    title={c.label}
                  >
                    <div 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center shadow-2xs" 
                      style={{ backgroundColor: c.color }} 
                    >
                      {isCurrent && (
                        <Checkmark12Regular className={cn("w-2.5 h-2.5", c.color === "#ffffff" ? "text-black" : "text-white")} />
                      )}
                    </div>
                    <span className="text-[10px] font-bold truncate text-foreground/80">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* تبويب 3: التأثيرات والشارات والأختام (Effects & Badges) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "effects" && (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          
          {/* 🎴 بطاقة 1: الخلفية والشارة */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Color16Regular className="w-3.5 h-3.5 text-primary" />
                <span>الخلفية والشارة</span>
              </span>

              <div className="flex items-center gap-1.5">
                {hasBadge && (
                  <PopoverColorPicker
                    color={element.textBgColor || "#2563eb"}
                    onChange={(val: string) => {
                      onUpdate(element.id, { textBgColor: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    swatchOnly
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (hasBadge) {
                      onUpdate(element.id, { textBgColor: "transparent", textBgBorderWidth: 0 });
                    } else {
                      onUpdate(element.id, {
                        textBgColor: "#2563eb",
                        textBgRadius: element.textBgRadius ?? 8,
                        textBgPadding: element.textBgPadding ?? 8,
                        textBgPaddingX: element.textBgPaddingX ?? 12,
                        textBgPaddingY: element.textBgPaddingY ?? 6,
                      });
                    }
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "h-7 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    hasBadge
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  {hasBadge ? "مفعّلة" : "إضافة"}
                </button>
              </div>
            </div>

            {hasBadge && (
              <div className="space-y-2.5 pt-2 border-t border-border/30 animate-in fade-in duration-150">
                {/* تباعد أفقي X */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-semibold">أفقي (X)</span>
                    <span className="font-mono font-bold text-foreground">{element.textBgPaddingX ?? element.textBgPadding ?? 12}px</span>
                  </div>
                  <Slider
                    value={[element.textBgPaddingX ?? element.textBgPadding ?? 12]}
                    min={0}
                    max={48}
                    step={1}
                    onValueChange={(val) => onUpdate(element.id, { textBgPaddingX: val[0] })}
                    onPointerUp={() => useEditorStore.getState().pushHistory()}
                    className="py-0.5"
                  />
                </div>

                {/* تباعد عمودي Y */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-semibold">عمودي (Y)</span>
                    <span className="font-mono font-bold text-foreground">{element.textBgPaddingY ?? element.textBgPadding ?? 6}px</span>
                  </div>
                  <Slider
                    value={[element.textBgPaddingY ?? element.textBgPadding ?? 6]}
                    min={0}
                    max={36}
                    step={1}
                    onValueChange={(val) => onUpdate(element.id, { textBgPaddingY: val[0] })}
                    onPointerUp={() => useEditorStore.getState().pushHistory()}
                    className="py-0.5"
                  />
                </div>

                {/* الاستدارة */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-muted-foreground font-semibold">الاستدارة</span>
                    <span className="font-mono font-bold text-foreground">{element.textBgRadius ?? 8}px</span>
                  </div>
                  <Slider
                    value={[element.textBgRadius ?? 8]}
                    min={0}
                    max={64}
                    step={1}
                    onValueChange={(val) => onUpdate(element.id, { textBgRadius: val[0] })}
                    onPointerUp={() => useEditorStore.getState().pushHistory()}
                    className="py-0.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 🎴 بطاقة 2: الإطار والحدود */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Square16Regular className="w-3.5 h-3.5 text-primary" />
                <span>الإطار والحدود</span>
              </span>

              <div className="flex items-center gap-1.5">
                {hasStroke && (
                  <PopoverColorPicker
                    color={element.stroke || "#000000"}
                    onChange={(val: string) => {
                      onUpdate(element.id, { stroke: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    swatchOnly
                  />
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
                    "h-7 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    hasStroke
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  {hasStroke ? "مفعّل" : "إضافة"}
                </button>
              </div>
            </div>

            {hasStroke && (
              <div className="space-y-1 pt-2 border-t border-border/30 animate-in fade-in duration-150">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground font-semibold">السمك</span>
                  <span className="font-mono font-bold text-foreground">{element.strokeWidth ?? 2}px</span>
                </div>
                <Slider
                  value={[element.strokeWidth ?? 2]}
                  min={0.5}
                  max={20}
                  step={0.5}
                  onValueChange={(val) => onUpdate(element.id, { strokeWidth: val[0] })}
                  onPointerUp={() => useEditorStore.getState().pushHistory()}
                  className="py-0.5"
                />
              </div>
            )}
          </div>

          {/* 🎴 بطاقة 3: الظل والتوهج */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <Sparkle16Regular className="w-3.5 h-3.5 text-primary" />
                <span>الظل والتوهج</span>
              </span>

              <div className="flex items-center gap-1.5">
                {hasShadow && (
                  <PopoverColorPicker
                    color={element.shadowColor || "#000000"}
                    onChange={(val: string) => {
                      onUpdate(element.id, { shadowColor: val });
                      useEditorStore.getState().pushHistory();
                    }}
                    swatchOnly
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (hasShadow) {
                      onUpdate(element.id, { shadowBlur: 0, shadowOpacity: 0 });
                    } else {
                      onUpdate(element.id, { 
                        shadowColor: element.shadowColor || "#000000",
                        shadowBlur: 10,
                        shadowOpacity: 0.5,
                        shadowOffsetX: 2,
                        shadowOffsetY: 2,
                      });
                    }
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn(
                    "h-7 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    hasShadow
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  {hasShadow ? "مفعّل" : "إضافة"}
                </button>
              </div>
            </div>

            {/* أنماط سريعة */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[10px]">
              {SHADOW_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onUpdate(element.id, {
                      shadowColor: p.color,
                      shadowBlur: p.blur,
                      shadowOffsetX: p.ox,
                      shadowOffsetY: p.oy,
                      shadowOpacity: p.opacity,
                    });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="px-2 py-0.5 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/50 rounded-md text-muted-foreground text-[9.5px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {hasShadow && (
              <div className="space-y-1.5 pt-2 border-t border-border/30 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground font-semibold">التمويه</span>
                  <span className="font-mono font-bold">{element.shadowBlur ?? 10}px</span>
                </div>
                <Slider
                  value={[element.shadowBlur ?? 10]}
                  min={0}
                  max={40}
                  step={2}
                  onValueChange={(val) => onUpdate(element.id, { shadowBlur: val[0] })}
                  onPointerUp={() => useEditorStore.getState().pushHistory()}
                  className="py-0.5"
                />
              </div>
            )}
          </div>

          {/* 🎴 بطاقة 4: تقويس النص */}
          <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground/90 flex items-center gap-1.5">
                <ArrowClockwise16Regular className="w-3.5 h-3.5 text-primary" />
                <span>تقويس النص</span>
              </span>

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
                  "h-7 px-2.5 rounded-md border text-[9.5px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                  hasCurve
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                {hasCurve ? "مفعّل" : "إضافة"}
              </button>
            </div>

            {hasCurve && (
              <div className="space-y-2 pt-2 border-t border-border/30 animate-in fade-in duration-150">
                {/* زوايا جاهزة */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[10px]">
                  {CURVE_PRESETS.map((cp) => (
                    <button
                      key={cp.label}
                      type="button"
                      onClick={() => {
                        onUpdate(element.id, { curve: cp.value });
                        useEditorStore.getState().pushHistory();
                      }}
                      className={cn(
                        "px-1.5 py-0.5 rounded-md border text-[9px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                        (element.curve ?? 0) === cp.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-primary/10 text-muted-foreground border-border/50"
                      )}
                    >
                      {cp.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                    <span>-100°</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdate(element.id, { curve: 0 });
                        useEditorStore.getState().pushHistory();
                      }}
                      className="px-1.5 py-0.5 bg-background border border-border/60 hover:border-primary/40 rounded-md text-[9px] text-foreground font-bold cursor-pointer flex items-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                      title="استقامة"
                    >
                      <ArrowReset20Regular className="w-2.5 h-2.5" />
                      <span>تصفير</span>
                    </button>
                    <span>+100°</span>
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
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
