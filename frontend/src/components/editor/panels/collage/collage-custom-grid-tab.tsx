import React, { useState } from "react";
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
  Check,
  CheckCircle,
} from "@phosphor-icons/react";
import { PhotoGridType, GridAlignment, getGridLimits, getPhotoDimensions } from "./collage-grid-math";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FluentSection } from "@/components/ui/blocks";

/* ═══════════════════════════════════════════════════════════════
   تبويب الشبكة — تصميم Fluent 2 مريح ومتخصص حصراً في
   تخطيط وأبعاد ومقاسات شبكة صور الكولاج
   ═══════════════════════════════════════════════════════════════ */

/** حلقة التركيز المزدوجة الموحّدة (Dual Focus Ring) — المعيار الإلزامي */
const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

/** زر عداد مدمج (h-7 = مقياس Compact Controls) */
const COUNTER_BTN = cn(
  "w-7 h-7 rounded-md border border-border/60 bg-muted/60 text-muted-foreground flex items-center justify-center shadow-2xs cursor-pointer transition-colors",
  "hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:bg-primary/20",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted/60 disabled:hover:text-muted-foreground disabled:hover:border-border/60",
  FOCUS_RING
);

/** مقاس الوثيقة كرسم مصغر متناسق الأبعاد بصرياً */
function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active
    ? "border-primary bg-primary/15 text-primary"
    : "border-border/80 bg-muted/50 text-muted-foreground/70";

  if (type === "stretch") {
    return (
      <div className={cn("w-7 h-7 rounded-md border border-dashed flex items-center justify-center transition-colors", activeBorder)}>
        <CornersOut className="w-3.5 h-3.5" weight="bold" />
      </div>
    );
  }

  // تمثيل نسبي دقيق لشكل وأبعاد كل وثيقة رسمية
  const ratioStyles: Record<string, string> = {
    visa: "w-5 h-5 rounded-md", // مربع 1:1
    "iq-national-id": "w-4 h-6 rounded-md", // 35:45 عمودي
    "iq-civil-id": "w-4 h-6 rounded-md", // 32:40 عمودي
    "iq-general-id": "w-4 h-6 rounded-md", // 40:60 عمودي مستطيل
    "iq-transactions": "w-4 h-5 rounded-md", // 30:40 مدمج
  };
  const styleClass = ratioStyles[type] || "w-4 h-6 rounded-md";

  return (
    <div
      aria-hidden="true"
      className={cn(styleClass, "border flex flex-col items-center justify-center p-0.5 transition-colors relative overflow-hidden", activeBorder)}
    >
      <div className="w-2 h-2 rounded-full border border-current opacity-85 mt-0.5 shrink-0" />
      <div className="w-3 h-1.5 rounded-t-full bg-current opacity-60 -mb-0.5 shrink-0" />
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

/** ترتيب المسح الشبكي لتسهيل تنقل لوحة المفاتيح في مصفوفة 3×3 */
const ALIGNMENT_ORDER: GridAlignment[] = ALIGNMENT_MATRIX.flat();

const PHOTO_TYPE_OPTIONS = [
  { value: "iq-national-id", label: "وطنية", dim: "35×45", sub: "مم" },
  { value: "iq-civil-id", label: "أحوال", dim: "32×40", sub: "مم" },
  { value: "visa", label: "فيزا", dim: "50×50", sub: "مم" },
  { value: "iq-general-id", label: "عامة", dim: "40×60", sub: "مم" },
  { value: "iq-transactions", label: "معاملات", dim: "30×40", sub: "مم" },
  { value: "stretch", label: "تمدد حر", dim: "ملء الحيز", sub: "" },
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

export const CollageCustomGridTab = React.memo(function CollageCustomGridTab({
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
  const maxPhotos = maxRows * maxCols;
  const totalPhotos = rows * cols;
  const isMaxFill = rows === maxRows && cols === maxCols;
  const isCornerStrip = rows === 1 && cols === Math.min(4, maxCols) && gridAlign === "top-left";

  // نسبة تغطية الورقة: التمدد الحر يملأ الورقة دائماً 100%،
  // والمقاسات الفيزيائية تُحسب من مجموع مساحات الصور مقابل مساحة الورقة.
  const coverage = (() => {
    if (photoType === "stretch") return 100;
    const { wMM, hMM } = getPhotoDimensions(photoType);
    const paperWmm = (canvasWidth / storedDpi) * 25.4;
    const paperHmm = (canvasHeight / storedDpi) * 25.4;
    const wRel = Math.min(1, wMM / paperWmm);
    const hRel = Math.min(1, hMM / paperHmm);
    return Math.min(100, Math.round(totalPhotos * wRel * hRel * 100));
  })();

  // تُطبَّق التعبئة السريعة بنداء واحد نهائي (لا حالات وسيطة تُلوّث سجل التراجع)
  const handleFillSheet = () => {
    onApply(maxRows, maxCols, photoType, gridAlign);
  };

  const handleCornerStrip = () => {
    onApply(1, Math.min(4, maxCols), photoType, "top-left");
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

  /** تنقل لوحة المفاتيح داخل مصفوفة المحاذاة (Roving Tabindex) */
  const handleAlignKeyDown = (e: React.KeyboardEvent, align: GridAlignment) => {
    const deltas: Record<string, number> = {
      ArrowLeft: 1,
      ArrowRight: -1,
      ArrowUp: -3,
      ArrowDown: 3,
    };
    const delta = deltas[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const nextIndex = Math.max(0, Math.min(8, ALIGNMENT_ORDER.indexOf(align) + delta));
    onGridAlignChange(ALIGNMENT_ORDER[nextIndex]);
  };

  const sizeBadge =
    photoType === "stretch"
      ? "تلقائي"
      : `${getPhotoDimensions(photoType).wMM}×${getPhotoDimensions(photoType).hMM} مم`;

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* ═══ بطاقة 1: أبعاد الشبكة والصفوف والأعمدة ═══ */}
      <FluentSection
        icon={<GridFour className="w-3.5 h-3.5" weight="duotone" />}
        title="أبعاد الشبكة"
        subtitle={
          <>
            الحد الأقصى <span className="font-mono font-bold text-foreground/80" dir="ltr">{maxRows}×{maxCols}</span> صور ({maxPhotos})
          </>
        }
        collapsible
        action={
          <div className="flex items-center gap-1.5 select-none">
            <span
              className="h-5 text-2xs font-bold px-2 rounded-full bg-primary/10 text-primary border border-primary/25 flex items-center gap-1"
              title="إجمالي الصور في الشبكة الحالية"
            >
              <span className="font-mono" dir="ltr">{totalPhotos}</span>
              <span>صور</span>
            </span>
            <span
              className="h-5 text-2xs font-mono font-bold px-2 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center"
              title="نسبة تغطية الورقة"
            >
              {coverage}%
            </span>
          </div>
        }
      >
        {/* عدادات الصفوف والأعمدة — شبكة ثنائية متوازنة */}
        <div className="grid grid-cols-2 gap-2">
          {/* عداد الصفوف */}
          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center justify-between gap-1 text-mini font-bold text-muted-foreground select-none">
              <span>الصفوف</span>
              <span className="text-2xs font-mono font-normal" title="الحد الأقصى للصفوف">أقصى {maxRows}</span>
            </div>
            <div className="flex items-center justify-between gap-1" role="group" aria-label="عدد الصفوف">
              <button
                type="button"
                disabled={rows <= 1}
                onClick={() => onRowsChange(Math.max(1, rows - 1))}
                title="تقليل صف"
                aria-label="تقليل عدد الصفوف"
                className={COUNTER_BTN}
              >
                <Minus className="w-3 h-3" weight="bold" />
              </button>
              <span
                aria-live="polite"
                className="text-xs font-mono font-bold text-foreground select-none"
              >
                {rows}
              </span>
              <button
                type="button"
                disabled={rows >= maxRows}
                onClick={() => onRowsChange(Math.min(maxRows, rows + 1))}
                title={`إضافة صف (الحد الأقصى ${maxRows})`}
                aria-label="زيادة عدد الصفوف"
                className={COUNTER_BTN}
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            </div>
          </div>

          {/* عداد الأعمدة */}
          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center justify-between gap-1 text-mini font-bold text-muted-foreground select-none">
              <span>الأعمدة</span>
              <span className="text-2xs font-mono font-normal" title="الحد الأقصى للأعمدة">أقصى {maxCols}</span>
            </div>
            <div className="flex items-center justify-between gap-1" role="group" aria-label="عدد الأعمدة">
              <button
                type="button"
                disabled={cols <= 1}
                onClick={() => onColsChange(Math.max(1, cols - 1))}
                title="تقليل عمود"
                aria-label="تقليل عدد الأعمدة"
                className={COUNTER_BTN}
              >
                <Minus className="w-3 h-3" weight="bold" />
              </button>
              <span
                aria-live="polite"
                className="text-xs font-mono font-bold text-foreground select-none"
              >
                {cols}
              </span>
              <button
                type="button"
                disabled={cols >= maxCols}
                onClick={() => onColsChange(Math.min(maxCols, cols + 1))}
                title={`إضافة عمود (الحد الأقصى ${maxCols})`}
                aria-label="زيادة عدد الأعمدة"
                className={COUNTER_BTN}
              >
                <Plus className="w-3 h-3" weight="bold" />
              </button>
            </div>
          </div>
        </div>

        {/* تعبئة سريعة — صفوف بعرض كامل حتى لا يُقتطع أي نص عربي مهما ضاق الشريط */}
        <div className="flex flex-col gap-1 p-1 rounded-lg bg-muted/50 border border-border/70 shadow-2xs">
          <button
            type="button"
            onClick={handleFillSheet}
            title={`ملء الورقة (${maxPhotos} صورة) — يُطبَّق فوراً`}
            className={cn(
              "h-7 px-2.5 rounded-md text-mini font-sans font-medium transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 border",
              isMaxFill
                ? "bg-card text-foreground border-border/80 shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60 border-transparent",
              FOCUS_RING
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 font-sans whitespace-nowrap">
              <CornersOut className={cn("w-3.5 h-3.5 shrink-0", isMaxFill ? "text-primary" : "text-muted-foreground")} weight="bold" />
              <span>ملء الورقة</span>
            </span>
            <span
              className={cn(
                "text-2xs font-mono px-1.5 py-0.5 rounded-sm border shrink-0",
                isMaxFill
                  ? "bg-muted text-foreground border-border/70 font-bold"
                  : "bg-muted/50 text-muted-foreground border-border/40"
              )}
            >
              {maxPhotos}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCornerStrip}
            title={`صف واحد بأربع صور في أعلى اليسار (${Math.min(4, maxCols)} صور) — يُطبَّق فوراً`}
            className={cn(
              "h-7 px-2.5 rounded-md text-mini font-sans font-medium transition-colors cursor-pointer select-none flex items-center justify-between gap-1.5 border",
              isCornerStrip
                ? "bg-card text-foreground border-border/80 shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60 border-transparent",
              FOCUS_RING
            )}
          >
            <span className="flex items-center gap-1.5 min-w-0 font-sans whitespace-nowrap">
              <Rows className={cn("w-3.5 h-3.5 shrink-0", isCornerStrip ? "text-primary" : "text-muted-foreground")} weight="bold" />
              <span>شريط علوي</span>
            </span>
            <span
              className={cn(
                "text-2xs font-mono px-1.5 py-0.5 rounded-sm border shrink-0",
                isCornerStrip
                  ? "bg-muted text-foreground border-border/70 font-bold"
                  : "bg-muted/50 text-muted-foreground border-border/40"
              )}
            >
              {Math.min(4, maxCols)}
            </span>
          </button>
        </div>
      </FluentSection>

      {/* ═══ بطاقة 2: مقاس الوثيقة الرسمي ═══ */}
      <FluentSection
        icon={<Ruler className="w-3.5 h-3.5" weight="duotone" />}
        title="مقاس الصورة"
        collapsible
        action={
          <span className="h-5 text-2xs font-bold font-mono px-2 rounded-full bg-primary/10 text-primary border border-primary/25 flex items-center select-none">
            {photoType === "stretch" ? "تلقائي" : sizeBadge}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {PHOTO_TYPE_OPTIONS.map((opt) => {
            const isActive = photoType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={isActive}
                title={`${opt.label} — ${opt.dim}`}
                onClick={() => onPhotoTypeChange(opt.value as PhotoGridType)}
                className={cn(
                  "h-8 px-2 rounded-md border font-sans transition-colors cursor-pointer select-none flex items-center gap-2 text-right",
                  isActive
                    ? "border-primary bg-primary/10 shadow-2xs"
                    : "bg-background/80 border-border/60 hover:bg-muted/50 hover:border-primary/40",
                  FOCUS_RING
                )}
              >
                <span className="w-7 h-7 rounded-md bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
                  <DocumentPresetGraphic type={opt.value} active={isActive} />
                </span>
                <span className="min-w-0 flex-1 leading-tight text-right font-sans">
                  <span className={cn("block text-xs truncate", isActive ? "text-primary font-semibold" : "text-foreground font-medium")}>
                    {opt.label}
                  </span>
                  <span className="flex items-center gap-1 text-micro text-muted-foreground font-mono mt-0.5">
                    <span dir="ltr" className="text-foreground/75">{opt.dim}</span>
                    {opt.sub && <span>{opt.sub}</span>}
                  </span>
                </span>
                {/* تأكيد بصري غير لوني للخيار المحدد */}
                {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" weight="bold" />}
              </button>
            );
          })}
        </div>
      </FluentSection>

      {/* ═══ بطاقة 3: المحاذاة على الورقة (تظهر فقط عند تثبيت المقاس) ═══ */}
      {photoType !== "stretch" && (
        <FluentSection
          icon={<Crosshair className="w-3.5 h-3.5" weight="duotone" />}
          title="المحاذاة على الورقة"
          collapsible
        >
          <div className="flex items-center gap-2">
            {/* مصفوفة الارتكاز — dir="ltr" مقصودة: خريطة مكانية للورقة لا نص متدفق */}
            <div
              role="radiogroup"
              aria-label="نقطة ارتكاز الصور على الورقة"
              className="w-[72px] h-[72px] rounded-lg border border-border/80 bg-background/95 p-1 grid grid-cols-3 grid-rows-3 gap-0.5 shrink-0 shadow-2xs select-none relative overflow-hidden"
              dir="ltr"
            >
              <div className="absolute inset-2 pointer-events-none border border-dashed border-border/60 rounded-md" />
              {ALIGNMENT_MATRIX.map((row) =>
                row.map((alignId) => {
                  const isActive = gridAlign === alignId;
                  return (
                    <button
                      key={alignId}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      aria-label={ALIGNMENT_LABELS[alignId]}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => onGridAlignChange(alignId)}
                      onKeyDown={(e) => handleAlignKeyDown(e, alignId)}
                      title={ALIGNMENT_LABELS[alignId]}
                      className={cn(
                        "relative flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-primary/10",
                        FOCUS_RING
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "rounded-full transition-colors duration-150",
                          isActive
                            ? "w-3 h-3 bg-primary shadow-xs ring-3 ring-primary/30"
                            : "w-2 h-2 bg-muted-foreground/50 border border-border/40 group-hover:bg-primary"
                        )}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* اختصارا الموضعين الأكثر استخداماً في طباعة الوثائق */}
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <button
                type="button"
                aria-pressed={gridAlign === "top-left"}
                onClick={() => onGridAlignChange("top-left")}
                className={cn(
                  "h-8 px-2.5 rounded-md text-xs font-semibold flex items-center justify-between gap-2 border cursor-pointer select-none transition-colors",
                  gridAlign === "top-left"
                    ? "bg-primary/10 border-primary/60 text-primary"
                    : "bg-card/60 border-border/60 text-foreground/80 hover:bg-muted hover:border-border",
                  FOCUS_RING
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Scissors className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span className="truncate">ركن القص</span>
                </span>
                <span className="text-2xs font-mono text-muted-foreground shrink-0">0،0</span>
              </button>

              <button
                type="button"
                aria-pressed={gridAlign === "center"}
                onClick={() => onGridAlignChange("center")}
                className={cn(
                  "h-8 px-2.5 rounded-md text-xs font-semibold flex items-center justify-between gap-2 border cursor-pointer select-none transition-colors",
                  gridAlign === "center"
                    ? "bg-primary/10 border-primary/60 text-primary"
                    : "bg-card/60 border-border/60 text-foreground/80 hover:bg-muted hover:border-border",
                  FOCUS_RING
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Crosshair className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span className="truncate">توسيط</span>
                </span>
                <span className="text-2xs font-mono text-muted-foreground shrink-0">50%</span>
              </button>
            </div>
          </div>
        </FluentSection>
      )}

      {/* ═══ بطاقة 4: إجراءات التطبيق والحفظ ═══ */}
      <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2">
        {!showSaveForm ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isCustomActive ? "outline" : "default"}
              className="flex-1"
              onClick={() => onApply(rows, cols, photoType, gridAlign)}
              title={isCustomActive ? "الشبكة مطبقة على الكانفس — إعادة التطبيق" : "تطبيق الشبكة على الكانفس"}
            >
              {isCustomActive ? (
                <CheckCircle className="w-4 h-4 text-primary" weight="bold" />
              ) : (
                <GridFour className="w-4 h-4" weight="bold" />
              )}
              <span>{isCustomActive ? "الشبكة مطبقة" : "تطبيق الشبكة"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaveName(`شبكة ${rows}×${cols} — ${getPhotoDimensions(photoType).label.split(" ")[0]}`);
                setShowSaveForm(true);
              }}
              title="حفظ في المكتبة"
            >
              <FloppyDisk className="w-4 h-4" weight="duotone" />
              <span>حفظ كقالب</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-lg border border-border/80 shadow-2xs animate-in slide-in-from-top-2 duration-200">
            <Input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="اسم القالب، مثال: شيت البطاقة الوطنية"
              aria-label="اسم القالب"
              className="flex-1 text-right font-cairo"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowSaveForm(false)}
              title="إلغاء"
              aria-label="إلغاء حفظ القالب"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </Button>
            <Button type="button" onClick={handleSave}>
              <FloppyDisk className="w-3.5 h-3.5" weight="bold" />
              <span>حفظ</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
