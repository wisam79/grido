import {
  Scissors,
  Ruler,
  GridFour,
  Columns,
  Copy,
  FrameCorners,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import {
  FluentSection,
  FluentSettingRow,
  FluentSliderField,
  FluentSegmentedControl,
} from "@/components/ui/blocks";
import { Switch } from "@/components/ui/switch";
import { PopoverColorPicker } from "@/components/editor/properties/shared-controls";

/* ═══════════════════════════════════════════════════════════════
   أداة الورق والقص — وصول سريع من الشريط الجانبي لكل ما يخص
   جاهزية الورقة للطباعة: النزيف، شكل القص، خطوط القص، النسخ،
   والإرشادات البصرية. كل القيم موصولة بحالة الـ store الحقيقية.
   ═══════════════════════════════════════════════════════════════ */

const CUT_SHAPES = [
  { id: "rectangle", label: "مستطيل" },
  { id: "rounded-rect", label: "زوايا ناعمة" },
  { id: "circle", label: "دائري" },
] as const;

const REPEAT_MODES = [
  { id: "all", label: "شبكة كاملة" },
  { id: "row", label: "صفوف" },
  { id: "column", label: "أعمدة" },
] as const;

export function CollagePaperToolsTab() {
  const {
    showBleedGuides,
    setShowBleedGuides,
    bleedMarginMM,
    setBleedMarginMM,
    cutShapeType,
    setCutShapeType,
    collageShowCutLines,
    setCollageShowCutLines,
    collageShowEndCutLine,
    setCollageShowEndCutLine,
    collageStrokeWidth,
    setCollageStrokeWidth,
    collageStrokeColor,
    setCollageStrokeColor,
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
      collageShowCutLines: state.collageShowCutLines,
      setCollageShowCutLines: state.setCollageShowCutLines,
      collageShowEndCutLine: state.collageShowEndCutLine,
      setCollageShowEndCutLine: state.setCollageShowEndCutLine,
      collageStrokeWidth: state.collageStrokeWidth,
      setCollageStrokeWidth: state.setCollageStrokeWidth,
      collageStrokeColor: state.collageStrokeColor,
      setCollageStrokeColor: state.setCollageStrokeColor,
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
    }))
  );

  const copiesPerSheet = printSettings?.copiesPerSheet ?? 1;
  const repeatMode = printSettings?.repeatMode ?? "all";
  const gapMM = printSettings?.gapMM ?? 0;

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* النزيف وعلامات القص */}
      <FluentSection
        icon={<Scissors className="w-3.5 h-3.5" weight="duotone" />}
        title="النزيف والقص"
        subtitle={`هامش النزيف ${bleedMarginMM} مم`}
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
            <FluentSegmentedControl<(typeof CUT_SHAPES)[number]["id"]>
              layoutId="paper-cut-shape"
              value={cutShapeType}
              onChange={setCutShapeType}
              size="sm"
              className="p-0.5 border-0 h-8"
              options={CUT_SHAPES.map((shape) => ({ id: shape.id, label: shape.label }))}
            />
          }
        />

        <FluentSettingRow
          label="خطوط القص"
          description="حدود الخانات على الورقة"
          control={
            <Switch
              checked={collageShowCutLines}
              onCheckedChange={setCollageShowCutLines}
              aria-label="خطوط القص"
            />
          }
        />

        <FluentSettingRow
          label="خط القص الأخير"
          description="يُغلق إطار الورقة"
          control={
            <Switch
              checked={collageShowEndCutLine}
              onCheckedChange={setCollageShowEndCutLine}
              aria-label="خط القص الأخير"
            />
          }
        />

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <FluentSliderField
              label="سماكة الخط"
              value={collageStrokeWidth}
              min={0}
              max={6}
              step={0.5}
              unit="px"
              onChange={setCollageStrokeWidth}
            />
          </div>
          <PopoverColorPicker
            color={collageStrokeColor}
            onChange={setCollageStrokeColor}
            swatchOnly
            label="لون خط القص"
            className="mt-1"
          />
        </div>
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
            <FluentSegmentedControl<(typeof REPEAT_MODES)[number]["id"]>
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
            <span className="w-6 text-center text-xs font-mono font-bold text-foreground" dir="ltr">
              {copiesPerSheet}
            </span>
            <button
              type="button"
              onClick={() =>
                setPrintSettings({ copiesPerSheet: Math.min(48, copiesPerSheet + 1) })
              }
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

      {/* الإرشادات البصرية */}
      <FluentSection
        icon={<Ruler className="w-3.5 h-3.5" weight="duotone" />}
        title="الإرشادات"
        subtitle="ما يظهر على الكانفاس"
        collapsible
      >
        {[
          {
            key: "grid",
            label: "الشبكة",
            icon: <GridFour className="w-3.5 h-3.5" weight="duotone" />,
            checked: showGrid,
            onChange: setShowGrid,
          },
          {
            key: "snap",
            label: "الالتقاط للشبكة",
            icon: <FrameCorners className="w-3.5 h-3.5" weight="duotone" />,
            checked: snapToGrid,
            onChange: setSnapToGrid,
          },
          {
            key: "columns",
            label: "أعمدة التقسيم",
            icon: <Columns className="w-3.5 h-3.5" weight="duotone" />,
            checked: showColumns,
            onChange: setShowColumns,
          },
          {
            key: "ruler",
            label: "المساطر",
            icon: <Ruler className="w-3.5 h-3.5" weight="duotone" />,
            checked: showRuler,
            onChange: setShowRuler,
          },
        ].map((guide) => (
          <FluentSettingRow
            key={guide.key}
            icon={guide.icon}
            label={guide.label}
            control={
              <Switch
                checked={guide.checked}
                onCheckedChange={guide.onChange}
                aria-label={guide.label}
              />
            }
          />
        ))}
      </FluentSection>
    </div>
  );
}
