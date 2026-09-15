import React, { useState } from "react";
import { GridFour, Columns, Crop, Eye } from "@phosphor-icons/react";
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
import { FluentSection, FluentSegmentedControl, FluentSliderField } from "@/components/ui/blocks";
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
          layoutId="grid-columns-view-tabs"
          value={activeGridTab}
          onChange={setActiveGridTab}
          size="sm"
          options={[
            { id: "grid", label: "الشبكة", icon: <GridFour className="w-3.5 h-3.5" weight="regular" /> },
            { id: "columns", label: "الأعمدة", icon: <Columns className="w-3.5 h-3.5" weight="regular" /> },
            { id: "bleed", label: "القص", icon: <Crop className="w-3.5 h-3.5" weight="regular" /> },
          ]}
        />

        {activeGridTab === "grid" && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
            {/* مفتاح تفعيل الشبكة الرئيسي */}
            <div className="flex items-center justify-between bg-input/50 hover:bg-input/80 px-2.5 h-8 rounded-md border border-border transition-colors select-none">
              <span className="text-xs font-semibold text-foreground">إظهار الشبكة</span>
              <Switch
                checked={showGrid}
                onCheckedChange={setShowGrid}
                aria-label="إظهار شبكة الكانفس"
              />
            </div>

            {showGrid ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                {/* صف حجم المربع والتقسيم */}
                <div className="grid grid-cols-2 gap-1.5" dir="rtl">
                  <div 
                    className="flex items-center justify-between bg-input border border-border hover:border-primary/40 rounded-md px-2.5 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
                    title="حجم مربع الشبكة"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground select-none shrink-0">المربع</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <input
                        type="number"
                        value={gridSize}
                        min={5}
                        max={200}
                        onChange={(e) => setGridSize(Math.max(5, Math.min(200, parseInt(e.target.value) || 20)))}
                        className="w-10 bg-transparent border-0 p-0 text-left text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground/70 select-none font-mono">px</span>
                    </div>
                  </div>

                  <div 
                    className="flex items-center justify-between bg-input border border-border hover:border-primary/40 rounded-md px-2.5 h-8 transition-all shadow-2xs"
                    title="تقسيم الشبكة الفرعي"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground select-none shrink-0">التقسيم</span>
                    <Select
                      value={String(gridSubdivisions)}
                      onValueChange={(val) => setGridSubdivisions(Number(val))}
                    >
                      <SelectTrigger className="w-auto h-7 border-0 bg-transparent p-0 text-xs font-mono font-bold focus:ring-0 focus:outline-none text-foreground justify-end gap-1">
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

                {/* صف النمط */}
                <div className="flex items-center justify-between bg-input/40 border border-border rounded-md px-2.5 h-8" dir="rtl">
                  <span className="text-[11px] font-bold text-muted-foreground select-none shrink-0">النمط</span>
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded">
                    <button
                      type="button"
                      onClick={() => setGridType("lines")}
                      className={cn(
                        "px-2.5 h-6 text-[11px] font-bold rounded transition-all cursor-pointer",
                        gridType === "lines"
                          ? "bg-card text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      خطوط
                    </button>
                    <button
                      type="button"
                      onClick={() => setGridType("dots")}
                      className={cn(
                        "px-2.5 h-6 text-[11px] font-bold rounded transition-all cursor-pointer",
                        gridType === "dots"
                          ? "bg-card text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      نقاط
                    </button>
                  </div>
                </div>

                {/* شريط الشفافية القياسي */}
                <FluentSliderField
                  label="الشفافية"
                  value={Math.round(gridOpacity * 100)}
                  min={5}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(val) => setGridOpacity(val / 100)}
                  icon={<Eye className="w-3.5 h-3.5" weight="regular" />}
                />

                {/* ألوان الشبكة */}
                <div className="flex items-center justify-between pt-1" dir="rtl">
                  <span className="text-[11px] font-bold text-muted-foreground">لون الشبكة</span>
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
                            "w-5 h-5 rounded-md border border-border/80 transition-all cursor-pointer relative shadow-2xs",
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
                      className="w-5 h-5 rounded-md"
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
            <div className="flex items-center justify-between bg-input/50 hover:bg-input/80 px-2.5 h-8 rounded-md border border-border transition-colors select-none">
              <span className="text-xs font-semibold text-foreground">إظهار الأعمدة</span>
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
                  <div 
                    className="flex flex-col items-center justify-center bg-input border border-border hover:border-primary/40 rounded-md p-1 h-12 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
                    title="عدد الأعمدة"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground select-none">الأعمدة</span>
                    <input
                      type="number"
                      value={columnsCount}
                      min={1}
                      max={24}
                      onChange={(e) => setColumnsCount(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                      className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                    />
                  </div>

                  <div 
                    className="flex flex-col items-center justify-center bg-input border border-border hover:border-primary/40 rounded-md p-1 h-12 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
                    title="هامش الأعمدة"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground select-none">الهامش</span>
                    <input
                      type="number"
                      value={columnsMargin}
                      min={0}
                      onChange={(e) => setColumnsMargin(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                    />
                  </div>

                  <div 
                    className="flex flex-col items-center justify-center bg-input border border-border hover:border-primary/40 rounded-md p-1 h-12 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
                    title="التباعد بين الأعمدة"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground select-none">التباعد</span>
                    <input
                      type="number"
                      value={columnsGutter}
                      min={0}
                      onChange={(e) => setColumnsGutter(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-transparent border-0 p-0 text-center text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ألوان الأعمدة */}
                <div className="flex items-center justify-between pt-1" dir="rtl">
                  <span className="text-[11px] font-bold text-muted-foreground">لون الأعمدة</span>
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
                            "w-5 h-5 rounded-md border border-border/80 transition-all cursor-pointer relative shadow-2xs",
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
            <div className="flex items-center justify-between bg-input/50 hover:bg-input/80 px-2.5 h-8 rounded-md border border-border transition-colors select-none">
              <span className="text-xs font-semibold text-foreground">إظهار هوامش القص</span>
              <Switch
                checked={showBleedGuides}
                onCheckedChange={setShowBleedGuides}
                aria-label="إظهار حدود وهوامش النزيف والقص"
              />
            </div>

            {showBleedGuides ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                {/* شكل القص Die-cut */}
                <div className="flex items-center justify-between bg-input/40 border border-border rounded-md px-2.5 h-8" dir="rtl">
                  <span className="text-[11px] font-bold text-muted-foreground select-none shrink-0">شكل القص</span>
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded">
                    <button
                      type="button"
                      onClick={() => setCutShapeType("rectangle")}
                      className={cn(
                        "px-2 h-6 text-[10px] font-bold rounded transition-all cursor-pointer",
                        cutShapeType === "rectangle"
                          ? "bg-card text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      مستطيل
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutShapeType("rounded-rect")}
                      className={cn(
                        "px-2 h-6 text-[10px] font-bold rounded transition-all cursor-pointer",
                        cutShapeType === "rounded-rect"
                          ? "bg-card text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      مستدير
                    </button>
                    <button
                      type="button"
                      onClick={() => setCutShapeType("circle")}
                      className={cn(
                        "px-2 h-6 text-[10px] font-bold rounded transition-all cursor-pointer",
                        cutShapeType === "circle"
                          ? "bg-card text-primary shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      دائري
                    </button>
                  </div>
                </div>

                {/* مقاس النزيف ومقاس الأمان */}
                <div className="grid grid-cols-2 gap-1.5" dir="rtl">
                  <div 
                    className="flex items-center justify-between bg-input border border-border hover:border-primary/40 rounded-md px-2.5 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
                    title="هامش النزيف الخارجي"
                  >
                    <div className="flex items-center gap-1.5 select-none shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-[11px] font-bold text-muted-foreground">النزيف</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <input
                        type="number"
                        value={bleedMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(e) => setBleedMarginMM(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                        className="w-10 bg-transparent border-0 p-0 text-left text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground/70 select-none font-mono">مم</span>
                    </div>
                  </div>

                  <div 
                    className="flex items-center justify-between bg-input border border-border hover:border-primary/40 rounded-md px-2.5 h-8 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-2xs"
                    title="منطقة الأمان الداخلية"
                  >
                    <div className="flex items-center gap-1.5 select-none shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[11px] font-bold text-muted-foreground">الأمان</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <input
                        type="number"
                        value={safeMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(e) => setSafeMarginMM(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                        className="w-10 bg-transparent border-0 p-0 text-left text-xs font-mono font-bold text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground/70 select-none font-mono">مم</span>
                    </div>
                  </div>
                </div>

                {/* دليل ألوان الإرشادات */}
                <div className="p-2 rounded-md border border-border/50 bg-muted/25 space-y-1 text-[10px] select-none" dir="rtl">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-rose-500 border-dashed shrink-0" />
                    <span className="text-muted-foreground"><strong className="text-foreground">النزيف:</strong> تمديد الخلفية لمنع البياض.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-500 shrink-0" />
                    <span className="text-muted-foreground"><strong className="text-foreground">القص:</strong> الحد الفعلي للمنتج النهائي.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-emerald-500 border-dashed shrink-0" />
                    <span className="text-muted-foreground"><strong className="text-foreground">الأمان:</strong> إبقاء المحتوى الهام بالداخل.</span>
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
