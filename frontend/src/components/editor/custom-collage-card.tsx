import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Minus, FolderHeart, X, Save, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, Columns, Rows, Maximize2, Sparkles } from "lucide-react";
import { CollageTemplate, PAPER_SIZES } from "@/lib/templates";
import { FreeformCollageModal } from "@/features/freeform-collage";

function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active ? "border-primary/80 bg-primary/20" : "border-muted-foreground/40 bg-muted/30";
  const activeIcon = active ? "text-primary" : "text-muted-foreground/60";

  if (type === "stretch") {
    return (
      <div className={cn("w-4 h-4 rounded-[2px] border border-dashed flex items-center justify-center transition-all", activeBorder)}>
        <Maximize2 className={cn("w-2.5 h-2.5", activeIcon)} />
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

const CustomCollageCard = React.memo(function CustomCollageCard({
  onSelect,
  activeTemplateId,
  onSaveTemplate,
}: {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
  onSaveTemplate: (name: string, cells: any[]) => void;
}) {
  const { canvasWidth, canvasHeight, printSettings, collageTemplate } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    printSettings: state.printSettings,
    collageTemplate: state.collageTemplate,
  })));

  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [photoType, setPhotoType] = useState<
    "stretch" | "passport" | "id" | "visa" | "iq-national-id" | "iq-civil-id" | "iq-general-id" | "iq-transactions"
  >("stretch");
  const [gridAlign, setGridAlign] = useState<"center" | "top-left" | "top-right" | "bottom-left" | "bottom-right">("center");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");

  // مزامنة حالة عناصر التحكم المحلية مع القالب النشط حالياً على الكانفس
  useEffect(() => {
    if (!collageTemplate) return;
    queueMicrotask(() => {
      if (collageTemplate.physicalLayout) {
        const pl = collageTemplate.physicalLayout;
        if (pl.rows) setRows(pl.rows);
        if (pl.cols) setCols(pl.cols);
        if (pl.type) setPhotoType(pl.type as any);
        if (pl.align) setGridAlign(pl.align as any);
      } else if (collageTemplate.cells && collageTemplate.cells.length > 0) {
        const count = collageTemplate.cells.length;
        if (count === 4) { setRows(2); setCols(2); }
        else if (count === 6) { setRows(2); setCols(3); }
        else if (count === 8) { setRows(2); setCols(4); }
        else if (count === 9) { setRows(3); setCols(3); }
        else if (count === 12) { setRows(3); setCols(4); }
        setPhotoType("stretch");
      }
    });
  }, [collageTemplate]);

  const getMaxGridConfig = React.useCallback(() => {
    if (photoType === "stretch") {
      return { maxRows: 12, maxCols: 12 };
    }

    const W = canvasWidth || 2480;
    const H = canvasHeight || 3508;
    const storedDpi = printSettings.dpi || 300;

    let dpi = storedDpi;
    outerLoop:
    for (const paper of PAPER_SIZES) {
      for (const [pW, pH] of [
        [paper.widthMM,  paper.heightMM],
        [paper.heightMM, paper.widthMM],
      ] as [number, number][]) {
        const expectedW = (pW * storedDpi) / 25.4;
        const expectedH = (pH * storedDpi) / 25.4;
        if (
          Math.abs(W - expectedW) / expectedW < 0.02 &&
          Math.abs(H - expectedH) / expectedH < 0.02
        ) {
          const dpiFromW = (W * 25.4) / pW;
          const dpiFromH = (H * 25.4) / pH;
          dpi = (dpiFromW + dpiFromH) / 2;
          break outerLoop;
        }
      }
    }

    let wMM = 35;
    let hMM = 45;
    if (photoType === "iq-national-id" || photoType === "passport") {
      wMM = 35;
      hMM = 45;
    } else if (photoType === "iq-civil-id") {
      wMM = 32;
      hMM = 40;
    } else if (photoType === "iq-general-id" || photoType === "id") {
      wMM = 40;
      hMM = 60;
    } else if (photoType === "iq-transactions") {
      wMM = 30;
      hMM = 40;
    } else if (photoType === "visa") {
      wMM = 50;
      hMM = 50;
    } else {
      return { maxRows: 12, maxCols: 12 };
    }

    const cellW_px = (wMM * dpi) / 25.4;
    const cellH_px = (hMM * dpi) / 25.4;

    const gap = (2.0 * dpi) / 25.4;
    const marginX = (4.0 * dpi) / 25.4;
    const marginY = (4.0 * dpi) / 25.4;

    const availW = W - 2 * marginX;
    const availH = H - 2 * marginY;

    // إضافة سماحية (Tolerance) بمقدار 1 ملم لمنع أخطاء التقريب البرمجي للأرقام العشرية
    const tolerance = (1.0 * dpi) / 25.4;

    const maxCols = Math.max(1, Math.floor((availW + gap + tolerance) / (cellW_px + gap)));
    const maxRows = Math.max(1, Math.floor((availH + gap + tolerance) / (cellH_px + gap)));

    // رفع الحد الأقصى الاصطناعي ليتناسب مع قياسات الورق الضخمة كـ A3 و A2
    return { maxRows: Math.min(25, maxRows), maxCols: Math.min(25, maxCols) };
  }, [photoType, canvasWidth, canvasHeight, printSettings.dpi]);

  const { maxRows, maxCols } = React.useMemo(() => getMaxGridConfig(), [getMaxGridConfig]);

  const calculateCells = React.useCallback(function calculateCells(r: number, c: number, type: string, align = gridAlign) {
    const W = canvasWidth || 2480;
    const H = canvasHeight || 3508;

    // ─── Compute true effective DPI from canvas pixel dimensions ──────────
    // printSettings.dpi is used as a HINT to identify the paper size,
    // then the actual DPI is re-derived from the real pixel count.
    // This keeps physical accuracy even when the canvas was resized manually.
    const storedDpi = printSettings.dpi || 300;
    let dpi = storedDpi;
    outerLoop:
    for (const paper of PAPER_SIZES) {
      for (const [pW, pH] of [
        [paper.widthMM,  paper.heightMM],   // portrait
        [paper.heightMM, paper.widthMM],    // landscape
      ] as [number, number][]) {
        const expectedW = (pW * storedDpi) / 25.4;
        const expectedH = (pH * storedDpi) / 25.4;
        // 2% tolerance for integer rounding differences
        if (
          Math.abs(W - expectedW) / expectedW < 0.02 &&
          Math.abs(H - expectedH) / expectedH < 0.02
        ) {
          // Found the paper — compute PRECISE DPI from actual pixels
          const dpiFromW = (W * 25.4) / pW;
          const dpiFromH = (H * 25.4) / pH;
          dpi = (dpiFromW + dpiFromH) / 2;
          break outerLoop;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    if (type === "stretch") {
      const cells = [];
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          cells.push({
            x: j / c,
            y: i / r,
            w: 1 / c,
            h: 1 / r,
          });
        }
      }
      return cells;
    }

    // Determine physical size in millimeters
    let wMM = 35;
    let hMM = 45;
    let isPhysical = true;

    if (type === "iq-national-id" || type === "passport") {
      wMM = 35;
      hMM = 45;
    } else if (type === "iq-civil-id") {
      wMM = 32;
      hMM = 40;
    } else if (type === "iq-general-id" || type === "id") {
      wMM = 40;
      hMM = 60;
    } else if (type === "iq-transactions") {
      wMM = 30;
      hMM = 40;
    } else if (type === "visa") {
      wMM = 50;
      hMM = 50;
    } else {
      isPhysical = false;
    }

    if (!isPhysical) {
      // Fallback to purely aspect ratio-based calculations
      const photoRatio = 0.7778;
      const gap = Math.max(8, Math.round(W * 0.012));
      const marginX = Math.max(16, Math.round(W * 0.025));
      const marginY = Math.max(16, Math.round(H * 0.025));

      const availW = W - 2 * marginX - (c - 1) * gap;
      const availH = H - 2 * marginY - (r - 1) * gap;

      if (availW <= 0 || availH <= 0) {
        return calculateCells(r, c, "stretch", align);
      }

      const maxCellW = availW / c;
      const maxCellH = availH / r;

      let cellW = maxCellW;
      let cellH = cellW / photoRatio;

      if (cellH * r > availH) {
        cellH = maxCellH;
        cellW = cellH * photoRatio;
      }

      const gridW = c * cellW + (c - 1) * gap;
      const gridH = r * cellH + (r - 1) * gap;

      let startX = (W - gridW) / 2;
      let startY = (H - gridH) / 2;

      if (align === "top-left") {
        startX = marginX;
        startY = marginY;
      } else if (align === "top-right") {
        startX = W - marginX - gridW;
        startY = marginY;
      } else if (align === "bottom-left") {
        startX = marginX;
        startY = H - marginY - gridH;
      } else if (align === "bottom-right") {
        startX = W - marginX - gridW;
        startY = H - marginY - gridH;
      }

      const cells = [];
      for (let i = 0; i < r; i++) {
        for (let j = 0; j < c; j++) {
          cells.push({
            x: (startX + j * (cellW + gap)) / W,
            y: (startY + i * (cellH + gap)) / H,
            w: cellW / W,
            h: cellH / H,
          });
        }
      }
      return cells;
    }

    // Convert MM to Pixels using paper DPI
    const cellW_px = (wMM * dpi) / 25.4;
    const cellH_px = (hMM * dpi) / 25.4;

    const gap = (2.0 * dpi) / 25.4;
    const marginX = (4.0 * dpi) / 25.4;
    const marginY = (4.0 * dpi) / 25.4;

    const availW = W - 2 * marginX - (c - 1) * gap;
    const availH = H - 2 * marginY - (r - 1) * gap;

    if (availW <= 0 || availH <= 0) {
      return calculateCells(r, c, "stretch", align);
    }

    const gridW = c * cellW_px + (c - 1) * gap;
    const gridH = r * cellH_px + (r - 1) * gap;

    // Enforce 100% exact scale for physical documents to prevent invalid sizes
    const cellW = cellW_px;
    const cellH = cellH_px;
    const finalGridW = c * cellW + (c - 1) * gap;
    const finalGridH = r * cellH + (r - 1) * gap;

    let startX = (W - finalGridW) / 2;
    let startY = (H - finalGridH) / 2;

    if (align === "top-left") {
      startX = marginX;
      startY = marginY;
    } else if (align === "top-right") {
      startX = W - marginX - finalGridW;
      startY = marginY;
    } else if (align === "bottom-left") {
      startX = marginX;
      startY = H - marginY - finalGridH;
    } else if (align === "bottom-right") {
      startX = W - marginX - finalGridW;
      startY = H - marginY - finalGridH;
    }

    const cells = [];
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        cells.push({
          x: (startX + j * (cellW + gap)) / W,
          y: (startY + i * (cellH + gap)) / H,
          w: cellW / W,
          h: cellH / H,
        });
      }
    }
    return cells;
  }, [canvasWidth, canvasHeight, printSettings.dpi, gridAlign]);

  const applyCustomCollage = React.useCallback((r: number, c: number, type = photoType, align = gridAlign) => {
    const cells = calculateCells(r, c, type, align);
    const tpl: CollageTemplate = {
      id: "collage-custom",
      name: `كولاج مخصص (${r}×${c})`,
      slots: r * c,
      cells,
      icon: LayoutGrid,
      physicalLayout: type !== "stretch" ? { type, rows: r, cols: c, align } : undefined
    };
    onSelect(tpl);
  }, [calculateCells, photoType, gridAlign, onSelect]);

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error("يرجى إدخال اسم للقالب");
      return;
    }
    const cells = calculateCells(rows, cols, photoType, gridAlign);
    onSaveTemplate(saveName.trim(), cells);
    setSaveName("");
    setShowSaveForm(false);
  };

  useEffect(() => {
    const { maxRows: mR, maxCols: mC } = getMaxGridConfig();
    let adjustedRows = rows;
    let adjustedCols = cols;
    let changed = false;

    if (rows > mR) {
      adjustedRows = mR;
      changed = true;
    }
    if (cols > mC) {
      adjustedCols = mC;
      changed = true;
    }

    if (changed) {
      queueMicrotask(() => {
        setRows(adjustedRows);
        setCols(adjustedCols);
        applyCustomCollage(adjustedRows, adjustedCols, photoType, gridAlign);
      });
    }
  }, [photoType, canvasWidth, canvasHeight, rows, cols, getMaxGridConfig, applyCustomCollage, gridAlign]);


  const isCurrentActive =
    activeTemplateId === "collage-custom" ||
    (typeof activeTemplateId === "string" && activeTemplateId.startsWith("freeform-"));
  const [showFreeformModal, setShowFreeformModal] = useState(false);

  return (
    <div className="flex flex-col gap-4 font-cairo" dir="rtl">
      {/* Freeform Mixed Builder Action Button */}
      <button
        type="button"
        onClick={() => setShowFreeformModal(true)}
        className="w-full p-2.5 rounded-xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary transition-all cursor-pointer flex items-center justify-between shadow-xs font-bold group"
      >
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>محرر الكولاج الحر والأحجام المختلطة</span>
        </div>
        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-md font-bold">
          جديد ✨
        </span>
      </button>

      <FreeformCollageModal open={showFreeformModal} onOpenChange={setShowFreeformModal} />

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[11px] font-extrabold uppercase tracking-wide",
          isCurrentActive ? "text-primary" : "text-foreground/70"
        )}>
          تخصيص الشبكة المنتظمة
        </span>
        {isCurrentActive && (
          <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold shadow-sm">
            نشط
          </span>
        )}
      </div>

      {/* Steppers: Rows & Cols side by side */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Rows */}
        <div className="flex flex-col items-center gap-1.5 bg-card border border-border/60 hover:border-primary/30 rounded-xl p-3 transition-colors shadow-2xs">
          <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground select-none">
            <Rows className="w-3.5 h-3.5 text-primary/80" />
            الصفوف
          </span>
          <div className="flex items-center justify-between w-full gap-1" dir="ltr">
            <button
              type="button"
              disabled={rows <= 1}
              onClick={() => {
                const r = Math.max(1, rows - 1);
                setRows(r);
                applyCustomCollage(r, cols);
              }}
              className="w-9 h-9 rounded-lg bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <span className="font-mono text-xl font-black text-foreground w-8 text-center leading-none select-none">{rows}</span>
            <button
              type="button"
              disabled={rows >= maxRows}
              onClick={() => {
                const r = Math.min(maxRows, rows + 1);
                setRows(r);
                applyCustomCollage(r, cols);
              }}
              className="w-9 h-9 rounded-lg bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Columns */}
        <div className="flex flex-col items-center gap-1.5 bg-card border border-border/60 hover:border-primary/30 rounded-xl p-3 transition-colors shadow-2xs">
          <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground select-none">
            <Columns className="w-3.5 h-3.5 text-primary/80" />
            الأعمدة
          </span>
          <div className="flex items-center justify-between w-full gap-1" dir="ltr">
            <button
              type="button"
              disabled={cols <= 1}
              onClick={() => {
                const c = Math.max(1, cols - 1);
                setCols(c);
                applyCustomCollage(rows, c);
              }}
              className="w-9 h-9 rounded-lg bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <span className="font-mono text-xl font-black text-foreground w-8 text-center leading-none select-none">{cols}</span>
            <button
              type="button"
              disabled={cols >= maxCols}
              onClick={() => {
                const c = Math.min(maxCols, cols + 1);
                setCols(c);
                applyCustomCollage(rows, c);
              }}
              className="w-9 h-9 rounded-lg bg-muted/40 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Type Quick Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold text-muted-foreground/80">أبعاد ونوع الصورة للوثائق</span>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { value: "stretch",        label: "تمدد حر",      sub: "ملء الخلية" },
            { value: "iq-national-id",  label: "بطاقة وطنية",  sub: "35×45 ملم" },
            { value: "iq-civil-id",     label: "هوية أحوال",   sub: "32×40 ملم" },
            { value: "iq-general-id",   label: "هوية عامة",    sub: "40×60 ملم" },
            { value: "iq-transactions", label: "متقاعدون",     sub: "30×40 ملم" },
            { value: "visa",            label: "فيزا سفر",     sub: "50×50 ملم" },
          ] as const).map((opt) => {
            const isActive = photoType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setPhotoType(opt.value);
                  applyCustomCollage(rows, cols, opt.value);
                }}
                className={cn(
                  "relative flex items-center gap-2 p-2 px-2.5 rounded-xl border text-right transition-all cursor-pointer active:scale-[0.97] select-none h-[52px]",
                  isActive
                    ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-extrabold ring-1 ring-primary/30"
                    : "bg-card border-border/60 hover:bg-muted/30 text-foreground"
                )}
              >
                {/* Visual Document Miniature Icon */}
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-lg bg-muted/40 border border-border/40">
                  <DocumentPresetGraphic type={opt.value} active={isActive} />
                </div>

                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-[11px] font-bold leading-tight truncate w-full">{opt.label}</span>
                  <span className={cn("text-[8.5px] font-mono leading-none mt-0.5", isActive ? "text-primary/90 font-bold" : "text-muted-foreground/60")}>{opt.sub}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Alignment Quick Selector */}
      {photoType !== "stretch" && (
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-muted-foreground/80">محاذاة شبكة الخلايا</span>
            <span className="text-[9px] font-bold text-primary/90">
              {[
                { value: "center",       label: "توسيط" },
                { value: "top-left",     label: "أعلى اليسار" },
                { value: "top-center",   label: "أعلى الوسط" },
                { value: "top-right",    label: "أعلى اليمين" },
                { value: "center-left",  label: "منتصف اليسار" },
                { value: "center-right", label: "منتصف اليمين" },
                { value: "bottom-left",  label: "أسفل اليسار" },
                { value: "bottom-center",label: "أسفل الوسط" },
                { value: "bottom-right", label: "أسفل اليمين" },
              ].find(o => o.value === gridAlign)?.label || "توسيط"}
            </span>
          </div>

          <div
            className="grid gap-[3px] p-2.5 bg-card border border-border/60 rounded-xl w-full h-[130px]"
            style={{
              direction: "ltr",
              gridTemplateColumns: "3fr 4fr 3fr",
              gridTemplateRows: "3fr 4fr 3fr",
            }}
          >
            {[
              { id: "top-left",      icon: ArrowUpLeft,    label: "أعلى اليسار" },
              { id: "top-center",    icon: ArrowUp,        label: "أعلى الوسط" },
              { id: "top-right",     icon: ArrowUpRight,   label: "أعلى اليمين" },
              { id: "center-left",   icon: ArrowLeft,      label: "منتصف اليسار" },
              { id: "center",        icon: Crosshair,      label: "توسيط" },
              { id: "center-right",  icon: ArrowRight,     label: "منتصف اليمين" },
              { id: "bottom-left",   icon: ArrowDownLeft,  label: "أسفل اليسار" },
              { id: "bottom-center", icon: ArrowDown,      label: "أسفل الوسط" },
              { id: "bottom-right",  icon: ArrowDownRight, label: "أسفل اليمين" },
            ].map(({ id, icon: Icon, label }) => {
              const isCenter = id === "center";
              const isActive = gridAlign === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setGridAlign(id as any);
                    applyCustomCollage(rows, cols, photoType, id as any);
                  }}
                  title={label}
                  className={cn(
                    "w-full h-full rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-90",
                    isCenter && "rounded-lg",
                    isActive  && "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/50",
                    !isActive && "bg-card/80 text-muted-foreground border border-border/40 hover:bg-muted/50 hover:text-foreground hover:border-primary/30",
                  )}
                >
                  <Icon className={cn(
                    "shrink-0",
                    isCenter ? "w-5 h-5 stroke-[2.5]" : "w-3.5 h-3.5"
                  )} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showSaveForm ? (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => applyCustomCollage(rows, cols)}
            className={cn(
              "flex-1 h-9 text-xs font-extrabold rounded-xl transition-all border active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1.5 shadow-xs",
              isCurrentActive
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-primary/20"
                : "bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground border-primary/30 hover:border-primary"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {isCurrentActive ? "تخصيص نشط" : "تطبيق التقسيم"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveName(`كولاج مخصص ${rows}×${cols}`);
              setShowSaveForm(true);
            }}
            className="w-9 h-9 text-xs font-bold rounded-xl border border-border/60 bg-background hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800/50 text-muted-foreground hover:text-rose-500 cursor-pointer flex items-center justify-center active:scale-[0.97] transition-all shadow-xs shrink-0"
            title="حفظ كقالب جديد"
          >
            <FolderHeart className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 bg-muted/20 dark:bg-muted/10 p-3 rounded-2xl border border-border/40 animate-in slide-in-from-top-2 duration-200">
          <span className="text-[10px] font-bold text-muted-foreground block">اسم القالب الجديد</span>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="مثال: شيت البطاقة الوطنية"
            className="w-full h-9 px-3 text-xs bg-background border border-border/60 rounded-xl text-right font-cairo focus:outline-hidden focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="flex-1 h-8 text-[10px] font-bold rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" />
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 h-8 text-[10px] font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
            >
              <Save className="w-3 h-3" />
              حفظ القالب
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export { CustomCollageCard };
