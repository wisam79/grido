import {
  Scissors,
  Ruler,
  GridFour,
  Columns,
  Copy,
  FrameCorners,
  SlidersHorizontal,
} from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
  FluentSegmentedControl,
} from '@/components/ui/blocks';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════════════════════
   أداة الورق والقص — وصول سريع من الشريط الجانبي لكل ما يخص
   جاهزية الورقة للطباعة ولا يوجد في العمود الأيمن: النزيف، شكل
   القص، النسخ، والإرشادات البصرية.
   قاعدة عدم التكرار: خطوط القص وسماكتها ولونها مملوكة للوحـة
   الخصائص (CollageSettings) فلا تُكرر هنا — يوجد سطر تنقل لها.
   ═══════════════════════════════════════════════════════════════ */

const CUT_SHAPES = [
  { id: 'rectangle', label: 'مستطيل' },
  { id: 'rounded-rect', label: 'زوايا ناعمة' },
  { id: 'circle', label: 'دائري' },
] as const;

const REPEAT_MODES = [
  { id: 'all', label: 'شبكة كاملة' },
  { id: 'row', label: 'صفوف' },
  { id: 'column', label: 'أعمدة' },
] as const;

const GUIDES = [
  { key: 'grid', label: 'الشبكة', icon: GridFour },
  { key: 'snap', label: 'الالتقاط', icon: FrameCorners },
  { key: 'columns', label: 'الأعمدة', icon: Columns },
  { key: 'ruler', label: 'المساطر', icon: Ruler },
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
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    showColumns,
    setShowColumns,
    showRuler,
    setShowRuler,
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
      showGrid: state.showGrid,
      setShowGrid: state.setShowGrid,
      snapToGrid: state.snapToGrid,
      setSnapToGrid: state.setSnapToGrid,
      showColumns: state.showColumns,
      setShowColumns: state.setShowColumns,
      showRuler: state.showRuler,
      setShowRuler: state.setShowRuler,
    })),
  );

  const copiesPerSheet = printSettings?.copiesPerSheet ?? 1;
  const repeatMode = printSettings?.repeatMode ?? 'all';
  const gapMM = printSettings?.gapMM ?? 0;

  const guideState: Record<(typeof GUIDES)[number]['key'], boolean> = {
    grid: showGrid,
    snap: snapToGrid,
    columns: showColumns,
    ruler: showRuler,
  };
  const guideSetters: Record<(typeof GUIDES)[number]['key'], (v: boolean) => void> = {
    grid: setShowGrid,
    snap: setSnapToGrid,
    columns: setShowColumns,
    ruler: setShowRuler,
  };
  const activeGuides = GUIDES.filter((g) => guideState[g.key]).length;

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* النزيف وشكل القص */}
      <FluentSection
        icon={<Scissors className="w-3.5 h-3.5" weight="duotone" />}
        title="النزيف والقص"
        subtitle={showBleedGuides ? `هامش النزيف ${bleedMarginMM} مم` : 'بلا نزيف'}
        collapsible
      >
        <FluentSettingRow
          label="خطوط النزيف"
          description="هامش أمان حول كل صورة"
          tooltip="خطوط إرشاد تُظهر المساحة التي ستُقص خارج حدود الصورة"
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
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-dashed border-border/70 text-micro text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 text-primary" weight="duotone" />
          <span className="flex-1 text-right leading-relaxed">
            سماكة ولون خطوط القص من <b>لوحة الخصائص</b>
          </span>
        </button>
      </FluentSection>

      {/* النسخ والمسافات على الورقة */}
      <FluentSection
        icon={<Copy className="w-3.5 h-3.5" weight="duotone" />}
        title="النسخ على الورقة"
        subtitle={`${copiesPerSheet} نسخة`}
        collapsible
      >
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
              options={REPEAT_MODES.map((mode) => ({ id: mode.id, label: mode.label }))}
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
              className="w-7 h-7 rounded-md border border-border/60 bg-muted/60 text-muted-foreground flex items-center justify-center cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
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
              className="w-7 h-7 rounded-md border border-border/60 bg-muted/60 text-muted-foreground flex items-center justify-center cursor-pointer transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              +
            </button>
          </div>
        </div>

        <FluentSliderField
          label="المسافة بين النسخ"
          value={gapMM}
          min={0}
          max={20}
          step={1}
          unit="مم"
          onChange={(value) => setPrintSettings({ gapMM: value })}
        />
      </FluentSection>

      {/* الإرشادات البصرية — شبكة مدمجة 2×2 بدل 4 صفوف */}
      <FluentSection
        icon={<Ruler className="w-3.5 h-3.5" weight="duotone" />}
        title="الإرشادات"
        subtitle={activeGuides > 0 ? `${activeGuides} مفعّلة` : 'كلها مطفأة'}
        collapsible
      >
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="الإرشادات البصرية">
          {GUIDES.map((guide) => {
            const checked = guideState[guide.key];
            const GuideIcon = guide.icon;
            return (
              <button
                key={guide.key}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={guide.label}
                title={guide.label}
                onClick={() => guideSetters[guide.key](!checked)}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-md border transition-all cursor-pointer select-none active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  checked
                    ? 'bg-primary/10 border-primary/40 text-foreground shadow-2xs'
                    : 'bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent/60',
                )}
              >
                <GuideIcon
                  className={cn('w-4 h-4 shrink-0', checked && 'text-primary')}
                  weight={checked ? 'duotone' : 'regular'}
                />
                <span className="flex-1 text-right text-xs font-semibold truncate">
                  {guide.label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                    checked ? 'bg-primary' : 'bg-border',
                  )}
                />
              </button>
            );
          })}
        </div>
      </FluentSection>
    </div>
  );
}
