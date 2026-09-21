import React, { useState, useMemo } from "react";
import {
  Palette,
  Printer,
  ArrowCounterClockwise,
  Scissors,
  Sparkle,
  TextT,
  SlidersHorizontal,
  BookmarkSimple,
  FloppyDisk,
  Trash,
  Check,
  Plus,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { FluentSection, FluentSliderField, FluentSegmentedControl } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";
import { StickerTemplate, StickerParams, SheetGridConfig, StickerFinish, StickerUserPreset } from "../types";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CURATED_PALETTES } from "../constants";
import { StickerFontSelector } from "./StickerFontSelector";
import {
  loadStickerPresets,
  saveStickerPreset,
  deleteStickerPreset,
  getPresetsForTemplate,
} from "../lib/preset-utils";

export interface StickerPropertiesProps {
  template: StickerTemplate;
  params: StickerParams;
  onChangeParams: (updater: (prev: StickerParams) => StickerParams) => void;
  onResetDefaults: () => void;
  gridConfig: SheetGridConfig;
  onChangeGridConfig: (config: SheetGridConfig | ((prev: SheetGridConfig) => SheetGridConfig)) => void;
  /** حقول بلا عنصر مرئي في المعاينة (اختياري للتوافق) */
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
  onChange: (color: string) => void;
}

function ColorRoleButton({ label, color, disabled, onChange }: ColorRoleButtonProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-md bg-card/60 border transition-all",
        disabled
          ? "opacity-35 pointer-events-none border-border/40"
          : "border-border/40 hover:border-primary/60 cursor-pointer group"
      )}
      title={`${label}: ${color}`}
    >
      <div className="relative w-6 h-6 rounded-md border border-black/15 shadow-2xs overflow-hidden shrink-0">
        <span className="w-full h-full block" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color.startsWith("#") && color.length === 7 ? color : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title={label}
        />
      </div>
      <span className="text-micro font-semibold text-foreground/80">{label}</span>
      <span className="text-2xs font-mono text-muted-foreground/75 truncate max-w-full uppercase">
        {color}
      </span>
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
}: StickerPropertiesProps) {
  const [activeTab, setActiveTab] = useState<"design" | "sheet" | "presets">("design");
  const [presets, setPresets] = useState<StickerUserPreset[]>(() => loadStickerPresets());
  const [newPresetName, setNewPresetName] = useState("");

  const templatePresets = useMemo(
    () => getPresetsForTemplate(presets, template.id),
    [presets, template.id]
  );

  const handleSavePreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      toast.error("اكتب اسم القالب");
      return;
    }
    const saved = saveStickerPreset(trimmed, template.id, params);
    setPresets((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
    setNewPresetName("");
    toast.success(`حُفظ القالب "${saved.name}"`);
  };

  const handleDeletePreset = (id: string, name: string) => {
    const remaining = deleteStickerPreset(id);
    setPresets(remaining);
    toast.success(`حُذف القالب "${name}"`);
  };

  const handleApplyPreset = (preset: StickerUserPreset) => {
    onChangeParams(() => ({ ...preset.params }));
    toast.success(`طُبّق القالب "${preset.name}"`);
    setActiveTab("design");
  };

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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/20 select-none">
      {/* ── Subheader / Tabs Header ── */}
      <div className="p-2.5 border-b border-border/30 shrink-0 bg-muted/15 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-foreground truncate" title={template.name}>
              {template.name}
            </h3>
            <p className="text-micro text-muted-foreground font-mono mt-0.5">
              {currentMm.width} × {currentMm.height} مم • 300 DPI
            </p>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetDefaults}
                className="w-7 h-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-muted/50 shrink-0"
              >
                <ArrowCounterClockwise className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              استعادة
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Fluent Segmented Tabs: Design vs Sheet vs Presets */}
        <FluentSegmentedControl<"design" | "sheet" | "presets">
          layoutId="sticker-properties-tabs"
          value={activeTab}
          onChange={setActiveTab}
          size="sm"
          options={[
            {
              id: "design",
              label: "التصميم",
              icon: <SlidersHorizontal className="w-4 h-4" weight={activeTab === "design" ? "bold" : "regular"} />,
            },
            {
              id: "sheet",
              label: "الشيت",
              icon: <Printer className="w-4 h-4" weight={activeTab === "sheet" ? "bold" : "regular"} />,
              badge: (
                <span className="text-2xs font-mono px-1 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                  {gridConfig.rows * gridConfig.cols}
                </span>
              ),
            },
            {
              id: "presets",
              label: "قوالبي",
              icon: <BookmarkSimple className="w-4 h-4" weight={activeTab === "presets" ? "bold" : "regular"} />,
              badge: templatePresets.length > 0 ? (
                <span className="text-2xs font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                  {templatePresets.length}
                </span>
              ) : undefined,
            },
          ]}
        />
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-3">
        {activeTab === "design" ? (
          <>
            {/* 1. النصوص */}
            {template.fields.length > 0 && (
              <FluentSection
                icon={<TextT className="w-4 h-4" weight="duotone" />}
                title="النصوص"
                collapsible
                defaultOpen
              >
                <div className="space-y-2">
                  {template.fields.map((field) => {
                    const val = params.fields[field.id] ?? field.defaultValue;
                    const isModified = val !== field.defaultValue;
                    return (
                      <div key={field.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-mini font-semibold text-foreground/85">{field.label}</Label>
                          {isModified && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange(field.id, field.defaultValue)}
                                  className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded transition-colors"
                                >
                                  <ArrowCounterClockwise className="w-3 h-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs font-cairo">
                                استعادة
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          value={val}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || field.label}
                          className="h-8 text-xs rounded-md bg-background border-border/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none text-foreground"
                        />
                      </div>
                    );
                  })}
                </div>
              </FluentSection>
            )}

            {/* 2. الألوان */}
            <FluentSection
              icon={<Palette className="w-4 h-4" weight="duotone" />}
              title="الألوان"
              collapsible
              defaultOpen
            >
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
                    "relative flex flex-col items-center justify-center gap-1.5 p-2 rounded-md border transition-all cursor-pointer text-center",
                    params.isTransparent
                      ? "bg-card text-foreground border border-border/80 dark:border-white/15 shadow-xs font-bold ring-1 ring-primary/40"
                      : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:bg-card"
                  )}
                  title={params.isTransparent ? "مفرغة (انقر للإلغاء)" : "تفريغ"}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-md border flex items-center justify-center shrink-0 text-xs font-bold",
                      params.isTransparent
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border/50 bg-muted/40 text-muted-foreground"
                    )}
                  >
                    ∅
                  </div>
                  <span className="text-micro font-semibold">
                    {params.isTransparent ? "مفرغة" : "شفافة"}
                  </span>
                </button>
              </div>

              {/* Curated Quick Palettes */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
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
                            "h-7 px-2 rounded-md border flex items-center gap-1 shrink-0 transition-all cursor-pointer",
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

            {/* 3. المظهر */}
            <FluentSection
              icon={<Sparkle className="w-4 h-4" weight="duotone" />}
              title="المظهر"
              collapsible
              defaultOpen
            >
              {/* Font Selector */}
              <StickerFontSelector
                value={params.fontFamily || "Cairo"}
                onChange={(family) => {
                  onChangeParams((prev) => ({ ...prev, fontFamily: family }));
                }}
              />

              {/* Font Scale Slider */}
              <FluentSliderField
                layout="inline"
                label="الخط"
                labelWidth="w-12"
                value={params.fontScale ?? 1}
                min={0.8}
                max={1.3}
                step={0.05}
                unit="x"
                valueFormatter={(v) => `${v.toFixed(2)}x`}
                onChange={(val) => onChangeParams((prev) => ({ ...prev, fontScale: val }))}
              />

              {/* Finish Options */}
              <div className="pt-1 border-t border-border/30">
                <FluentSegmentedControl
                  layoutId="sticker-finish-tabs"
                  value={params.finish || "standard"}
                  onChange={(finish) => onChangeParams((prev) => ({ ...prev, finish: finish as StickerFinish }))}
                  options={FINISH_OPTIONS.map((f) => ({ id: f.id, label: f.label }))}
                  className="w-full"
                />
              </div>

              {/* Die-cut Cutline Toggle */}
              <div className="h-8 flex items-center justify-between px-2.5 rounded-md bg-card/40 border border-border/30 hover:border-border/60 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-semibold text-foreground/85">إطار القص</span>
                </div>
                <Switch
                  id="diecut-toggle"
                  checked={params.dieCutBorder ?? true}
                  onCheckedChange={(checked) => onChangeParams((prev) => ({ ...prev, dieCutBorder: checked }))}
                />
              </div>
            </FluentSection>
          </>
        ) : activeTab === "sheet" ? (
          /* ── شيت الطباعة Tab ── */
          <div className="space-y-3">
            {/* Miniature Sheet Grid Preview */}
            <div className="relative w-full h-28 rounded-xl bg-muted/25 border border-border/40 p-2 flex items-center justify-center overflow-hidden">
              <div
                className="relative bg-card/95 rounded-lg border border-border/60 shadow-xs flex items-center justify-center p-1.5 transition-all duration-200"
                style={{ width: "130px", height: "80px" }}
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
                        "w-full h-full max-w-[14px] max-h-[14px] mx-auto border transition-all duration-150 shadow-2xs",
                        template.shape === "circle" ? "rounded-full" : template.shape === "rect" ? "rounded-sm" : "rounded-md"
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
            <div className="grid grid-cols-4 gap-1 bg-muted/60 dark:bg-black/35 p-1 rounded-xl border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
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
                      "h-7 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center select-none active:scale-[0.98]",
                      isActive
                        ? "bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40 dark:hover:bg-white/5 border-transparent font-medium"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Sliders */}
            <div className="p-2.5 rounded-xl bg-card/40 border border-border/30 space-y-2">
              <FluentSliderField
                layout="inline"
                label="صفوف"
                labelWidth="w-12"
                value={gridConfig.rows}
                min={1}
                max={8}
                step={1}
                onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, rows: val }))}
              />
              <FluentSliderField
                layout="inline"
                label="أعمدة"
                labelWidth="w-12"
                value={gridConfig.cols}
                min={1}
                max={8}
                step={1}
                onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, cols: val }))}
              />
              <FluentSliderField
                layout="inline"
                label="مسافة"
                labelWidth="w-12"
                value={gridConfig.spacingMm}
                min={0}
                max={20}
                step={1}
                unit="مم"
                onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, spacingMm: val }))}
              />
            </div>
          </div>
        ) : (
          /* ── 3. تبويب قوالبي المحفوظة (Presets Tab) ── */
          <div className="space-y-3">
            {/* حفظ التخصيص الحالي */}
            <div className="p-3 rounded-xl bg-card/60 border border-border/40 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <FloppyDisk className="w-5 h-5 text-primary" weight="duotone" />
                <span>حفظ التخصيص</span>
              </div>
              <p className="text-mini text-muted-foreground leading-relaxed">
                احفظ النصوص والألوان والخط لاسترجاعها لاحقاً.
              </p>
              <div className="flex items-center gap-1.5">
                <Input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSavePreset();
                  }}
                  placeholder="اسم القالب"
                  className="h-8 text-xs font-medium rounded-md flex-1 bg-background/80"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSavePreset}
                  className="h-8 px-3 rounded-md text-xs font-bold gap-1 cursor-pointer shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" weight="bold" />
                  <span>حفظ</span>
                </Button>
              </div>
            </div>

            {/* قائمة القوالب المحفوظة */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold text-foreground">
                  القوالب المحفوظة ({templatePresets.length})
                </span>
                {presets.length > templatePresets.length && (
                  <span className="text-micro text-muted-foreground">
                    {presets.length} قالب إجمالي
                  </span>
                )}
              </div>

              {templatePresets.length > 0 ? (
                <div className="space-y-2">
                  {templatePresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-2.5 rounded-xl bg-card/60 hover:bg-card border border-border/40 hover:border-primary/40 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground truncate" title={preset.name}>
                          {preset.name}
                        </span>

                        {/* Color Dots */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.params.primaryColor }}
                            title={`الرئيسي: ${preset.params.primaryColor}`}
                          />
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.params.secondaryColor }}
                            title={`الثانوي: ${preset.params.secondaryColor}`}
                          />
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: preset.params.backgroundColor }}
                            title={`الخلفية: ${preset.params.backgroundColor}`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                        <span className="text-micro text-muted-foreground font-mono">
                          {new Date(preset.createdAt).toLocaleDateString("ar-EG", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePreset(preset.id, preset.name)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                            title="حذف"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApplyPreset(preset)}
                            className="h-7 px-3 text-xs font-bold rounded-md cursor-pointer bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all gap-1"
                          >
                            <Check className="w-4 h-4" weight="bold" />
                            <span>تطبيق</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-card/30 border border-dashed border-border/50 text-center space-y-1.5">
                  <BookmarkSimple className="w-7 h-7 mx-auto text-muted-foreground/60" weight="duotone" />
                  <p className="text-xs font-semibold text-foreground/80">لا قوالب محفوظة</p>
                  <p className="text-mini text-muted-foreground leading-relaxed">
                    اكتب اسماً بالأعلى واضغط "حفظ" لاستخدامه لاحقاً.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

StickerProperties.displayName = "StickerProperties";
