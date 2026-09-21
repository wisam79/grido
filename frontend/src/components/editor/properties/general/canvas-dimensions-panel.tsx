import React, { useState, useEffect } from "react";
import { CaretDown, Check, Crop, FrameCorners, Link, LinkBreak } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { PAPER_SIZES, CARD_AND_LABEL_SIZES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useShallow } from "zustand/react/shallow";
import { FluentSection, FluentSettingRow } from "@/components/ui/blocks";

// ─────────────────────────────────────────────────────────────────────────────
// canvas-dimensions-panel.tsx — لوحة "مساحة العمل" (المقاس + الأبعاد + الاتجاه)
//
// قواعد الهوية البصرية المطبَّقة (Fluent 2):
//   - سلم الارتفاعات: كل عناصر التحكم h-8 (32px) — لا ارتفاع شاذ.
//   - هرمية الاستدارة: عناصر التحكم rounded-md، مجموعات التحكم rounded-md.
//   - حلقة التركيز المزدوجة الموحّدة: ring-2 + ring-offset-2 (للفأرة ولوحة المفاتيح).
//   - قابلية القراءة: لا نصوص 8px؛ التسميات text-micro والقيم text-xs بخط monospace.
//   - الدقة (DPI) ظاهرة في ترويسة القسم لأن تحويل ملم↔بكسل يعتمد عليها.
//
// إزالة التكرار الوظيفي: كان باللوحة عنصران يؤديان نفس العملية تماماً
// (زر "تبديل الأبعاد" + محدد "الاتجاه" — كلاهما يستبدل العرض بالارتفاع).
// أُبقي محدد الاتجاه كمصدر وحيد للتبديل، وحلّ محل الزر تكرار الميزة الغائبة
// فعلاً: قفل نسبة الأبعاد (Aspect Ratio Lock).
// ─────────────────────────────────────────────────────────────────────────────

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";

const FIELD_SHELL =
  "flex items-center gap-1.5 bg-input/60 hover:bg-input border border-border/80 hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background rounded-md px-2 h-8 shadow-2xs transition-colors";

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
    setRulerUnit,
  } = useEditorStore(useShallow((state) => ({
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
    setRulerUnit: state.setRulerUnit,
  })));

  const activeUnit = rulerUnit === "px" ? "px" : "mm";
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
      activeUnit === "px"
        ? px.toString()
        : Number(((px / currentDpi) * 25.4).toFixed(1)).toString(),
    [activeUnit, currentDpi]
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

  // نسبة مبسّطة للعرض فقط (1 : 1.41 لعمل عمودي)
  const ratioLabel = React.useMemo(() => {
    if (!isFinite(aspectRatio) || aspectRatio <= 0) return "—";
    const long = Math.max(canvasWidth, canvasHeight);
    const short = Math.min(canvasWidth, canvasHeight);
    if (short <= 0) return "—";
    const r = (long / short).toFixed(2);
    return canvasWidth <= canvasHeight ? `1 : ${r}` : `${r} : 1`;
  }, [aspectRatio, canvasWidth, canvasHeight]);

  const clampPx = React.useCallback(
    (px: number) => Math.max(MIN_PX, Math.min(MAX_PX, Math.round(px))),
    []
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
    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setWidthVal(val);
    }
  };

  const handleWidthCommit = () => {
    const num = parseFloat(widthVal);
    if (isNaN(num) || num <= 0) {
      setWidthVal(toDisplay(canvasWidth));
      return;
    }
    if (activeUnit === "px") {
      commitWidthPx(num);
      setWidthVal(clampPx(num).toString());
    } else {
      const mm = Math.min(Math.max(MIN_MM, num), MAX_MM);
      commitWidthPx((mm * currentDpi) / 25.4);
      setWidthVal(mm.toString());
    }
  };

  const handleHeightChange = (val: string) => {
    if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setHeightVal(val);
    }
  };

  const handleHeightCommit = () => {
    const num = parseFloat(heightVal);
    if (isNaN(num) || num <= 0) {
      setHeightVal(toDisplay(canvasHeight));
      return;
    }
    if (activeUnit === "px") {
      commitHeightPx(num);
      setHeightVal(clampPx(num).toString());
    } else {
      const mm = Math.min(Math.max(MIN_MM, num), MAX_MM);
      commitHeightPx((mm * currentDpi) / 25.4);
      setHeightVal(mm.toString());
    }
  };

  // Escape يعيد القيمة المخزّنة بدل ترك قيمة نصف مُدخلة معلّقة في الحقل
  const revertOnEscape = (
    e: React.KeyboardEvent<HTMLInputElement>,
    revert: () => void
  ) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    revert();
    e.currentTarget.blur();
  };

  const handlePresetChange = (presetId: string) => {
    if (presetId === "custom") {
      if (template) setTemplate(null);
      return;
    }

    const cardOrLabel = CARD_AND_LABEL_SIZES.find((p) => p.id === presetId);
    if (cardOrLabel) {
      const dpi = currentDpi;
      let targetW = (cardOrLabel.widthMM * dpi) / 25.4;
      let targetH = (cardOrLabel.heightMM * dpi) / 25.4;

      const isCurrentLandscape = canvasWidth > canvasHeight;
      if (isCurrentLandscape && targetW < targetH) {
        const temp = targetW;
        targetW = targetH;
        targetH = temp;
      }

      setCanvasSize(Math.round(targetW), Math.round(targetH));
      setShowBleedGuides(true);
      setBleedMarginMM(cardOrLabel.defaultBleedMM || 2);
      setCutShapeType(cardOrLabel.shape || "rectangle");
      if (template) setTemplate(null);
      return;
    }

    const paper = PAPER_SIZES.find((p) => p.id === presetId);
    if (!paper) return;

    const dpi = currentDpi;
    let targetW = (paper.widthMM * dpi) / 25.4;
    let targetH = (paper.heightMM * dpi) / 25.4;

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

  const activePaperPreset = PAPER_SIZES.find((p) => {
    const dpi = currentDpi;
    const currentWMM = (canvasWidth / dpi) * 25.4;
    const currentHMM = (canvasHeight / dpi) * 25.4;
    return (
      (Math.abs(currentWMM - p.widthMM) <= 1.5 && Math.abs(currentHMM - p.heightMM) <= 1.5) ||
      (Math.abs(currentWMM - p.heightMM) <= 1.5 && Math.abs(currentHMM - p.widthMM) <= 1.5)
    );
  });

  const activeCardPreset = CARD_AND_LABEL_SIZES.find((p) => {
    const dpi = currentDpi;
    const currentWMM = (canvasWidth / dpi) * 25.4;
    const currentHMM = (canvasHeight / dpi) * 25.4;
    return (
      (Math.abs(currentWMM - p.widthMM) <= 1.5 && Math.abs(currentHMM - p.heightMM) <= 1.5) ||
      (Math.abs(currentWMM - p.heightMM) <= 1.5 && Math.abs(currentHMM - p.widthMM) <= 1.5)
    );
  });

  const activePreset = activeCardPreset || activePaperPreset;
  const activePresetId = activePreset ? activePreset.id : "custom";
  const isPortrait = canvasWidth <= canvasHeight;

  const presetSizeLabel = (widthMM: number, heightMM: number) =>
    activeUnit === "px"
      ? `${Math.round((widthMM * currentDpi) / 25.4)}×${Math.round((heightMM * currentDpi) / 25.4)} بكسل`
      : `${widthMM}×${heightMM} مم`;

  const unitOptions: { id: "mm" | "px"; label: string; title: string }[] = [
    { id: "mm", label: "mm", title: "مليمتر" },
    { id: "px", label: "px", title: "بكسل" },
  ];

  const orientationOptions = [
    { id: "portrait" as const, label: "عمودي", title: "عمودي", glyph: "w-3 h-4" },
    { id: "landscape" as const, label: "أفقي", title: "أفقي", glyph: "w-4 h-3" },
  ];

  return (
    <FluentSection
      icon={<Crop className="w-4 h-4 text-primary" weight="duotone" />}
      title="مساحة العمل"
      subtitle={`${currentDpi} DPI`}
      collapsible
      defaultOpen={true}
      action={
        <span
          className="text-micro font-mono font-bold text-foreground/80 bg-muted/60 dark:bg-muted/40 border border-border/50 px-2 py-0.5 rounded-md shrink-0 select-none shadow-2xs"
          dir="ltr"
        >
          {activeUnit === "px"
            ? `${canvasWidth} × ${canvasHeight} px`
            : `${Number(((canvasWidth / currentDpi) * 25.4).toFixed(1))} × ${Number(((canvasHeight / currentDpi) * 25.4).toFixed(1))} mm`}
        </span>
      }
    >
      <div className="space-y-2.5 animate-in fade-in duration-200 font-cairo">
        {/* 1. المقاس: قائمة الأوراق والكروت القياسية + وحدة القياس */}
        <div className="flex items-center gap-1.5 w-full min-w-0" dir="rtl">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`المقاس: ${activePreset ? activePreset.name.split(" (")[0] : "مقاس مخصص"}`}
                className={cn(
                  "flex-1 min-w-0 flex items-center justify-between gap-1.5 px-2.5 h-8 rounded-md bg-input/60 hover:bg-input border border-border hover:border-primary/50 text-foreground text-xs font-semibold transition-colors cursor-pointer shadow-2xs overflow-hidden",
                  FOCUS_RING
                )}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <FrameCorners className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                  <span className="truncate text-xs font-semibold">
                    {activePreset ? activePreset.name.split(" (")[0] : "مقاس مخصص"}
                  </span>
                </span>
                <CaretDown className="w-4 h-4 text-muted-foreground shrink-0" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 font-cairo rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-fluent-8 max-h-[380px] overflow-y-auto" align="start">
              <DropdownMenuItem
                onClick={() => {
                  if (template) setTemplate(null);
                }}
                className={cn("text-xs text-right justify-between font-bold cursor-pointer rounded-md", FOCUS_RING)}
              >
                <span>مقاس مخصص</span>
                {activePresetId === "custom" && <Check className="w-4 h-4 text-primary" weight="bold" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>أوراق قياسية</DropdownMenuLabel>
              {PAPER_SIZES.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn("text-xs text-right justify-between cursor-pointer rounded-md flex items-center", FOCUS_RING)}
                >
                  <span>{`${p.name.split(" (")[0].replace(" بوصة", "″")} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                  {activePresetId === p.id && <Check className="w-4 h-4 text-primary" weight="bold" />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>كروت عمل</DropdownMenuLabel>
              {CARD_AND_LABEL_SIZES.filter((p) => p.category === "card").map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn("text-xs text-right justify-between cursor-pointer rounded-md flex items-center", FOCUS_RING)}
                >
                  <span>{`${p.name} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                  {activePresetId === p.id && <Check className="w-4 h-4 text-primary" weight="bold" />}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>ملصقات تجارية</DropdownMenuLabel>
              {CARD_AND_LABEL_SIZES.filter((p) => p.category !== "card").map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn("text-xs text-right justify-between cursor-pointer rounded-md flex items-center", FOCUS_RING)}
                >
                  <span>{`${p.name} (${presetSizeLabel(p.widthMM, p.heightMM)})`}</span>
                  {activePresetId === p.id && <Check className="w-4 h-4 text-primary" weight="bold" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* وحدة القياس — mm أولاً لأنها الوحدة الافتراضية للطباعة */}
          <div
            role="group"
            aria-label="وحدة القياس"
            className="flex items-center bg-muted/60 border border-border/80 rounded-md p-0.5 h-8 shrink-0 select-none shadow-2xs"
          >
            {unitOptions.map((unit) => {
              const isActive = activeUnit === unit.id;
              return (
                <button
                  key={unit.id}
                  type="button"
                  aria-pressed={isActive}
                  title={unit.title}
                  onClick={() => setRulerUnit(unit.id)}
                  className={cn(
                    "px-2.5 h-full rounded-md text-mini font-mono transition-colors cursor-pointer flex items-center justify-center select-none",
                    isActive
                      ? "bg-card text-primary font-bold shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground font-normal border border-transparent",
                    FOCUS_RING
                  )}
                >
                  {unit.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. الأبعاد: العرض والارتفاع مع قفل نسبة الأبعاد */}
        <FluentSettingRow
          layout="vertical"
          label="الأبعاد"
          description={`النسبة ${ratioLabel}`}
          control={
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
              {/* العرض */}
              <div className={FIELD_SHELL} dir="ltr" title="العرض">
                <span className="text-micro font-bold text-muted-foreground/70 uppercase select-none shrink-0 font-mono">
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
                    if (e.key === "Enter") handleWidthCommit();
                    revertOnEscape(e, () => setWidthVal(toDisplay(canvasWidth)));
                  }}
                  className="w-full min-w-0 bg-transparent border-0 p-0 text-left font-mono text-xs font-semibold text-foreground focus:ring-0 focus:outline-none select-all"
                  dir="ltr"
                />
                <span className="text-micro font-mono text-muted-foreground/70 shrink-0 select-none">
                  {activeUnit}
                </span>
              </div>

              {/* قفل نسبة الأبعاد — يحفظ التناسب عند تعديل أي بُعد */}
              <button
                type="button"
                onClick={() => setLockAspect((prev) => !prev)}
                aria-pressed={lockAspect}
                aria-label={lockAspect ? "إلغاء قفل نسبة الأبعاد" : "قفل نسبة الأبعاد"}
                title={lockAspect ? "نسبة الأبعاد مقفلة" : "قفل نسبة الأبعاد"}
                className={cn(
                  "w-8 h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0",
                  lockAspect
                    ? "bg-primary/10 text-primary border-primary/40 font-bold"
                    : "bg-input/40 border-border/80 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40",
                  FOCUS_RING
                )}
              >
                {lockAspect ? (
                  <Link className="w-4 h-4" weight="bold" />
                ) : (
                  <LinkBreak className="w-4 h-4" weight="bold" />
                )}
              </button>

              {/* الارتفاع */}
              <div className={FIELD_SHELL} dir="ltr" title="الارتفاع">
                <span className="text-micro font-bold text-muted-foreground/70 uppercase select-none shrink-0 font-mono">
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
                    if (e.key === "Enter") handleHeightCommit();
                    revertOnEscape(e, () => setHeightVal(toDisplay(canvasHeight)));
                  }}
                  className="w-full min-w-0 bg-transparent border-0 p-0 text-left font-mono text-xs font-semibold text-foreground focus:ring-0 focus:outline-none select-all"
                  dir="ltr"
                />
                <span className="text-micro font-mono text-muted-foreground/70 shrink-0 select-none">
                  {activeUnit}
                </span>
              </div>
            </div>
          }
        />

        {/* 3. الاتجاه — المصدر الوحيد لتبديل العرض بالارتفاع */}
        <FluentSettingRow
          label="الاتجاه"
          control={
            <div
              role="group"
              aria-label="اتجاه الصفحة"
              className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border/40"
            >
              {orientationOptions.map((option) => {
                const isActive = option.id === "portrait" ? isPortrait : !isPortrait;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActive}
                    title={option.title}
                    onClick={() => {
                      if (option.id === "portrait" && !isPortrait) handleSwapDimensions();
                      if (option.id === "landscape" && isPortrait) handleSwapDimensions();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2 h-7 text-mini font-sans rounded-md transition-colors cursor-pointer select-none",
                      isActive
                        ? "bg-card text-foreground font-bold shadow-2xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground font-normal border border-transparent",
                      FOCUS_RING
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "rounded-sm border-[1.5px] transition-colors shrink-0",
                        option.glyph,
                        isActive ? "border-primary bg-primary/25" : "border-muted-foreground/60"
                      )}
                    />
                    <span className="font-sans">{option.label}</span>
                  </button>
                );
              })}
            </div>
          }
        />
      </div>
    </FluentSection>
  );
});
