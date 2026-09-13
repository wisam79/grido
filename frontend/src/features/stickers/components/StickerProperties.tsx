import React from "react";
import {
  Palette,
  Printer,
  ArrowCounterClockwise,
  Scissors,
  Sparkle,
  QrCode,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FluentSection, FluentSliderField, FluentSegmentedControl } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";
import { StickerTemplate, StickerParams, SheetGridConfig, StickerFinish } from "../types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CURATED_PALETTES } from "../constants";
import { StickerFontSelector } from "./StickerFontSelector";

interface StickerPropertiesProps {
  template: StickerTemplate;
  params: StickerParams;
  onChangeParams: (updater: (prev: StickerParams) => StickerParams) => void;
  onResetDefaults: () => void;
  gridConfig: SheetGridConfig;
  onChangeGridConfig: (config: SheetGridConfig | ((prev: SheetGridConfig) => SheetGridConfig)) => void;
  /** حقول بلا عنصر مرئي في المعاينة (كمربع النص المولّد من الرابط) — تبقى وحدها في نموذج المفتش */
  hiddenFieldIds?: string[];
}

const FINISH_OPTIONS: { id: StickerFinish; label: string }[] = [
  { id: "standard", label: "عادي" },
  { id: "glossy", label: "لامع" },
  { id: "matte", label: "مطفي" },
  { id: "holographic", label: "هولوغرام" },
];

interface ColorRoleButtonProps {
  label: string;
  color: string;
  disabled?: boolean;
  active?: boolean;
  onChange: (color: string) => void;
}

function ColorRoleButton({ label, color, disabled, onChange }: ColorRoleButtonProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-md bg-card/60 border transition-all",
        disabled
          ? "opacity-35 pointer-events-none border-border/40"
          : "border-border/40 hover:border-primary/60 cursor-pointer group"
      )}
      title={`${label}: ${color}`}
    >
      <div className="relative w-7 h-7 rounded-md border border-black/15 shadow-2xs overflow-hidden shrink-0">
        <span className="w-full h-full block" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color.startsWith("#") && color.length === 7 ? color : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title={label}
        />
      </div>
      <span className="text-[10px] font-semibold text-foreground/80">{label}</span>
    </div>
  );
}

export const StickerProperties = React.memo(function StickerProperties({
  template,
  params,
  onChangeParams,
  onResetDefaults,
  gridConfig,
  onChangeGridConfig,
  hiddenFieldIds = [],
}: StickerPropertiesProps) {
  const handleFieldChange = (fieldId: string, value: string) => {
    onChangeParams((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: value,
      },
    }));
  };

  const handleColorChange = (key: "primaryColor" | "secondaryColor" | "backgroundColor", color: string) => {
    onChangeParams((prev) => ({
      ...prev,
      [key]: color,
    }));
  };

  const currentMm = template.defaultMm || {
    width: 50,
    height: Math.round(50 / template.aspectRatio),
  };

  // الحقول بلا عنصر مرئي في المعاينة (تُصنّف كبيانات مولّدة مثل رابط QR)
  const hiddenFieldFields = template.fields.filter((f) => hiddenFieldIds.includes(f.id));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/20 select-none">
      {/* Template Header — بيانات القالب فقط، مرة واحدة */}
      <div className="flex items-center justify-between gap-3 p-3 border-b border-border/30 shrink-0 bg-muted/15">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-foreground truncate" title={template.name}>{template.name}</h3>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {currentMm.width} × {currentMm.height} مم • 300 DPI
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetDefaults}
          title="استعادة كل القيم الافتراضية"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer rounded-md hover:bg-muted/40 shrink-0"
        >
          <ArrowCounterClockwise className="w-3.5 h-3.5" />
          <span>استعادة</span>
        </Button>
      </div>

      {/* Inspector Body — Sections ordered: Content → Colors → Finish → Sheet */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-2.5 space-y-2.5">
        {/* 1. المحتوى — الحقول المخفية فقط (المرئية تُعدّل بالنقر المباشر) */}
        {hiddenFieldFields.length > 0 ? (
          <FluentSection
            icon={<QrCode className="w-3.5 h-3.5" weight="duotone" />}
            title="بيانات غير مرئية"
            subtitle="تُطبّق فوراً على الرمز المولّد"
            collapsible
            defaultOpen
          >
            {hiddenFieldFields.map((field) => {
              const val = params.fields[field.id] ?? field.defaultValue;
              const isModified = val !== field.defaultValue;
              return (
                <div key={field.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-foreground/85">{field.label}</Label>
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(field.id, field.defaultValue)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer"
                        title="استعادة النص الافتراضي"
                      >
                        <ArrowCounterClockwise className="w-2.5 h-2.5" />
                        <span>استعادة</span>
                      </button>
                    )}
                  </div>
                  <Input
                    value={val}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || field.label}
                    className="h-8 text-xs rounded-md bg-background/90 border-border/40 focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                  />
                </div>
              );
            })}
          </FluentSection>
        ) : null}

        {/* 1. الألوان */}
        <FluentSection
          icon={<Palette className="w-3.5 h-3.5" weight="duotone" />}
          title="الألوان"
          collapsible
          defaultOpen
        >
          {/* Color Roles Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            <ColorRoleButton
              label="الأساسي"
              color={params.primaryColor}
              onChange={(c) => handleColorChange("primaryColor", c)}
            />
            <ColorRoleButton
              label="الثانوي"
              color={params.secondaryColor}
              onChange={(c) => handleColorChange("secondaryColor", c)}
            />
            <ColorRoleButton
              label="الخلفية"
              color={params.backgroundColor}
              disabled={params.isTransparent}
              onChange={(c) => handleColorChange("backgroundColor", c)}
            />
            <button
              type="button"
              onClick={() => onChangeParams((prev) => ({ ...prev, isTransparent: !prev.isTransparent }))}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-md border transition-all cursor-pointer text-center",
                params.isTransparent
                  ? "bg-primary/10 border-primary text-primary shadow-2xs font-bold ring-1 ring-primary/30"
                  : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-card"
              )}
              title={params.isTransparent ? "الخلفية مفرغة (انقر للتعطيل)" : "تفريغ الخلفية"}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-md border flex items-center justify-center shrink-0 text-sm font-bold",
                  params.isTransparent
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border/50 bg-muted/40 text-muted-foreground"
                )}
              >
                ∅
              </div>
              <span className="text-[10px] font-semibold">
                {params.isTransparent ? "مفرغة" : "شفافة"}
              </span>
            </button>
          </div>

          {/* Curated Palettes (Icon/Swatch-driven with Tooltips) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CURATED_PALETTES.map((palette) => {
              const isActive =
                params.primaryColor.toLowerCase() === palette.primary.toLowerCase() &&
                params.secondaryColor.toLowerCase() === palette.secondary.toLowerCase() &&
                params.backgroundColor.toLowerCase() === palette.background.toLowerCase() &&
                !params.isTransparent;

              return (
                <Tooltip key={palette.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeParams((prev) => ({
                          ...prev,
                          primaryColor: palette.primary,
                          secondaryColor: palette.secondary,
                          backgroundColor: palette.background,
                          isTransparent: false,
                        }))
                      }
                      className={cn(
                        "h-7 px-2 rounded-md border flex items-center gap-1 shrink-0 transition-all cursor-pointer group",
                        isActive
                          ? "bg-primary/15 border-primary shadow-2xs ring-1 ring-primary/40"
                          : "bg-background/60 hover:bg-background border-border/40 hover:border-border/70"
                      )}
                      aria-label={palette.name}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: palette.primary }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: palette.secondary }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: palette.background }}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo font-medium">
                    {palette.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </FluentSection>

        {/* 2. التشطيب */}
        <FluentSection
          icon={<Sparkle className="w-3.5 h-3.5" weight="duotone" />}
          title="التشطيب"
          collapsible
          defaultOpen
        >
          <FluentSegmentedControl
            value={params.finish || "standard"}
            onChange={(finish) => onChangeParams((prev) => ({ ...prev, finish: finish as StickerFinish }))}
            options={FINISH_OPTIONS.map((f) => ({ id: f.id, label: f.label }))}
            className="w-full"
          />

          <div className="h-8 flex items-center justify-between px-2.5 rounded-md bg-card/40 border border-border/30 hover:border-border/60 transition-colors">
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-xs font-semibold text-foreground/85">إطار القص</span>
            </div>
            <Switch
              id="diecut-toggle"
              checked={params.dieCutBorder ?? true}
              onCheckedChange={(checked) => onChangeParams((prev) => ({ ...prev, dieCutBorder: checked }))}
            />
          </div>

          {/* Font Family — مكوّن اختيار الخط القياسي مع البحث والمعاينة الحية */}
          <StickerFontSelector
            value={params.fontFamily || "Cairo"}
            onChange={(family) => {
              onChangeParams((prev) => ({ ...prev, fontFamily: family }));
            }}
          />

          <FluentSliderField
            layout="inline"
            label="الخط"
            labelWidth="w-10"
            value={params.fontScale ?? 1}
            min={0.8}
            max={1.3}
            step={0.05}
            unit="x"
            valueFormatter={(v) => `${v.toFixed(2)}x`}
            onChange={(val) => onChangeParams((prev) => ({ ...prev, fontScale: val }))}
          />
        </FluentSection>

        {/* 3. الشيت */}
        <FluentSection
          icon={<Printer className="w-3.5 h-3.5" weight="duotone" />}
          title="الشيت"
          badge={
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-bold font-mono">
              {gridConfig.rows * gridConfig.cols}
            </span>
          }
          collapsible
          defaultOpen
        >
          {/* Miniature Sheet Grid Preview */}
          <div className="relative w-full h-24 rounded-md bg-muted/30 border border-border/40 p-2 flex items-center justify-center overflow-hidden">
            <div
              className="relative bg-card/95 rounded border border-border/60 shadow-xs flex items-center justify-center p-1.5 transition-all duration-200"
              style={{ width: "110px", height: "66px" }}
            >
              <div
                className="grid w-full h-full gap-1 items-center justify-center"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: Math.min(32, gridConfig.rows * gridConfig.cols) }).map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-full h-full max-w-[12px] max-h-[12px] mx-auto border transition-all duration-150 shadow-2xs",
                      template.shape === "circle" ? "rounded-full" : template.shape === "rect" ? "rounded-[1px]" : "rounded-xs"
                    )}
                    style={{
                      backgroundColor: params.primaryColor,
                      borderColor: params.secondaryColor || "rgba(0,0,0,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Grid Presets */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { r: 2, c: 2, label: "2×2" },
              { r: 3, c: 3, label: "3×3" },
              { r: 4, c: 2, label: "4×2" },
              { r: 5, c: 3, label: "5×3" },
            ].map((p) => {
              const isActive = gridConfig.rows === p.r && gridConfig.cols === p.c;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChangeGridConfig((prev) => ({ ...prev, rows: p.r, cols: p.c }))}
                  className={cn(
                    "h-7 text-[11px] font-medium rounded-md border transition-all cursor-pointer flex items-center justify-center",
                    isActive
                      ? "bg-card border-primary text-primary font-bold shadow-2xs"
                      : "bg-muted/20 border-border/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <FluentSliderField
            layout="inline"
            label="الصفوف"
            labelWidth="w-14"
            value={gridConfig.rows}
            min={1}
            max={8}
            step={1}
            onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, rows: val }))}
          />
          <FluentSliderField
            layout="inline"
            label="الأعمدة"
            labelWidth="w-14"
            value={gridConfig.cols}
            min={1}
            max={8}
            step={1}
            onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, cols: val }))}
          />
          <FluentSliderField
            layout="inline"
            label="المسافة"
            labelWidth="w-14"
            value={gridConfig.spacingMm}
            min={0}
            max={20}
            step={1}
            unit="مم"
            onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, spacingMm: val }))}
          />

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono px-0.5">
            <Printer className="w-3 h-3" />
            <span>تُدرج الشيتات مباشرة على مساحة العمل عبر زر الإدراج</span>
          </div>
        </FluentSection>
      </div>
    </div>
  );
});

StickerProperties.displayName = "StickerProperties";
