import React, { useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
  IdentificationCard,
  Printer,
  DeviceMobile,
  Check,
  FrameCorners,
  ArrowsClockwise,
} from '@/components/ui/icons';
import { CANVAS_SIZE_PRESETS, CanvasSizePreset } from './freeform-panel-constants';
import { cn } from '@/lib/utils';
import { FluentFilterChips } from '@/components/ui/blocks';
import { canvasMm } from '@/lib/canvas/units';

export const FreeformPresetsTab = React.memo(function FreeformPresetsTab() {
  const { canvasWidth, canvasHeight, setCanvasSize, printSettings, template } = useEditorStore(
    useShallow((state) => ({
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      setCanvasSize: state.setCanvasSize,
      printSettings: state.printSettings,
      template: state.template,
    })),
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const currentDpi = template?.dpi || printSettings?.dpi || 300;
  const { wMM: currentW_MM, hMM: currentH_MM } = canvasMm(canvasWidth, canvasHeight, currentDpi);

  // تصفية المقاسات حسب الفئة المختارة
  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'all') return CANVAS_SIZE_PRESETS;
    return CANVAS_SIZE_PRESETS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // فحص المقاس النشط حالياً
  const isPresetActive = useCallback(
    (preset: CanvasSizePreset) => {
      if (preset.widthMM && preset.heightMM) {
        return (
          (currentW_MM === preset.widthMM && currentH_MM === preset.heightMM) ||
          (currentW_MM === preset.heightMM && currentH_MM === preset.widthMM)
        );
      }
      return (
        (canvasWidth === preset.widthPx && canvasHeight === preset.heightPx) ||
        (canvasWidth === preset.heightPx && canvasHeight === preset.widthPx)
      );
    },
    [currentW_MM, currentH_MM, canvasWidth, canvasHeight],
  );

  const handleSelectPreset = useCallback(
    (preset: CanvasSizePreset) => {
      setCanvasSize(preset.widthPx, preset.heightPx);
      toast.success(`كانفاس: ${preset.name} (${preset.tag})`);
    },
    [setCanvasSize],
  );

  // تبديل اتجاه الورقة (أفقي / رأسي)
  const handleToggleOrientation = () => {
    setCanvasSize(canvasHeight, canvasWidth);
    toast.success(canvasHeight >= canvasWidth ? 'أفقي' : 'رأسي');
  };

  return (
    <div className="space-y-2.5 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 📐 شريط المقاس النشط المدمج بتصميم Fluent 2 الأنيق */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular">
        <div className="flex items-center gap-2 min-w-0">
          <FrameCorners className="w-4 h-4 text-primary shrink-0" weight="duotone" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-bold text-foreground font-mono text-xs truncate">
              {currentW_MM} × {currentH_MM} مم
            </span>
            <span className="text-micro font-mono text-muted-foreground shrink-0">
              {currentDpi} DPI
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleOrientation}
          className="flex items-center gap-1 text-micro font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer bg-muted/60 hover:bg-muted px-2 py-1 rounded-md border border-border/60 shadow-2xs active:scale-95 shrink-0 select-none"
          title="تبديل الاتجاه"
        >
          <ArrowsClockwise className="w-3 h-3" />
          <span>{canvasWidth >= canvasHeight ? 'أفقي' : 'رأسي'}</span>
        </button>
      </div>

      {/* 🧭 كبسولات التصفية المدمجة بدون قص أو فيضان أفقي */}
      <FluentFilterChips
        layoutId="freeform-presets-filter-chips"
        value={selectedCategory}
        onChange={setSelectedCategory}
        size="sm"
        className="w-full justify-between"
        options={[
          { id: 'all', label: 'الكل' },
          { id: 'id', label: 'وثائق', icon: <IdentificationCard /> },
          { id: 'print', label: 'مطبوعات', icon: <Printer /> },
          { id: 'social', label: 'وسائط', icon: <DeviceMobile /> },
        ]}
      />

      {/* 📄 قائمة المقاسات الكاملة بدون أي اقتطاع مع شريط تمرير Fluent ناعم */}
      <div className="space-y-1 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 pl-0.5 custom-scrollbar">
        {filteredPresets.map((preset) => {
          const active = isPresetActive(preset);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              title={`${preset.name} - ${preset.tag}`}
              className={cn(
                'group w-full h-9 px-2.5 rounded-md border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 select-none active:scale-[0.99] text-right',
                active
                  ? 'bg-card border-border/90 text-foreground shadow-xs ring-1 ring-primary/40 font-bold'
                  : 'bg-card/40 hover:bg-accent/60 border-border/50 hover:border-primary/40 text-foreground/90',
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* مصغر أيقونة الفئة الدلالية */}
                <div className="w-5 h-5 rounded-md bg-muted/70 flex items-center justify-center shrink-0 border border-border/40">
                  {preset.category === 'id' ? (
                    <IdentificationCard
                      className={cn('w-3 h-3', active ? 'text-primary' : 'text-muted-foreground')}
                    />
                  ) : preset.category === 'social' ? (
                    <DeviceMobile
                      className={cn('w-3 h-3', active ? 'text-primary' : 'text-muted-foreground')}
                    />
                  ) : (
                    <Printer
                      className={cn('w-3 h-3', active ? 'text-primary' : 'text-muted-foreground')}
                    />
                  )}
                </div>

                {/* اسم المقاس كاملاً بدون أي اقتطاع */}
                <span
                  className={cn(
                    'text-xs truncate transition-colors',
                    active
                      ? 'text-primary font-bold'
                      : 'text-foreground font-medium group-hover:text-primary',
                  )}
                >
                  {preset.name}
                </span>
              </div>

              {/* الأبعاد وعلامة الاختيار النشط */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-micro font-mono font-medium px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                  {preset.tag}
                </span>
                {active && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
                    <Check className="w-2.5 h-2.5" weight="bold" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
