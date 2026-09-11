import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GridFour,
  Plus,
  Minus,
  Crosshair,
  X,
  FloppyDisk,
  CornersOut,
  Rows,
  Ruler,
  Scissors,
} from "@phosphor-icons/react";
import { PhotoGridType, GridAlignment, getGridLimits, getPhotoDimensions } from "./collage-grid-math";

/* ═══════════════════════════════════════════════════════════════
   تبويب الشبكة — تصميم Fluent 2 مريح ومتخصص حصراً في
   تخطيط وأبعاد ومقاسات شبكة صور الكولاج
   ═══════════════════════════════════════════════════════════════ */

/** مقاس الوثيقة كرسم مصغر متناسق الأبعاد بصرياً */
function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active ? "border-primary bg-primary/20 text-primary" : "border-border/80 bg-muted/40 text-muted-foreground/60";

  if (type === "stretch") {
    return (
      <div className={cn("w-5 h-5 rounded-xs border border-dashed flex items-center justify-center transition-all", activeBorder)}>
        <span className="text-[10px] font-mono font-black leading-none">⤢</span>
      </div>
    );
  }

  // تمثيل نسبي دقيق لشكل وأبعاد كل وثيقة رسمية
  const ratioStyles: Record<string, string> = {
    visa: "w-5 h-5 rounded-xs", // مربع 1:1
    "iq-national-id": "w-4.5 h-6 rounded-xs", // 35:45 عمودي
    "iq-civil-id": "w-4.5 h-5.5 rounded-xs", // 32:40 عمودي
    "iq-general-id": "w-4 h-6 rounded-xs", // 40:60 عمودي مستطيل
    "iq-transactions": "w-4 h-5 rounded-xs", // 30:40 مدمج
  };
  const styleClass = ratioStyles[type] || "w-4.5 h-5.5 rounded-xs";

  return (
    <div className={cn(styleClass, "border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
      <div className="w-2 h-2 rounded-full border border-current opacity-85 mt-0.5 shrink-0" />
      <div className="w-3 h-1.5 rounded-t-full bg-current opacity-60 -mb-0.5 shrink-0" />
    </div>
  );
}

/** ترويسة بطاقة فرعية متوافقة مع Fluent 2 */
function SectionCardHeader({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 select-none mb-2">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-xs font-bold text-foreground">{title}</span>
      </div>
      {badge && <div>{badge}</div>}
    </div>
  );
}

const ALIGNMENT_MATRIX: GridAlignment[][] = [
  ["top-left", "top-center", "top-right"],
  ["center-left", "center", "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const ALIGNMENT_LABELS: Record<GridAlignment, string> = {
  "top-left": "أعلى اليسار",
  "top-center": "أعلى الوسط",
  "top-right": "أعلى اليمين",
  "center-left": "منتصف اليسار",
  "center": "توسيط",
  "center-right": "منتصف اليمين",
  "bottom-left": "أسفل اليسار",
  "bottom-center": "أسفل الوسط",
  "bottom-right": "أسفل اليمين",
};

const PHOTO_TYPE_OPTIONS = [
  { value: "iq-national-id", label: "وطنية", dim: "35×45" },
  { value: "iq-civil-id", label: "أحوال", dim: "32×40" },
  { value: "visa", label: "فيزا", dim: "50×50" },
  { value: "iq-general-id", label: "عامة", dim: "40×60" },
  { value: "iq-transactions", label: "معاملات", dim: "30×40" },
  { value: "stretch", label: "تمدد حر", dim: "ملء الحيز" },
] as const;

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
  /** اختياري: لون الخلفية يُدار أساسياً في تبويب الورقة */
  backgroundColor?: string;
  onBackgroundColorChange?: (hex: string) => void;
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
  const isMaxFill = rows === maxRows && cols === maxCols;
  const totalPhotos = rows * cols;
  const coverage = (() => {
    if (photoType === "stretch") return Math.min(100, Math.round(totalPhotos * (1 / totalPhotos) * 100));
    const { wMM, hMM } = getPhotoDimensions(photoType);
    const paperWmm = (canvasWidth / storedDpi) * 25.4;
    const paperHmm = (canvasHeight / storedDpi) * 25.4;
    const wRel = Math.min(1, wMM / paperWmm);
    const hRel = Math.min(1, hMM / paperHmm);
    return Math.min(100, Math.round(totalPhotos * wRel * hRel * 100));
  })();

  const handleFillSheet = () => {
    onRowsChange(maxRows);
    onColsChange(maxCols);
    onApply(maxRows, maxCols);
  };

  const handleCornerStrip = () => {
    const targetCols = Math.min(4, maxCols);
    onRowsChange(1);
    onColsChange(targetCols);
    onGridAlignChange("top-left");
    onApply(1, targetCols, photoType, "top-left");
  };

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
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* ═══ بطاقة 1: أبعاد الشبكة والصفوف والأعمدة ═══ */}
      <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-3">
        <SectionCardHeader
          icon={<GridFour className="w-3.5 h-3.5" weight="duotone" />}
          title="أبعاد الشبكة"
          badge={
            <div className="flex items-center gap-1.5 select-none">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25 flex items-center gap-1"
                title="إجمالي الصور على الورقة"
              >
                <span className="font-mono">{totalPhotos}</span>
                <span>صور</span>
              </span>
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60"
                title="نسبة استغلال مساحة الورقة"
              >
                {coverage}%
              </span>
            </div>
          }
        />

        {/* عدادات الصفوف والأعمدة — شبكة ثنائية متوازنة */}
        <div className="grid grid-cols-2 gap-2">
          {/* عداد الصفوف */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-background/60 border border-border/60">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground select-none">
              <span>الصفوف</span>
              <span className="text-[9px] font-mono font-normal opacity-70">أقصى {maxRows}</span>
            </div>
            <div className="flex items-center justify-between gap-1" dir="ltr">
              <button
                type="button"
                disabled={rows <= 1}
                onClick={() => onRowsChange(Math.max(1, rows - 1))}
                title="تقليل صف"
                className="w-7 h-7 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Minus className="w-3 h-3" weight="bold" />
              </button>
              <span className="font-mono text-sm font-black text-foreground select-none">
                {rows}
              </span>
              <button
                type="button"
                disabled={rows >= maxRows}
                onClick={() => onRowsChange(Math.min(maxRows, rows + 1))}
                title={`إضافة صف (الحد الأقصى ${maxRows})`}
                className="w-7 h-7 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            </div>
          </div>

          {/* عداد الأعمدة */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-background/60 border border-border/60">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground select-none">
              <span>الأعمدة</span>
              <span className="text-[9px] font-mono font-normal opacity-70">أقصى {maxCols}</span>
            </div>
            <div className="flex items-center justify-between gap-1" dir="ltr">
              <button
                type="button"
                disabled={cols <= 1}
                onClick={() => onColsChange(Math.max(1, cols - 1))}
                title="تقليل عمود"
                className="w-7 h-7 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Minus className="w-3 h-3" weight="bold" />
              </button>
              <span className="font-mono text-sm font-black text-foreground select-none">
                {cols}
              </span>
              <button
                type="button"
                disabled={cols >= maxCols}
                onClick={() => onColsChange(Math.min(maxCols, cols + 1))}
                title={`إضافة عمود (الحد الأقصى ${maxCols})`}
                className="w-7 h-7 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* إجراءات التعبئة السريعة للورقة — أزرار ثانوية متزنة بصرياً */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleFillSheet}
            title={`ملء كامل الورقة بأقصى عدد (${maxRows * maxCols} صورة)`}
            className={cn(
              "h-8 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none flex items-center justify-between border active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              isMaxFill
                ? "bg-primary/10 text-primary border-primary/50 shadow-xs ring-1 ring-primary/25 font-bold"
                : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70 hover:border-primary/40"
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <CornersOut className="w-3.5 h-3.5 shrink-0 text-primary" weight="bold" />
              <span>ملء الورقة</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80 border border-border/40">
              {maxRows * maxCols}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCornerStrip}
            title="شريط زاوية علوي (4 صور) لحفظ مساحة بقية الورقة"
            className={cn(
              "h-8 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none flex items-center justify-between border active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              rows === 1 && cols === Math.min(4, maxCols) && gridAlign === "top-left"
                ? "bg-primary/10 text-primary border-primary/50 shadow-xs ring-1 ring-primary/25 font-bold"
                : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70 hover:border-primary/40"
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Rows className="w-3.5 h-3.5 shrink-0 text-primary" weight="bold" />
              <span>شريط سريع</span>
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted/60 text-foreground/80 border border-border/40">
              {Math.min(4, maxCols)}
            </span>
          </button>
        </div>
      </div>

      {/* ═══ بطاقة 2: مقاس الوثيقة الرسمي ═══ */}
      <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2.5">
        <SectionCardHeader
          icon={<Ruler className="w-3.5 h-3.5" weight="duotone" />}
          title="مقاس الصورة"
          badge={
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 select-none">
              {photoType === "stretch" ? "تلقائي" : `${getPhotoDimensions(photoType).wMM}×${getPhotoDimensions(photoType).hMM} مم`}
            </span>
          }
        />

        {/* شبكة خيارات المقاسات — شبكة ثنائية متوازنة مع عزل أرقام BiDi الصحيح */}
        <div className="grid grid-cols-2 gap-1.5">
          {PHOTO_TYPE_OPTIONS.map((opt) => {
            const isActive = photoType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onPhotoTypeChange(opt.value as PhotoGridType)}
                className={cn(
                  "h-10 px-2 rounded-lg border transition-all cursor-pointer active:scale-95 select-none flex items-center gap-2 text-right focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  isActive
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                    : "bg-background/80 border-border/60 hover:bg-muted/40 hover:border-primary/40"
                )}
              >
                <div className="w-6 h-6 rounded-md bg-muted/50 border border-border/40 flex items-center justify-center shrink-0">
                  <DocumentPresetGraphic type={opt.value} active={isActive} />
                </div>
                <div className="min-w-0 flex-1 leading-tight text-right">
                  <div className={cn("text-[11px] font-bold truncate", isActive ? "text-primary" : "text-foreground")}>
                    {opt.label}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-mono mt-0.5" dir="rtl">
                    {opt.value !== "stretch" ? (
                      <>
                        <span dir="ltr" className="font-bold text-foreground/80">{opt.dim}</span>
                        <span className="font-cairo text-[8.5px]">مم</span>
                      </>
                    ) : (
                      <span className="font-cairo text-[8.5px]">{opt.dim}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ بطاقة 3: المحاذاة على الورقة (تظهر فقط عند تثبيت المقاس) ═══ */}
      {photoType !== "stretch" && (
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2.5 animate-in fade-in duration-200">
          <SectionCardHeader
            icon={<Crosshair className="w-3.5 h-3.5" weight="duotone" />}
            title="المحاذاة على الورقة"
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 select-none">
                {gridAlign === "top-left" ? "ركن القص" : gridAlign === "center" ? "توسيط" : ALIGNMENT_LABELS[gridAlign]}
              </span>
            }
          />

          <div className="flex items-center gap-2.5">
            {/* مجسم مصغر للورقة والشبكة (Miniature Paper Sheet Proxy) */}
            <div
              className="w-[74px] h-[74px] rounded-lg border border-border/80 bg-background/95 p-1 grid grid-cols-3 grid-rows-3 gap-0.5 shrink-0 shadow-2xs select-none relative overflow-hidden"
              dir="ltr"
              title="مصفوفة نقاط ارتكاز الصور على الورقة"
            >
              {/* إطار الهامش الداخلي للورقة لتعزيز الإدراك البصري */}
              <div className="absolute inset-2 pointer-events-none border border-dashed border-border/60 rounded-xs" />

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
                      className="relative z-10 flex items-center justify-center rounded-xs transition-all cursor-pointer group hover:bg-primary/10"
                    >
                      <span
                        className={cn(
                          "rounded-full transition-all duration-150",
                          isActive
                            ? "w-3 h-3 bg-primary shadow-xs ring-3 ring-primary/30 scale-105"
                            : "w-2 h-2 bg-muted-foreground/50 border border-border/40 group-hover:bg-primary group-hover:scale-125"
                        )}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* أزرار المحاذاة الشائعة المتناسقة هرمياً */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {/* خيار ركن القص */}
              <button
                type="button"
                onClick={() => onGridAlignChange("top-left")}
                className={cn(
                  "h-[34px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer select-none active:scale-[0.98]",
                  gridAlign === "top-left"
                    ? "bg-primary/12 text-primary border-primary/60 shadow-xs font-bold ring-1 ring-primary/25"
                    : "bg-background/80 hover:bg-muted text-foreground/80 hover:text-foreground border-border/70 hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      gridAlign === "top-left"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground"
                    )}
                  >
                    <Scissors className="w-3 h-3" weight="bold" />
                  </div>
                  <span className="truncate">ركن القص</span>
                </div>
                <span
                  className={cn(
                    "text-[9.5px] px-1.5 py-0.5 rounded-sm border shrink-0 font-medium",
                    gridAlign === "top-left"
                      ? "bg-primary/15 text-primary border-primary/30 font-bold"
                      : "bg-muted/50 text-muted-foreground border-border/40"
                  )}
                >
                  أعلى اليسار
                </span>
              </button>

              {/* خيار التوسيط */}
              <button
                type="button"
                onClick={() => onGridAlignChange("center")}
                className={cn(
                  "h-[34px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all border cursor-pointer select-none active:scale-[0.98]",
                  gridAlign === "center"
                    ? "bg-primary/12 text-primary border-primary/60 shadow-xs font-bold ring-1 ring-primary/25"
                    : "bg-background/80 hover:bg-muted text-foreground/80 hover:text-foreground border-border/70 hover:border-primary/40"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      gridAlign === "center"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground"
                    )}
                  >
                    <Crosshair className="w-3 h-3" weight="bold" />
                  </div>
                  <span className="truncate">توسيط</span>
                </div>
                <span
                  className={cn(
                    "text-[9.5px] px-1.5 py-0.5 rounded-sm border shrink-0 font-medium",
                    gridAlign === "center"
                      ? "bg-primary/15 text-primary border-primary/30 font-bold"
                      : "bg-muted/50 text-muted-foreground border-border/40"
                  )}
                >
                  المنتصف
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ بطاقة 4: إجراءات التطبيق والحفظ ═══ */}
      <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2">
        {!showSaveForm ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApply(rows, cols)}
              className={cn(
                "flex-1 h-8.5 text-xs font-bold rounded-lg transition-all border active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
                isCustomActive
                  ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  : "bg-primary/90 hover:bg-primary text-primary-foreground border-primary"
              )}
            >
              <GridFour className="w-4 h-4" weight="bold" />
              <span>تطبيق الشبكة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSaveName(`شبكة ${rows}×${cols} — ${getPhotoDimensions(photoType).label.split(" ")[0]}`);
                setShowSaveForm(true);
              }}
              className="h-8.5 px-3.5 text-xs font-bold rounded-lg border border-border/80 bg-background hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              title="حفظ التخطيط كقالب دائم في مكتبتي"
            >
              <FloppyDisk className="w-4 h-4" weight="duotone" />
              <span>حفظ كقالب</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-lg border border-border/80 shadow-2xs animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="اسم القالب، مثال: شيت البطاقة الوطنية"
              className="flex-1 h-8 px-2.5 text-xs bg-background border border-border/80 rounded-md text-right font-cairo focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="w-8 h-8 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="إلغاء"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-8 px-3 text-xs font-bold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <FloppyDisk className="w-3.5 h-3.5" weight="bold" />
              <span>حفظ</span>
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/85 font-medium text-center leading-relaxed select-none pb-1">
        الحد الأقصى لهذه الورقة: <span className="font-mono font-bold text-foreground" dir="ltr">{maxRows}×{maxCols}</span> صور ({maxRows * maxCols} إجمالي)
      </p>
    </div>
  );
}
