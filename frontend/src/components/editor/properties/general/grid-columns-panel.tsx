import React, { useState } from "react";
import { GridFour, Columns, Crop } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useShallow } from "zustand/react/shallow";
import { FluentSection, FluentSegmentedControl } from "@/components/ui/blocks";
import { PopoverColorPicker } from "../shared-controls";

export const GridColumnsPanel = React.memo(function GridColumnsPanel() {
  const {
    mode,
    showGrid,
    setShowGrid,
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
    setShowColumns,
    columnsCount,
    setColumnsCount,
    columnsColor,
    setColumnsColor,
    columnsMargin,
    setColumnsMargin,
    columnsGutter,
    setColumnsGutter,
    showBleedGuides,
    setShowBleedGuides,
    bleedMarginMM,
    setBleedMarginMM,
    safeMarginMM,
    setSafeMarginMM,
    cutShapeType,
    setCutShapeType,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    showGrid: state.showGrid,
    setShowGrid: state.setShowGrid,
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
    setShowColumns: state.setShowColumns,
    columnsCount: state.columnsCount,
    setColumnsCount: state.setColumnsCount,
    columnsColor: state.columnsColor,
    setColumnsColor: state.setColumnsColor,
    columnsMargin: state.columnsMargin,
    setColumnsMargin: state.setColumnsMargin,
    columnsGutter: state.columnsGutter,
    setColumnsGutter: state.setColumnsGutter,
    showBleedGuides: state.showBleedGuides,
    setShowBleedGuides: state.setShowBleedGuides,
    bleedMarginMM: state.bleedMarginMM,
    setBleedMarginMM: state.setBleedMarginMM,
    safeMarginMM: state.safeMarginMM,
    setSafeMarginMM: state.setSafeMarginMM,
    cutShapeType: state.cutShapeType,
    setCutShapeType: state.setCutShapeType,
  })));

  const [activeGridTab, setActiveGridTab] = useState<"grid" | "columns" | "bleed">("grid");

  if (mode !== "single") return null;

  return (
    <FluentSection
      icon={<GridFour className="w-3.5 h-3.5 text-primary" weight="duotone" />}
      title="الشبكة والقص"
      collapsible
      defaultOpen={true}
      action={
        <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 border border-border/60 px-2 py-0.5 rounded-md font-bold">
          {showGrid || showColumns || showBleedGuides ? "نشط" : "مخفي"}
        </span>
      }
    >
      <div className="space-y-3 animate-in fade-in duration-200">
        {/* التبديل بين الشبكة والأعمدة وهامش النزيف */}
        <FluentSegmentedControl<"grid" | "columns" | "bleed">
          value={activeGridTab}
          onChange={setActiveGridTab}
          size="sm"
          options={[
            { id: "grid", label: "الشبكة", icon: <GridFour className="w-3.5 h-3.5" weight="regular" /> },
            { id: "columns", label: "الأعمدة", icon: <Columns className="w-3.5 h-3.5" weight="regular" /> },
            { id: "bleed", label: "القص والنزيف", icon: <Crop className="w-3.5 h-3.5" weight="regular" /> },
          ]}
        />

        {activeGridTab === "grid" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
            {/* مفتاح تفعيل الشبكة الرئيسي */}
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40 select-none">
              <span className="text-xs font-bold text-foreground">إظهار الشبكة</span>
              <Switch
                checked={showGrid}
                onCheckedChange={setShowGrid}
                aria-label="إظهار شبكة الكانفس"
              />
            </div>

            {showGrid ? (
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
                      <span className="text-[10px] text-muted-foreground font-mono select-none">px</span>
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
                    <div className="grid grid-cols-2 gap-1 bg-input border border-border p-0.5 rounded-md h-8">
                      <button
                        type="button"
                        onClick={() => setGridType("lines")}
                        className={cn(
                          "text-[10px] font-bold rounded transition-all cursor-pointer",
                          gridType === "lines"
                            ? "bg-card text-primary shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        خطوط
                      </button>
                      <button
                        type="button"
                        onClick={() => setGridType("dots")}
                        className={cn(
                          "text-[10px] font-bold rounded transition-all cursor-pointer",
                          gridType === "dots"
                            ? "bg-card text-primary shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        نقاط
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-bold">الشفافية</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{Math.round(gridOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={gridOpacity}
                      onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-input rounded-lg appearance-none cursor-pointer accent-primary mt-2"
                    />
                  </div>
                </div>

                {/* ألوان الشبكة */}
                <div className="flex items-center justify-between pt-1" dir="rtl">
                  <span className="text-[10px] text-muted-foreground font-bold">لون الشبكة</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: "#cbd5e1", label: "رمادي فاتح" },
                      { hex: "#94a3b8", label: "رمادي" },
                      { hex: "#3b82f6", label: "أزرق" },
                      { hex: "#ef4444", label: "أحمر" },
                      { hex: "#10b981", label: "أخضر" },
                    ].map((col) => {
                      const isSelected = gridColor.toLowerCase() === col.hex.toLowerCase();
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
            ) : (
              <div className="p-3 text-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-muted-foreground">
                <p className="text-[11px] leading-relaxed">الشبكة معطلة. فعّلها بالمفتاح أعلاه أو اضغط <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border text-[10px]">Ctrl+'</kbd></p>
              </div>
            )}
          </div>
        )}

        {activeGridTab === "columns" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
            {/* مفتاح تفعيل الأعمدة الرئيسي */}
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40 select-none">
              <span className="text-xs font-bold text-foreground">إظهار الأعمدة</span>
              <Switch
                checked={showColumns}
                onCheckedChange={setShowColumns}
                aria-label="إظهار أعمدة التخطيط"
              />
            </div>

            {showColumns ? (
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
            ) : (
              <div className="p-3 text-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-muted-foreground">
                <p className="text-[11px] leading-relaxed">الأعمدة الإرشادية معطلة حالياً. فعّلها لمساعدتك على توزيع وتنسيق العناصر بدقة.</p>
              </div>
            )}
          </div>
        )}

        {activeGridTab === "bleed" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
            {/* مفتاح تفعيل خطوط النزيف والقص */}
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40 select-none">
              <span className="text-xs font-bold text-foreground">إظهار هوامش النزيف والقص</span>
              <Switch
                checked={showBleedGuides}
                onCheckedChange={setShowBleedGuides}
                aria-label="إظهار حدود وهوامش النزيف والقص"
              />
            </div>

            {showBleedGuides ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                {/* شكل القص Die-cut */}
                <div className="space-y-1" dir="rtl">
                  <span className="text-[10px] text-muted-foreground font-bold block">شكل القص (Die-Cut)</span>
                  <div className="grid grid-cols-3 gap-1 bg-input border border-border p-0.5 rounded-md h-8">
                    <button
                      type="button"
                      onClick={() => setCutShapeType("rectangle")}
                      className={cn(
                        "text-[10px] font-bold rounded transition-all cursor-pointer",
                        cutShapeType === "rectangle"
                          ? "bg-card text-primary shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      مستطيل
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutShapeType("rounded-rect")}
                      className={cn(
                        "text-[10px] font-bold rounded transition-all cursor-pointer",
                        cutShapeType === "rounded-rect"
                          ? "bg-card text-primary shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      زوايا مستديرة
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutShapeType("circle")}
                      className={cn(
                        "text-[10px] font-bold rounded transition-all cursor-pointer",
                        cutShapeType === "circle"
                          ? "bg-card text-primary shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      دائري
                    </button>
                  </div>
                </div>

                {/* مقاس النزيف ومقاس الأمان */}
                <div className="grid grid-cols-2 gap-2" dir="rtl">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-bold block">هامش النزيف</span>
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" title="خط النزيف الخارجي" />
                    </div>
                    <div className="flex items-center bg-input border border-border rounded-md px-2 h-8">
                      <input
                        type="number"
                        value={bleedMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(e) => setBleedMarginMM(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                        className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground font-mono select-none">مم</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-bold block">منطقة الأمان</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="منطقة الأمان الداخلية" />
                    </div>
                    <div className="flex items-center bg-input border border-border rounded-md px-2 h-8">
                      <input
                        type="number"
                        value={safeMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(e) => setSafeMarginMM(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                        className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground font-mono select-none">مم</span>
                    </div>
                  </div>
                </div>

                {/* دليل ألوان الإرشادات */}
                <div className="p-2.5 rounded-lg border border-border/50 bg-muted/30 space-y-1.5 text-[10px] select-none" dir="rtl">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-rose-500 border-dashed" />
                    <span className="text-muted-foreground"><strong className="text-foreground">حد النزيف:</strong> مدّد الخلفية لخارج الورقة لمنع الحواف البيضاء.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-500" />
                    <span className="text-muted-foreground"><strong className="text-foreground">خط القص:</strong> الحد الفعلي للبطاقة/الملصق النهائي.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-emerald-500 border-dashed" />
                    <span className="text-muted-foreground"><strong className="text-foreground">منطقة الأمان:</strong> أبقِ النصوص والشعارات داخل هذا الخط.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-muted-foreground">
                <p className="text-[11px] leading-relaxed">خطوط النزيف والقص مفيدة لتجهيز كروت العمل والملصقات للطباعة التجارية لمنع تلف التصميم أثناء القص.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </FluentSection>
  );
});
