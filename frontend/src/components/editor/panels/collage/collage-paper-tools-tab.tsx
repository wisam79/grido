import { useShallow } from 'zustand/react/shallow';

import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
  FluentSegmentedControl,
} from '@/components/ui/blocks';
import { CaretLeft } from '@/components/ui/icons';
import { Switch } from '@/components/ui/switch';
import { useEditorStore } from '@/lib/editor-store';

/* ═══════════════════════════════════════════════════════════════
   أداة الورق والقص — وصول سريع من الشريط الجانبي لكل ما يخص
   جاهزية الورقة للطباعة ولا يوجد في العمود الأيمن: النزيف، شكل
   القص، والنسخ على الورقة.
   قاعدة عدم التكرار: خطوط القص مملوكة للوحة الخصائص (CollageSettings)
   وأدوات العرض الإرشادية (الشبكة/الالتقاط/الأعمدة/المساطر) مملوكة
   لشريط الحالة السفلي (CanvasViewportDeck) فلا تُكرر هنا.
   ═══════════════════════════════════════════════════════════════ */

const CUT_SHAPES = [
  { id: 'rectangle', label: 'مستطيل' },
  { id: 'rounded-rect', label: 'زوايا ناعمة' },
  { id: 'circle', label: 'دائري' },
] as const;

const REPEAT_MODES = [
  { id: 'all', label: 'الكل', ariaLabel: 'شبكة كاملة' },
  { id: 'row', label: 'صفوف' },
  { id: 'column', label: 'أعمدة' },
] as const;

export function CollagePaperToolsTab() {
  const {
    showBleedGuides,
    setShowBleedGuides,
    bleedMarginMM,
    setBleedMarginMM,
    cutShapeType,
    setCutShapeType,
    printSettings,
    setPrintSettings,
  } = useEditorStore(
    useShallow((state) => ({
      showBleedGuides: state.showBleedGuides,
      setShowBleedGuides: state.setShowBleedGuides,
      bleedMarginMM: state.bleedMarginMM,
      setBleedMarginMM: state.setBleedMarginMM,
      cutShapeType: state.cutShapeType,
      setCutShapeType: state.setCutShapeType,
      printSettings: state.printSettings,
      setPrintSettings: state.setPrintSettings,
    })),
  );

  const copiesPerSheet = printSettings?.copiesPerSheet ?? 1;
  const repeatMode = printSettings?.repeatMode ?? 'all';
  const gapMM = printSettings?.gapMM ?? 0;

  return (
    <div
      className="flex min-w-0 flex-col font-cairo motion-safe:animate-in motion-safe:fade-in duration-150"
      dir="rtl"
    >
      {/* النزيف وشكل القص */}
      <FluentSection title="النزيف والقص" collapsible>
        <FluentSettingRow
          label="خطوط النزيف"
          control={
            <Switch
              checked={showBleedGuides}
              onCheckedChange={setShowBleedGuides}
              aria-label="خطوط النزيف"
            />
          }
        />

        <FluentSliderField
          label="هامش النزيف"
          layout="inline"
          value={bleedMarginMM}
          min={0}
          max={10}
          step={0.5}
          unit="مم"
          disabled={!showBleedGuides}
          onChange={setBleedMarginMM}
        />

        <FluentSettingRow
          layout="vertical"
          label="شكل القص"
          description="يُطبَّق على تصدير وطباعة الورقة"
          control={
            <FluentSegmentedControl<(typeof CUT_SHAPES)[number]['id']>
              layoutId="paper-cut-shape"
              variant="field"
              value={cutShapeType}
              onChange={setCutShapeType}
              size="sm"
              className="p-0.5 border-0 h-8"
              options={CUT_SHAPES.map((shape) => ({ id: shape.id, label: shape.label }))}
            />
          }
        />

        {/* تنقل للوحـة الخصائص — خطوط القص وسماكتها ولونها هناك بلا تكرار */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('grido:open-properties-panel'))}
          title="فتح لوحة الخصائص"
          className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted/40 hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <span className="flex-1 text-start">الإطار وخطوط القص</span>
          <CaretLeft className="size-3.5 shrink-0" />
        </button>
      </FluentSection>

      {/* النسخ والمسافات على الورقة */}
      <FluentSection title="النسخ على الورقة" collapsible>
        <FluentSettingRow
          layout="vertical"
          label="وضع التكرار"
          control={
            <FluentSegmentedControl<(typeof REPEAT_MODES)[number]['id']>
              layoutId="paper-repeat-mode"
              value={repeatMode}
              onChange={(mode) => setPrintSettings({ repeatMode: mode })}
              size="sm"
              className="p-0.5 border-0 h-8"
              options={REPEAT_MODES.map((mode) => ({
                id: mode.id,
                label: mode.label,
                ariaLabel: 'ariaLabel' in mode ? mode.ariaLabel : undefined,
              }))}
            />
          }
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground/90">عدد النسخ</span>
          <div className="flex items-center gap-1" dir="ltr">
            <button
              type="button"
              onClick={() => setPrintSettings({ copiesPerSheet: Math.max(1, copiesPerSheet - 1) })}
              disabled={copiesPerSheet <= 1}
              title="تقليل النسخ"
              aria-label="تقليل عدد النسخ"
              className="w-7 h-7 rounded-md border border-border/60 bg-muted/60 text-muted-foreground flex items-center justify-center cursor-pointer transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              −
            </button>
            <span
              className="w-6 text-center text-xs font-mono font-bold text-foreground tabular-nums"
              dir="ltr"
            >
              {copiesPerSheet}
            </span>
            <button
              type="button"
              onClick={() => setPrintSettings({ copiesPerSheet: Math.min(48, copiesPerSheet + 1) })}
              disabled={copiesPerSheet >= 48}
              title="إضافة نسخة"
              aria-label="زيادة عدد النسخ"
              className="w-7 h-7 rounded-md border border-border/60 bg-muted/60 text-muted-foreground flex items-center justify-center cursor-pointer transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              +
            </button>
          </div>
        </div>

        <FluentSliderField
          label="المسافة بين النسخ"
          layout="inline"
          labelWidth="w-24"
          value={gapMM}
          min={0}
          max={20}
          step={1}
          unit="مم"
          defaultValue={0}
          onChange={(value) => setPrintSettings({ gapMM: value })}
        />
      </FluentSection>
    </div>
  );
}
