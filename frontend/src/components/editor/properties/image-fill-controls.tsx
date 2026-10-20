import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FluentSegmentedControl, FluentSliderField } from '@/components/ui/blocks';
import { Image as ImageIcon, Trash, ArrowsClockwise } from '@/components/ui/icons';
import { useAsyncImage } from '@/hooks/use-async-image';
import { pickLocalImage } from '@/lib/io/file-dialog-utils';
import { toErrorMessage } from '@/lib/wails-error';
import { createLogger } from '@/lib/logger';
import {
  TILE_SCALE_DEFAULT,
  TILE_SCALE_MAX,
  TILE_SCALE_MIN,
  type ShapeFillImageFit,
} from '@/lib/canvas/shape-pattern';
import type { ImageFillFields } from './image-fill-patch';

const logger = createLogger('image-fill-controls');

export interface ImageFillControlsProps {
  value: ImageFillFields;
  onChange: (patch: Partial<ImageFillFields>) => void;
  /** إدخال في سجل التراجع بعد اكتمال عملية (اختيار/إزالة/نمط) */
  onCommit?: () => void;
}

const FIT_OPTIONS: Array<{ id: ShapeFillImageFit; label: string }> = [
  { id: 'stretch', label: 'تمدد' },
  { id: 'cover', label: 'تعبئة' },
  { id: 'contain', label: 'احتواء' },
  { id: 'tile', label: 'تكرار' },
];

const FIT_LABELS: Record<ShapeFillImageFit, string> = {
  stretch: 'ممددة لملء الشكل',
  cover: 'تغطية مع قص الفائض',
  contain: 'كاملة داخل الشكل',
  tile: 'نمط مكرر كبلاط',
};

/**
 * لوحة تعبئة الشكل بصورة — تُركَّب داخل GradientPicker (وضع «صورة») بدل
 * منتقٍ لون منفصل، فتظل نقطة تعبئة واحدة لكل عنصر.
 */
export function ImageFillControls({ value, onChange, onCommit }: ImageFillControlsProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [thumb] = useAsyncImage(value.fillImageSrc || '');
  const fit = value.fillImageFit ?? 'cover';
  const hasImage = !!value.fillImageSrc;

  const handlePick = async () => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const path = await pickLocalImage();
      if (path) {
        onChange({ fillImageSrc: path, fillImageFit: value.fillImageFit ?? 'cover' });
        onCommit?.();
      }
    } catch (err) {
      logger.error(err);
      toast.error(toErrorMessage(err, 'فشل اختيار الصورة'));
    } finally {
      setIsPicking(false);
    }
  };

  const handleRemove = () => {
    onChange({
      fillImageSrc: undefined,
      fillImageFit: undefined,
      fillImageScale: undefined,
      fillImageRotation: undefined,
      fillImageOffsetX: undefined,
      fillImageOffsetY: undefined,
    });
    onCommit?.();
  };

  return (
    <div className="space-y-2.5 w-full">
      {hasImage ? (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-background/50 border border-border/60 shadow-2xs w-full">
          <div
            className="w-12 h-12 rounded-lg overflow-hidden border border-border/60 shrink-0"
            style={{
              backgroundImage:
                'repeating-conic-gradient(rgba(0,0,0,0.08) 0% 25%, transparent 0% 50%)',
              backgroundSize: '12px 12px',
            }}
          >
            {thumb ? <img src={thumb.src} alt="" className="w-full h-full object-cover" /> : null}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <span className="text-xs font-bold text-foreground block truncate">صورة التعبئة</span>
            <span className="text-micro text-muted-foreground block truncate">
              {FIT_LABELS[fit]}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handlePick}
              disabled={isPicking}
              aria-label="استبدال الصورة"
              title="استبدال الصورة"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
            >
              <ArrowsClockwise className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleRemove}
              aria-label="إزالة الصورة"
              title="إزالة الصورة"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePick}
          disabled={isPicking}
          className="w-full h-16 rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-60 disabled:cursor-wait"
        >
          <ImageIcon className="w-4 h-4" weight="duotone" />
          <span className="text-xs font-semibold">
            {isPicking ? 'جاري الاختيار...' : 'اختيار صورة للتعبئة'}
          </span>
        </button>
      )}

      {hasImage && (
        <>
          <div className="space-y-1">
            <span className="text-micro font-semibold text-muted-foreground block">
              ملاءمة الصورة
            </span>
            <FluentSegmentedControl<ShapeFillImageFit>
              layoutId="shape-image-fit"
              value={fit}
              onChange={(nextFit) => {
                onChange({ fillImageFit: nextFit });
                onCommit?.();
              }}
              size="sm"
              options={FIT_OPTIONS}
            />
          </div>

          {/* حجم النقش — ذو معنى في وضع التكرار فقط */}
          {fit === 'tile' && (
            <FluentSliderField
              label="حجم النقش"
              value={Math.round((value.fillImageScale ?? TILE_SCALE_DEFAULT) * 100)}
              min={Math.round(TILE_SCALE_MIN * 100)}
              max={Math.round(TILE_SCALE_MAX * 100)}
              step={5}
              unit="%"
              onChange={(v) => onChange({ fillImageScale: v / 100 })}
              onCommit={onCommit}
            />
          )}

          {/* الدوران والإزاحة — بلا معنى مع التمدد (الصورة تغطي الشكل أصلاً) */}
          {fit !== 'stretch' && (
            <>
              <FluentSliderField
                label="دوران الصورة"
                value={Math.round(value.fillImageRotation ?? 0)}
                min={-180}
                max={180}
                step={1}
                unit="°"
                onChange={(v) => onChange({ fillImageRotation: v })}
                onCommit={onCommit}
              />
              <div className="grid grid-cols-2 gap-2">
                <FluentSliderField
                  label="إزاحة أفقية"
                  value={Math.round((value.fillImageOffsetX ?? 0) * 100)}
                  min={-50}
                  max={50}
                  step={1}
                  unit="%"
                  onChange={(v) => onChange({ fillImageOffsetX: v / 100 })}
                  onCommit={onCommit}
                />
                <FluentSliderField
                  label="إزاحة عمودية"
                  value={Math.round((value.fillImageOffsetY ?? 0) * 100)}
                  min={-50}
                  max={50}
                  step={1}
                  unit="%"
                  onChange={(v) => onChange({ fillImageOffsetY: v / 100 })}
                  onCommit={onCommit}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
