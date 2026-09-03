import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import {
  TextHOne,
  TextHTwo,
  Article,
  Tag,
  Stamp,
  CaretDown,
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextAlignRight,
  TextAlignCenter,
  TextAlignLeft,
  Hash,
  ArrowsInLineHorizontal,
  ArrowsInLineVertical,
  ArrowsHorizontal,
} from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import { TextFontSelector } from "./text-font-selector";
import { loadGoogleFont } from "@/lib/io/fonts";
import { TextTabProps, WEIGHT_OPTIONS } from "./text-tab-types";

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

const selectClassName =
  "w-full h-8 bg-input hover:bg-background border border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md px-2 text-xs font-bold text-foreground cursor-pointer appearance-none outline-hidden transition-all shadow-inner";

export function TextTypeTab({ element, onUpdate }: TextTabProps) {
  const isBold = (element.fontWeight || 400) >= 700;
  const isItalic = element.fontStyle === "italic";
  const isUnderline = element.textDecoration === "underline";
  const isLineThrough = element.textDecoration === "line-through";
  const textAlign = element.textAlign || "center";
  const isArabicNumerals = element.arabicNumerals === true;
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(element.text || "");

  const currentFontSize = element.fontSize ?? 32;
  const currentLineHeight = element.lineHeight ?? 1.2;
  const currentSpacing = element.letterSpacing ?? 0;

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

  const toggleButtonClassName = (active: boolean) =>
    cn(
      "w-7.5 h-7.5 rounded-md flex items-center justify-center transition-all cursor-pointer text-xs font-bold active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none select-none",
      active
        ? "bg-background text-primary shadow-xs font-extrabold"
        : "hover:bg-background/60 text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150">

      {/* 🎴 بطاقة 1: نوع الخط والقياسات */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5 shadow-xs fluent-specular">
        {/* النمط السريع */}
        <div className="grid grid-cols-5 gap-1 text-[10px]">
          {[
            { id: "heading" as const, label: "رئيسي", icon: TextHOne },
            { id: "subheading" as const, label: "فرعي", icon: TextHTwo },
            { id: "body" as const, label: "عادي", icon: Article },
            { id: "badge" as const, label: "شارة", icon: Tag },
            { id: "stamp" as const, label: "ختم", icon: Stamp },
          ].map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="h-7 px-1 bg-input hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border rounded-md text-muted-foreground font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none truncate"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" weight="bold" />
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
                className={selectClassName}
              >
                {WEIGHT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <CaretDown className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" weight="bold" />
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
                className={`${selectClassName} font-mono`}
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
              <CaretDown className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" weight="bold" />
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
              className={toggleButtonClassName(isBold)}
              title="عريض (B)"
            >
              <TextB className="w-4 h-4" weight={isBold ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { fontStyle: isItalic ? "normal" : "italic" });
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(isItalic)}
              title="مائل (I)"
            >
              <TextItalic className="w-4 h-4" weight={isItalic ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textDecoration: isUnderline ? "none" : "underline" });
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(isUnderline)}
              title="تسطير (U)"
            >
              <TextUnderline className="w-4 h-4" weight={isUnderline ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textDecoration: isLineThrough ? "none" : "line-through" });
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(isLineThrough)}
              title="شطب (S)"
            >
              <TextStrikethrough className="w-4 h-4" weight={isLineThrough ? "bold" : "regular"} />
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
              className={toggleButtonClassName(textAlign === "right")}
              title="يمين"
            >
              <TextAlignRight className="w-4 h-4" weight={textAlign === "right" ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textAlign: "center" });
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(textAlign === "center")}
              title="توسيط"
            >
              <TextAlignCenter className="w-4 h-4" weight={textAlign === "center" ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              onClick={() => {
                onUpdate(element.id, { textAlign: "left" });
                useEditorStore.getState().pushHistory();
              }}
              className={toggleButtonClassName(textAlign === "left")}
              title="يسار"
            >
              <TextAlignLeft className="w-4 h-4" weight={textAlign === "left" ? "bold" : "regular"} />
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
            <Hash className="w-3 h-3" weight={isArabicNumerals ? "bold" : "regular"} />
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
            <ArrowsInLineHorizontal className="w-3 h-3" weight="bold" />
            <span>ملاءمة العرض</span>
          </button>
        </div>
      </div>

      {/* 🎴 بطاقة 3: التباعد والمسافات */}
      <div className="bg-card border border-border/80 dark:border-white/10 rounded-xl p-3 space-y-2 shadow-xs fluent-specular">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
              <ArrowsInLineVertical className="w-3 h-3 text-primary/70" weight="regular" />
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
              <CaretDown className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" weight="bold" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
              <ArrowsHorizontal className="w-3 h-3 text-primary/70" weight="regular" />
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
              <CaretDown className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" weight="bold" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
