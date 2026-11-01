import { FluentSliderField } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { Sparkle } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

import type { SheetGridConfig, StickerParams, StickerTemplate } from '../types';

export interface StickerSheetTabProps {
  template: StickerTemplate;
  params: StickerParams;
  gridConfig: SheetGridConfig;
  onChangeGridConfig: (
    config: SheetGridConfig | ((prev: SheetGridConfig) => SheetGridConfig),
  ) => void;
  onAutoFitSheet: () => void;
}

/** تبويب «الشيت» في لوح خصائص الملصق — معاينة الشبكة والملاءمة التلقائية والضبط */
export function StickerSheetTab({
  template,
  params,
  gridConfig,
  onChangeGridConfig,
  onAutoFitSheet,
}: StickerSheetTabProps) {
  return (
    <div className="space-y-3">
      {/* Miniature Sheet Grid Preview */}
      <div className="relative w-full h-28 rounded-md bg-muted/25 border border-border/40 p-2 flex items-center justify-center overflow-hidden">
        <div
          className="relative bg-card/95 rounded-lg border border-border/60 shadow-xs flex items-center justify-center p-1.5 transition-colors duration-200"
          style={{ width: '130px', height: '80px' }}
        >
          <div
            className="grid w-full h-full gap-1 items-center justify-center"
            style={{
              gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridConfig.rows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: Math.min(32, gridConfig.rows * gridConfig.cols) }).map(
              (_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'w-full h-full max-w-[14px] max-h-[14px] mx-auto border transition-colors duration-150 shadow-2xs',
                    template.shape === 'circle'
                      ? 'rounded-full'
                      : template.shape === 'rect'
                        ? 'rounded-sm'
                        : 'rounded-md',
                  )}
                  style={{
                    backgroundColor: params.primaryColor,
                    borderColor: params.secondaryColor || 'rgba(0,0,0,0.2)',
                  }}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* ملاءمة تلقائية من مقاس الملصق وورقة الطباعة */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onAutoFitSheet}
        className="w-full h-8 text-xs font-bold rounded-md gap-1.5 cursor-pointer border-primary/40 text-primary hover:bg-primary/10"
        title="أكبر شبكة تتسع على ورقة الطباعة"
      >
        <Sparkle className="w-3.5 h-3.5" weight="duotone" />
        <span>ملاءمة تلقائية على الورقة</span>
      </Button>

      {/* Grid Presets */}
      <div className="grid grid-cols-4 gap-1 bg-muted/60 dark:bg-black/35 p-1 rounded-md border border-border/70 dark:border-white/10 fluent-specular shadow-2xs">
        {[
          { r: 2, c: 2, label: '2×2' },
          { r: 3, c: 3, label: '3×3' },
          { r: 4, c: 2, label: '4×2' },
          { r: 5, c: 3, label: '5×3' },
        ].map((p) => {
          const isActive = gridConfig.rows === p.r && gridConfig.cols === p.c;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChangeGridConfig((prev) => ({ ...prev, rows: p.r, cols: p.c }))}
              className={cn(
                'h-7 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center select-none',
                isActive
                  ? 'bg-card text-foreground font-bold border border-border/80 dark:border-white/15 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40 dark:hover:bg-white/5 border-transparent font-medium',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="p-2.5 rounded-md bg-card/40 border border-border/30 space-y-2.5">
        <FluentSliderField
          label="صفوف"
          value={gridConfig.rows}
          min={1}
          max={12}
          step={1}
          onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, rows: val }))}
        />
        <FluentSliderField
          label="أعمدة"
          value={gridConfig.cols}
          min={1}
          max={12}
          step={1}
          onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, cols: val }))}
        />
        <FluentSliderField
          label="مسافة"
          value={gridConfig.spacingMm}
          min={0}
          max={20}
          step={1}
          unit="مم"
          onChange={(val) => onChangeGridConfig((prev) => ({ ...prev, spacingMm: val }))}
        />
      </div>
    </div>
  );
}
