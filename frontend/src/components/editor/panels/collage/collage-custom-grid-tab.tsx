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
} from "@phosphor-icons/react";
import { PhotoGridType, GridAlignment, getGridLimits, getPhotoDimensions } from "./collage-grid-math";

/* ═══════════════════════════════════════════════════════════════
   تبويب الشبكة — تصميم Fluent 2 مريح ومتخصص حصراً في
   تخطيط وأبعاد ومقاسات شبكة صور الكولاج
   ═══════════════════════════════════════════════════════════════ */

/** مقاس الوثيقة كرسم مصغر (silhouette بورتريه داخل إطار بمقياس نسبي) */
function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active ? "border-primary bg-primary/20" : "border-muted-foreground/40 bg-muted/30";
  const activeIcon = active ? "text-primary" : "text-muted-foreground/60";

  if (type === "stretch") {
    return (
      <div className={cn("w-4 h-4 rounded-[2px] border border-dashed flex items-center justify-center transition-all", activeBorder)}>
        <span className={cn("text-[8px] font-mono font-black leading-none", active ? "text-primary" : "text-muted-foreground/50")}>
          ⤢
        </span>
      </div>
    );
  }

  const dims: Record<string, { w: string; h: string }> = {
    visa: { w: "w-4", h: "h-4" },
    "iq-national-id": { w: "w-3.5", h: "h-4.5" },
    "iq-civil-id": { w: "w-3.5", h: "h-4" },
    "iq-general-id": { w: "w-3", h: "h-5" },
    "iq-transactions": { w: "w-3", h: "h-4" },
  };
  const d = dims[type] || { w: "w-3.5", h: "h-4" };

  return (
    <div className={cn(d.w, d.h, "rounded-[2px] border flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden", activeBorder)}>
      <div className={cn("w-1.5 h-1.5 rounded-full border border-current opacity-80 mt-0.5 shrink-0", activeIcon)} />
      <div className={cn("w-2.5 h-1.5 rounded-t-full bg-current opacity-50 -mb-0.5 shrink-0", activeIcon)} />
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
  { value: "iq-national-id", label: "وطنية", sub: "35×45 مم" },
  { value: "iq-civil-id", label: "أحوال", sub: "32×40 مم" },
  { value: "visa", label: "فيزا", sub: "50×50 مم" },
  { value: "iq-general-id", label: "عامة", sub: "40×60 مم" },
  { value: "iq-transactions", label: "معاملات", sub: "30×40 مم" },
  { value: "stretch", label: "تمدد حر", sub: "ملء الحيز" },
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
    <div className="flex flex-col gap-2.5 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* ═══ بطاقة 1: أبعاد الشبكة والصفوف والأعمدة ═══ */}
      <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2.5">
        <SectionCardHeader
          icon={<GridFour className="w-3.5 h-3.5" weight="duotone" />}
          title="أبعاد الشبكة"
          badge={
            <div className="flex items-center gap-1.5" dir="ltr">
              <span
                className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 select-none"
                title="إجمالي الصور على الورقة"
              >
                {totalPhotos}×
              </span>
              <span
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60 select-none"
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

        {/* إجراءات التعبئة السريعة للورقة */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={handleFillSheet}
            title={`ملء كامل الورقة بأقصى عدد (${maxRows * maxCols} صورة)`}
            className={cn(
              "h-7.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none flex items-center justify-between border active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              isMaxFill
                ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/40"
                : "bg-muted/40 hover:bg-muted text-foreground border-border/60 hover:border-primary/40"
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <CornersOut className="w-3.5 h-3.5 shrink-0 text-primary" weight="bold" />
              <span>ملء الورقة</span>
            </span>
            <span
              className={cn(
                "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border",
                isMaxFill
                  ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                  : "bg-background/80 text-foreground border-border/50"
              )}
              dir="ltr"
            >
              {maxRows * maxCols}×
            </span>
          </button>

          <button
            type="button"
            onClick={handleCornerStrip}
            title="شريط زاوية علوي (4 صور) — يحفظ بقية مساحة الورقة"
            className={cn(
              "h-7.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none flex items-center justify-between border active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              rows === 1 && cols === Math.min(4, maxCols) && gridAlign === "top-left"
                ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/40"
                : "bg-muted/40 hover:bg-muted text-foreground border-border/60 hover:border-primary/40"
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Rows className="w-3.5 h-3.5 shrink-0 text-primary" weight="bold" />
              <span>شريط سريع</span>
            </span>
            <span
              className={cn(
                "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border",
                rows === 1 && cols === Math.min(4, maxCols) && gridAlign === "top-left"
                  ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                  : "bg-background/80 text-foreground border-border/50"
              )}
              dir="ltr"
            >
              {Math.min(4, maxCols)}×
            </span>
          </button>
        </div>
      </div>

      {/* ═══ بطاقة 2: مقاس الوثيقة الرسمي ═══ */}
      <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2">
        <SectionCardHeader
          icon={<Ruler className="w-3.5 h-3.5" weight="duotone" />}
          title="مقاس الصورة"
          badge={
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 select-none">
              {getPhotoDimensions(photoType).label}
            </span>
          }
        />

        {/* شبكة خيارات المقاسات — شبكة ثنائية متوازنة وواضحة بلا تمرير */}
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
                  "h-9.5 px-2 rounded-lg border transition-all cursor-pointer active:scale-95 select-none flex items-center gap-2 text-right focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  isActive
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                    : "bg-background/80 border-border/60 hover:bg-muted/40 hover:border-primary/40"
                )}
              >
                <div className="w-5.5 h-5.5 rounded-md bg-muted/50 border border-border/40 flex items-center justify-center shrink-0">
                  <DocumentPresetGraphic type={opt.value} active={isActive} />
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className={cn("text-[11px] font-bold truncate", isActive ? "text-primary" : "text-foreground")}>
                    {opt.label}
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground truncate mt-0.5" dir="ltr">
                    {opt.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ بطاقة 3: المحاذاة على الورقة (تظهر فقط عند تثبيت المقاس) ═══ */}
      {photoType !== "stretch" && (
        <div className="p-3 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2.5 animate-in fade-in duration-200">
          <SectionCardHeader
            icon={<Crosshair className="w-3.5 h-3.5" weight="duotone" />}
            title="المحاذاة على الورقة"
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 select-none">
                {ALIGNMENT_LABELS[gridAlign]}
              </span>
            }
          />

          <div className="flex items-center gap-3">
            {/* مصفوفة الـ 9 نقاط (Anchor Matrix) */}
            <div
              className="w-13 h-13 rounded-lg border border-border/80 bg-background/90 p-1 grid grid-cols-3 grid-rows-3 gap-1 shrink-0 shadow-2xs select-none"
              dir="ltr"
              title="مصفوفة نقاط ارتكاز الصور على الورقة"
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
                      className="flex items-center justify-center rounded-xs transition-all cursor-pointer group"
                    >
                      <span
                        className={cn(
                          "rounded-full transition-all duration-150",
                          isActive
                            ? "w-2.5 h-2.5 bg-primary shadow-xs ring-2 ring-primary/30"
                            : "w-1.5 h-1.5 bg-muted-foreground/35 group-hover:bg-primary/70 group-hover:scale-125"
                        )}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* أزرار المحاذاة الأكثر استخداماً */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => onGridAlignChange("top-left")}
                className={cn(
                  "h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center justify-between transition-all border cursor-pointer select-none active:scale-[0.98]",
                  gridAlign === "top-left"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold ring-1 ring-primary/40"
                    : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <CornersOut className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span>أعلى اليسار</span>
                </span>
                <span className={cn("text-[9px] shrink-0", gridAlign === "top-left" ? "text-primary-foreground/85" : "text-muted-foreground/75")}>
                  قص سريع
                </span>
              </button>

              <button
                type="button"
                onClick={() => onGridAlignChange("center")}
                className={cn(
                  "h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center justify-between transition-all border cursor-pointer select-none active:scale-[0.98]",
                  gridAlign === "center"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold ring-1 ring-primary/40"
                    : "bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50"
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Crosshair className="w-3.5 h-3.5 shrink-0" weight="regular" />
                  <span>توسيط</span>
                </span>
                <span className={cn("text-[9px] shrink-0", gridAlign === "center" ? "text-primary-foreground/85" : "text-muted-foreground/75")}>
                  متوازن
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ بطاقة 4: إجراءات التطبيق والحفظ ═══ */}
      <div className="p-2.5 rounded-xl bg-card/60 border border-border/70 shadow-2xs fluent-specular">
        {!showSaveForm ? (
          <div className="flex gap-2">
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
              className="h-8.5 px-3 text-xs font-bold rounded-lg border border-border/80 bg-background hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
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
              className="flex-1 h-7.5 px-2.5 text-xs bg-background border border-border/80 rounded-md text-right font-cairo focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background min-w-0"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="w-7.5 h-7.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              title="إلغاء"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-7.5 px-3 text-xs font-bold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <FloppyDisk className="w-3.5 h-3.5" weight="bold" />
              <span>حفظ</span>
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed select-none pb-1">
        الحد الأقصى لهذه الورقة: <span className="font-mono font-bold text-foreground/80" dir="ltr">{maxRows}×{maxCols}</span> صور
      </p>
    </div>
  );
}
