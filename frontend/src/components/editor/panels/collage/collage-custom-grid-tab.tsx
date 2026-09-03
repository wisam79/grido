import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GridFour,
  Plus,
  Minus,
  Crop,
  Crosshair,
  X,
  FloppyDisk,
  Folder,
  Rows,
  Columns,
  CornersOut,
} from "@phosphor-icons/react";
import { FluentSection } from "@/components/ui/blocks";
import { PhotoGridType, GridAlignment, getGridLimits } from "./collage-grid-math";

function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active ? "border-primary bg-primary/25 shadow-2xs" : "border-muted-foreground/40 bg-muted/30";
  const activeIcon = active ? "text-primary font-bold" : "text-muted-foreground/60";

  if (type === "stretch") {
    return (
      <div className={cn("w-4 h-4 rounded-[2px] border border-dashed flex items-center justify-center transition-all", activeBorder)}>
        <Crop className={cn("w-2.5 h-2.5", activeIcon)} weight="regular" />
      </div>
    );
  }

  if (type === "visa") {
    return (
      <div className={cn("w-4 h-4 rounded-[3px] border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
        <div className={cn("w-1.5 h-1.5 rounded-full border border-current opacity-80 mt-0.5 shrink-0", activeIcon)} />
        <div className={cn("w-2.5 h-1 rounded-t-full bg-current opacity-50 -mb-0.5 shrink-0", activeIcon)} />
      </div>
    );
  }

  if (type === "iq-national-id") {
    return (
      <div className={cn("w-3.5 h-4.5 rounded-[2px] border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
        <div className={cn("w-1.5 h-1.5 rounded-full border border-current opacity-80 mt-0.5 shrink-0", activeIcon)} />
        <div className={cn("w-2.5 h-1.5 rounded-t-full bg-current opacity-50 -mb-0.5 shrink-0", activeIcon)} />
      </div>
    );
  }

  if (type === "iq-civil-id") {
    return (
      <div className={cn("w-3.5 h-4 rounded-[2px] border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
        <div className={cn("w-1.5 h-1.5 rounded-full border border-current opacity-80 mt-0.5 shrink-0", activeIcon)} />
        <div className={cn("w-2 h-1 rounded-t-full bg-current opacity-50 -mb-0.5 shrink-0", activeIcon)} />
      </div>
    );
  }

  if (type === "iq-general-id") {
    return (
      <div className={cn("w-3 h-5 rounded-[2px] border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
        <div className={cn("w-1.5 h-1.5 rounded-full border border-current opacity-80 mt-0.5 shrink-0", activeIcon)} />
        <div className={cn("w-2 h-1.5 rounded-t-full bg-current opacity-50 -mb-0.5 shrink-0", activeIcon)} />
      </div>
    );
  }

  return (
    <div className={cn("w-3.5 h-4 rounded-[2px] border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
      <div className={cn("w-1.5 h-1.5 rounded-full border border-current opacity-80 mt-0.5 shrink-0", activeIcon)} />
      <div className={cn("w-2 h-1 rounded-t-full bg-current opacity-50 -mb-0.5 shrink-0", activeIcon)} />
    </div>
  );
}

const ALIGNMENT_MATRIX: GridAlignment[][] = [
  ["top-left", "top-center", "top-right"],
  ["center-left", "center", "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const ALIGNMENT_LABELS: Record<GridAlignment, string> = {
  "top-left": "أعلى اليسار (للقص السريع)",
  "top-center": "أعلى الوسط",
  "top-right": "أعلى اليمين",
  "center-left": "منتصف اليسار",
  "center": "توسيط في المنتصف",
  "center-right": "منتصف اليمين",
  "bottom-left": "أسفل اليسار",
  "bottom-center": "أسفل الوسط",
  "bottom-right": "أسفل اليمين",
};

const PHOTO_TYPE_OPTIONS = [
  { value: "stretch", label: "تمدد حر", sub: "ملء الخلية" },
  { value: "iq-national-id", label: "بطاقة وطنية", sub: "35 × 45 mm" },
  { value: "iq-civil-id", label: "هوية أحوال", sub: "32 × 40 mm" },
  { value: "iq-general-id", label: "هوية عامة", sub: "40 × 60 mm" },
  { value: "iq-transactions", label: "متقاعدون", sub: "30 × 40 mm" },
  { value: "visa", label: "فيزا سفر", sub: "50 × 50 mm" },
] as const;

const stepperButtonClassName =
  "w-8 h-8 rounded-md bg-muted/50 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none";

export interface CollageCustomGridTabProps {
  rows: number;
  cols: number;
  photoType: PhotoGridType;
  gridAlign: GridAlignment;
  isCustomActive: boolean;
  canvasWidth: number;
  canvasHeight: number;
  storedDpi: number;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  onApply: (rows: number, cols: number, photoType?: PhotoGridType, align?: GridAlignment) => void;
  onPhotoTypeChange: (photoType: PhotoGridType) => void;
  onGridAlignChange: (align: GridAlignment) => void;
  onSaveCurrentAsTemplate: (name: string) => void;
}

export function CollageCustomGridTab({
  rows,
  cols,
  photoType,
  gridAlign,
  isCustomActive,
  canvasWidth,
  canvasHeight,
  storedDpi,
  onRowsChange,
  onColsChange,
  onApply,
  onPhotoTypeChange,
  onGridAlignChange,
  onSaveCurrentAsTemplate,
}: CollageCustomGridTabProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");

  const { maxRows, maxCols } = getGridLimits(photoType, canvasWidth, canvasHeight, storedDpi);

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error("يرجى إدخال اسم للقالب");
      return;
    }
    onSaveCurrentAsTemplate(saveName);
    setShowSaveForm(false);
    setSaveName("");
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      <FluentSection
        icon={<GridFour className="w-5 h-5 text-primary" weight="duotone" />}
        title="تقسيم الصفوف والأعمدة"
        action={
          <div className="text-xs font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border/40 flex items-center gap-1.5">
            <span>{rows * cols} صورة</span>
            <span className="font-mono text-muted-foreground/75" dir="ltr">({rows}×{cols})</span>
          </div>
        }
      >
        {/* عدادات الصفوف والأعمدة */}
        <div className="grid grid-cols-2 gap-2">
          {/* Rows */}
          <div className="flex flex-col items-center gap-1.5 bg-background/70 border border-border/70 hover:border-primary/40 rounded-xl p-2.5 transition-colors shadow-2xs">
            <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground select-none">
              <Rows className="w-3.5 h-3.5 text-primary/80" weight="regular" />
              الصفوف (أفقي)
            </span>
            <div className="flex items-center justify-between w-full gap-1" dir="ltr">
              <button
                type="button"
                disabled={rows <= 1}
                onClick={() => {
                  const r = Math.max(1, rows - 1);
                  onRowsChange(r);
                }}
                title={rows <= 1 ? "الحد الأدنى" : "تقليل صف"}
                className={stepperButtonClassName}
              >
                <Minus className="w-4 h-4" weight="bold" />
              </button>
              <span className="font-mono text-base font-black text-foreground w-6 text-center leading-none select-none">
                {rows}
              </span>
              <button
                type="button"
                disabled={rows >= maxRows}
                onClick={() => {
                  const r = Math.min(maxRows, rows + 1);
                  onRowsChange(r);
                }}
                title={rows >= maxRows ? `الحد الأقصى للورقة (${maxRows})` : "إضافة صف"}
                className={stepperButtonClassName}
              >
                <Plus className="w-4 h-4" weight="bold" />
              </button>
            </div>
          </div>

          {/* Columns */}
          <div className="flex flex-col items-center gap-1.5 bg-background/70 border border-border/70 hover:border-primary/40 rounded-xl p-2.5 transition-colors shadow-2xs">
            <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground select-none">
              <Columns className="w-3.5 h-3.5 text-primary/80" weight="regular" />
              الأعمدة (عمودي)
            </span>
            <div className="flex items-center justify-between w-full gap-1" dir="ltr">
              <button
                type="button"
                disabled={cols <= 1}
                onClick={() => {
                  const c = Math.max(1, cols - 1);
                  onColsChange(c);
                }}
                title={cols <= 1 ? "الحد الأدنى" : "تقليل عمود"}
                className={stepperButtonClassName}
              >
                <Minus className="w-4 h-4" weight="bold" />
              </button>
              <span className="font-mono text-base font-black text-foreground w-6 text-center leading-none select-none">
                {cols}
              </span>
              <button
                type="button"
                disabled={cols >= maxCols}
                onClick={() => {
                  const c = Math.min(maxCols, cols + 1);
                  onColsChange(c);
                }}
                title={cols >= maxCols ? `الحد الأقصى للورقة (${maxCols})` : "إضافة عمود"}
                className={stepperButtonClassName}
              >
                <Plus className="w-4 h-4" weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* أبعاد ومقاسات صور الوثائق */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
          <span className="text-[11px] font-bold text-muted-foreground">أبعاد ونوع صور الوثائق</span>
          <div className="grid grid-cols-2 gap-1.5">
            {PHOTO_TYPE_OPTIONS.map((opt) => {
              const isActive = photoType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={`${opt.label} - ${opt.sub}`}
                  onClick={() => onPhotoTypeChange(opt.value as PhotoGridType)}
                  className={cn(
                    "relative flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer active:scale-[0.98] select-none h-11.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                    isActive
                      ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/30"
                      : "bg-background/80 border-border/60 hover:bg-muted/40 hover:border-primary/40 text-foreground"
                  )}
                >
                  <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-muted/40 border border-border/40">
                    <DocumentPresetGraphic type={opt.value} active={isActive} />
                  </div>

                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-xs font-bold leading-tight truncate w-full">{opt.label}</span>
                    <span
                      className={cn(
                        "text-[10px] font-mono leading-none mt-0.5",
                        isActive ? "text-primary font-bold" : "text-muted-foreground"
                      )}
                      dir="ltr"
                    >
                      {opt.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* لوحة محاذاة موضع الصور على الورقة (Sleek Compact Anchor Widget) */}
        {photoType !== "stretch" && (
          <div className="p-3 rounded-xl bg-background/50 border border-border/80 shadow-2xs space-y-2.5 fluent-specular animate-in fade-in duration-200">
            {/* الرأس: العنوان + شارة المحاذاة */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <GridFour className="w-4 h-4 text-primary" weight="duotone" />
                <span>موضع الصور على الورقة</span>
              </span>
              <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                {ALIGNMENT_LABELS[gridAlign] || "أعلى اليسار"}
              </span>
            </div>

            {/* الحاوية المدمجة: مصفوفة الارتكاز المصغرة + أزرار التحديد السريع */}
            <div className="flex items-center gap-2.5 bg-card/90 p-2 rounded-lg border border-border/60">
              {/* شبكة الارتكاز التفاعلية المصغرة (Figma / InDesign Anchor Widget) */}
              <div
                className="w-14 h-16 rounded-md border border-border bg-background p-1 grid grid-cols-3 grid-rows-3 gap-0.5 shrink-0 shadow-2xs select-none"
                dir="ltr"
              >
                {ALIGNMENT_MATRIX.map((row) =>
                  row.map((alignId) => {
                    const isActive = gridAlign === alignId;
                    return (
                      <button
                        key={alignId}
                        type="button"
                        aria-label={ALIGNMENT_LABELS[alignId]}
                        aria-pressed={isActive}
                        onClick={() => onGridAlignChange(alignId)}
                        title={ALIGNMENT_LABELS[alignId]}
                        className={cn(
                          "flex items-center justify-center rounded-xs transition-all cursor-pointer group",
                          isActive
                            ? "bg-primary/20 ring-1 ring-primary/40"
                            : "hover:bg-muted/70"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-full transition-all duration-150",
                            isActive
                              ? "w-2.5 h-2.5 bg-primary shadow-xs ring-2 ring-primary/30"
                              : "w-1 h-1 bg-muted-foreground/40 group-hover:bg-primary/70 group-hover:scale-125"
                          )}
                        />
                      </button>
                    );
                  })
                )}
              </div>

              {/* زرا الإجراءات الأكثر استخداماً في الاستوديو */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onGridAlignChange("top-left")}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer select-none",
                    gridAlign === "top-left"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                      : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <CornersOut className="w-3.5 h-3.5 shrink-0" weight="bold" />
                    <span>أعلى اليسار</span>
                  </span>
                  <span className={cn("text-[9.5px] shrink-0", gridAlign === "top-left" ? "text-primary-foreground/85" : "text-muted-foreground/80")}>قص سريع</span>
                </button>

                <button
                  type="button"
                  onClick={() => onGridAlignChange("center")}
                  className={cn(
                    "h-7 px-2.5 rounded-md text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer select-none",
                    gridAlign === "center"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                      : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Crosshair className="w-3.5 h-3.5 shrink-0" weight="regular" />
                    <span>توسيط</span>
                  </span>
                  <span className={cn("text-[9.5px] shrink-0", gridAlign === "center" ? "text-primary-foreground/85" : "text-muted-foreground/80")}>متوازن</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* أزرار الإجراءات والتطبيق */}
        {!showSaveForm ? (
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => onApply(rows, cols)}
              className="flex-1 h-9 text-xs font-bold rounded-md transition-all border active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-xs bg-primary text-primary-foreground border-primary hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <GridFour className="w-4 h-4" weight="bold" />
              <span>{isCustomActive ? "تحديث وتطبيق الشبكة" : "تطبيق التقسيم"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveName(`كولاج مخصص ${rows}×${cols}`);
                setShowSaveForm(true);
              }}
              className="w-9 h-9 text-xs font-bold rounded-md border border-border/80 bg-background hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center active:scale-[0.98] transition-all shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              title="حفظ كقالب جديد في مكتبتي"
            >
              <Folder className="w-4 h-4" weight="duotone" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/80 shadow-2xs animate-in slide-in-from-top-2 duration-200">
            <span className="text-[10px] font-bold text-muted-foreground block">اسم القالب الجديد</span>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="مثال: شيت البطاقة الوطنية"
              className="w-full h-8 px-3 text-xs bg-background border border-border/80 rounded-md text-right font-cairo focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSaveForm(false)}
                className="flex-1 h-8 text-[10px] font-bold rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <X className="w-3 h-3" weight="bold" />
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 h-8 text-[10px] font-bold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <FloppyDisk className="w-3 h-3" weight="bold" />
                حفظ القالب
              </button>
            </div>
          </div>
        )}
      </FluentSection>
    </div>
  );
}
