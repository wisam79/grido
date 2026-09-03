import { cn } from "@/lib/utils";
import { Lightning, Rows, GridFour, Check } from "@phosphor-icons/react";
import { CollageTemplate, COLLAGE_TEMPLATES } from "@/lib/templates";
import { FluentSection, FluentSegmentedControl } from "@/components/ui/blocks";
import { StudioCanvasColorDeck } from "../../properties/shared-controls";
import { STUDIO_FULL_SHEET_PRESETS, STUDIO_SINGLE_ROW_PRESETS } from "./collage-preset-data";

function PresetMiniDiagram({ templateId, active }: { templateId: string; active: boolean }) {
  const tpl = COLLAGE_TEMPLATES.find((t) => t.id === templateId);
  const cells = tpl?.cells || [];

  return (
    <div
      className={cn(
        "w-8 h-11 rounded-md border shrink-0 relative p-1 transition-all duration-150 shadow-2xs flex items-center justify-center",
        active
          ? "border-primary bg-primary/15 shadow-xs ring-1 ring-primary/40"
          : "border-border bg-input"
      )}
      dir="ltr"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 150"
        className="w-full h-full block"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {cells.map((cell, idx) => (
          <rect
            key={idx}
            x={cell.x * 100}
            y={cell.y * 150}
            width={cell.w * 100}
            height={cell.h * 150}
            rx={1}
            ry={1}
            className={cn(
              "transition-colors",
              active
                ? "fill-primary/60 stroke-primary stroke-[1.5]"
                : "fill-muted-foreground/30 stroke-muted-foreground/50 stroke-[1]"
            )}
          />
        ))}
      </svg>
    </div>
  );
}

interface CollagePresetsTabProps {
  presetCategory: "row" | "full";
  onPresetCategoryChange: (category: "row" | "full") => void;
  activeTemplateId: string | undefined;
  onSelect: (t: CollageTemplate) => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
}

export function CollagePresetsTab({
  presetCategory,
  onPresetCategoryChange,
  activeTemplateId,
  onSelect,
  backgroundColor,
  onBackgroundColorChange,
}: CollagePresetsTabProps) {
  const activePresetsList =
    presetCategory === "row" ? STUDIO_SINGLE_ROW_PRESETS : STUDIO_FULL_SHEET_PRESETS;

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* محول الفئات البارز والأنيق */}
      <div className="bg-muted/50 p-1 rounded-xl border border-border/60 shadow-2xs">
        <FluentSegmentedControl
          options={[
            {
              id: "row",
              label: "صف واحد",
              icon: <Rows className="w-4 h-4 text-primary" weight="regular" />,
            },
            {
              id: "full",
              label: "شيت كامل",
              icon: <GridFour className="w-4 h-4 text-primary" weight="duotone" />,
            },
          ]}
          value={presetCategory}
          onChange={(val) => onPresetCategoryChange(val as "row" | "full")}
          size="sm"
        />
      </div>

      <FluentSection
        icon={<Lightning className="w-4 h-4 text-amber-500" weight="duotone" />}
        title="النماذج الجاهزة"
      >
        <div className="grid grid-cols-2 gap-2">
          {activePresetsList.map((preset) => {
            const isActive = activeTemplateId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isActive}
                aria-label={`${preset.title} - ${preset.spec}`}
                onClick={() => {
                  const tpl = COLLAGE_TEMPLATES.find((t) => t.id === preset.id);
                  if (tpl) onSelect(tpl);
                }}
                className={cn(
                  "p-2 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between select-none relative active:scale-[0.98] shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none min-h-[82px]",
                  isActive
                    ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/30"
                    : "bg-input border-border hover:border-primary/40 text-foreground hover:bg-muted/30"
                )}
              >
                {/* المخطط الهندسي المصغر + شارة التحديد / البادج */}
                <div className="flex items-start justify-between w-full mb-1">
                  <PresetMiniDiagram templateId={preset.id} active={isActive} />
                  <div className="flex flex-col items-end gap-1">
                    {isActive ? (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3.5 h-3.5" weight="bold" />
                      </div>
                    ) : preset.badge ? (
                      <span
                        dir="ltr"
                        className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 leading-none"
                      >
                        {preset.badge}
                      </span>
                    ) : null}
                    <span className="text-[9.5px] font-mono text-muted-foreground font-medium leading-none">
                      {preset.slots} صور
                    </span>
                  </div>
                </div>

                {/* تفاصيل ومعلومات القالب */}
                <div className="flex flex-col items-start w-full min-w-0">
                  <span className="text-[11.5px] font-bold leading-tight line-clamp-1 w-full text-right" title={preset.title}>
                    {preset.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 font-mono leading-none truncate w-full text-right" dir="ltr">
                    {preset.spec}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </FluentSection>

      {/* لون خلفية مساحة العمل مدمج بأناقة */}
      <div className="pt-1">
        <StudioCanvasColorDeck
          color={backgroundColor}
          onChange={onBackgroundColorChange}
        />
      </div>
    </div>
  );
}
