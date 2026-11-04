import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FluentSection, FluentSettingRow, FluentSliderField } from '@/components/ui/blocks';
import { Switch } from '@/components/ui/switch';
import { isBakedCollageLayout } from '@/lib/canvas/collage-geometry';
import { mmToPx, pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import {
  DEFAULT_COLLAGE_GAP_MM,
  DEFAULT_COLLAGE_MARGIN_MM,
  getEffectiveDpi,
} from '@/lib/templates';
import { ColorField, ColorPanel } from './color-panel';

export function CollageSettings() {
  const {
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageShowEndCutLine,
    collageStrokeWidth,
    collageStrokeColor,
    collageTemplate,
    canvasWidth,
    canvasHeight,
    printSettings,
    previewCollageGap,
    previewCollageMargin,
    setCollageRadius,
    setCollageShowCutLines,
    setCollageShowEndCutLine,
    setCollageStrokeWidth,
    setCollageStrokeColor,
  } = useEditorStore(
    useShallow((state) => ({
      collageGap: state.collageGap,
      collageMargin: state.collageMargin,
      collageRadius: state.collageRadius,
      collageShowCutLines: state.collageShowCutLines,
      collageShowEndCutLine: state.collageShowEndCutLine,
      collageStrokeWidth: state.collageStrokeWidth,
      collageStrokeColor: state.collageStrokeColor,
      collageTemplate: state.collageTemplate,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      printSettings: state.printSettings,
      previewCollageGap: state.previewCollageGap,
      previewCollageMargin: state.previewCollageMargin,
      setCollageRadius: state.setCollageRadius,
      setCollageShowCutLines: state.setCollageShowCutLines,
      setCollageShowEndCutLine: state.setCollageShowEndCutLine,
      setCollageStrokeWidth: state.setCollageStrokeWidth,
      setCollageStrokeColor: state.setCollageStrokeColor,
    })),
  );

  // 🖨️ المسافات تُخزَّن بكسلات الكانفس لكنها تُعرض بالمليمتر — نفس DPI الفعلي
  // المستخدم في الطباعة، فلا يرى المستخدم وحدتين متضاربتين في مستند ورقي.
  const dpi = useMemo(
    () => getEffectiveDpi(canvasWidth, canvasHeight, printSettings?.dpi || 300),
    [canvasWidth, canvasHeight, printSettings?.dpi],
  );
  const toMm = useCallback((px: number) => Math.round(pxToMm(px, dpi) * 10) / 10, [dpi]);
  const toPx = useCallback((mm: number) => Math.round(mmToPx(mm, dpi)), [dpi]);

  // 🚀 فواصل الكولاج بنمط معاينة/تثبيت (القسم 10.5 من ثوابت Konva): onChange
  // يكتب قيمة عابرة فقط (previewCollageGap/Margin — بلا إعادة حساب الخلايا
  // الفيزيائية ولا remapSlotsToCells ذي البحث المتداخل O(S²) في كل إطار)،
  // وعند onCommit تُعاد المطابقة مرة واحدة عبر commitCollageSpacing ثم
  // pushHistory واحدة. التثبيت يعمل للتخطيط الفيزيائي فقط؛ للتصميم اليدوي
  // تكفي المعاينة المقيَّدة ثم الدفع.
  const committedGapPxRef = useRef(collageGap);
  const committedMarginPxRef = useRef(collageMargin);
  const previewingRef = useRef({ gap: false, margin: false });

  // 🛡️ مزامنة آخر قيمة ملتزمة مع التغييرات الخارجية (تبديل قالب/مقاس ورقة) —
  // إطارات المعاينة النشطة مستثناة حتى لا يبتلع الحارس تغيّراً سيُلتقط عند onCommit.
  useEffect(() => {
    if (!previewingRef.current.gap) committedGapPxRef.current = collageGap;
    if (!previewingRef.current.margin) committedMarginPxRef.current = collageMargin;
  }, [collageGap, collageMargin]);

  const beginGapPreview = useCallback(() => {
    previewingRef.current.gap = true;
  }, []);

  const beginMarginPreview = useCallback(() => {
    previewingRef.current.margin = true;
  }, []);

  // 🛡️ حارس الالتقاط: إذا لم تتغير القيمة عن آخر قيمة ملتزمة (نقر بلا حراك/
  // إعادة التقاط لنفس القيمة) فلا commitCollageSpacing ولا pushHistory زائداً.
  const commitGapSpacing = useCallback(() => {
    const state = useEditorStore.getState();
    if (state.collageGap !== committedGapPxRef.current) {
      state.commitCollageSpacing();
      useEditorStore.getState().pushHistory();
      committedGapPxRef.current = useEditorStore.getState().collageGap;
    }
    previewingRef.current.gap = false;
  }, []);

  const commitMarginSpacing = useCallback(() => {
    const state = useEditorStore.getState();
    if (state.collageMargin !== committedMarginPxRef.current) {
      state.commitCollageSpacing();
      useEditorStore.getState().pushHistory();
      committedMarginPxRef.current = useEditorStore.getState().collageMargin;
    }
    previewingRef.current.margin = false;
  }, []);

  // 🧱 القوالب المخبوزة (أطقم جاهزة/تعديل يدوي/كولاج حر) تحمل فواصلها داخل
  // إحداثيات الخلايا، وجيومترية العرض تتجاهل الفجوة والهامش فيها. إبقاء
  // المنزلقين نشطين كان يوهم المستخدم بتغيير لا يحدث؛ نعطّلهما ونشرح السبب.
  // التخطيطات الفيزيائية مستثناة لأن مولّد الخلايا يعيد حسابها فعلياً.
  const spacingLocked = isBakedCollageLayout(collageTemplate) && !collageTemplate?.physicalLayout;

  return (
    <div className="flex flex-col font-cairo" dir="rtl">
      <FluentSection title="المسافات والاستدارة" collapsible defaultOpen>
        <div className="space-y-2.5">
          <FluentSliderField
            label="التباعد"
            value={toMm(collageGap)}
            min={0}
            max={30}
            step={0.1}
            unit="mm"
            defaultValue={DEFAULT_COLLAGE_GAP_MM}
            disabled={spacingLocked}
            onChange={(mm) => {
              beginGapPreview();
              previewCollageGap(toPx(mm));
            }}
            onCommit={commitGapSpacing}
          />
          <FluentSliderField
            label="الهوامش"
            value={toMm(collageMargin)}
            min={0}
            max={100}
            step={0.1}
            unit="mm"
            defaultValue={DEFAULT_COLLAGE_MARGIN_MM}
            disabled={spacingLocked}
            onChange={(mm) => {
              beginMarginPreview();
              previewCollageMargin(toPx(mm));
            }}
            onCommit={commitMarginSpacing}
          />
          {spacingLocked && (
            <p className="text-mini leading-5 text-muted-foreground">
              التباعد والهوامش مخبوزة داخل هذا القالب. عدّل الخلايا يدوياً أو اختر قالباً فيزيائياً
              لتغيير المسافات.
            </p>
          )}
          <FluentSliderField
            label="الزوايا"
            value={toMm(collageRadius)}
            min={0}
            max={50}
            step={0.1}
            unit="mm"
            defaultValue={0}
            onChange={(mm) => setCollageRadius(toPx(mm))}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />
        </div>
      </FluentSection>

      <FluentSection title="إطار الصور" collapsible defaultOpen>
        <div className="space-y-2.5">
          <FluentSliderField
            label="السُّمك"
            value={collageStrokeWidth}
            min={0}
            max={15}
            step={1}
            unit="px"
            defaultValue={0}
            onChange={setCollageStrokeWidth}
            onCommit={() => useEditorStore.getState().pushHistory()}
          />

          {collageStrokeWidth > 0 && (
            <ColorPanel wheelPosition="bottom" className="pt-1">
              <ColorField
                color={collageStrokeColor}
                onChange={(hex) => {
                  setCollageStrokeColor(hex);
                }}
                onCommit={() => useEditorStore.getState().pushHistory()}
                className="w-full h-8"
                ariaLabel="لون إطار الكولاج"
              />
            </ColorPanel>
          )}
        </div>
      </FluentSection>

      {/* 🎴 بطاقة 3: خطوط القص — بدون collapsible حتى يتحاذى مفتاحا التبديل
          على محور عمودي واحد تماماً دون إزاحة بسبب سهم الطي. */}
      <FluentSection
        title="خطوط القص"
        action={
          <Switch
            checked={collageShowCutLines}
            onCheckedChange={setCollageShowCutLines}
            aria-label="إظهار خطوط القص"
          />
        }
      >
        {/* صفّ مسطّح مباشرةً: كانت الحاوية المستديرة والوصف («نهاية الطباعة
            على الورقة») يكرّران التسمية نفسها بلا معلومة جديدة. */}
        {collageShowCutLines && (
          <FluentSettingRow
            label="خط نهاية الطباعة"
            control={
              <Switch
                checked={collageShowEndCutLine}
                onCheckedChange={setCollageShowEndCutLine}
                aria-label="إظهار خط نهاية الطباعة"
              />
            }
          />
        )}
      </FluentSection>
    </div>
  );
}
