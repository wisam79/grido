import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Grid3x3, Columns, Palette, ChevronDown, Square } from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShallow } from "zustand/react/shallow";
import { SliderControl } from "../shared-controls";

export const GridColumnsPanel = React.memo(function GridColumnsPanel() {
  const {
    mode,
    showGrid,
    gridSize,
    setGridSize,
    gridColor,
    setGridColor,
    gridOpacity,
    setGridOpacity,
    gridSubdivisions,
    setGridSubdivisions,
    gridType,
    setGridType,
    showColumns,
    columnsCount,
    setColumnsCount,
    columnsColor,
    setColumnsColor,
    columnsMargin,
    setColumnsMargin,
    columnsGutter,
    setColumnsGutter,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    setGridSize: state.setGridSize,
    gridColor: state.gridColor,
    setGridColor: state.setGridColor,
    gridOpacity: state.gridOpacity,
    setGridOpacity: state.setGridOpacity,
    gridSubdivisions: state.gridSubdivisions,
    setGridSubdivisions: state.setGridSubdivisions,
    gridType: state.gridType,
    setGridType: state.setGridType,
    showColumns: state.showColumns,
    columnsCount: state.columnsCount,
    setColumnsCount: state.setColumnsCount,
    columnsColor: state.columnsColor,
    setColumnsColor: state.setColumnsColor,
    columnsMargin: state.columnsMargin,
    setColumnsMargin: state.setColumnsMargin,
    columnsGutter: state.columnsGutter,
    setColumnsGutter: state.setColumnsGutter,
  })));

  const [gridExpanded, setGridExpanded] = useState(false);
  const [activeGridTab, setActiveGridTab] = useState<"grid" | "columns">("grid");

  if (mode !== "single") return null;

  return (
    <div className="space-y-3 bg-card/30 p-3 rounded-xl border border-border/40">
      <button
        type="button"
        onClick={() => setGridExpanded(!gridExpanded)}
        className="flex items-center justify-between w-full text-right cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200 text-muted-foreground", !gridExpanded && "-rotate-90")} />
          <Label className="text-sm font-bold text-foreground/90 cursor-pointer flex items-center gap-1.5">
            <Grid3x3 className="w-4 h-4 text-primary shrink-0" />
            <span>شبكة ومخطط العمل</span>
          </Label>
        </div>
        {!gridExpanded && (
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded-md font-bold">
            {showGrid || showColumns ? "نشط" : "مخفي"}
          </span>
        )}
      </button>

      {gridExpanded && (
        <div className="space-y-3 pt-2 border-t border-border/10 animate-in fade-in duration-200">
          <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border/10 w-full">
            <button
              type="button"
              onClick={() => setActiveGridTab("grid")}
              className={cn(
                "flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold",
                activeGridTab === "grid"
                  ? "bg-background text-primary shadow-xs border border-border/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              <span>الشبكة</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveGridTab("columns")}
              className={cn(
                "flex-1 py-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] font-bold",
                activeGridTab === "columns"
                  ? "bg-background text-primary shadow-xs border border-border/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>الأعمدة</span>
            </button>
          </div>

          {activeGridTab === "grid" && (
            <div className="space-y-3 pt-3 border-t border-border/10 animate-in fade-in duration-200">
              <SliderControl
                label="حجم المربع"
                icon={<Square className="w-3.5 h-3.5 text-primary" />}
                value={gridSize}
                min={5}
                max={200}
                step={1}
                unit="px"
                onChange={setGridSize}
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">التقسيم الرئيسي</span>
                  <Select
                    value={String(gridSubdivisions)}
                    onValueChange={(val) => setGridSubdivisions(Number(val))}
                  >
                    <SelectTrigger className="w-full h-9 text-xs bg-background border border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">تعطيل</SelectItem>
                      <SelectItem value="2">كل 2 مربعات</SelectItem>
                      <SelectItem value="5">كل 5 مربعات</SelectItem>
                      <SelectItem value="10">كل 10 مربعات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">نمط الرسم</span>
                  <div className="grid grid-cols-2 gap-1 bg-muted/30 p-0.5 rounded-md border border-border/10 h-9 items-center">
                    <button
                      onClick={() => setGridType("lines")}
                      className={cn(
                        "py-1 text-[11px] font-bold rounded-sm transition-all cursor-pointer h-7 flex items-center justify-center",
                        gridType === "lines"
                          ? "bg-background text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      خطوط
                    </button>
                    <button
                      onClick={() => setGridType("dots")}
                      className={cn(
                        "py-1 text-[11px] font-bold rounded-sm transition-all cursor-pointer h-7 flex items-center justify-center",
                        gridType === "dots"
                          ? "bg-background text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      نقاط
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/10">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> لون الشبكة وشفافيتها</span>
                  <span className="font-mono text-xs">{Math.round(gridOpacity * 100)}%</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: "#000000", title: "أسود" },
                      { hex: "#3B82F6", title: "أزرق" },
                      { hex: "#EC4899", title: "زهري" },
                      { hex: "#10B981", title: "أخضر" },
                      { hex: "#F59E0B", title: "برتقالي" }
                    ].map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setGridColor(c.hex)}
                        className={cn(
                          "w-4.5 h-4.5 rounded-full border border-black/10 transition-all cursor-pointer relative",
                          gridColor === c.hex
                            ? "ring-2 ring-primary ring-offset-1 scale-110"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: c.hex }}
                        title={c.title}
                      />
                    ))}
                  </div>

                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={gridOpacity}
                    onChange={(e) => setGridOpacity(Number(e.target.value))}
                    className="w-24 accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {activeGridTab === "columns" && (
            <div className="space-y-3 pt-3 border-t border-border/10 animate-in fade-in duration-200">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">الأعمدة</span>
                  <div className="flex items-center bg-background border border-border/60 rounded-md px-1.5 h-9 shadow-xs">
                    <input
                      type="number"
                      min={2}
                      max={32}
                      value={columnsCount}
                      onChange={(e) => setColumnsCount(Math.max(2, Math.min(32, Number(e.target.value))))}
                      className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">الهامش</span>
                  <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-md px-1.5 h-9 shadow-xs">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={columnsMargin}
                      onChange={(e) => setColumnsMargin(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                    />
                    <span className="text-[8.5px] text-muted-foreground/60 font-bold select-none shrink-0">px</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">المسافة</span>
                  <div className="flex items-center gap-0.5 bg-background border border-border/60 rounded-md px-1.5 h-9 shadow-xs">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={columnsGutter}
                      onChange={(e) => setColumnsGutter(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-center text-foreground font-semibold"
                    />
                    <span className="text-[8.5px] text-muted-foreground/60 font-bold select-none shrink-0">px</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1.5 border-t border-border/10">
                <span className="text-[10px] text-muted-foreground font-semibold block mb-1">لون الأعمدة ومخطط التخطيط</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { hex: "rgba(239, 68, 68, 0.08)", label: "أحمر خفيف" },
                    { hex: "rgba(59, 130, 246, 0.08)", label: "أزرق خفيف" },
                    { hex: "rgba(16, 185, 129, 0.08)", label: "أخضر خفيف" },
                    { hex: "rgba(139, 92, 246, 0.08)", label: "بنفسجي خفيف" },
                    { hex: "rgba(0, 0, 0, 0.08)", label: "رمادي خفيف" }
                  ].map((colorObj) => (
                    <button
                      key={colorObj.hex}
                      onClick={() => setColumnsColor(colorObj.hex)}
                      className={cn(
                        "w-5 h-5 rounded-md border border-black/10 transition-all cursor-pointer relative",
                        columnsColor === colorObj.hex
                          ? "ring-2 ring-primary ring-offset-1 scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: colorObj.hex.replace("0.08", "0.25") }}
                      title={colorObj.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
