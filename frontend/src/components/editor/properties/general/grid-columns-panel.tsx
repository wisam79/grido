import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  FluentSection,
  FluentSegmentedControl,
  FluentSettingRow,
  FluentSliderField,
} from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

import { ColorField, ColorPanel } from '../color-panel';

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
  } = useEditorStore(
    useShallow((state) => ({
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
    })),
  );

  const fieldId = React.useId();
  const [activeGridTab, setActiveGridTab] = useState<'grid' | 'columns' | 'bleed'>('grid');

  if (mode !== 'single') return null;

  return (
    <FluentSection
      title="الشبكة والقص"
      headerClassName="min-h-7"
      collapsible
      defaultOpen={Boolean(showGrid || showColumns || showBleedGuides)}
      action={
        <span className="text-mini text-muted-foreground font-medium">
          {showGrid || showColumns || showBleedGuides ? 'نشط' : 'مخفي'}
        </span>
      }
    >
      <div className="space-y-3 animate-in fade-in duration-100">
        {/* التبديل بين الشبكة والأعمدة وهامش النزيف */}
        <FluentSegmentedControl<'grid' | 'columns' | 'bleed'>
          layoutId="grid-columns-view-tabs"
          value={activeGridTab}
          onChange={setActiveGridTab}
          size="sm"
          options={[
            { id: 'grid', label: 'الشبكة' },
            { id: 'columns', label: 'الأعمدة' },
            { id: 'bleed', label: 'القص' },
          ]}
        />

        {activeGridTab === 'grid' && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
            {/* مفتاح تفعيل الشبكة الرئيسي */}
            <FluentSettingRow
              label="إظهار الشبكة"
              control={
                <Switch
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                  aria-label="إظهار الشبكة"
                />
              }
            />

            {showGrid ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
                {/* صف حجم المربع والتقسيم */}
                <div className="grid grid-cols-2 gap-2" dir="rtl">
                  <label className="flex min-w-0 flex-col gap-1.5" title="حجم المربع">
                    <span className="text-control font-medium text-muted-foreground">المربع</span>
                    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-control-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <input
                        type="number"
                        dir="ltr"
                        aria-label="حجم مربع الشبكة"
                        value={gridSize}
                        min={5}
                        max={200}
                        onChange={(e) =>
                          setGridSize(Math.max(5, Math.min(200, parseInt(e.target.value) || 20)))
                        }
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-center text-control font-mono tabular-nums font-medium text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-mini text-muted-foreground shrink-0 font-mono">px</span>
                    </div>
                  </label>

                  <div className="flex min-w-0 flex-col gap-1.5" title="التقسيم الفرعي">
                    <span className="text-control font-medium text-muted-foreground">التقسيم</span>
                    <Select
                      value={String(gridSubdivisions)}
                      onValueChange={(val) => setGridSubdivisions(Number(val))}
                    >
                      <SelectTrigger
                        aria-label="عدد تقسيمات الشبكة"
                        className="w-full border-control-border text-control shadow-none"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="font-cairo rounded-lg border border-border bg-popover/95 backdrop-blur-xl">
                        <SelectItem value="0">تعطيل</SelectItem>
                        <SelectItem value="2">كل 2</SelectItem>
                        <SelectItem value="5">كل 5</SelectItem>
                        <SelectItem value="10">كل 10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* صف النمط — زر تبديل مفرد ينوب عن زرين نصيين */}
                <FluentSettingRow
                  label="النمط"
                  control={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGridType(gridType === 'lines' ? 'dots' : 'lines')}
                      title={
                        gridType === 'lines'
                          ? 'النمط: خطوط متصلة (انقر للتبديل إلى نقاط)'
                          : 'النمط: نقاط متقطعة (انقر للتبديل إلى خطوط)'
                      }
                      className="cursor-pointer"
                    >
                      {gridType === 'lines' ? 'خطوط متصلة' : 'نقاط متقطعة'}
                    </Button>
                  }
                />

                {/* شريط الشفافية القياسي */}
                <FluentSliderField
                  label="الشفافية"
                  value={Math.round(gridOpacity * 100)}
                  min={5}
                  max={100}
                  step={5}
                  unit="%"
                  onChange={(val) => setGridOpacity(val / 100)}
                />

                <ColorPanel wheelPosition="bottom">
                  <ColorField
                    color={gridColor}
                    onChange={setGridColor}
                    className="w-full"
                    ariaLabel="لون خطوط الشبكة"
                  />
                </ColorPanel>
              </div>
            ) : (
              <div className="py-2 text-muted-foreground">
                <p className="text-mini leading-relaxed">
                  الشبكة معطلة. فعّلها أو اضغط{' '}
                  <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border text-mini">
                    Ctrl+'
                  </kbd>
                </p>
              </div>
            )}
          </div>
        )}

        {activeGridTab === 'columns' && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
            {/* مفتاح تفعيل الأعمدة الرئيسي */}
            <FluentSettingRow
              label="إظهار الأعمدة"
              control={
                <Switch
                  checked={showColumns}
                  onCheckedChange={setShowColumns}
                  aria-label="إظهار الأعمدة"
                />
              }
            />

            {showColumns ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
                {/* صف عدد الأعمدة والهامش والتباعد */}
                <div className="grid grid-cols-3 gap-2" dir="rtl">
                  <label
                    htmlFor={`${fieldId}-count`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="عدد الأعمدة"
                  >
                    <span className="text-control font-medium text-muted-foreground">الأعمدة</span>
                    <Input
                      id={`${fieldId}-count`}
                      type="number"
                      dir="ltr"
                      aria-label="عدد الأعمدة"
                      value={columnsCount}
                      min={1}
                      max={24}
                      onChange={(e) =>
                        setColumnsCount(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))
                      }
                      className="px-1.5 text-center font-mono tabular-nums font-medium"
                    />
                  </label>

                  <label
                    htmlFor={`${fieldId}-margin`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="الهامش"
                  >
                    <span className="text-control font-medium text-muted-foreground">الهامش</span>
                    <Input
                      id={`${fieldId}-margin`}
                      type="number"
                      dir="ltr"
                      aria-label="هامش الأعمدة"
                      value={columnsMargin}
                      min={0}
                      onChange={(e) => setColumnsMargin(Math.max(0, parseInt(e.target.value) || 0))}
                      className="px-1.5 text-center font-mono tabular-nums font-medium"
                    />
                  </label>

                  <label
                    htmlFor={`${fieldId}-gutter`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="التباعد"
                  >
                    <span className="text-control font-medium text-muted-foreground">التباعد</span>
                    <Input
                      id={`${fieldId}-gutter`}
                      type="number"
                      dir="ltr"
                      aria-label="تباعد الأعمدة"
                      value={columnsGutter}
                      min={0}
                      onChange={(e) => setColumnsGutter(Math.max(0, parseInt(e.target.value) || 0))}
                      className="px-1.5 text-center font-mono tabular-nums font-medium"
                    />
                  </label>
                </div>

                {/* ألوان الأعمدة */}
                <div className="flex items-center justify-between gap-2 pt-1" dir="rtl">
                  <span className="text-control font-medium text-muted-foreground shrink-0">
                    لون الأعمدة
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { hex: 'rgba(239, 68, 68, 0.08)', label: 'أحمر' },
                      { hex: 'rgba(59, 130, 246, 0.08)', label: 'أزرق' },
                      { hex: 'rgba(16, 185, 129, 0.08)', label: 'أخضر' },
                      { hex: 'rgba(139, 92, 246, 0.08)', label: 'بنفسجي' },
                      { hex: 'rgba(0, 0, 0, 0.08)', label: 'رمادي' },
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
                            'w-7 h-7 rounded-md border border-control-border transition-colors duration-150 cursor-pointer relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                              : 'opacity-80 hover:opacity-100',
                          )}
                          style={{ backgroundColor: colorObj.hex.replace('0.08', '0.40') }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-muted-foreground">
                <p className="text-mini leading-relaxed">فعّل الأعمدة الإرشادية للتوزيع الدقيق.</p>
              </div>
            )}
          </div>
        )}

        {activeGridTab === 'bleed' && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
            {/* مفتاح تفعيل خطوط النزيف والقص */}
            <FluentSettingRow
              label="إظهار هوامش القص"
              control={
                <Switch
                  checked={showBleedGuides}
                  onCheckedChange={setShowBleedGuides}
                  aria-label="إظهار هوامش القص"
                />
              }
            />

            {showBleedGuides ? (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-100">
                {/* شكل القص Die-cut */}
                <div className="space-y-1.5" dir="rtl">
                  <span className="text-control font-medium text-muted-foreground">شكل القص</span>
                  <FluentSegmentedControl<'rectangle' | 'rounded-rect' | 'circle'>
                    layoutId="grid-columns-cutshape-toggle"
                    variant="field"
                    value={cutShapeType}
                    onChange={setCutShapeType}
                    size="sm"
                    className="border-control-border bg-input"
                    options={[
                      { id: 'rectangle', label: 'مستطيل', className: 'text-control' },
                      { id: 'rounded-rect', label: 'مستدير', className: 'text-control' },
                      { id: 'circle', label: 'دائري', className: 'text-control' },
                    ]}
                  />
                </div>

                {/* مقاس النزيف ومقاس الأمان */}
                <div className="grid grid-cols-2 gap-2" dir="rtl">
                  <label className="flex min-w-0 flex-col gap-1.5" title="النزيف الخارجي">
                    <span className="flex items-center gap-1.5 text-control font-medium text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      النزيف
                    </span>
                    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-control-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <input
                        type="number"
                        dir="ltr"
                        aria-label="النزيف الخارجي"
                        value={bleedMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(e) =>
                          setBleedMarginMM(
                            Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)),
                          )
                        }
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-center text-control font-mono tabular-nums font-medium text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-mini text-muted-foreground shrink-0">مم</span>
                    </div>
                  </label>

                  <label className="flex min-w-0 flex-col gap-1.5" title="منطقة الأمان">
                    <span className="flex items-center gap-1.5 text-control font-medium text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      الأمان
                    </span>
                    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-control-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                      <input
                        type="number"
                        dir="ltr"
                        aria-label="منطقة الأمان"
                        value={safeMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onChange={(e) =>
                          setSafeMarginMM(
                            Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)),
                          )
                        }
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-center text-control font-mono tabular-nums font-medium text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-mini text-muted-foreground shrink-0">مم</span>
                    </div>
                  </label>
                </div>

                {/* دليل ألوان الإرشادات */}
                <div
                  className="border-t border-border/40 pt-2 space-y-1 text-mini select-none"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-rose-500 border-dashed shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">النزيف:</strong> تمديد الخلفية.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-blue-500 shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">القص:</strong> الحد الفعلي.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-emerald-500 border-dashed shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">الأمان:</strong> إبقاء المحتوى بالداخل.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-muted-foreground">
                <p className="text-mini leading-relaxed">
                  خطوط النزيف والقص لتجهيز المطبوعات التجارية.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </FluentSection>
  );
});
