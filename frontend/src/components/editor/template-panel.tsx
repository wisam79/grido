import { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { COLLAGE_TEMPLATES, CollageTemplate } from "@/lib/templates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Images, LayoutGrid, Rows, Columns, Image as ImageIcon } from "lucide-react";

export function TemplatePanel() {
  const { setCollageTemplate, collageTemplate } = useEditorStore();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Panel Header */}
      <div className="p-4 border-b border-border/40 bg-card/10">
        <h2 className="text-sm font-bold flex items-center gap-2 text-foreground/95">
          <Images className="w-4.5 h-4.5 text-primary" /> قوالب الكولاج
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
          اختر قالباً جاهزاً أو خصص التقسيم حسب رغبتك.
        </p>
      </div>

      {/* Cards Grid */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="grid grid-cols-2 gap-2.5">
          {COLLAGE_TEMPLATES.slice(0, 5).map((tpl) => (
            <CollageTemplateCard key={tpl.id} tpl={tpl} onSelect={setCollageTemplate} />
          ))}
          <CustomCollageCard 
            onSelect={setCollageTemplate} 
            activeTemplateId={collageTemplate?.id} 
          />
        </div>
      </ScrollArea>
    </div>
  );
}

function CollageTemplateCard({
  tpl,
  onSelect,
}: {
  tpl: CollageTemplate;
  onSelect: (t: CollageTemplate) => void;
}) {
  return (
    <button
      onClick={() => onSelect(tpl)}
      className="group flex flex-col items-stretch gap-2.5 p-2.5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md hover:bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/[0.02] active:scale-[0.98] transition-all duration-300 text-right relative overflow-hidden"
    >
      {/* Collage Preview Frame */}
      <div className="aspect-square w-full bg-muted/40 dark:bg-muted/10 rounded-xl p-1 border border-border/30 relative shrink-0">
        {/* Crop corner lines for the preview box */}
        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-muted-foreground/35 rounded-tl-[2px]" />
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r border-muted-foreground/35 rounded-tr-[2px]" />
        <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l border-muted-foreground/35 rounded-bl-[2px]" />
        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-muted-foreground/35 rounded-br-[2px]" />

        <div className="w-full h-full relative overflow-hidden rounded bg-background/50 dark:bg-background/20 shadow-inner border border-border/20">
          {tpl.cells.map((c, i) => (
            <div
              key={i}
              className="absolute bg-muted/40 dark:bg-muted/10 border border-border/60 dark:border-border/30 rounded-md flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:bg-accent/60 group-hover:border-primary/40"
              style={{
                left: `calc(${c.x * 100}% + 1px)`,
                top: `calc(${c.y * 100}% + 1px)`,
                width: `calc(${c.w * 100}% - 2px)`,
                height: `calc(${c.h * 100}% - 2px)`,
              }}
            >
              {/* Image Icon inside cell */}
              <ImageIcon className="w-1/3 h-1/3 text-primary/35 dark:text-primary/25 transition-transform duration-300 group-hover:scale-110" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Title & Info */}
      <div className="flex flex-col gap-1.5 mt-0.5 px-0.5">
        <div className="text-[11px] font-bold leading-tight text-foreground/90 group-hover:text-primary transition-colors duration-200 truncate">
          {tpl.name}
        </div>
        <div className="flex items-center justify-between mt-1 border-t border-border/30 pt-2">
          <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[9px] font-bold border border-primary/20">
            {tpl.slots} صور
          </span>
          <span className="text-[9px] font-medium text-muted-foreground/80">تخطيط تلقائي</span>
        </div>
      </div>
    </button>
  );
}

function CustomCollageCard({
  onSelect,
  activeTemplateId,
}: {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
}) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  const applyCustomCollage = (r: number, c: number) => {
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

  return (
    <div
      className={cn(
        "group flex flex-col items-stretch gap-2.5 p-2.5 rounded-2xl border transition-all duration-300 text-right relative overflow-hidden",
        isCurrentActive
          ? "border-primary bg-primary/[0.02] shadow-lg shadow-primary/[0.02] dark:bg-primary/[0.04]"
          : "border-dashed border-border/80 bg-card/60 backdrop-blur-md hover:border-primary/50 hover:bg-card"
      )}
    >
      {/* Visual representation of custom grid */}
      <div className="aspect-square w-full bg-muted/40 dark:bg-muted/10 rounded-xl p-1.5 border border-border/30 relative flex flex-col justify-between overflow-hidden shrink-0">
        {/* Crop corner lines */}
        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-muted-foreground/35 rounded-tl-[2px]" />
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r border-muted-foreground/35 rounded-tr-[2px]" />
        <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l border-muted-foreground/35 rounded-bl-[2px]" />
        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-muted-foreground/35 rounded-br-[2px]" />

        <div className="w-full h-full relative overflow-hidden rounded bg-background/50 dark:bg-background/20 shadow-inner border border-border/20 flex flex-col gap-[2px] p-[2px]">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex-1 flex gap-[2px]">
              {Array.from({ length: cols }).map((_, c) => (
                <div
                  key={c}
                  className="flex-1 bg-muted/40 dark:bg-muted/10 border border-border/60 dark:border-border/30 rounded-md flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:bg-accent/60 group-hover:border-primary/40"
                >
                  <ImageIcon className="w-2.5 h-2.5 text-primary/30 shrink-0" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Inputs for custom grid */}
      <div className="flex flex-col gap-1.5 mt-1 px-1">
        <div className="text-[11px] font-bold leading-tight text-foreground/90 group-hover:text-primary transition-colors duration-200">
          تخصيص حر
        </div>
        
        {/* الصفوف والأعمدة بنمط Figma وتنسيق الأيقونات */}
        <div className="flex items-center gap-1.5 mt-1">
          {/* الصفوف */}
          <div className="flex-1 flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-7.5 shadow-xs" title="الصفوف">
            <Rows className="w-3.5 h-3.5 text-muted-foreground/60 select-none shrink-0" />
            <input
              type="number"
              min={1}
              max={6}
              value={rows}
              onChange={(e) => {
                const r = Math.max(1, Math.min(6, Number(e.target.value)));
                setRows(r);
                applyCustomCollage(r, cols);
              }}
              className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>

          {/* الأعمدة */}
          <div className="flex-1 flex items-center gap-1.5 bg-background border border-border/60 rounded-lg px-2 h-7.5 shadow-xs" title="الأعمدة">
            <Columns className="w-3.5 h-3.5 text-muted-foreground/60 select-none shrink-0" />
            <input
              type="number"
              min={1}
              max={6}
              value={cols}
              onChange={(e) => {
                const c = Math.max(1, Math.min(6, Number(e.target.value)));
                setCols(c);
                applyCustomCollage(rows, c);
              }}
              className="w-full bg-transparent border-0 p-0 text-[10px] font-mono focus:ring-0 focus:outline-hidden text-left text-foreground font-semibold"
            />
          </div>
        </div>

        <button
          onClick={() => applyCustomCollage(rows, cols)}
          className={cn(
            "w-full py-2 text-[10px] font-bold rounded-lg mt-1 transition-all border shadow-xs active:scale-[0.97]",
            isCurrentActive
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-md shadow-primary/20"
              : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-accent hover:text-foreground"
          )}
        >
          {isCurrentActive ? "تم التطبيق" : "تطبيق التقسيم"}
        </button>
      </div>
    </div>
  );
}
