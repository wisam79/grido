import React, { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { COLLAGE_TEMPLATES, CollageTemplate } from "@/lib/templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LayoutGrid, Plus, Minus, Image as ImageIcon, Paintbrush, Rows, Columns, IdCard, User, Contact, Scaling } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ColorWheelPicker } from "./properties/shared-controls";

export function TemplatePanel() {
  const { setCollageTemplate, collageTemplate, backgroundColor, setBackgroundColor } = useEditorStore(useShallow((state) => ({
    setCollageTemplate: state.setCollageTemplate,
    collageTemplate: state.collageTemplate,
    backgroundColor: state.backgroundColor,
    setBackgroundColor: state.setBackgroundColor,
  })));

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/40 select-none">
      {/* Panel Header */}
      <div className="p-4 border-b border-border/50 bg-card/45 backdrop-blur-md shrink-0">
        <h2 className="text-xs font-bold flex items-center gap-2 text-foreground/95">
          <LayoutGrid className="w-4 h-4 text-primary animate-pulse" />
          <span>تخطيط الكولاج واللون</span>
        </h2>
      </div>

      {/* Scrollable Sidebar Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-8 space-y-4">
          {/* Color Picker Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              <Paintbrush className="w-3.5 h-3.5 text-primary" />
              <span>لون خلفية مساحة العمل</span>
            </div>
            <ColorWheelPicker
              color={backgroundColor}
              onChange={setBackgroundColor}
            />
          </div>

          <Separator className="bg-border/25" />

          {/* Grid Settings Section */}
          <div className="space-y-3.5">
            <CustomCollageCard 
              onSelect={setCollageTemplate} 
              activeTemplateId={collageTemplate?.id} 
            />

            {/* Ready-made Templates Dialog Trigger */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full text-xs font-bold gap-1.5 h-9 rounded-xl border-border/60 hover:border-primary/45 hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer shadow-xs active:scale-[0.98] transition-all"
                >
                  <LayoutGrid className="w-4 h-4 text-primary" />
                  <span>قوالب كولاج جاهزة...</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card p-5" dir="rtl">
                <DialogHeader className="pb-3 border-b border-border/30">
                  <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <LayoutGrid className="w-4.5 h-4.5 text-primary" />
                    <span>اختيار قالب كولاج جاهز</span>
                  </DialogTitle>
                  <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
                    اختر أحد التنسيقات المقترحة لتقسيم الكولاج تلقائياً.
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 py-4 pr-1">
                  <div className="grid grid-cols-3 gap-3.5">
                    {COLLAGE_TEMPLATES.slice(0, 5).map((tpl) => (
                      <CollageTemplateCard 
                        key={tpl.id} 
                        tpl={tpl} 
                        onSelect={(t) => {
                          setCollageTemplate(t);
                          setDialogOpen(false);
                        }} 
                        isActive={collageTemplate?.id === tpl.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
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
}: {
  tpl: CollageTemplate;
  onSelect: (t: CollageTemplate) => void;
  isActive: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(tpl)}
      className={cn(
        "group flex flex-col items-stretch gap-2.5 p-3 rounded-2xl border transition-all duration-300 text-right relative overflow-hidden active:scale-[0.97] cursor-pointer",
        isActive
          ? "border-2 border-primary bg-card shadow-[0_8px_20px_rgba(59,130,246,0.15)]"
          : "border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-border-hover hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Active Indicator Dot */}
      {isActive && (
        <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-primary animate-ping" />
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
    </button>
  );
});

const CustomCollageCard = React.memo(function CustomCollageCard({
  onSelect,
  activeTemplateId,
}: {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
}) {
  const { canvasWidth, canvasHeight } = useEditorStore(useShallow((state) => ({
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
  })));

  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [photoType, setPhotoType] = useState<"stretch" | "passport" | "id" | "visa">("stretch");

  const calculateCells = (r: number, c: number, type: string) => {
    const W = canvasWidth || 1200;
    const H = canvasHeight || 1200;

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

    let photoRatio = 0.7778; // Passport 3.5x4.5
    if (type === "id") {
      photoRatio = 0.6667; // ID 4x6
    } else if (type === "visa") {
      photoRatio = 1.0; // Visa 5x5
    }

    const gap = Math.max(8, Math.round(W * 0.012));
    const marginX = Math.max(16, Math.round(W * 0.025));
    const marginY = Math.max(16, Math.round(H * 0.025));

    const availW = W - 2 * marginX - (c - 1) * gap;
    const availH = H - 2 * marginY - (r - 1) * gap;

    if (availW <= 0 || availH <= 0) {
      return calculateCells(r, c, "stretch");
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
    const startX = (W - gridW) / 2;
    const startY = (H - gridH) / 2;

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

  const applyCustomCollage = (r: number, c: number, type = photoType) => {
    const cells = calculateCells(r, c, type);
    const tpl: CollageTemplate = {
      id: "collage-custom",
      name: `كولاج مخصص (${r}×${c})`,
      slots: r * c,
      cells,
      icon: LayoutGrid,
    };
    onSelect(tpl);
  };

  const isCurrentActive = activeTemplateId === "collage-custom";
  const previewCells = calculateCells(rows, cols, photoType);

  return (
    <div
      className={cn(
        "group flex flex-col items-stretch gap-2.5 p-3 rounded-2xl border transition-all duration-300 text-right relative overflow-hidden bg-card",
        isCurrentActive
          ? "border-2 border-primary shadow-[0_8px_20px_rgba(59,130,246,0.12)]"
          : "border-border shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-primary/45 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* Visual representation of custom grid */}
      <div className="w-28 h-28 mx-auto bg-muted/40 dark:bg-muted/15 rounded-xl p-1.5 border border-border/40 relative flex flex-col justify-between overflow-hidden shrink-0 shadow-inner">
        <div className="w-full h-full relative overflow-hidden rounded-lg bg-background dark:bg-background shadow-inner border border-border/20">
          {previewCells.map((c, i) => (
            <div
              key={i}
              className={cn(
                "absolute border rounded-md flex items-center justify-center overflow-hidden transition-all duration-300",
                isCurrentActive
                  ? "bg-primary/10 border-primary/30"
                  : "bg-muted/60 dark:bg-muted/20 border-border group-hover:bg-accent/40"
              )}
              style={{
                left: `${c.x * 100}%`,
                top: `${c.y * 100}%`,
                width: `${c.w * 100}%`,
                height: `${c.h * 100}%`,
              }}
            >
              <ImageIcon className={cn(
                "w-2.5 h-2.5 shrink-0",
                isCurrentActive ? "text-primary/60" : "text-muted-foreground/35"
              )} />
            </div>
          ))}
        </div>
      </div>

      {/* Inputs for custom grid */}
      <div className="flex flex-col gap-2.5 mt-0.5 px-0.5">
        <div className={cn(
          "text-[10px] font-bold leading-tight transition-colors",
          isCurrentActive ? "text-primary" : "text-foreground group-hover:text-primary"
        )}>
          تخصيص حر (أعمدة × صفوف)
        </div>

        {/* Photo Type Selector */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-muted-foreground">نسبة وحجم الصورة:</span>
          <div className="grid grid-cols-4 gap-1 bg-muted/40 dark:bg-muted/25 p-0.5 rounded-lg border border-border/40">
            <button
              type="button"
              onClick={() => {
                setPhotoType("stretch");
                applyCustomCollage(rows, cols, "stretch");
              }}
              title="ملء الورقة (تمدد)"
              className={cn(
                "h-8 px-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer",
                photoType === "stretch"
                  ? "bg-background text-primary shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/30"
              )}
            >
              <Scaling className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoType("passport");
                applyCustomCollage(rows, cols, "passport");
              }}
              title="جواز سفر (3.5×4.5)"
              className={cn(
                "h-8 px-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer",
                photoType === "passport"
                  ? "bg-background text-primary shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/30"
              )}
            >
              <Contact className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoType("id");
                applyCustomCollage(rows, cols, "id");
              }}
              title="هوية (4×6)"
              className={cn(
                "h-8 px-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer",
                photoType === "id"
                  ? "bg-background text-primary shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/30"
              )}
            >
              <IdCard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPhotoType("visa");
                applyCustomCollage(rows, cols, "visa");
              }}
              title="تأشيرة (5×5)"
              className={cn(
                "h-8 px-1 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer",
                photoType === "visa"
                  ? "bg-background text-primary shadow-xs border border-border/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/30"
              )}
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Row & Column Stepper Controls */}
        <div className="flex flex-col gap-2.5 mt-0.5">
          {/* Rows Stepper */}
          <div className="flex items-center justify-between bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-lg px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground" title="الصفوف">
              <Rows className="w-4 h-4" />
              <span>الصفوف</span>
            </span>
            <div className="flex items-center gap-2.5" dir="ltr">
              <button
                type="button"
                onClick={() => {
                  const r = Math.max(1, rows - 1);
                  setRows(r);
                  applyCustomCollage(r, cols);
                }}
                className="w-8 h-8 rounded-md bg-background dark:bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-all border border-border/30 shadow-xs cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono text-sm font-bold w-6 text-center text-foreground">{rows}</span>
              <button
                type="button"
                onClick={() => {
                  const r = Math.min(6, rows + 1);
                  setRows(r);
                  applyCustomCollage(r, cols);
                }}
                className="w-8 h-8 rounded-md bg-background dark:bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-all border border-border/30 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Columns Stepper */}
          <div className="flex items-center justify-between bg-muted/40 dark:bg-muted/20 border border-border/60 rounded-lg px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground" title="الأعمدة">
              <Columns className="w-4 h-4" />
              <span>الأعمدة</span>
            </span>
            <div className="flex items-center gap-2.5" dir="ltr">
              <button
                type="button"
                onClick={() => {
                  const c = Math.max(1, cols - 1);
                  setCols(c);
                  applyCustomCollage(rows, c);
                }}
                className="w-8 h-8 rounded-md bg-background dark:bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-all border border-border/30 shadow-xs cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono text-sm font-bold w-6 text-center text-foreground">{cols}</span>
              <button
                type="button"
                onClick={() => {
                  const c = Math.min(6, cols + 1);
                  setCols(c);
                  applyCustomCollage(rows, c);
                }}
                className="w-8 h-8 rounded-md bg-background dark:bg-card hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center active:scale-90 transition-all border border-border/30 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => applyCustomCollage(rows, cols)}
          className={cn(
            "w-full py-3 text-xs font-bold rounded-xl mt-1.5 transition-all border active:scale-[0.96] cursor-pointer",
            isCurrentActive
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/95 shadow-sm shadow-primary/25"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-border/80"
          )}
        >
          {isCurrentActive ? "تخصيص نشط" : "تطبيق التقسيم"}
        </button>
      </div>
    </div>
  );
});
