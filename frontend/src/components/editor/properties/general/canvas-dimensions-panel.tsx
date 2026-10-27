import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FluentSegmentedControl } from '@/components/ui/blocks/fluent-segmented-control';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { CaretDown, Check, FrameCorners, Link, LinkBreak } from '@/components/ui/icons';
import { PageOrientationIcon } from '@/components/ui/image-icons';
import { mmToPx, pxToMm } from '@/lib/canvas/units';
import { useEditorStore } from '@/lib/editor-store';
import { PAPER_SIZES, ADVANCED_PAPER_SIZES, CARD_AND_LABEL_SIZES } from '@/lib/templates';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// canvas-dimensions-panel.tsx — قسم إعدادات الورقة (المقاس + الحقول المخصصة + الاتجاه)
//
// قواعد الهوية البصرية المطبَّقة (Fluent 2):
//   - سلم الارتفاعات: كل عناصر التحكم h-8 (32px) — لا ارتفاع شاذ.
//   - هرمية الاستدارة: عناصر التحكم rounded-md، مجموعات التحكم rounded-md.
//   - حلقة التركيز المزدوجة الموحّدة: ring-2 + ring-offset-2 (للفأرة ولوحة المفاتيح).
//   - قابلية القراءة: لا نصوص 8px؛ التسميات text-mini والقيم text-xs بخط monospace.
//   - لا ترويسة داخلية مكررة: عنوان العمود «إعدادات الورقة» يكفي، والمقاس
//     والأبعاد ظاهرة في المحدد وحقلي W/H فلا تُعاد في شارة أو وصف.
//
// إزالة التكرار الوظيفي: كان باللوحة عنصران يؤديان نفس العملية تماماً
// (زر "تبديل الأبعاد" + محدد "الاتجاه" — كلاهما يستبدل العرض بالارتفاع).
// أُبقي محدد الاتجاه كمصدر وحيد للتبديل، وحلّ محل الزر تكرار الميزة الغائبة
// فعلاً: قفل نسبة الأبعاد (Aspect Ratio Lock).
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none';

const FIELD_SHELL =
  'flex items-center gap-1.5 bg-input/60 hover:bg-input border border-border/80 hover:border-foreground/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background rounded-md px-2 h-8 shadow-2xs transition-colors';

// البحث والعرض في كل المقاسات: كان الاقتصار على PAPER_SIZES يجعل مقاس «Letter»
// (المتاح أيضاً في كبسولة شريط العرض السفلي) يظهر هنا «مقاس مخصص» بلا تعرّف.
const ALL_PAPER_SIZES = [...PAPER_SIZES, ...ADVANCED_PAPER_SIZES];

const PRESET_MATCH_TOLERANCE_MM = 1.5;

function matchesPresetMm(
  preset: { widthMM: number; heightMM: number },
  widthMM: number,
  heightMM: number,
): boolean {
  return (
    (Math.abs(widthMM - preset.widthMM) <= PRESET_MATCH_TOLERANCE_MM &&
      Math.abs(heightMM - preset.heightMM) <= PRESET_MATCH_TOLERANCE_MM) ||
    (Math.abs(widthMM - preset.heightMM) <= PRESET_MATCH_TOLERANCE_MM &&
      Math.abs(heightMM - preset.widthMM) <= PRESET_MATCH_TOLERANCE_MM)
  );
}

export const CanvasDimensionsPanel = React.memo(function CanvasDimensionsPanel() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    template,
    setTemplate,
    printSettings,
    setShowBleedGuides,
    setBleedMarginMM,
    setCutShapeType,
    rulerUnit,
  } = useEditorStore(
    useShallow((state) => ({
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      setCanvasSize: state.setCanvasSize,
      template: state.template,
      setTemplate: state.setTemplate,
      printSettings: state.printSettings,
      setShowBleedGuides: state.setShowBleedGuides,
      setBleedMarginMM: state.setBleedMarginMM,
      setCutShapeType: state.setCutShapeType,
      rulerUnit: state.rulerUnit,
    })),
  );

  const activeUnit = rulerUnit === 'px' ? 'px' : 'mm';
  const [widthVal, setWidthVal] = useState(canvasWidth.toString());
  const [heightVal, setHeightVal] = useState(canvasHeight.toString());
  const [lockAspect, setLockAspect] = useState(false);

  const currentDpi = template?.dpi || printSettings?.dpi || 300;

  const MIN_PX = 10;
  const MAX_PX = 20000;
  // سقف ملم مطابق لخطة الإصلاح P2-15 (2000mm) لمنع قيم مستحيلة عبر التحويل
  const MIN_MM = 1;
  const MAX_MM = 2000;

  // عرض قيمة بالوحدة النشطة (بكسل كما هو، أو ملم بمنزلة عشرية واحدة)
  const toDisplay = React.useCallback(
    (px: number) =>
      activeUnit === 'px' ? px.toString() : Number(pxToMm(px, currentDpi).toFixed(1)).toString(),
    [activeUnit, currentDpi],
  );

  useEffect(() => {
    const nextWidthVal = toDisplay(canvasWidth);
    const nextHeightVal = toDisplay(canvasHeight);

    const rafId = requestAnimationFrame(() => {
      setWidthVal(nextWidthVal);
      setHeightVal(nextHeightVal);
    });

    return () => cancelAnimationFrame(rafId);
  }, [canvasWidth, canvasHeight, toDisplay]);

  const aspectRatio = canvasHeight > 0 ? canvasWidth / canvasHeight : 1;

  const clampPx = React.useCallback(
    (px: number) => Math.max(MIN_PX, Math.min(MAX_PX, Math.round(px))),
    [],
  );

  // يطبّق العرض الجديد ويشتق الارتفاع منه عند قفل النسبة
  const commitWidthPx = (rawPx: number) => {
    const px = clampPx(rawPx);
    const nextHeight =
      lockAspect && isFinite(aspectRatio) && aspectRatio > 0
        ? clampPx(px / aspectRatio)
        : canvasHeight;
    if (px === canvasWidth && nextHeight === canvasHeight) return;
    setCanvasSize(px, nextHeight);
    if (template) setTemplate(null);
  };

  // يطبّق الارتفاع الجديد ويشتق العرض منه عند قفل النسبة
  const commitHeightPx = (rawPx: number) => {
    const px = clampPx(rawPx);
    const nextWidth =
      lockAspect && isFinite(aspectRatio) && aspectRatio > 0
        ? clampPx(px * aspectRatio)
        : canvasWidth;
    if (px === canvasHeight && nextWidth === canvasWidth) return;
    setCanvasSize(nextWidth, px);
    if (template) setTemplate(null);
  };

  const handleWidthChange = (val: string) => {
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setWidthVal(val);
    }
  };

  const handleWidthCommit = () => {
    const num = parseFloat(widthVal);
    if (isNaN(num) || num <= 0) {
      setWidthVal(toDisplay(canvasWidth));
      return;
    }
    if (activeUnit === 'px') {
      commitWidthPx(num);
      setWidthVal(clampPx(num).toString());
    } else {
      const mm = Math.min(Math.max(MIN_MM, num), MAX_MM);
      commitWidthPx(mmToPx(mm, currentDpi));
      setWidthVal(mm.toString());
    }
  };

  const handleHeightChange = (val: string) => {
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setHeightVal(val);
    }
  };

  const handleHeightCommit = () => {
    const num = parseFloat(heightVal);
    if (isNaN(num) || num <= 0) {
      setHeightVal(toDisplay(canvasHeight));
      return;
    }
    if (activeUnit === 'px') {
      commitHeightPx(num);
      setHeightVal(clampPx(num).toString());
    } else {
      const mm = Math.min(Math.max(MIN_MM, num), MAX_MM);
      commitHeightPx(mmToPx(mm, currentDpi));
      setHeightVal(mm.toString());
    }
  };

  // Escape يعيد القيمة المخزّنة بدل ترك قيمة نصف مُدخلة معلّقة في الحقل
  const revertOnEscape = (e: React.KeyboardEvent<HTMLInputElement>, revert: () => void) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    revert();
    e.currentTarget.blur();
  };

  const handlePresetChange = (presetId: string) => {
    if (presetId === 'custom') {
      if (template) setTemplate(null);
      return;
    }

    const cardOrLabel = CARD_AND_LABEL_SIZES.find((p) => p.id === presetId);
    if (cardOrLabel) {
      const dpi = currentDpi;
      let targetW = mmToPx(cardOrLabel.widthMM, dpi);
      let targetH = mmToPx(cardOrLabel.heightMM, dpi);

      const isCurrentLandscape = canvasWidth > canvasHeight;
      if (isCurrentLandscape && targetW < targetH) {
        const temp = targetW;
        targetW = targetH;
        targetH = temp;
      }

      setCanvasSize(Math.round(targetW), Math.round(targetH));
      setShowBleedGuides(true);
      setBleedMarginMM(cardOrLabel.defaultBleedMM || 2);
      setCutShapeType(cardOrLabel.shape || 'rectangle');
      if (template) setTemplate(null);
      return;
    }

    const paper = ALL_PAPER_SIZES.find((p) => p.id === presetId);
    if (!paper) return;

    const dpi = currentDpi;
    let targetW = mmToPx(paper.widthMM, dpi);
    let targetH = mmToPx(paper.heightMM, dpi);

    const isCurrentLandscape = canvasWidth > canvasHeight;
    if (isCurrentLandscape && targetW < targetH) {
      const temp = targetW;
      targetW = targetH;
      targetH = temp;
    }

    const finalW = Math.round(targetW);
    const finalH = Math.round(targetH);

    setCanvasSize(finalW, finalH);
    setShowBleedGuides(false);

    if (template) {
      setTemplate({
        ...template,
        width: finalW,
        height: finalH,
        dpi,
      });
    }
  };

  const handleSwapDimensions = () => {
    setCanvasSize(canvasHeight, canvasWidth);
    if (template) {
      setTemplate({
        ...template,
        width: canvasHeight,
        height: canvasWidth,
      });
    }
  };

  const currentWMM = pxToMm(canvasWidth, currentDpi);
  const currentHMM = pxToMm(canvasHeight, currentDpi);
  const activePaperPreset = ALL_PAPER_SIZES.find((p) => matchesPresetMm(p, currentWMM, currentHMM));
  const activeCardPreset = CARD_AND_LABEL_SIZES.find((p) =>
    matchesPresetMm(p, currentWMM, currentHMM),
  );

  const activePreset = activeCardPreset || activePaperPreset;
  const activePresetId = activePreset ? activePreset.id : 'custom';
  const isPortrait = canvasWidth <= canvasHeight;

  const presetSizeLabel = (widthMM: number, heightMM: number) =>
    activeUnit === 'px'
      ? `${Math.round(mmToPx(widthMM, currentDpi))}×${Math.round(mmToPx(heightMM, currentDpi))} بكسل`
      : `${widthMM}×${heightMM} مم`;

  return (
    <div className="space-y-2.5 animate-in fade-in duration-200 font-cairo">
      {/* 1. المقاس: قائمة الأوراق والكروت القياسية + الاتجاه */}
      <div className="flex w-full min-w-0 flex-col gap-1.5" dir="rtl">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`المقاس: ${activePreset ? activePreset.name.split(' (')[0] : 'مقاس مخصص'}`}
              className={cn(
                'w-full flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-md bg-card hover:bg-muted/60 border border-border/80 hover:border-foreground/40 text-foreground text-xs font-semibold transition-colors cursor-pointer shadow-2xs overflow-hidden',
                FOCUS_RING,
              )}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <FrameCorners
                  className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                  weight="duotone"
                />
                <span className="truncate text-xs font-semibold">
                  {activePreset ? activePreset.name.split(' (')[0] : 'مقاس مخصص'}
                </span>
              </span>
              <CaretDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" weight="bold" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 font-cairo rounded-lg border border-border bg-popover/95 backdrop-blur-xl shadow-fluent-8 max-h-[380px] overflow-y-auto"
            align="start"
          >
            <DropdownMenuItem
              onClick={() => {
                if (template) setTemplate(null);
              }}
              className={cn(
                'text-xs text-start justify-between font-bold cursor-pointer rounded-md',
                FOCUS_RING,
              )}
            >
              <span>مقاس مخصص</span>
              {activePresetId === 'custom' && (
                <Check className="w-3.5 h-3.5 text-primary" weight="bold" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>أوراق قياسية</DropdownMenuLabel>
            {PAPER_SIZES.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'text-xs text-start justify-between cursor-pointer rounded-md flex items-center',
                  FOCUS_RING,
                )}
              >
                <span>{`${p.name.split(' (')[0].replace(' بوصة', '″')} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                {activePresetId === p.id && (
                  <Check className="w-3.5 h-3.5 text-primary" weight="bold" />
                )}
              </DropdownMenuItem>
            ))}
            {ADVANCED_PAPER_SIZES.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'text-xs text-start justify-between cursor-pointer rounded-md flex items-center',
                  FOCUS_RING,
                )}
              >
                <span>{`${p.name.split(' (')[0].replace(' بوصة', '″')} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                {activePresetId === p.id && (
                  <Check className="w-3.5 h-3.5 text-primary" weight="bold" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>كروت وبطاقات</DropdownMenuLabel>
            {CARD_AND_LABEL_SIZES.filter((p) => p.category === 'card').map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'text-xs text-start justify-between cursor-pointer rounded-md flex items-center',
                  FOCUS_RING,
                )}
              >
                <span>{`${p.name} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                {activePresetId === p.id && (
                  <Check className="w-3.5 h-3.5 text-primary" weight="bold" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuLabel>ملصقات الشحن والباركود</DropdownMenuLabel>
            {CARD_AND_LABEL_SIZES.filter((p) => p.category !== 'card').map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'text-xs text-start justify-between cursor-pointer rounded-md flex items-center',
                  FOCUS_RING,
                )}
              >
                <span>{`${p.name} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                {activePresetId === p.id && (
                  <Check className="w-3.5 h-3.5 text-primary" weight="bold" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* مبدّل الاتجاه: مساحة واضحة بخيارين مسمّيين بدل زر أيقونة معزول */}
        <FluentSegmentedControl
          value={isPortrait ? 'portrait' : 'landscape'}
          onChange={(next) => {
            if (next !== (isPortrait ? 'portrait' : 'landscape')) handleSwapDimensions();
          }}
          variant="field"
          iconInline
          size="sm"
          className="w-full"
          ariaLabel="اتجاه اللوحة"
          options={[
            {
              id: 'portrait',
              label: 'عمودي',
              icon: <PageOrientationIcon isLandscape={false} className="w-3.5 h-3.5" />,
            },
            {
              id: 'landscape',
              label: 'أفقي',
              icon: <PageOrientationIcon isLandscape className="w-3.5 h-3.5" />,
            },
          ]}
        />
      </div>

      {/* 3. الأبعاد: العرض والارتفاع مع قفل نسبة الأبعاد */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        {/* العرض — بلا لاحقة الوحدة: مبدّل الوحدة (px/mm) أعلى الصف
                  يحدّدها، وتكرارها داخل كل حقل كان يقتطع القيمة. */}
        <div className={FIELD_SHELL} dir="ltr">
          <span className="text-mini font-bold text-muted-foreground/70 uppercase select-none shrink-0 font-mono">
            W
          </span>
          <input
            type="text"
            inputMode="decimal"
            aria-label="العرض"
            value={widthVal}
            onChange={(e) => handleWidthChange(e.target.value)}
            onBlur={handleWidthCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleWidthCommit();
              revertOnEscape(e, () => setWidthVal(toDisplay(canvasWidth)));
            }}
            className="w-full min-w-0 bg-transparent border-0 p-0 text-start font-mono text-xs font-semibold text-foreground focus:ring-0 focus:outline-none select-all"
            dir="ltr"
          />
        </div>

        {/* قفل نسبة الأبعاد — يحفظ التناسب عند تعديل أي بُعد */}
        <button
          type="button"
          onClick={() => setLockAspect((prev) => !prev)}
          aria-pressed={lockAspect}
          aria-label={lockAspect ? 'إلغاء قفل نسبة الأبعاد' : 'قفل نسبة الأبعاد'}
          title={lockAspect ? 'نسبة الأبعاد مقفلة' : 'قفل نسبة الأبعاد'}
          className={cn(
            'w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0',
            lockAspect
              ? 'bg-accent-active text-foreground border-border/80 font-bold'
              : 'bg-card border-border/80 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border',
            FOCUS_RING,
          )}
        >
          {lockAspect ? (
            <Link className="w-3.5 h-3.5" weight="bold" />
          ) : (
            <LinkBreak className="w-3.5 h-3.5" weight="bold" />
          )}
        </button>

        {/* الارتفاع */}
        <div className={FIELD_SHELL} dir="ltr">
          <span className="text-mini font-bold text-muted-foreground/70 uppercase select-none shrink-0 font-mono">
            H
          </span>
          <input
            type="text"
            inputMode="decimal"
            aria-label="الارتفاع"
            value={heightVal}
            onChange={(e) => handleHeightChange(e.target.value)}
            onBlur={handleHeightCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleHeightCommit();
              revertOnEscape(e, () => setHeightVal(toDisplay(canvasHeight)));
            }}
            className="w-full min-w-0 bg-transparent border-0 p-0 text-start font-mono text-xs font-semibold text-foreground focus:ring-0 focus:outline-none select-all"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
});
