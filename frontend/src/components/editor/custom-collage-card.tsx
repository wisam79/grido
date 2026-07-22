import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Minus, FolderHeart, X, Save, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, Crosshair, Columns, Rows } from "lucide-react";
import { CollageTemplate, PAPER_SIZES } from "@/lib/templates";
import { PhotoTypeMiniature } from "./photo-type-miniature";

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
    if (collageTemplate) {
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
    }
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

  const calculateCells = React.useCallback((r: number, c: number, type: string, align = gridAlign) => {
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


  const isCurrentActive = activeTemplateId === "collage-custom";

  return (
    <div className="flex flex-col gap-4 font-cairo" dir="rtl">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[11px] font-extrabold uppercase tracking-wide",
          isCurrentActive ? "text-primary" : "text-foreground/70"
        )}>
          تخصيص الشبكة
        </span>
        {isCurrentActive && (
          <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold shadow-sm">
            نشط
          </span>
        )}
      </div>

      {/* Large Steppers: Rows & Cols side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Rows */}
        <div className="flex flex-col items-center gap-2 bg-muted/20 border border-border/40 hover:border-primary/20 rounded-2xl p-3.5 transition-colors">
          <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground select-none">
            <Rows className="w-3.5 h-3.5" />
            الصفوف
          </span>
          <div className="flex items-center justify-between w-full gap-2" dir="ltr">
            <button
              type="button"
              disabled={rows <= 1}
              onClick={() => {
                const r = Math.max(1, rows - 1);
                setRows(r);
                applyCustomCollage(r, cols);
              }}
              className="w-8 h-8 rounded-lg bg-background dark:bg-card hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/30 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="font-mono text-2xl font-black text-foreground w-8 text-center leading-none select-none">{rows}</span>
            <button
              type="button"
              disabled={rows >= maxRows}
              onClick={() => {
                const r = Math.min(maxRows, rows + 1);
                setRows(r);
                applyCustomCollage(r, cols);
              }}
              className="w-8 h-8 rounded-lg bg-background dark:bg-card hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/30 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Columns */}
        <div className="flex flex-col items-center gap-2 bg-muted/20 border border-border/40 hover:border-primary/20 rounded-2xl p-3.5 transition-colors">
          <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground select-none">
            <Columns className="w-3.5 h-3.5" />
            الأعمدة
          </span>
          <div className="flex items-center justify-between w-full gap-2" dir="ltr">
            <button
              type="button"
              disabled={cols <= 1}
              onClick={() => {
                const c = Math.max(1, cols - 1);
                setCols(c);
                applyCustomCollage(rows, c);
              }}
              className="w-8 h-8 rounded-lg bg-background dark:bg-card hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/30 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="font-mono text-2xl font-black text-foreground w-8 text-center leading-none select-none">{cols}</span>
            <button
              type="button"
              disabled={cols >= maxCols}
              onClick={() => {
                const c = Math.min(maxCols, cols + 1);
                setCols(c);
                applyCustomCollage(rows, c);
              }}
              className="w-8 h-8 rounded-lg bg-background dark:bg-card hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/30 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground disabled:active:scale-100"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Type Quick Selector */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-muted-foreground">أبعاد ونوع الصورة للوثائق</span>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "stretch",        label: "تمدد حر",      sub: "ملء الخلية" },
            { value: "iq-national-id",  label: "بطاقة وطنية",  sub: "35×45 ملم" },
            { value: "iq-civil-id",     label: "هوية أحوال",   sub: "32×40 ملم" },
            { value: "iq-general-id",   label: "هوية عامة",    sub: "40×60 ملم" },
            { value: "iq-transactions", label: "متقاعدون",     sub: "30×40 ملم" },
            { value: "visa",            label: "فيزا سفر",     sub: "50×50 ملم" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setPhotoType(opt.value);
                applyCustomCollage(rows, cols, opt.value);
              }}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-[0.97] select-none h-20 bg-card",
                photoType === opt.value
                  ? "border-2 border-primary bg-primary/10 text-primary shadow-xs font-bold ring-1 ring-primary/20"
                  : "border-border hover:bg-muted/20 text-foreground"
              )}
            >
              <PhotoTypeMiniature type={opt.value} active={photoType === opt.value} />
              <span className="text-[11px] font-bold leading-none mt-1">{opt.label}</span>
              <span className={cn("text-[8.5px] font-mono leading-none mt-1", photoType === opt.value ? "text-primary/80" : "text-muted-foreground/60")}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Alignment Quick Selector */}
      {photoType !== "stretch" && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground">محاذاة شبكة الخلايا على الورقة</span>
            <span className="text-[9px] font-medium text-primary/80">
              {[
                { value: "center",       label: "توسيط المنتصف" },
                { value: "top-right",    label: "أعلى اليمين" },
                { value: "top-left",     label: "أعلى اليسار" },
                { value: "bottom-right", label: "أسفل اليمين" },
                { value: "bottom-left",  label: "أسفل اليسار" },
              ].find(o => o.value === gridAlign)?.label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/20 border border-border/30 rounded-2xl w-full" style={{ direction: "ltr" }}>
            {/* Top-Left */}
            <button
              type="button"
              onClick={() => {
                setGridAlign("top-left");
                applyCustomCollage(rows, cols, photoType, "top-left");
              }}
              title="أعلى اليسار"
              className={cn(
                "h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs",
                gridAlign === "top-left"
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpLeft className="w-4.5 h-4.5" />
            </button>

            {/* Top-Center Spacer */}
            <div className="h-11 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            </div>

            {/* Top-Right */}
            <button
              type="button"
              onClick={() => {
                setGridAlign("top-right");
                applyCustomCollage(rows, cols, photoType, "top-right");
              }}
              title="أعلى اليمين"
              className={cn(
                "h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs",
                gridAlign === "top-right"
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpRight className="w-4.5 h-4.5" />
            </button>

            {/* Middle-Left Spacer */}
            <div className="h-11 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            </div>

            {/* Center */}
            <button
              type="button"
              onClick={() => {
                setGridAlign("center");
                applyCustomCollage(rows, cols, photoType, "center");
              }}
              title="توسيط المنتصف"
              className={cn(
                "h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs",
                gridAlign === "center"
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <Crosshair className="w-4.5 h-4.5" />
            </button>

            {/* Middle-Right Spacer */}
            <div className="h-11 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            </div>

            {/* Bottom-Left */}
            <button
              type="button"
              onClick={() => {
                setGridAlign("bottom-left");
                applyCustomCollage(rows, cols, photoType, "bottom-left");
              }}
              title="أسفل اليسار"
              className={cn(
                "h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs",
                gridAlign === "bottom-left"
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownLeft className="w-4.5 h-4.5" />
            </button>

            {/* Bottom-Center Spacer */}
            <div className="h-11 flex items-center justify-center opacity-20 pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            </div>

            {/* Bottom-Right */}
            <button
              type="button"
              onClick={() => {
                setGridAlign("bottom-right");
                applyCustomCollage(rows, cols, photoType, "bottom-right");
              }}
              title="أسفل اليمين"
              className={cn(
                "h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-2xs",
                gridAlign === "bottom-right"
                  ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                  : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showSaveForm ? (
        <div className="flex gap-2">
          <button
            onClick={() => applyCustomCollage(rows, cols)}
            className={cn(
              "flex-1 h-11 text-xs font-bold rounded-xl transition-all border active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1.5 shadow-xs",
              isCurrentActive
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-primary/20"
                : "bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground border-primary/30 hover:border-primary"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            {isCurrentActive ? "تخصيص نشط" : "تطبيق التقسيم"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveName(`كولاج مخصص ${rows}×${cols}`);
              setShowSaveForm(true);
            }}
            className="w-11 h-11 text-xs font-bold rounded-xl border border-border/60 bg-background hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800/50 text-muted-foreground hover:text-rose-500 cursor-pointer flex items-center justify-center active:scale-[0.97] transition-all shadow-xs"
            title="حفظ كقالب جديد"
          >
            <FolderHeart className="w-5 h-5" />
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
