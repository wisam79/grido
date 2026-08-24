import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Plus,
  Minus,
  FolderHeart,
  X,
  Save,
  ArrowUpRight,
  ArrowUpLeft,
  Crosshair,
  Columns,
  Rows,
  Maximize2,
  Sparkles,
  Zap,
  Check,
  Trash2,
  Layers,
  Upload,
} from "lucide-react";
import { CollageTemplate, COLLAGE_TEMPLATES } from "@/lib/templates";
import { FreeformCollageModal } from "@/features/freeform-collage";
import { FluentSection, FluentSegmentedControl } from "@/components/ui/blocks";
import { StudioCanvasColorDeck } from "../properties/shared-controls";

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

// 🎴 قوالب الشيت الكامل
const STUDIO_FULL_SHEET_PRESETS = [
  {
    id: "collage-iq-national",
    title: "8 صور بطاقة وجواز",
    spec: "35 × 45 مم",
    badge: "2×4",
    slots: 8,
  },
  {
    id: "collage-iq-civil",
    title: "8 صور أحوال وجنسية",
    spec: "32 × 40 مم",
    badge: "2×4",
    slots: 8,
  },
  {
    id: "collage-iq-general",
    title: "4 صور معاملات عامة",
    spec: "40 × 60 مم",
    badge: "2×2",
    slots: 4,
  },
  {
    id: "collage-iq-mixed",
    title: "طقم معاملات مختلط",
    spec: "4 (35×45) + 2 (40×60)",
    badge: "طقم",
    slots: 6,
  },
  {
    id: "collage-4",
    title: "4 صور متساوية",
    spec: "2 × 2 شبكة متساوية",
    badge: "2×2",
    slots: 4,
  },
  {
    id: "collage-8",
    title: "8 صور متساوية",
    spec: "4 × 2 شبكة متساوية",
    badge: "4×2",
    slots: 8,
  },
];

// 📏 قوالب الصف الواحد (Single Row Strip) — الأكثر طلباً للطباعة والقص السريع
const STUDIO_SINGLE_ROW_PRESETS = [
  {
    id: "collage-iq-national-row4",
    title: "4 صور جواز وبطاقة",
    spec: "35 × 45 مم",
    badge: "1×4",
    slots: 4,
  },
  {
    id: "collage-iq-civil-row4",
    title: "4 صور أحوال وجنسية",
    spec: "32 × 40 مم",
    badge: "1×4",
    slots: 4,
  },
  {
    id: "collage-iq-general-row2",
    title: "صورتان معاملات عامة",
    spec: "40 × 60 مم",
    badge: "1×2",
    slots: 2,
  },
  {
    id: "collage-iq-pension-row4",
    title: "4 صور متقاعدين",
    spec: "30 × 40 مم",
    badge: "1×4",
    slots: 4,
  },
  {
    id: "collage-1x4-row",
    title: "4 صور متساوية",
    spec: "تمدد حر متساوي",
    badge: "1×4",
    slots: 4,
  },
  {
    id: "collage-6v-row",
    title: "6 صور متساوية",
    spec: "تمدد حر متساوي",
    badge: "1×6",
    slots: 6,
  },
  {
    id: "collage-1x3-row",
    title: "3 صور متساوية",
    spec: "تمدد حر متساوي",
    badge: "1×3",
    slots: 3,
  },
  {
    id: "collage-2h",
    title: "صورتان متساويتان",
    spec: "أفقي متساوي",
    badge: "1×2",
    slots: 2,
  },
];

interface CustomCollageCardProps {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
  onSaveTemplate: (name: string, cells: any[]) => void;
  savedTemplates?: CollageTemplate[];
  onDeleteTemplate?: (id: string, e: React.MouseEvent) => void;
  onOpenTemplatesDialog?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

const CustomCollageCard = React.memo(function CustomCollageCard({
  onSelect,
  activeTemplateId,
  onSaveTemplate,
  savedTemplates = [],
  onDeleteTemplate,
  onOpenTemplatesDialog,
  fileInputRef,
}: CustomCollageCardProps) {
  const { canvasWidth, canvasHeight, printSettings, collageTemplate, backgroundColor, setBackgroundColor } =
    useEditorStore(
      useShallow((state) => ({
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        printSettings: state.printSettings,
        collageTemplate: state.collageTemplate,
        backgroundColor: state.backgroundColor,
        setBackgroundColor: state.setBackgroundColor,
      }))
    );

  // التبويب الرئيسي للوحة الكولاج (3-Tab Navigation)
  const [activeTab, setActiveTab] = useState<"presets" | "custom" | "library">("presets");

  // تصنيف النماذج السريعة
  const [presetCategory, setPresetCategory] = useState<"row" | "full">("row");

  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(4);
  const [photoType, setPhotoType] = useState<
    "stretch" | "passport" | "id" | "visa" | "iq-national-id" | "iq-civil-id" | "iq-general-id" | "iq-transactions"
  >("iq-national-id");
  const [gridAlign, setGridAlign] = useState<GridAlignment>("top-left");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showFreeformModal, setShowFreeformModal] = useState(false);

  const isCustomActive =
    activeTemplateId === "collage-custom" ||
    (typeof activeTemplateId === "string" && activeTemplateId.startsWith("freeform-"));

  // تحديث التبويب النشط بناء على القالب الحالي
  // 🛡️ نمط "ضبط الحالة أثناء الرسم" المعتمد رسمياً في React بدل useEffect —
  // يتجنّب الرندر المتتالي (cascading render) ويزامن فوراً مع تغير القالب
  // 🛡️ نبدأ بـ null لضمان تنفيذ الضبط في أول رسم أيضاً (سلوك مطابق لـ
  // useEffect القديم الذي كان يعمل عند التركيب) دون رندر متتالي
  const [prevTemplateId, setPrevTemplateId] = useState<string | null | undefined>(null);
  if (activeTemplateId !== prevTemplateId) {
    setPrevTemplateId(activeTemplateId);
    if (activeTemplateId) {
      if (isCustomActive) {
        setActiveTab("custom");
      } else if (STUDIO_SINGLE_ROW_PRESETS.some((p) => p.id === activeTemplateId)) {
        setPresetCategory("row");
      } else if (STUDIO_FULL_SHEET_PRESETS.some((p) => p.id === activeTemplateId)) {
        setPresetCategory("full");
      }
    }
  }

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
      }
    });
  }, [collageTemplate]);

  const getMaxGridConfig = useCallback(() => {
    const W = canvasWidth || 2480;
    const H = canvasHeight || 3508;
    const storedDpi = printSettings?.dpi || 300;

    let dpi = storedDpi;
    if (typeof W === "number" && typeof H === "number" && W > 0 && H > 0) {
      for (const [pW, pH] of [
        [210, 297],
        [148, 210],
        [100, 150],
        [127, 178],
        [297, 420],
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
      return { maxRows: 12, maxCols: 12 };
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
  }, [canvasWidth, canvasHeight, printSettings, photoType]);

  const { maxRows, maxCols } = getMaxGridConfig();

  const applyCustomCollage = useCallback(
    (
      targetRows: number,
      targetCols: number,
      customPhotoType?: typeof photoType,
      customAlign?: GridAlignment
    ) => {
      const activePhotoType = customPhotoType ?? photoType;
      const activeAlign = customAlign ?? gridAlign;

      if (activePhotoType === "stretch") {
        const cells = [];
        const cellW = 1 / targetCols;
        const cellH = 1 / targetRows;
        for (let row = 0; row < targetRows; row++) {
          for (let col = 0; col < targetCols; col++) {
            cells.push({
              x: col * cellW,
              y: row * cellH,
              w: cellW,
              h: cellH,
            });
          }
        }
        onSelect({
          id: "collage-custom",
          name: `كولاج مخصص (${targetRows}×${targetCols})`,
          slots: targetRows * targetCols,
          cells,
          icon: LayoutGrid,
        });
        return;
      }

      const W = canvasWidth || 2480;
      const H = canvasHeight || 3508;
      const storedDpi = printSettings?.dpi || 300;

      let dpi = storedDpi;
      if (typeof W === "number" && typeof H === "number" && W > 0 && H > 0) {
        for (const [pW, pH] of [
          [210, 297],
          [148, 210],
          [100, 150],
          [127, 178],
          [297, 420],
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

      let wMM = 35;
      let hMM = 45;
      let label = "بطاقة وطنية";
      if (activePhotoType === "iq-national-id" || activePhotoType === "passport") {
        wMM = 35;
        hMM = 45;
        label = "بطاقة وطنية / جواز";
      } else if (activePhotoType === "iq-civil-id") {
        wMM = 32;
        hMM = 40;
        label = "هوية أحوال";
      } else if (activePhotoType === "iq-general-id") {
        wMM = 40;
        hMM = 60;
        label = "هوية عامة";
      } else if (activePhotoType === "iq-transactions" || activePhotoType === "id") {
        wMM = 30;
        hMM = 40;
        label = "متقاعدون / معاملات";
      } else if (activePhotoType === "visa") {
        wMM = 50;
        hMM = 50;
        label = "فيزا سفر 5×5";
      }

      const cellW_px = (wMM * dpi) / 25.4;
      const cellH_px = (hMM * dpi) / 25.4;

      const normW = cellW_px / W;
      const normH = cellH_px / H;

      const totalGridW = targetCols * normW;
      const totalGridH = targetRows * normH;

      let startX = 0;
      let startY = 0;

      if (activeAlign === "center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (activeAlign === "top-left") {
        startX = 0;
        startY = 0;
      } else if (activeAlign === "top-center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = 0;
      } else if (activeAlign === "top-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = 0;
      } else if (activeAlign === "center-left") {
        startX = 0;
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (activeAlign === "center-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = Math.max(0, (1 - totalGridH) / 2);
      } else if (activeAlign === "bottom-left") {
        startX = 0;
        startY = Math.max(0, 1 - totalGridH);
      } else if (activeAlign === "bottom-center") {
        startX = Math.max(0, (1 - totalGridW) / 2);
        startY = Math.max(0, 1 - totalGridH);
      } else if (activeAlign === "bottom-right") {
        startX = Math.max(0, 1 - totalGridW);
        startY = Math.max(0, 1 - totalGridH);
      }

      const cells = [];
      for (let row = 0; row < targetRows; row++) {
        for (let col = 0; col < targetCols; col++) {
          cells.push({
            x: startX + col * normW,
            y: startY + row * normH,
            w: normW,
            h: normH,
          });
        }
      }

      onSelect({
        id: "collage-custom",
        name: `كولاج ${label} (${targetRows}×${targetCols})`,
        slots: targetRows * targetCols,
        cells,
        icon: LayoutGrid,
        physicalLayout: {
          type: activePhotoType,
          rows: targetRows,
          cols: targetCols,
          align: activeAlign,
        },
      });
    },
    [canvasWidth, canvasHeight, printSettings, photoType, gridAlign, onSelect]
  );

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error("يرجى إدخال اسم للقالب");
      return;
    }

    const W = canvasWidth || 2480;
    const H = canvasHeight || 3508;
    const storedDpi = printSettings?.dpi || 300;

    let dpi = storedDpi;
    if (typeof W === "number" && typeof H === "number" && W > 0 && H > 0) {
      for (const [pW, pH] of [
        [210, 297],
        [148, 210],
        [100, 150],
        [127, 178],
        [297, 420],
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

  const activePresetsList =
    presetCategory === "row" ? STUDIO_SINGLE_ROW_PRESETS : STUDIO_FULL_SHEET_PRESETS;

  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🧭 شريط التبويبات الثلاثي الذكي للعمود الأيمن */}
      <div className="bg-muted/50 p-1 rounded-xl border border-border/60 shadow-2xs">
        <FluentSegmentedControl
          options={[
            {
              id: "presets",
              label: "نماذج سريعة",
              icon: <Zap className="w-3.5 h-3.5" />,
            },
            {
              id: "custom",
              label: "تخصيص الشبكة",
              icon: <LayoutGrid className="w-3.5 h-3.5" />,
              badge: isCustomActive ? <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> : undefined,
            },
            {
              id: "library",
              label: "مكتبتي",
              icon: <FolderHeart className="w-3.5 h-3.5" />,
              badge: savedTemplates.length > 0 ? (
                <span className="text-[9px] bg-primary/20 text-primary font-bold px-1 rounded-full">
                  {savedTemplates.length}
                </span>
              ) : undefined,
            },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as any)}
          size="sm"
        />
      </div>

      {/* ⚡ التبويب 1: نماذج الاستوديو السريعة */}
      {activeTab === "presets" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* محول الفئات البارز والأنيق */}
          <div className="bg-muted/50 p-1 rounded-xl border border-border/60 shadow-2xs">
            <FluentSegmentedControl
              options={[
                {
                  id: "row",
                  label: "صف واحد (قص سريع)",
                  icon: <Columns className="w-3.5 h-3.5" />,
                },
                {
                  id: "full",
                  label: "شيت كامل (الورقة كلها)",
                  icon: <LayoutGrid className="w-3.5 h-3.5" />,
                },
              ]}
              value={presetCategory}
              onChange={(val) => setPresetCategory(val as "row" | "full")}
              size="sm"
            />
          </div>

          <FluentSection
            icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
            title="نماذج الاستوديو الفورية"
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
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
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
              onChange={setBackgroundColor}
            />
          </div>
        </div>
      )}

      {/* 📐 التبويب 2: تخصيص الشبكة المنتظمة للمحترفين */}
      {activeTab === "custom" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <FluentSection
            icon={<LayoutGrid className="w-3.5 h-3.5 text-primary" />}
            title="تقسيم الصفوف والأعمدة"
            action={
              <span className="text-[9.5px] font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40" dir="ltr">
                {rows * cols} صور ({rows}×{cols})
              </span>
            }
          >
            {/* عدادات الصفوف والأعمدة */}
            <div className="grid grid-cols-2 gap-2">
              {/* Rows */}
              <div className="flex flex-col items-center gap-1.5 bg-background/70 border border-border/70 hover:border-primary/40 rounded-xl p-2.5 transition-colors shadow-2xs">
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground select-none">
                  <Rows className="w-3.5 h-3.5 text-primary/80" />
                  الصفوف (أفقي)
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
                  <span className="font-mono text-base font-black text-foreground w-6 text-center leading-none select-none">
                    {rows}
                  </span>
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
              <div className="flex flex-col items-center gap-1.5 bg-background/70 border border-border/70 hover:border-primary/40 rounded-xl p-2.5 transition-colors shadow-2xs">
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-muted-foreground select-none">
                  <Columns className="w-3.5 h-3.5 text-primary/80" />
                  الأعمدة (عمودي)
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
                  <span className="font-mono text-base font-black text-foreground w-6 text-center leading-none select-none">
                    {cols}
                  </span>
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

            {/* أبعاد ومقاسات صور الوثائق */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
              <span className="text-[10.5px] font-bold text-muted-foreground">أبعاد ونوع صور الوثائق</span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { value: "stretch", label: "تمدد حر", sub: "ملء الخلية" },
                  { value: "iq-national-id", label: "بطاقة وطنية", sub: "35 × 45 مم" },
                  { value: "iq-civil-id", label: "هوية أحوال", sub: "32 × 40 مم" },
                  { value: "iq-general-id", label: "هوية عامة", sub: "40 × 60 مم" },
                  { value: "iq-transactions", label: "متقاعدون", sub: "30 × 40 مم" },
                  { value: "visa", label: "فيزا سفر", sub: "50 × 50 مم" },
                ] as const).map((opt) => {
                  const isActive = photoType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${opt.label} - ${opt.sub}`}
                      onClick={() => {
                        setPhotoType(opt.value);
                        applyCustomCollage(rows, cols, opt.value);
                      }}
                      className={cn(
                        "relative flex items-center gap-2 p-2 rounded-md border text-right transition-all cursor-pointer active:scale-[0.98] select-none h-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                        isActive
                          ? "border-2 border-primary bg-primary/15 text-primary shadow-xs font-bold ring-1 ring-primary/30"
                          : "bg-background/80 border-border/60 hover:bg-muted/40 hover:border-primary/40 text-foreground"
                      )}
                    >
                      <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-muted/40 border border-border/40">
                        <DocumentPresetGraphic type={opt.value} active={isActive} />
                      </div>

                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="text-[11.5px] font-bold leading-tight truncate w-full">{opt.label}</span>
                        <span
                          className={cn(
                            "text-[9.5px] font-mono leading-none mt-0.5",
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

            {/* لوحة محاذاة الشبكة على الورقة (Figma / Adobe Interactive Anchor Matrix) */}
            {photoType !== "stretch" && (
              <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-background/50 border border-border/60 shadow-2xs animate-in fade-in duration-200">
                {/* الرأس: العنوان + اسم المحاذاة الحالية */}
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-foreground/90 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-primary" />
                    <span>محاذاة الشبكة على الورقة</span>
                  </span>
                  <span className="text-[9px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                    {ALIGNMENT_LABELS[gridAlign] || "أعلى اليسار"}
                  </span>
                </div>

                {/* زران سريعان لأكثر الإجراءات طلباً في الاستوديو */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGridAlign("top-left");
                      applyCustomCollage(rows, cols, photoType, "top-left");
                    }}
                    className={cn(
                      "h-7 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer select-none",
                      gridAlign === "top-left"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60 hover:border-primary/30"
                    )}
                  >
                    <ArrowUpLeft className="w-3 h-3 stroke-[2.5]" />
                    <span>أعلى اليسار (للقص)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGridAlign("center");
                      applyCustomCollage(rows, cols, photoType, "center");
                    }}
                    className={cn(
                      "h-7 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer select-none",
                      gridAlign === "center"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60 hover:border-primary/30"
                    )}
                  >
                    <Crosshair className="w-3 h-3 stroke-[2.5]" />
                    <span>توسيط في المنتصف</span>
                  </button>
                </div>

                {/* الورقة المصغرة ونقاط الارتكاز التفاعلية (Interactive Anchor Pad) */}
                <div
                  className="w-full max-w-[170px] h-20 mx-auto rounded-lg border border-border/70 bg-card/90 p-1.5 grid grid-cols-3 grid-rows-3 gap-1 shadow-2xs select-none"
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
                          onClick={() => {
                            setGridAlign(alignId);
                            applyCustomCollage(rows, cols, photoType, alignId);
                          }}
                          title={ALIGNMENT_LABELS[alignId]}
                          className={cn(
                            "flex items-center justify-center rounded-md transition-all cursor-pointer relative group",
                            isActive
                              ? "bg-primary/20 border border-primary/40 ring-1 ring-primary/30"
                              : "hover:bg-muted/60"
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-full transition-all duration-150",
                              isActive
                                ? "w-2.5 h-2.5 bg-primary ring-2 ring-primary/40 shadow-xs"
                                : "w-1.5 h-1.5 bg-muted-foreground/40 group-hover:bg-primary/70 group-hover:scale-125"
                            )}
                          />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* أزرار الإجراءات والتطبيق */}
            {!showSaveForm ? (
              <div className="flex gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => applyCustomCollage(rows, cols)}
                  className={cn(
                    "flex-1 h-8 text-xs font-bold rounded-md transition-all border active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    isCustomActive
                      ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
                      : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {isCustomActive ? "تحديث الشبكة الحالية" : "تطبيق التقسيم"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveName(`كولاج مخصص ${rows}×${cols}`);
                    setShowSaveForm(true);
                  }}
                  className="w-8 h-8 text-xs font-bold rounded-md border border-border/80 bg-background hover:bg-accent hover:border-primary/40 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center active:scale-[0.98] transition-all shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  title="حفظ كقالب جديد في مكتبتي"
                >
                  <FolderHeart className="w-3.5 h-3.5" />
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
                    <X className="w-3 h-3" />
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 h-8 text-[10px] font-bold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Save className="w-3 h-3" />
                    حفظ القالب
                  </button>
                </div>
              </div>
            )}
          </FluentSection>
        </div>
      )}

      {/* 🗂️ التبويب 3: كولاج حر ومكتبتي */}
      {activeTab === "library" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Freeform Mixed Builder Action Button */}
          <button
            type="button"
            onClick={() => setShowFreeformModal(true)}
            className="w-full h-10 px-3.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 text-xs font-bold transition-all cursor-pointer flex items-center justify-between group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none shadow-2xs fluent-specular"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-primary shrink-0 group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col items-start text-right">
                <span className="font-bold">كولاج حر ومختلط</span>
                <span className="text-[9.5px] text-muted-foreground font-normal">دمج أحجام وقياسات متعددة في ورقة واحدة</span>
              </div>
            </div>
            <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
              فتح
            </span>
          </button>

          {/* القوالب المحفوظة الخاصة بالمستخدم */}
          <FluentSection
            icon={<FolderHeart className="w-3.5 h-3.5 text-primary" />}
            title="قوالبي المحفوظة"
            action={
              <button
                type="button"
                onClick={() => fileInputRef?.current?.click()}
                className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                title="استيراد قوالب من ملف JSON"
              >
                <Upload className="w-3 h-3" />
                <span>استيراد</span>
              </button>
            }
          >
            {savedTemplates.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border/60 rounded-xl">
                لا توجد قوالب محفوظة بعد. يمكنك تخصيص شبكة وحفظها من تبويب "تخصيص الشبكة".
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {savedTemplates.map((t) => {
                  const isActive = activeTemplateId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelect(t)}
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none group",
                        isActive
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : "bg-background/80 border-border/70 hover:bg-muted/50 hover:border-primary/40 text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold truncate">{t.name}</span>
                        <span className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                          {t.slots} خانات
                        </span>
                      </div>
                      {onDeleteTemplate && (
                        <button
                          type="button"
                          onClick={(e) => onDeleteTemplate(t.id, e)}
                          title="حذف القالب"
                          className="w-6 h-6 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </FluentSection>

          {/* زر فتح مكتبة القوالب الكاملة */}
          {onOpenTemplatesDialog && (
            <button
              type="button"
              onClick={onOpenTemplatesDialog}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border/80 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 text-foreground transition-all cursor-pointer active:scale-[0.98] shadow-2xs font-bold text-xs"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span>تصفح كافة القوالب الرسمية</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          )}
        </div>
      )}

      <FreeformCollageModal open={showFreeformModal} onOpenChange={setShowFreeformModal} />
    </div>
  );
});

export { CustomCollageCard };
