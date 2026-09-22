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
  Sparkle,
} from "@phosphor-icons/react";
import { PageOrientationIcon } from "@/components/ui/image-icons";
import { PAPER_SIZES } from "@/lib/templates/constants";
import type { PrintSettings } from "@/lib/store/types";
import { calculateOptimalSheetImposition } from "@/lib/print/print-layout-math";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";

const toggleButtonClassName = (active: boolean) =>
  cn(
    "rounded-md text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
    active
      ? "bg-primary text-primary-foreground shadow-2xs font-bold"
      : "text-muted-foreground hover:text-foreground hover:bg-background/70"
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
  grid: { safeCols: number; actualRows?: number };
  onMarginlessToggle: (checked: boolean) => void;
  imageWidthMM?: number;
  imageHeightMM?: number;
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
  onMarginlessToggle,
  imageWidthMM,
  imageHeightMM,
}: PrintSettingsToolbarProps) {
  const cutLinesActive = mode === "collage" ? collageShowCutLines : printSettings.showCutLines;

  const maxCopiesPerSheet = Math.max(1, (grid.safeCols ?? 1) * (grid.actualRows ?? 10));

  const handleAutoImpose = () => {
    if (!imageWidthMM || !imageHeightMM) {
      toast.error("تعذر قراءة مقاس التصميم");
      return;
    }
    const { showBleedGuides, bleedMarginMM } = useEditorStore.getState();
    const bleed = showBleedGuides && bleedMarginMM > 0 ? bleedMarginMM : 0;

    const result = calculateOptimalSheetImposition({
      paperWidthMM: printSettings.paperWidthMM || 210,
      paperHeightMM: printSettings.paperHeightMM || 297,
      itemWidthMM: imageWidthMM,
      itemHeightMM: imageHeightMM,
      marginMM: printSettings.marginMM ?? 5,
      gapMM: printSettings.gapMM ?? 2,
      bleedMM: bleed,
    });

    // اتجاه الورقة يُشتق من الأبعاد التي حسبها المونتاج مقابل الأبعاد المخزّنة
    // (لا من التسمية وحدها) — فورق مخزّن بترتيب عرضي كان يُصنَّف «portrait»
    // فتبقى الورقة بعرضها الأصلي وتخالف الشبكة المحسوبة.
    const storedWidth = printSettings.paperWidthMM || 210;
    const storedHeight = printSettings.paperHeightMM || 297;
    const orientation: "portrait" | "landscape" =
      Math.abs(result.paperWidthMM - storedWidth) < 0.01 ? "portrait" : "landscape";

    setPrintSettings({
      orientation,
      copiesPerSheet: result.maxCopies,
      repeatMode: "all",
      showCutLines: true,
    });
    // لا نُعلن «تدوير التصميم» هنا: المونتاج يعادل تدوير العنصر بتدوير الورقة
    // (نسخة القالب المدوّرة تُفوَّض لمرشّح الورقة المقابلة) — والوعد بتدوير لا
    // يُنفِّذه أي مسار في خط الأنابيب.
    toast.success(
      `تم المونتاج: ${result.maxCopies} نسخة (${result.cols} أعمدة × ${result.rows} صفوف) - الهدر ${result.wastePercentage}%`
    );
  };

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
          <SelectContent className="z-(--z-print-toolbar)" dir="rtl">
            {PAPER_SIZES.map((size) => (
              <SelectItem key={size.id} value={size.id} className="text-xs font-semibold cursor-pointer">
                {size.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* اتجاه الورقة (أفقي / رأسي) */}
        <div className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  setPrintSettings({
                    orientation:
                      printSettings.orientation === "landscape" ? "portrait" : "landscape",
                  })
                }
                className={cn(
                  "px-2 py-1 flex items-center gap-1.5",
                  "rounded-md text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none bg-primary text-primary-foreground shadow-2xs font-bold"
                )}
                aria-label="تبديل اتجاه الورقة"
              >
                <PageOrientationIcon
                  isLandscape={printSettings.orientation === "landscape"}
                  className="w-3.5 h-3.5 text-primary"
                />
                <span>{printSettings.orientation === "landscape" ? "أفقي" : "رأسي"}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-cairo text-xs font-semibold">
              <span>
                {printSettings.orientation === "landscape"
                  ? "أفقي (انقر للتحويل إلى رأسي)"
                  : "رأسي (انقر للتحويل إلى أفقي)"}
              </span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* وضع الألوان */}
        <div role="group" aria-label="وضع الألوان" className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => onColorSpaceChange("sRGB")}
            aria-pressed={colorSpace === "sRGB"}
            className={cn("px-2.5 py-1", toggleButtonClassName(colorSpace === "sRGB"))}
          >
            sRGB
          </button>
          <button
            type="button"
            onClick={() => onColorSpaceChange("CMYK")}
            aria-pressed={colorSpace === "CMYK"}
            className={cn("px-2.5 py-1", toggleButtonClassName(colorSpace === "CMYK"))}
          >
            CMYK
          </button>
        </div>

        {/* محاذاة الشبكة (أعلى اليسار للقص / توسيط) */}
        <div role="group" aria-label="محاذاة الشبكة" className="flex items-center gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40 text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setPrintSettings({ gridAlign: "top-left" })}
                aria-pressed={(printSettings.gridAlign || "top-left") === "top-left"}
                aria-label="محاذاة الزاوية"
                className={cn(
                  "px-2 py-1 flex items-center gap-1",
                  toggleButtonClassName((printSettings.gridAlign || "top-left") === "top-left")
                )}
              >
                <ArrowUpLeft className="w-3.5 h-3.5 shrink-0" weight="bold" />
                <span>أعلى اليسار</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-cairo text-xs font-semibold">
              محاذاة الزاوية للقص السريع
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setPrintSettings({ gridAlign: "center" })}
                aria-pressed={printSettings.gridAlign === "center"}
                aria-label="توسيط الشبكة"
                className={cn("px-2 py-1 flex items-center gap-1", toggleButtonClassName(printSettings.gridAlign === "center"))}
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" weight="bold" />
                <span>توسيط</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-cairo text-xs font-semibold">
              توسيط في منتصف الورقة
            </TooltipContent>
          </Tooltip>
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
            <Select
              value={printSettings.cutLineStyle || "dashed"}
              onValueChange={(val) => setPrintSettings({ cutLineStyle: val as PrintSettings["cutLineStyle"] })}
            >
              <SelectTrigger
                aria-label="نمط خطوط القص"
                className="h-6 w-[84px] px-2 py-0 text-mini font-semibold bg-background border-border/50 shadow-none focus:ring-1 focus:ring-primary/40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl" className="z-(--z-print-toolbar)">
                <SelectItem value="dashed" className="text-xs font-semibold cursor-pointer">متقطع</SelectItem>
                <SelectItem value="dotted" className="text-xs font-semibold cursor-pointer">منقط</SelectItem>
                <SelectItem value="solid" className="text-xs font-semibold cursor-pointer">متصل</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* شريط الأدوات يتم إظهاره فقط في وضع الطباعة الفردية Single Mode */}
      {mode !== "collage" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 select-none shrink-0">
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
              <span
                className="text-xs font-mono font-bold w-6 text-center text-foreground"
                title={`المطبوع على الورقة: ${actualCopies}`}
              >
                {printSettings.copiesPerSheet ?? 1}
              </span>
              <Button
                variant="ghost" size="sm"
                className="h-6 w-6 p-0 rounded-md cursor-pointer hover:bg-muted"
                disabled={(printSettings.repeatMode ?? "all") !== "all" || (printSettings.copiesPerSheet ?? 1) >= maxCopiesPerSheet}
                onClick={() => setPrintSettings({ copiesPerSheet: (printSettings.copiesPerSheet ?? 1) + 1 })}
              >
                <Plus className="w-3 h-3 shrink-0" weight="bold" />
              </Button>
            </div>
          </div>

          {/* نمط التكرار */}
          <div className="flex items-center justify-between bg-card rounded-lg border border-border/50 px-2.5 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-muted-foreground">التكرار</span>
            <div role="group" aria-label="نمط التكرار" className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/30">
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
                      aria-pressed={(printSettings.repeatMode ?? "all") === id}
                      className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center",
                        toggleButtonClassName((printSettings.repeatMode ?? "all") === id)
                      )}
                      aria-label={label}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs font-semibold">{label}</TooltipContent>
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

          {/* زر المونتاج التلقائي للشيت */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoImpose}
            className="min-h-[34px] rounded-md border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold gap-1.5 cursor-pointer shadow-2xs flex items-center justify-center transition-all"
            title="تعبئة الشيت بأقصى عدد نسخ"
          >
            <Sparkle className="w-3.5 h-3.5 shrink-0" weight="fill" />
            <span>مونتاج تلقائي</span>
          </Button>
        </div>
      )}
    </>
  );
}
