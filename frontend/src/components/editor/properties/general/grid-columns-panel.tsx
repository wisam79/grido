import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Grid3x3, Columns, Palette, Square } from "lucide-react";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

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

  const [activeGridTab, setActiveGridTab] = useState<"grid" | "columns">("grid");

  if (mode !== "single") return null;

  return (
    <div className="space-y-3.5 bg-card border border-border/80 dark:border-white/10 p-3 rounded-xl shadow-xs font-cairo fluent-specular">
      {/* هيدر ثابت بدون تقليص */}
      <div className="flex items-center justify-between border-b border-border/30 pb-2">
        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 select-none">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Grid3x3 className="w-3.5 h-3.5" />
          </div>
          <span>الشبكة والأعمدة</span>
        </Label>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border/40 px-2 py-0.5 rounded-md font-bold">
          {showGrid || showColumns ? "نشط" : "مخفي"}
        </span>
      </div>

      <div className="space-y-3 animate-in fade-in duration-200">
        <div className="flex bg-muted/60 dark:bg-muted/30 p-1 rounded-lg border border-border/40 w-full gap-1">
          <button
            type="button"
            onClick={() => setActiveGridTab("grid")}
            className={cn(
              "flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold",
              activeGridTab === "grid"
                ? "bg-background text-primary shadow-xs font-bold border border-border/80 ring-1 ring-primary/25"
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
              "flex-1 py-1 rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold",
              activeGridTab === "columns"
                ? "bg-background text-primary shadow-xs font-bold border border-border/80 ring-1 ring-primary/25"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>الأعمدة</span>
          </button>
        </div>

        {activeGridTab === "grid" && (
          <div className="space-y-3 pt-2 border-t border-border/20 animate-in fade-in duration-200">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground font-semibold cursor-help block">التقسيم</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-cairo text-xs font-bold">التقسيم الرئيسي للشبكة</TooltipContent>
                </Tooltip>
                <Select
                  value={String(gridSubdivisions)}
                  onValueChange={(val) => setGridSubdivisions(Number(val))}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-background/60 border border-border/80 rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-cairo">
                    <SelectItem value="0">تعطيل</SelectItem>
                    <SelectItem value="2">كل 2 مربعات</SelectItem>
                    <SelectItem value="5">كل 5 مربعات</SelectItem>
                    <SelectItem value="10">كل 10 مربعات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground font-semibold cursor-help block">النمط</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="font-cairo text-xs font-bold">نمط رسم الشبكة (نقاط أو خطوط)</TooltipContent>
                </Tooltip>
                <div className="flex bg-muted/60 p-0.5 rounded-md border border-border/60 h-8 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setGridType("dots")}
                    className={cn(
                      "flex-1 h-full rounded-md text-xs font-semibold transition-all cursor-pointer",
                      gridType === "dots"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    نقاط
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridType("lines")}
                    className={cn(
                      "flex-1 h-full rounded-md text-xs font-semibold transition-all cursor-pointer",
                      gridType === "lines"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    خطوط
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-border/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {["#000000", "#3b82f6", "#ec4899", "#10b981", "#f59e0b"].map((col) => (
                    <button
                      key={col}
                      onClick={() => setGridColor(col)}
                      className={cn(
                        "w-5 h-5 rounded-full border border-black/10 transition-all cursor-pointer relative",
                        gridColor === col
                          ? "ring-2 ring-primary ring-offset-1 scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>

                <div className="w-28 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={gridOpacity}
                    onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-[9px] font-mono text-muted-foreground font-bold w-6 text-right">
                    {Math.round(gridOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeGridTab === "columns" && (
          <div className="space-y-3 pt-3 border-t border-border/10 animate-in fade-in duration-200">
            <SliderControl
              label="الأعمدة"
              icon={<Columns className="w-3.5 h-3.5 text-primary" />}
              value={columnsCount}
              min={1}
              max={24}
              step={1}
              unit=""
              onChange={setColumnsCount}
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">الهامش (px)</span>
                <input
                  type="number"
                  value={columnsMargin}
                  onChange={(e) => setColumnsMargin(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-background border border-border/60 rounded-md px-2.5 h-8 text-xs font-bold font-mono focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-center text-foreground"
                  min={0}
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold">التباعد (px)</span>
                <input
                  type="number"
                  value={columnsGutter}
                  onChange={(e) => setColumnsGutter(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-background border border-border/60 rounded-md px-2.5 h-8 text-xs font-bold font-mono focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background text-center text-foreground"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5 border-t border-border/10">
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
    </div>
  );
});
