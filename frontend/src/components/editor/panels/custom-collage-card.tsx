import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Minus, FolderHeart, X, Save, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, Columns, Rows, Maximize2, Sparkles } from "lucide-react";
import { CollageTemplate, PAPER_SIZES } from "@/lib/templates";
import { FreeformCollageModal } from "@/features/freeform-collage";
import { FluentSection } from "@/components/ui/blocks";

function DocumentPresetGraphic({ type, active }: { type: string; active: boolean }) {
  const activeBorder = active ? "border-primary bg-primary/25 shadow-2xs" : "border-muted-foreground/40 bg-muted/30";
  const activeIcon = active ? "text-primary font-bold" : "text-muted-foreground/60";

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

type GridAlignment =
  | "center"
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

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
  const [gridAlign, setGridAlign] = useState<GridAlignment>("center");
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
    } else if (photoType === "iq-general-id") {
      wMM = 40;
      hMM = 60;
    } else if (photoType === "iq-transactions" || photoType === "id") {
      wMM = 30;
      hMM = 40;
    } else if (photoType === "visa") {
      wMM = 50;
      hMM = 50;
    }

    const cellW_px = (wMM * dpi) / 25.4;
    const cellH_px = (hMM * dpi) / 25.4;

    const maxCols = Math.max(1, Math.floor(W / cellW_px));
    const maxRows = Math.max(1, Math.floor(H / cellH_px));

    return { maxRows, maxCols };
  }, [photoType, canvasWidth, canvasHeight, printSettings.dpi]);

  const { maxRows, maxCols } = getMaxGridConfig();

  const applyCustomCollage = React.useCallback(
    (
      r = rows,
      c = cols,
      t = photoType,
      al: GridAlignment = gridAlign
    ) => {
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

      if (t === "stretch") {
        const cells = [];
        const cellW = 1 / c;
        const cellH = 1 / r;
        for (let row = 0; row < r; row++) {
          for (let col = 0; col < c; col++) {
            cells.push({
              x: col * cellW,
              y: row * cellH,
              w: cellW,
              h: cellH,
            });
          }
        }

        const template: CollageTemplate = {
          id: "collage-custom",
          name: `كولاج مخصص ${r}×${c}`,
          slots: r * c,
          cells,
          icon: LayoutGrid,
        };
        onSelect(template);
        return;
      }

      let wMM = 35;
      let hMM = 45;
      let label = "بطاقة وطنية";

      if (t === "iq-national-id" || t === "passport") {
        wMM = 35;
        hMM = 45;
        label = "بطاقة وطنية";
      } else if (t === "iq-civil-id") {
        wMM = 32;
        hMM = 40;
        label = "هوية أحوال";
      } else if (t === "iq-general-id") {
        wMM = 40;
        hMM = 60;
        label = "هوية عامة";
      } else if (t === "iq-transactions" || t === "id") {
        wMM = 30;
        hMM = 40;
        label = "معاملات/متقاعدين";
      } else if (t === "visa") {
        wMM = 50;
        hMM = 50;
        label = "فيزا سفر";
      }

      const cellW_px = (wMM * dpi) / 25.4;
      const cellH_px = (hMM * dpi) / 25.4;

      const normW = cellW_px / W;
      const normH = cellH_px / H;

      const totalGridW = c * normW;
      const totalGridH = r * normH;

      let startX = 0;
      let startY = 0;

      if (al === "center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (al === "top-left") {
        startX = 0;
        startY = 0;
      } else if (al === "top-center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = 0;
      } else if (al === "top-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = 0;
      } else if (al === "center-left") {
        startX = 0;
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (al === "center-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (al === "bottom-left") {
        startX = 0;
        startY = Math.max(0, 1 - totalGridH);
      } else if (al === "bottom-center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = Math.max(0, 1 - totalGridH);
      } else if (al === "bottom-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = Math.max(0, 1 - totalGridH);
      }

      const cells = [];
      for (let row = 0; row < r; row++) {
        for (let col = 0; col < c; col++) {
          cells.push({
            x: startX + col * normW,
            y: startY + row * normH,
            w: normW,
            h: normH,
          });
        }
      }

      const template: CollageTemplate = {
        id: "collage-custom",
        name: `طقم ${label} (${r * c} صور)`,
        slots: r * c,
        cells,
        icon: LayoutGrid,
        physicalLayout: { rows: r, cols: c, type: t as any, align: al },
      };
      onSelect(template);
    },
    [rows, cols, photoType, canvasWidth, canvasHeight, printSettings.dpi, onSelect, gridAlign]
  );

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error("يرجى إدخال اسم القالب");
      return;
    }

    const W = canvasWidth || 2480;
    const H = canvasHeight || 3508;
    const storedDpi = printSettings.dpi || 300;

    let dpi = storedDpi;
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
          break;
        }
      }
    }

    if (photoType === "stretch") {
      const cells = [];
      const cellW = 1 / cols;
      const cellH = 1 / rows;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          cells.push({
            x: col * cellW,
            y: row * cellH,
            w: cellW,
            h: cellH,
          });
        }
      }
      onSaveTemplate(saveName, cells);
    } else {
      let wMM = 35;
      let hMM = 45;
      if (photoType === "iq-national-id" || photoType === "passport") {
        wMM = 35;
        hMM = 45;
      } else if (photoType === "iq-civil-id") {
        wMM = 32;
        hMM = 40;
      } else if (photoType === "iq-general-id") {
        wMM = 40;
        hMM = 60;
      } else if (photoType === "iq-transactions" || photoType === "id") {
        wMM = 30;
        hMM = 40;
      } else if (photoType === "visa") {
        wMM = 50;
        hMM = 50;
      }

      const cellW_px = (wMM * dpi) / 25.4;
      const cellH_px = (hMM * dpi) / 25.4;

      const normW = cellW_px / W;
      const normH = cellH_px / H;

      const totalGridW = cols * normW;
      const totalGridH = rows * normH;

      let startX = 0;
      let startY = 0;

      if (gridAlign === "center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (gridAlign === "top-left") {
        startX = 0;
        startY = 0;
      } else if (gridAlign === "top-center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = 0;
      } else if (gridAlign === "top-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = 0;
      } else if (gridAlign === "center-left") {
        startX = 0;
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (gridAlign === "center-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (gridAlign === "bottom-left") {
        startX = 0;
        startY = Math.max(0, 1 - totalGridH);
      } else if (gridAlign === "bottom-center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = Math.max(0, 1 - totalGridH);
      } else if (gridAlign === "bottom-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = Math.max(0, 1 - totalGridH);
      }

      const cells = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          cells.push({
            x: startX + col * normW,
            y: startY + row * normH,
            w: normW,
            h: normH,
          });
        }
      }
      onSaveTemplate(saveName, cells);
    }

    setShowSaveForm(false);
    setSaveName("");
  };

  useEffect(() => {
    const { maxRows: currentMaxRows, maxCols: currentMaxCols } = getMaxGridConfig();
    let changed = false;
    let adjustedRows = rows;
    let adjustedCols = cols;

    if (rows > currentMaxRows) {
      adjustedRows = currentMaxRows;
      changed = true;
    }
    if (cols > currentMaxCols) {
      adjustedCols = currentMaxCols;
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
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* Freeform Mixed Builder Action Button */}
      <button
        type="button"
        onClick={() => setShowFreeformModal(true)}
        className="w-full h-9 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none shadow-2xs fluent-specular"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>كولاج حر ومختلط</span>
        </div>
        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md font-extrabold">
          جديد
        </span>
      </button>

      <FreeformCollageModal open={showFreeformModal} onOpenChange={setShowFreeformModal} />

      {/* Main Section: Custom Grid Collage */}
      <FluentSection
        icon={<LayoutGrid className="w-3.5 h-3.5" />}
        title="تخصيص الشبكة المنتظمة"
        action={
          isCurrentActive ? (
            <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold shadow-xs">
              نشط
            </span>
          ) : undefined
        }
      >
        {/* Steppers: Rows & Cols side by side */}
        <div className="grid grid-cols-2 gap-2">
          {/* Rows */}
          <div className="flex flex-col items-center gap-1.5 bg-background/60 border border-border/70 hover:border-primary/40 rounded-xl p-2.5 transition-colors shadow-2xs">
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
                className="w-8 h-8 rounded-md bg-muted/50 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="font-mono text-lg font-black text-foreground w-7 text-center leading-none select-none">{rows}</span>
              <button
                type="button"
                disabled={rows >= maxRows}
                onClick={() => {
                  const r = Math.min(maxRows, rows + 1);
                  setRows(r);
                  applyCustomCollage(r, cols);
                }}
                className="w-8 h-8 rounded-md bg-muted/50 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Columns */}
          <div className="flex flex-col items-center gap-1.5 bg-background/60 border border-border/70 hover:border-primary/40 rounded-xl p-2.5 transition-colors shadow-2xs">
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
                className="w-8 h-8 rounded-md bg-muted/50 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <span className="font-mono text-lg font-black text-foreground w-7 text-center leading-none select-none">{cols}</span>
              <button
                type="button"
                disabled={cols >= maxCols}
                onClick={() => {
                  const c = Math.min(maxCols, cols + 1);
                  setCols(c);
                  applyCustomCollage(rows, c);
                }}
                className="w-8 h-8 rounded-md bg-muted/50 hover:bg-primary/15 hover:text-primary text-muted-foreground flex items-center justify-center border border-border/60 hover:border-primary/40 cursor-pointer shadow-2xs active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Photo Type Quick Selector */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-border/30">
          <span className="text-[10px] font-bold text-muted-foreground">أبعاد ونوع الصورة للوثائق</span>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { value: "stretch",        label: "تمدد حر",      sub: "ملء الخلية" },
              { value: "iq-national-id",  label: "بطاقة وطنية",  sub: "35 × 45 مم" },
              { value: "iq-civil-id",     label: "هوية أحوال",   sub: "32 × 40 مم" },
              { value: "iq-general-id",   label: "هوية عامة",    sub: "40 × 60 مم" },
              { value: "iq-transactions", label: "متقاعدون",     sub: "30 × 40 مم" },
              { value: "visa",            label: "فيزا سفر",     sub: "50 × 50 مم" },
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
                    "relative flex items-center gap-2 p-2 rounded-xl border text-right transition-all cursor-pointer active:scale-[0.97] select-none h-[48px]",
                    isActive
                      ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/30"
                      : "bg-background/80 border-border/60 hover:bg-muted/40 hover:border-primary/40 text-foreground"
                  )}
                >
                  {/* Visual Document Miniature Icon */}
                  <div className="shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-md bg-muted/40 border border-border/40">
                    <DocumentPresetGraphic type={opt.value} active={isActive} />
                  </div>

                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-[11px] font-bold leading-tight truncate w-full">{opt.label}</span>
                    <span className={cn("text-[8.5px] font-mono leading-none mt-0.5", isActive ? "text-primary font-bold" : "text-muted-foreground/70")}>{opt.sub}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid Alignment Quick Selector */}
        {photoType !== "stretch" && (
          <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-background/50 border border-border/60 shadow-2xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/80 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-primary" />
                <span>محاذاة الشبكة على الورقة</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">
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
              className="grid gap-[3px] p-2 bg-muted/30 rounded-lg border border-border/40 w-fit mx-auto"
              style={{
                direction: "ltr",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
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
                      "w-7.5 h-7.5 rounded-md flex items-center justify-center transition-all cursor-pointer active:scale-90",
                      isCenter && "rounded-lg",
                      isActive  && "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-1 ring-primary/50",
                      !isActive && "bg-card text-muted-foreground border border-border/40 hover:bg-muted hover:text-foreground hover:border-primary/30",
                    )}
                  >
                    <Icon className={cn(
                      "shrink-0",
                      isCenter ? "w-4 h-4 stroke-[2.5]" : "w-3 h-3"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showSaveForm ? (
          <div className="flex gap-2 pt-1 border-t border-border/30">
            <button
              onClick={() => applyCustomCollage(rows, cols)}
              className={cn(
                "flex-1 h-8 text-xs font-bold rounded-md transition-all border active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                isCurrentActive
                  ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
                  : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {isCurrentActive ? "تحديث الشبكة الحالية" : "تطبيق التقسيم"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveName(`كولاج مخصص ${rows}×${cols}`);
                setShowSaveForm(true);
              }}
              className="w-8 h-8 text-xs font-bold rounded-md border border-border/80 bg-background hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center active:scale-[0.98] transition-all shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              title="حفظ كقالب جديد"
            >
              <FolderHeart className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/80 shadow-2xs animate-in slide-in-from-top-2 duration-200">
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
                className="flex-1 h-7.5 text-[10px] font-bold rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer transition-all flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
              >
                <X className="w-3 h-3" />
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 h-7.5 text-[10px] font-bold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Save className="w-3 h-3" />
                حفظ القالب
              </button>
            </div>
          </div>
        )}
      </FluentSection>
    </div>
  );
});

export { CustomCollageCard };
