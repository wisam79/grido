import React, { useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import {
  IdentificationCard,
  Camera,
  FileText,
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
      return (
        (currentW_MM === preset.widthMM && currentH_MM === preset.heightMM) ||
        (currentW_MM === preset.heightMM && currentH_MM === preset.widthMM)
      );
    },
    [currentW_MM, currentH_MM],
  );

  const handleSelectPreset = useCallback(
    (preset: CanvasSizePreset) => {
      setCanvasSize(preset.widthPx, preset.heightPx);
    },
    [setCanvasSize],
  );

  // تبديل اتجاه الورقة (أفقي / رأسي)
  const handleToggleOrientation = () => {
    setCanvasSize(canvasHeight, canvasWidth);
  };

  return (
    <div className="space-y-3 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 📐 شريط المقاس النشط المدمج بتصميم Fluent 2 الأنيق */}
      <div className="flex items-center justify-between p-2.5 rounded-md bg-card border border-border/80 shadow-2xs fluent-specular">
        <div className="flex items-center gap-2 min-w-0">
          <FrameCorners className="w-4 h-4 text-muted-foreground shrink-0" weight="duotone" />
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-bold text-foreground font-mono text-xs truncate">
              {currentW_MM} × {currentH_MM} مم
            </span>
            <span className="text-mini font-mono text-muted-foreground shrink-0">
              {currentDpi} DPI
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleOrientation}
          className="flex items-center gap-1.5 text-mini font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-md border border-border/60 shadow-2xs shrink-0 select-none"
          title="تبديل الاتجاه (أفقي / رأسي)"
        >
          <ArrowsClockwise className="w-3.5 h-3.5" />
          <span>{canvasWidth >= canvasHeight ? 'أفقي' : 'رأسي'}</span>
        </button>
      </div>

      {/* 🧭 كبسولات التصفية للمقاسات القياسية المعتمدة في السوق */}
      <FluentFilterChips
        layoutId="freeform-presets-filter-chips"
        value={selectedCategory}
        onChange={setSelectedCategory}
        size="sm"
        className="w-full justify-between"
        options={[
          { id: 'all', label: 'الكل' },
          { id: 'photo', label: 'ورق صور', icon: <Camera /> },
          { id: 'standard', label: 'ورق قياسي', icon: <FileText /> },
          { id: 'cards', label: 'كروت', icon: <IdentificationCard /> },
        ]}
      />

      {/* 📄 قائمة مقاسات الورق الحقيقية المدعومة في الطابعات والأسواق */}
      <div className="space-y-1.5 pe-1 ps-0.5">
        {filteredPresets.map((preset) => {
          const active = isPresetActive(preset);

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              title={`${preset.name} - ${preset.tag}`}
              className={cn(
                'group w-full min-h-10 px-2.5 py-1.5 rounded-lg border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2.5 select-none text-start',
                active
                  ? 'bg-card border-border/90 text-foreground shadow-xs ring-1 ring-foreground/25 font-bold'
                  : 'bg-card/40 hover:bg-accent/60 border-border/50 hover:border-border text-foreground/90',
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* مصغر أيقونة الفئة الدلالية */}
                <div className="w-6 h-6 rounded-md bg-muted/70 flex items-center justify-center shrink-0 border border-border/40">
                  {preset.category === 'photo' ? (
                    <Camera
                      className={cn(
                        'w-3.5 h-3.5',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    />
                  ) : preset.category === 'cards' ? (
                    <IdentificationCard
                      className={cn(
                        'w-3.5 h-3.5',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    />
                  ) : (
                    <FileText
                      className={cn(
                        'w-3.5 h-3.5',
                        active ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    />
                  )}
                </div>

                {/* اسم المقاس */}
                <span
                  className={cn(
                    'text-xs leading-tight transition-colors min-w-0 flex-1',
                    active
                      ? 'text-foreground font-bold'
                      : 'text-foreground font-medium group-hover:text-foreground',
                  )}
                >
                  {preset.name}
                </span>
              </div>

              {/* الأبعاد وعلامة الاختيار النشط */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-mini font-mono font-medium px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                  {preset.tag}
                </span>
                {active && (
                  <span className="w-4 h-4 rounded-full bg-foreground text-background flex items-center justify-center shadow-xs shrink-0">
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
