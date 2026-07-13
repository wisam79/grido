import React, { useState, useEffect } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { COLLAGE_TEMPLATES, CollageTemplate, PAPER_SIZES } from "@/lib/templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Minus, Image as ImageIcon, Paintbrush, Rows, Columns, FolderHeart, Trash2, Save, X, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, Crosshair } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { PopoverColorPicker } from "./properties/shared-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TemplatePanel() {
  const { setCollageTemplate, collageTemplate, backgroundColor, setBackgroundColor } = useEditorStore(useShallow((state) => ({
    setCollageTemplate: state.setCollageTemplate,
    collageTemplate: state.collageTemplate,
    backgroundColor: state.backgroundColor,
    setBackgroundColor: state.setBackgroundColor,
  })));

  const [savedTemplates, setSavedTemplates] = useState<CollageTemplate[]>(() => {
    const raw = localStorage.getItem("grido_user_collage_templates");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return parsed.map((t: any) => ({
          ...t,
          icon: LayoutGrid,
        }));
      } catch (e) {
        console.error("Failed to load user templates", e);
      }
    }
    return [];
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPredefined, setShowPredefined] = useState(false);
  
  const officialTemplates = COLLAGE_TEMPLATES.filter(
    (t) => t.id.startsWith("collage-iq-") || t.id === "collage-passport-sheet"
  );

  const loadTemplates = () => {
    const raw = localStorage.getItem("grido_user_collage_templates");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const mapped = parsed.map((t: any) => ({
          ...t,
          icon: LayoutGrid,
        }));
        setSavedTemplates(mapped);
      } catch (e) {
        console.error("Failed to load user templates", e);
      }
    } else {
      setSavedTemplates([]);
    }
  };

  const handleSaveTemplate = (name: string, cells: any[]) => {
    const newTpl: CollageTemplate = {
      id: "collage-user-" + Date.now(),
      name,
      slots: cells.length,
      cells,
      icon: LayoutGrid,
    };
    const updated = [...savedTemplates, newTpl];
    localStorage.setItem("grido_user_collage_templates", JSON.stringify(updated));
    setSavedTemplates(updated);
    toast.success("تم حفظ القالب بنجاح");
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter((t) => t.id !== id);
    localStorage.setItem("grido_user_collage_templates", JSON.stringify(updated));
    setSavedTemplates(updated);
    toast.success("تم حذف القالب بنجاح");
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/40 select-none">
      {/* Scrollable Sidebar Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 pb-8 space-y-4">
          {/* Color Picker Section */}
          <div className="space-y-1.5 font-cairo">
            <PopoverColorPicker
              color={backgroundColor}
              onChange={setBackgroundColor}
              className="w-full h-9 rounded-xl border-border/60 bg-background/60 hover:bg-accent/30 hover:border-primary/30"
              label={
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                  <Paintbrush className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>لون خلفية مساحة العمل</span>
                </div>
              }
            />
          </div>

          <Separator className="bg-border/25" />

          {/* Grid Settings Section */}
          <div className="space-y-3.5">
            <CustomCollageCard 
              onSelect={setCollageTemplate} 
              activeTemplateId={collageTemplate?.id} 
              onSaveTemplate={handleSaveTemplate}
            />

            <Separator className="bg-border/25" />

            <div className="space-y-2.5 font-cairo pt-1.5">
              <Dialog onOpenChange={(open) => { if (open) loadTemplates(); }}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/70 hover:border-primary/30 text-foreground transition-all cursor-pointer active:scale-[0.98] shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FolderHeart className="w-4 h-4 text-primary" />
                      <span className="text-[11px] font-bold">قوالب الكولاج والطباعة</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl font-cairo" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="text-right text-base font-bold flex items-center gap-2">
                      <FolderHeart className="w-5 h-5 text-primary" />
                      قوالب الكولاج والطباعة
                    </DialogTitle>
                    <DialogDescription className="text-right text-[11px]">
                      اختر من نماذج الطباعة الرسمية المجهزة أو قوالب الكولاج التي قمت بحفظها مسبقاً.
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="official" className="w-full mt-3">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-10 border border-border/40">
                      <TabsTrigger value="official" className="rounded-lg font-bold text-xs cursor-pointer py-1.5">
                        نماذج الطباعة الرسمية
                      </TabsTrigger>
                      <TabsTrigger value="saved" className="rounded-lg font-bold text-xs cursor-pointer py-1.5 flex items-center justify-center gap-1.5">
                        قوالبي المحفوظة
                        {savedTemplates.length > 0 && (
                          <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
                            {savedTemplates.length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="official" className="mt-4 focus-visible:outline-hidden">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                        {officialTemplates.map((tpl) => (
                          <DialogTrigger key={tpl.id} asChild>
                            <div>
                              <CollageTemplateCard
                                tpl={tpl}
                                onSelect={(t) => setCollageTemplate(t)}
                                isActive={collageTemplate?.id === tpl.id}
                              />
                            </div>
                          </DialogTrigger>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="saved" className="mt-4 focus-visible:outline-hidden">
                      {savedTemplates.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground text-center py-10 border border-dashed border-border/60 rounded-2xl bg-muted/5">
                          لا توجد قوالب محفوظة بعد. يمكنك إنشاء قالب مخصص وحفظه.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                          {savedTemplates.map((tpl) => (
                            <DialogTrigger key={tpl.id} asChild>
                              <div>
                                <CollageTemplateCard
                                  tpl={tpl}
                                  onSelect={(t) => setCollageTemplate(t)}
                                  isActive={collageTemplate?.id === tpl.id}
                                  onDelete={(e) => handleDeleteTemplate(tpl.id, e)}
                                />
                              </div>
                            </DialogTrigger>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

const CollageTemplateCard = React.memo(function CollageTemplateCard({
  tpl,
  onSelect,
  isActive,
  onDelete,
}: {
  tpl: CollageTemplate;
  onSelect: (t: CollageTemplate) => void;
  isActive: boolean;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={() => onSelect(tpl)}
      className={cn(
        "group flex flex-col items-stretch gap-2.5 p-3 rounded-2xl border transition-all duration-300 text-right relative overflow-hidden bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-border-hover hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] active:scale-[0.97] cursor-pointer select-none",
        isActive
          ? "border-2 border-primary shadow-[0_8px_20px_rgba(59,130,246,0.15)]"
          : "border-border"
      )}
    >
      {/* Active Indicator Dot (Top Right) */}
      {isActive && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary z-10 animate-pulse" />
      )}

      {/* Delete Button (Top Left) */}
      {onDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 hover:text-red-600 flex items-center justify-center border border-red-100 dark:border-red-900/30 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shadow-sm"
              title="حذف القالب"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="font-cairo text-right" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف القالب</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا القالب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse sm:justify-start gap-2">
              <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(e); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                حذف نهائي
              </AlertDialogAction>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="mt-0 border-border">إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Collage Preview Frame */}
      <div className="aspect-square w-full bg-muted/40 dark:bg-muted/15 rounded-xl p-1.5 border border-border/40 relative shrink-0">
        <div className="w-full h-full relative overflow-hidden rounded-lg bg-background dark:bg-background shadow-inner border border-border/20">
          {tpl.cells.map((c, i) => (
            <div
              key={i}
              className={cn(
                "absolute border rounded-md flex items-center justify-center overflow-hidden transition-all duration-300",
                isActive
                  ? "bg-primary/10 border-primary/45"
                  : "bg-muted/60 dark:bg-muted/20 border-border group-hover:bg-accent/40 group-hover:border-primary/30"
              )}
              style={{
                left: `calc(${c.x * 100}% + 1px)`,
                top: `calc(${c.y * 100}% + 1px)`,
                width: `calc(${c.w * 100}% - 2px)`,
                height: `calc(${c.h * 100}% - 2px)`,
              }}
            >
              <ImageIcon className={cn(
                "w-1/3 h-1/3 transition-transform duration-300 group-hover:scale-110",
                isActive ? "text-primary/70" : "text-muted-foreground/45"
              )} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Title & Info */}
      <div className="flex flex-col gap-1.5 mt-0.5 px-0.5">
        <div className={cn(
          "text-[10px] font-bold leading-tight truncate transition-colors duration-200",
          isActive ? "text-primary" : "text-foreground group-hover:text-primary"
        )}>
          {tpl.name}
        </div>
        <div className="flex items-center justify-between mt-0.5 border-t border-border/20 pt-2">
          <span className={cn(
            "px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border transition-colors",
            isActive
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border"
          )}>
            {tpl.slots} صور
          </span>
          <span className="text-[8px] font-bold text-muted-foreground">تخطيط تلقائي</span>
        </div>
      </div>
    </div>
  );
});

function PhotoTypeMiniature({ type, active }: { type: string; active: boolean }) {
  return (
    <div className={cn(
      "w-7 h-9 rounded-md border flex items-center justify-center mb-1 transition-all duration-200",
      active ? "border-primary/80 bg-primary/10 shadow-[0_0_8px_rgba(59,130,246,0.15)]" : "border-border/60 bg-muted/20"
    )}>
      {type === "stretch" ? (
        <LayoutGrid className={cn("w-3.5 h-3.5 transition-colors", active ? "text-primary" : "text-muted-foreground/60")} />
      ) : (
        <div className={cn(
          "rounded-[1px] border border-dashed transition-all duration-200",
          type === "visa" ? "w-4.5 h-4.5" : 
          type === "iq-general-id" ? "w-3.5 h-5.5" :
          type === "iq-national-id" ? "w-4 h-5.5" :
          type === "iq-civil-id" ? "w-4 h-5" : "w-4 h-4.5",
          active ? "border-primary/80 bg-primary/30" : "border-muted-foreground/50 bg-muted/40"
        )} />
      )}
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
  const { canvasWidth, canvasHeight, printSettings } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    printSettings: state.printSettings,
  })));

  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [photoType, setPhotoType] = useState<
    "stretch" | "passport" | "id" | "visa" | "iq-national-id" | "iq-civil-id" | "iq-general-id" | "iq-transactions"
  >("stretch");
  const [gridAlign, setGridAlign] = useState<"center" | "top-left" | "top-right" | "bottom-left" | "bottom-right">("center");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState("");

  const getMaxGridConfig = () => {
    if (photoType === "stretch") {
      return { maxRows: 6, maxCols: 6 };
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
      return { maxRows: 6, maxCols: 6 };
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

    return { maxRows: Math.min(6, maxRows), maxCols: Math.min(6, maxCols) };
  };

  const { maxRows, maxCols } = getMaxGridConfig();

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

  const calculateCells = (r: number, c: number, type: string, align = gridAlign) => {
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
  };

  const applyCustomCollage = (r: number, c: number, type = photoType, align = gridAlign) => {
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
      setTimeout(() => {
        setRows(adjustedRows);
        setCols(adjustedCols);
        applyCustomCollage(adjustedRows, adjustedCols, photoType, gridAlign);
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoType, canvasWidth, canvasHeight]);


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
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-muted-foreground">محاذاة شبكة الخلايا على الورقة</span>
          
          <div className="flex items-center justify-center p-3.5 bg-muted/20 border border-border/30 rounded-2xl h-28 relative">
            {/* Paper outline visual representation */}
            <div className="w-40 h-20 border border-border/60 bg-card rounded-xl relative flex items-center justify-center shadow-xs">
              {/* Top-Left */}
              <button
                type="button"
                onClick={() => {
                  setGridAlign("top-left");
                  applyCustomCollage(rows, cols, photoType, "top-left");
                }}
                className={cn(
                  "absolute top-1.5 left-1.5 w-6.5 h-6.5 rounded-md border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs",
                  gridAlign === "top-left"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
                title="أعلى اليسار"
              >
                <ArrowUpLeft className="w-3.5 h-3.5" />
              </button>

              {/* Center */}
              <button
                type="button"
                onClick={() => {
                  setGridAlign("center");
                  applyCustomCollage(rows, cols, photoType, "center");
                }}
                className={cn(
                  "w-6.5 h-6.5 rounded-md border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs",
                  gridAlign === "center"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
                title="توسيط في المنتصف"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              {/* Top-Right */}
              <button
                type="button"
                onClick={() => {
                  setGridAlign("top-right");
                  applyCustomCollage(rows, cols, photoType, "top-right");
                }}
                className={cn(
                  "absolute top-1.5 right-1.5 w-6.5 h-6.5 rounded-md border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs",
                  gridAlign === "top-right"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
                title="أعلى اليمين"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              {/* Bottom-Left */}
              <button
                type="button"
                onClick={() => {
                  setGridAlign("bottom-left");
                  applyCustomCollage(rows, cols, photoType, "bottom-left");
                }}
                className={cn(
                  "absolute bottom-1.5 left-1.5 w-6.5 h-6.5 rounded-md border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs",
                  gridAlign === "bottom-left"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
                title="أسفل اليسار"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </button>

              {/* Bottom-Right */}
              <button
                type="button"
                onClick={() => {
                  setGridAlign("bottom-right");
                  applyCustomCollage(rows, cols, photoType, "bottom-right");
                }}
                className={cn(
                  "absolute bottom-1.5 right-1.5 w-6.5 h-6.5 rounded-md border flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-2xs",
                  gridAlign === "bottom-right"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                )}
                title="أسفل اليمين"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <p className="text-[9px] text-muted-foreground/60 text-center leading-none mt-1">
            {[
              { value: "center",       label: "توسيط في المنتصف" },
              { value: "top-right",    label: "أعلى اليمين" },
              { value: "top-left",     label: "أعلى اليسار" },
              { value: "bottom-right", label: "أسفل اليمين" },
              { value: "bottom-left",  label: "أسفل اليسار" },
            ].find(o => o.value === gridAlign)?.label}
          </p>
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
