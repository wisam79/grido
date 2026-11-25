import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import {
  FluentSection,
  FluentSegmentedControl,
  FluentSettingRow,
  FluentSliderField,
} from '@/components/ui/blocks';
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
import { getDocumentSession } from '@/lib/io/document-session';
import { cn } from '@/lib/utils';

import { ColorField, ColorPanel } from '../color-panel';

function DraftNumberField({
  id,
  value,
  min,
  max,
  step,
  isFloat = false,
  ariaLabel,
  onCommit,
  getValue,
  useInputPrimitive = false,
  className,
}: {
  id?: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  isFloat?: boolean;
  ariaLabel: string;
  onCommit: (next: number) => void;
  getValue: () => number;
  useInputPrimitive?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = React.useState(String(value));
  const focusedRef = React.useRef(false);
  const gestureRef = React.useRef<{
    session: number;
    source: number;
    owned: number;
    dirty: boolean;
  } | null>(null);
  const skipBlurRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) setDraft(String(value));
  }, [value]);

  const clampVal = (num: number) => {
    const floored = Math.max(min, isFloat ? num : Math.round(num));
    return max !== undefined ? Math.min(max, floored) : floored;
  };
  const applyValue = (next: number) => {
    const gesture = gestureRef.current;
    const current = getValue();
    if (!gesture || gesture.session !== getDocumentSession() || !Object.is(current, gesture.owned))
      return;
    if (Object.is(next, current)) return;
    onCommit(next);
    gesture.owned = getValue();
  };
  const commitValue = (raw: string) => {
    const gesture = gestureRef.current;
    const parsed = raw.trim() ? Number(raw) : NaN;
    if (gesture?.dirty && Number.isFinite(parsed)) applyValue(clampVal(parsed));
    setDraft(String(getValue()));
    gestureRef.current = null;
  };

  const props = {
    id,
    type: 'number' as const,
    dir: 'ltr' as const,
    'aria-label': ariaLabel,
    value: draft,
    min,
    max,
    step,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = true;
      skipBlurRef.current = false;
      const current = getValue();
      gestureRef.current = {
        session: getDocumentSession(),
        source: current,
        owned: current,
        dirty: false,
      };
      setDraft(String(current));
      e.currentTarget.select();
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setDraft(next);
      const gesture = gestureRef.current;
      if (!gesture) return;
      gesture.dirty = true;
      const parsed = next.trim() ? Number(next) : NaN;
      if (Number.isFinite(parsed) && clampVal(parsed) === parsed) applyValue(parsed);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      skipBlurRef.current = true;
      focusedRef.current = false;
      if (e.key === 'Enter') commitValue(draft);
      else {
        const gesture = gestureRef.current;
        if (gesture?.dirty) applyValue(gesture.source);
        gestureRef.current = null;
        setDraft(String(getValue()));
      }
      e.currentTarget.blur();
    },
    onBlur: () => {
      focusedRef.current = false;
      if (skipBlurRef.current) {
        skipBlurRef.current = false;
        return;
      }
      commitValue(draft);
    },
    className,
  };

  return useInputPrimitive ? <Input {...props} /> : <input {...props} />;
}

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
                  <label
                    htmlFor={`${fieldId}-grid-size`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="حجم المربع"
                  >
                    <span className="ps-0.5 text-mini font-medium text-muted-foreground">
                      المربع
                    </span>
                    <div
                      dir="ltr"
                      className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-control-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                    >
                      <DraftNumberField
                        id={`${fieldId}-grid-size`}
                        ariaLabel="حجم مربع الشبكة"
                        value={gridSize}
                        getValue={() => useEditorStore.getState().gridSize}
                        min={5}
                        max={200}
                        onCommit={setGridSize}
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-start text-control font-mono tabular-nums font-medium text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-mini text-muted-foreground shrink-0 font-mono">px</span>
                    </div>
                  </label>

                  <div className="flex min-w-0 flex-col gap-1.5" title="التقسيم الفرعي">
                    <span className="ps-0.5 text-mini font-medium text-muted-foreground">
                      التقسيم
                    </span>
                    <Select
                      value={String(gridSubdivisions)}
                      onValueChange={(val) => setGridSubdivisions(Number(val))}
                    >
                      <SelectTrigger
                        aria-label="عدد تقسيمات الشبكة"
                        className="w-full border-control-border bg-input text-control shadow-none"
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

                {/* صف النمط — مبدّل واضح بين الخطوط والنقاط */}
                <FluentSettingRow
                  label="النمط"
                  control={
                    <FluentSegmentedControl<'lines' | 'dots'>
                      layoutId="grid-line-style-toggle"
                      variant="field"
                      size="sm"
                      fullWidth={false}
                      value={gridType}
                      onChange={setGridType}
                      ariaLabel="نمط الشبكة"
                      className="w-32 border-control-border bg-input"
                      options={[
                        { id: 'lines', label: 'خطوط', tooltip: 'خطوط متصلة' },
                        { id: 'dots', label: 'نقاط', tooltip: 'نقاط متقطعة' },
                      ]}
                    />
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
                    <DraftNumberField
                      id={`${fieldId}-count`}
                      useInputPrimitive
                      ariaLabel="عدد الأعمدة"
                      value={columnsCount}
                      getValue={() => useEditorStore.getState().columnsCount}
                      min={1}
                      max={24}
                      onCommit={(val) => setColumnsCount(val)}
                      className="px-1.5 text-center font-mono tabular-nums font-medium"
                    />
                  </label>

                  <label
                    htmlFor={`${fieldId}-margin`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="الهامش"
                  >
                    <span className="text-control font-medium text-muted-foreground">الهامش</span>
                    <DraftNumberField
                      id={`${fieldId}-margin`}
                      useInputPrimitive
                      ariaLabel="هامش الأعمدة"
                      value={columnsMargin}
                      getValue={() => useEditorStore.getState().columnsMargin}
                      min={0}
                      onCommit={(val) => setColumnsMargin(val)}
                      className="px-1.5 text-center font-mono tabular-nums font-medium"
                    />
                  </label>

                  <label
                    htmlFor={`${fieldId}-gutter`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="التباعد"
                  >
                    <span className="text-control font-medium text-muted-foreground">التباعد</span>
                    <DraftNumberField
                      id={`${fieldId}-gutter`}
                      useInputPrimitive
                      ariaLabel="تباعد الأعمدة"
                      value={columnsGutter}
                      getValue={() => useEditorStore.getState().columnsGutter}
                      min={0}
                      onCommit={(val) => setColumnsGutter(val)}
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
                  <label
                    htmlFor={`${fieldId}-bleed`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="النزيف الخارجي"
                  >
                    <span className="flex items-center gap-1.5 text-control font-medium text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                      النزيف
                    </span>
                    <div
                      dir="ltr"
                      className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-control-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                    >
                      <DraftNumberField
                        id={`${fieldId}-bleed`}
                        isFloat
                        ariaLabel="النزيف الخارجي"
                        value={bleedMarginMM}
                        getValue={() => useEditorStore.getState().bleedMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onCommit={(val) => setBleedMarginMM(val)}
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-start text-control font-mono tabular-nums font-medium text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-mini text-muted-foreground shrink-0 font-mono">mm</span>
                    </div>
                  </label>

                  <label
                    htmlFor={`${fieldId}-safe`}
                    className="flex min-w-0 flex-col gap-1.5"
                    title="منطقة الأمان"
                  >
                    <span className="flex items-center gap-1.5 text-control font-medium text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                      الأمان
                    </span>
                    <div
                      dir="ltr"
                      className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-control-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                    >
                      <DraftNumberField
                        id={`${fieldId}-safe`}
                        isFloat
                        ariaLabel="منطقة الأمان"
                        value={safeMarginMM}
                        getValue={() => useEditorStore.getState().safeMarginMM}
                        min={0}
                        max={20}
                        step={0.5}
                        onCommit={(val) => setSafeMarginMM(val)}
                        className="w-full min-w-0 bg-transparent border-0 p-0 text-start text-control font-mono tabular-nums font-medium text-foreground focus:ring-0 focus:outline-none"
                      />
                      <span className="text-mini text-muted-foreground shrink-0 font-mono">mm</span>
                    </div>
                  </label>
                </div>

                {/* دليل ألوان الإرشادات */}
                <div
                  className="border-t border-border/40 pt-2 space-y-1 text-mini select-none"
                  dir="rtl"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-destructive border-dashed shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">النزيف:</strong> تمديد الخلفية.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-info shrink-0" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">القص:</strong> الحد الفعلي.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 border-b-2 border-success border-dashed shrink-0" />
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
