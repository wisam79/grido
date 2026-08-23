import React, { useState } from "react";
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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FluentSection, FluentSegmentedControl, FluentSliderField } from "@/components/ui/blocks";

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
    <FluentSection
      icon={<Grid3x3 className="w-3.5 h-3.5" />}
      title="الشبكة والأعمدة"
      collapsible
      defaultOpen={true}
      action={
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border/40 px-2 py-0.5 rounded-md font-bold">
          {showGrid || showColumns ? "نشط" : "مخفي"}
        </span>
      }
    >
      <div className="space-y-3 animate-in fade-in duration-200">
        <FluentSegmentedControl<"grid" | "columns">
          value={activeGridTab}
          onChange={setActiveGridTab}
          size="sm"
          options={[
            { id: "grid", label: "الشبكة", icon: <Grid3x3 className="w-3.5 h-3.5" /> },
            { id: "columns", label: "الأعمدة", icon: <Columns className="w-3.5 h-3.5" /> },
          ]}
        />

        {activeGridTab === "grid" && (
          <div className="space-y-3 pt-2 border-t border-border/20 animate-in fade-in duration-200">
            <FluentSliderField
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
                      "flex-1 h-full rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                      gridType === "dots"
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    نقاط
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridType("lines")}
                    className={cn(
                      "flex-1 h-full rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                      gridType === "lines"
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    خطوط
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold">لون الشبكة</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { hex: "#000000", label: "أسود" },
                    { hex: "#3b82f6", label: "أزرق" },
                    { hex: "#ec4899", label: "وردي" },
                    { hex: "#10b981", label: "أخضر" },
                    { hex: "#f59e0b", label: "برتقالي" },
                  ].map((col) => {
                    const isSelected = gridColor === col.hex;
                    return (
                      <button
                        key={col.hex}
                        type="button"
                        aria-label={col.label}
                        aria-pressed={isSelected}
                        title={col.label}
                        onClick={() => setGridColor(col.hex)}
                        className={cn(
                          "w-5.5 h-5.5 rounded-full border border-black/10 transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: col.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              <FluentSliderField
                label="شفافية الشبكة"
                icon={<Palette className="w-3.5 h-3.5 text-primary" />}
                value={Math.round(gridOpacity * 100)}
                min={5}
                max={80}
                step={5}
                unit="%"
                onChange={(val) => setGridOpacity(val / 100)}
              />
            </div>
          </div>
        )}

        {activeGridTab === "columns" && (
          <div className="space-y-3 pt-3 border-t border-border/10 animate-in fade-in duration-200">
            <FluentSliderField
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

            <div className="space-y-2 pt-2 border-t border-border/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold">لون الأعمدة</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { hex: "rgba(239, 68, 68, 0.08)", label: "أحمر خفيف" },
                    { hex: "rgba(59, 130, 246, 0.08)", label: "أزرق خفيف" },
                    { hex: "rgba(16, 185, 129, 0.08)", label: "أخضر خفيف" },
                    { hex: "rgba(139, 92, 246, 0.08)", label: "بنفسجي خفيف" },
                    { hex: "rgba(0, 0, 0, 0.08)", label: "رمادي خفيف" }
                  ].map((colorObj) => {
                    const isSelected = columnsColor === colorObj.hex;
                    return (
                      <button
                        key={colorObj.hex}
                        type="button"
                        aria-label={colorObj.label}
                        aria-pressed={isSelected}
                        onClick={() => setColumnsColor(colorObj.hex)}
                        className={cn(
                          "w-5.5 h-5.5 rounded-full border border-black/10 transition-all cursor-pointer relative focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: colorObj.hex.replace("0.08", "0.25") }}
                        title={colorObj.label}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FluentSection>
  );
});
