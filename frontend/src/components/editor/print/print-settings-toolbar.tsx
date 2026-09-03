import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Plus,
  Minus,
  SquaresFour,
  Scissors,
  Crosshair,
  ArrowUpLeft,
  Columns,
  Rows,
} from "@phosphor-icons/react";
import { PAPER_SIZES } from "@/lib/templates/constants";
import type { PrintSettings } from "@/lib/store/types";

const toggleButtonClassName = (active: boolean, primary = false) =>
  cn(
    "rounded-md text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
    active
      ? primary
        ? "bg-primary text-primary-foreground shadow-2xs font-bold"
        : "bg-background text-foreground shadow-2xs font-bold"
      : "text-muted-foreground hover:text-foreground"
  );

export interface PrintSettingsToolbarProps {
  mode: "single" | "collage";
  printSettings: PrintSettings;
  setPrintSettings: (patch: Partial<PrintSettings>) => void;
  colorSpace: "sRGB" | "CMYK";
  onColorSpaceChange: (cs: "sRGB" | "CMYK") => void;
  collageShowCutLines: boolean;
  onCutLinesChange: (checked: boolean) => void;
  actualCopies: number;
  grid: { safeCols: number };
  lastNonZeroMargin: number;
  onMarginlessToggle: (checked: boolean) => void;
}

/**
 * 🧭 صف إعدادات الطباعة: قائمة الورقة، وضع الألوان، محاذاة الشبكة،
 * بدون هوامش، خطوط القص — وشريط النسخ/التكرار/المسافة للوضع المفرد.
 * كانت هذه الكتلة مضمّنة في PrintDialog.
 */
export function PrintSettingsToolbar({
  mode,
  printSettings,
  setPrintSettings,
  colorSpace,
  onColorSpaceChange,
  collageShowCutLines,
  onCutLinesChange,
  actualCopies,
  grid,
  lastNonZeroMargin,
  onMarginlessToggle,
}: PrintSettingsToolbarProps) {
  const cutLinesActive = mode === "collage" ? collageShowCutLines : printSettings.showCutLines;

  return (
    <>
      {/* صف الإعدادات الأساسية */}
      <div className="flex items-center gap-2.5 flex-wrap select-none shrink-0">
        {/* قائمة اختيارات قياس الورقة */}
        <Select
          value={printSettings.paperId || "a4"}
          onValueChange={(val) => {
            const selected = PAPER_SIZES.find((p) => p.id === val);
            if (selected) {
              setPrintSettings({
                paperId: selected.id,
                paperWidthMM: selected.widthMM,
                paperHeightMM: selected.heightMM,
              });
            }
          }}
        >
          <SelectTrigger className="h-8 text-xs font-semibold w-[150px] bg-background border-border/50 shadow-2xs focus:ring-primary/20">
            <SelectValue placeholder="مقاس الورقة" />
          </SelectTrigger>
          <SelectContent className="z-[150]" dir="rtl">
            {PAPER_SIZES.map((size) => (
              <SelectItem key={size.id} value={size.id} className="text-xs font-semibold cursor-pointer">
                {size.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* وضع الألوان */}
        <div className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => onColorSpaceChange("sRGB")}
            className={cn("px-2.5 py-1", toggleButtonClassName(colorSpace === "sRGB"))}
          >
            sRGB
          </button>
          <button
            type="button"
            onClick={() => onColorSpaceChange("CMYK")}
            className={cn("px-2.5 py-1", toggleButtonClassName(colorSpace === "CMYK", true))}
          >
            CMYK
          </button>
        </div>

        {/* محاذاة الشبكة (أعلى اليسار للقص / توسيط) */}
        <div className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => setPrintSettings({ gridAlign: "top-left" })}
            title="محاذاة زاوية الورقة (أعلى اليسار / للقص السريع)"
            className={cn(
              "px-2 py-1 flex items-center gap-1",
              toggleButtonClassName((printSettings.gridAlign || "top-left") === "top-left")
            )}
          >
            <ArrowUpLeft className="text-primary w-3.5 h-3.5 shrink-0" weight="bold" />
            <span>أعلى اليسار</span>
          </button>
          <button
            type="button"
            onClick={() => setPrintSettings({ gridAlign: "center" })}
            title="توسيط الشبكة في منتصف الورقة"
            className={cn("px-2 py-1 flex items-center gap-1", toggleButtonClassName(printSettings.gridAlign === "center", true))}
          >
            <Crosshair className="w-3.5 h-3.5 shrink-0" weight="bold" />
            <span>توسيط</span>
          </button>
        </div>

        {/* طباعة بدون هوامش */}
        <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
          <Switch
            id="borderless-mode"
            checked={printSettings.marginMM === 0}
            onCheckedChange={onMarginlessToggle}
          />
          <Label htmlFor="borderless-mode" className="text-xs font-semibold cursor-pointer select-none">
            بدون هوامش
          </Label>
        </div>

        {/* خطوط القص */}
        <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
          <Switch
            id="print-cut-lines"
            checked={cutLinesActive}
            onCheckedChange={onCutLinesChange}
          />
          <Label htmlFor="print-cut-lines" className="text-xs font-semibold cursor-pointer select-none flex items-center gap-1">
            <Scissors className="text-primary/80 w-3.5 h-3.5 shrink-0" weight="duotone" />
            <span>خطوط القص</span>
          </Label>
          {cutLinesActive && (
            <select
              aria-label="نمط خطوط القص"
              value={printSettings.cutLineStyle || "dashed"}
              onChange={(e) => setPrintSettings({ cutLineStyle: e.target.value as PrintSettings["cutLineStyle"] })}
              className="bg-background text-[11px] font-semibold border border-border/50 rounded-md px-1.5 py-0.5 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="dashed">متقطع</option>
              <option value="dotted">منقط</option>
              <option value="solid">متصل</option>
            </select>
          )}
        </div>
      </div>

      {/* شريط الأدوات يتم إظهاره فقط في وضع الطباعة الفردية Single Mode */}
      {mode !== "collage" && (
        <div className="grid grid-cols-3 gap-2 select-none shrink-0">
          {/* عدد النسخ في الورقة */}
          <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-muted-foreground">نسخ/ورقة</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) <= 1}
                onClick={() => setPrintSettings({ copiesPerSheet: Math.max(1, (printSettings.copiesPerSheet ?? 1) - 1) })}
              >
                <Minus className="w-3 h-3 shrink-0" weight="bold" />
              </Button>
              <span className="text-xs font-mono font-bold w-6 text-center text-foreground">
                {actualCopies}
              </span>
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) >= (grid.safeCols * 10)}
                onClick={() => setPrintSettings({ copiesPerSheet: (printSettings.copiesPerSheet ?? 1) + 1 })}
              >
                <Plus className="w-3 h-3 shrink-0" weight="bold" />
              </Button>
            </div>
          </div>

          {/* نمط التكرار */}
          <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-muted-foreground">التكرار</span>
            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/30">
              {([
                { id: "all", icon: SquaresFour, label: "تعبئة تلقائية" },
                { id: "row", icon: Rows, label: "صف واحد" },
                { id: "column", icon: Columns, label: "عمود واحد" },
              ] as const).map(({ id, icon: Icon, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setPrintSettings({ repeatMode: id })}
                      className={cn(
                        "h-6 w-6 rounded-xs flex items-center justify-center",
                        toggleButtonClassName((printSettings.repeatMode ?? "all") === id)
                      )}
                      aria-label={label}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[11px] font-semibold">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* المسافة الفاصلة بين النسخ */}
          <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-muted-foreground">المسافة (مم)</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                disabled={(printSettings.gapMM ?? 2) <= 0}
                onClick={() => setPrintSettings({ gapMM: Math.max(0, (printSettings.gapMM ?? 2) - 1) })}
              >
                <Minus className="w-3 h-3 shrink-0" weight="bold" />
              </Button>
              <span className="text-xs font-mono font-bold w-6 text-center text-foreground">
                {printSettings.gapMM ?? 2}
              </span>
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                disabled={(printSettings.gapMM ?? 2) >= 20}
                onClick={() => setPrintSettings({ gapMM: Math.min(20, (printSettings.gapMM ?? 2) + 1) })}
              >
                <Plus className="w-3 h-3 shrink-0" weight="bold" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
