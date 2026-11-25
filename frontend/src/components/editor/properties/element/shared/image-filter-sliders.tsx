import { FluentSliderField } from '@/components/ui/blocks';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { useEditorStore } from '@/lib/editor-store';
import { cn } from '@/lib/utils';

interface ImageAdjustValues {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
}

interface ImageFilterSlidersProps {
  targetId: string;
  values: ImageAdjustValues;
  includeBlur?: boolean;
  onPatch: (patch: Partial<ImageAdjustValues>) => void;
}

interface FilterSliderDef {
  key: keyof ImageAdjustValues;
  label: string;
  min: number;
  max: number;
  unit: string;
  defaultValue: number;
}

const BASE_SLIDERS: readonly FilterSliderDef[] = [
  { key: 'brightness', label: 'السطوع', min: 0, max: 200, unit: '%', defaultValue: 100 },
  { key: 'contrast', label: 'التباين', min: 0, max: 200, unit: '%', defaultValue: 100 },
  { key: 'saturation', label: 'التشبع', min: 0, max: 200, unit: '%', defaultValue: 100 },
];

const BLUR_SLIDER: FilterSliderDef = {
  key: 'blur',
  label: 'الضبابية',
  min: 0,
  max: 20,
  unit: 'px',
  defaultValue: 0,
};

/** منزلقات ضبط الصورة المشتركة (السطوع، التباين، التشبع، والضبابية الاختيارية) مع إدارة جودة السحب وسجل التراجع. */
export function ImageFilterSliders({
  targetId,
  values,
  includeBlur = false,
  onPatch,
}: ImageFilterSlidersProps) {
  const sliders = includeBlur ? [...BASE_SLIDERS, BLUR_SLIDER] : BASE_SLIDERS;
  const handleCommit = () => {
    useRenderQuality.getState().setIsDraggingFilter(false);
    useEditorStore.getState().pushHistory();
  };

  return (
    <div className="space-y-2.5 pt-1">
      {sliders.map((slider) => (
        <FluentSliderField
          key={slider.key}
          label={slider.label}
          value={values[slider.key] ?? slider.defaultValue}
          min={slider.min}
          max={slider.max}
          step={1}
          unit={slider.unit}
          defaultValue={slider.defaultValue}
          onChange={(v) => onPatch({ [slider.key]: v })}
          onCommit={handleCommit}
          onDragStart={() => useRenderQuality.getState().setIsDraggingFilter(true, targetId)}
          onDragEnd={() => useRenderQuality.getState().setIsDraggingFilter(false)}
        />
      ))}
    </div>
  );
}

/** شريط التقدم السفلي المدمج داخل أزرار عمليات الذكاء الاصطناعي النشطة. */
export function ButtonProgressBar({
  progress,
  tone = 'destructive',
}: {
  progress: number;
  tone?: 'destructive' | 'primary';
}) {
  const trackClass = tone === 'primary' ? 'bg-primary/20' : 'bg-destructive-foreground/30';
  const fillClass = tone === 'primary' ? 'bg-primary' : 'bg-destructive-foreground';

  return (
    <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 h-0.5', trackClass)}>
      <span
        className={cn('block h-full transition-[width] duration-300', fillClass)}
        style={{ width: `${Math.round(progress)}%` }}
      />
    </span>
  );
}
