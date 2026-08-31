import React, { useState } from "react";
import { Grid16Regular, Table16Regular } from "@fluentui/react-icons";
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
import { FluentSection, FluentSegmentedControl } from "@/components/ui/blocks";
import { PopoverColorPicker } from "../shared-controls";

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
      icon={<Grid16Regular className="w-3.5 h-3.5 text-primary" />}
      title="الشبكة والأعمدة"
      collapsible
      defaultOpen={true}
      action={
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md font-bold">
          {showGrid || showColumns ? "نشط" : "مخفي"}
        </span>
      }
    >
      <div className="space-y-3 animate-in fade-in duration-200">
        {/* التبديل بين الشبكة والأعمدة */}
        <FluentSegmentedControl<"grid" | "columns">
          value={activeGridTab}
          onChange={setActiveGridTab}
          size="sm"
          options={[
            { id: "grid", label: "الشبكة", icon: <Grid16Regular className="w-3.5 h-3.5" /> },
            { id: "columns", label: "الأعمدة", icon: <Table16Regular className="w-3.5 h-3.5" /> },
          ]}
        />

        {activeGridTab === "grid" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
            {/* صف حجم المربع والتقسيم */}
            <div className="grid grid-cols-2 gap-2" dir="rtl">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold block">حجم المربع</span>
                <div className="flex items-center bg-input border border-border rounded-md px-2 h-8">
                  <input
                    type="number"
                    value={gridSize}
                    min={5}
                    max={200}
                    onChange={(e) => setGridSize(Math.max(5, Math.min(200, parseInt(e.target.value) || 20)))}
                    className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground font-mono select-none">px</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold block">التقسيم</span>
                <Select
                  value={String(gridSubdivisions)}
                  onValueChange={(val) => setGridSubdivisions(Number(val))}
                >
                  <SelectTrigger className="w-full h-8 text-xs bg-input border border-border rounded-md font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-cairo rounded-xl border border-border bg-popover/95 backdrop-blur-xl">
                    <SelectItem value="0">تعطيل</SelectItem>
                    <SelectItem value="2">كل 2</SelectItem>
                    <SelectItem value="5">كل 5</SelectItem>
                    <SelectItem value="10">كل 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* صف النمط والشفافية */}
            <div className="grid grid-cols-2 gap-2 items-center" dir="rtl">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold block">النمط</span>
                <div className="flex bg-input p-0.5 rounded-md border border-border h-8 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setGridType("dots")}
                    className={cn(
                      "flex-1 h-full rounded text-[11px] font-bold transition-all cursor-pointer select-none",
                      gridType === "dots"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    نقاط
                  </button>
                  <button
                    type="button"
                    onClick={() => setGridType("lines")}
                    className={cn(
                      "flex-1 h-full rounded text-[11px] font-bold transition-all cursor-pointer select-none",
                      gridType === "lines"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    خطوط
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-bold">الشفافية</span>
                  <span className="text-[9px] font-mono text-muted-foreground font-bold">{Math.round(gridOpacity * 100)}%</span>
                </div>
                <div className="flex items-center bg-input border border-border rounded-md px-2 h-8">
                  <input
                    type="range"
                    value={Math.round(gridOpacity * 100)}
                    min={5}
                    max={80}
                    step={5}
                    onChange={(e) => setGridOpacity(parseInt(e.target.value) / 100)}
                    className="w-full accent-primary h-1.5 bg-muted rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* صف اختيار لون الشبكة المضغوط والاحترافي */}
            <div className="flex items-center justify-between pt-1" dir="rtl">
              <span className="text-[10px] text-muted-foreground font-bold">لون الشبكة</span>
              <div className="flex items-center gap-1.5">
                {[
                  { hex: "#000000", label: "أسود" },
                  { hex: "#3b82f6", label: "أزرق" },
                  { hex: "#ec4899", label: "وردي" },
                  { hex: "#10b981", label: "أخضر" },
                  { hex: "#f59e0b", label: "برتقالي" },
                ].map((col) => {
                  const isSelected = gridColor.toUpperCase() === col.hex.toUpperCase();
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      aria-label={col.label}
                      title={col.label}
                      onClick={() => setGridColor(col.hex)}
                      className={cn(
                        "w-5 h-5 rounded-full border border-border/80 transition-all cursor-pointer relative",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: col.hex }}
                    />
                  );
                })}
                <PopoverColorPicker
                  color={gridColor}
                  onChange={setGridColor}
                  swatchOnly
                  className="w-5 h-5 rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {activeGridTab === "columns" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
            {/* صف عدد الأعمدة والهامش والتباعد */}
            <div className="grid grid-cols-3 gap-1.5" dir="rtl">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold block text-center">الأعمدة</span>
                <input
                  type="number"
                  value={columnsCount}
                  min={1}
                  max={24}
                  onChange={(e) => setColumnsCount(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                  className="w-full bg-input border border-border rounded-md px-1.5 h-8 text-xs font-bold font-mono text-center text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold block text-center">الهامش</span>
                <input
                  type="number"
                  value={columnsMargin}
                  min={0}
                  onChange={(e) => setColumnsMargin(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-input border border-border rounded-md px-1.5 h-8 text-xs font-bold font-mono text-center text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-bold block text-center">التباعد</span>
                <input
                  type="number"
                  value={columnsGutter}
                  min={0}
                  onChange={(e) => setColumnsGutter(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-input border border-border rounded-md px-1.5 h-8 text-xs font-bold font-mono text-center text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* ألوان الأعمدة */}
            <div className="flex items-center justify-between pt-1" dir="rtl">
              <span className="text-[10px] text-muted-foreground font-bold">لون الأعمدة</span>
              <div className="flex items-center gap-1.5">
                {[
                  { hex: "rgba(239, 68, 68, 0.08)", label: "أحمر" },
                  { hex: "rgba(59, 130, 246, 0.08)", label: "أزرق" },
                  { hex: "rgba(16, 185, 129, 0.08)", label: "أخضر" },
                  { hex: "rgba(139, 92, 246, 0.08)", label: "بنفسجي" },
                  { hex: "rgba(0, 0, 0, 0.08)", label: "رمادي" },
                ].map((colorObj) => {
                  const isSelected = columnsColor === colorObj.hex;
                  return (
                    <button
                      key={colorObj.hex}
                      type="button"
                      aria-label={colorObj.label}
                      title={colorObj.label}
                      onClick={() => setColumnsColor(colorObj.hex)}
                      className={cn(
                        "w-5 h-5 rounded-full border border-border/80 transition-all cursor-pointer relative",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      )}
                      style={{ backgroundColor: colorObj.hex.replace("0.08", "0.40") }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </FluentSection>
  );
});
