import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Check, Copy, Eyedropper, Palette } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { checkerColor, previewWhite } from '@/lib/canvas/canvas-colors';
import { cn } from '@/lib/utils';

import { ColorWheel } from './color-wheel';

/** ألوان سريعة تُعرض في صف الحقل مباشرة؛ أما الكود والنطاق الكامل فداخل الحوار. */
const QUICK_COLORS = [
  { hex: '#000000', name: 'أسود' },
  { hex: '#FFFFFF', name: 'أبيض' },
  { hex: '#EF4444', name: 'أحمر' },
  { hex: '#3B82F6', name: 'أزرق' },
];

export interface ColorPanelProps {
  children: React.ReactNode;
  className?: string;
  /**
   * يُبقى للتوافق فقط: نظام الألوان الآن منتقٍ واحد يُفتح من الرقعة (ColorField)،
   * فلا تُعرض أي عجلة مضمّنة داخل اللوحات.
   */
  wheelPosition?: 'top' | 'bottom' | 'none';
}

/** مُغلّف شفّاف للتوافق الخلفي — لا يعرض أي عجلة. */
export function ColorPanel({ children }: ColorPanelProps) {
  return <>{children}</>;
}

/** @deprecated لم يعد هناك عجلة مضمّنة؛ استخدم ColorField. */
export function ColorWheelPanel(): null {
  return null;
}

export function ColorField({
  color,
  onChange,
  className,
  disabled,
  label,
  swatchOnly,
  ariaLabel,
}: {
  color: string;
  onChange: (hex: string) => void;
  className?: string;
  disabled?: boolean;
  label?: React.ReactNode;
  swatchOnly?: boolean;
  /** اسم برمجي للزر — ضروري في وضع swatchOnly حيث لا يوجد نص ظاهر */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const isDropperActiveRef = useRef(false);
  const name = ariaLabel ?? (typeof label === 'string' ? label : 'اللون');

  const swatchFace = (
    <div
      className="w-full h-full rounded border border-black/15 dark:border-white/20 shadow-2xs relative overflow-hidden transition-colors before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
      style={{ backgroundColor: color === 'transparent' ? previewWhite() : color }}
    >
      {color === 'transparent' && (
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`,
            backgroundSize: '4px 4px',
          }}
        />
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {swatchOnly ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={name}
                className={cn(
                  'flex w-8 h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border/80 bg-card p-0.5 shadow-2xs transition-colors hover:border-primary/60 hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none dark:border-white/10',
                  open && 'border-primary/60 bg-muted/60',
                  className,
                )}
              >
                {swatchFace}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs font-bold font-cairo">
            {name}
          </TooltipContent>
        </Tooltip>
      ) : (
        <div
          className={cn(
            'flex h-8 items-center gap-2 rounded-md border border-border/80 bg-card px-1.5 shadow-2xs transition-colors',
            open && 'border-primary/50 bg-muted/40',
            disabled && 'opacity-50',
            className,
          )}
        >
          {label ? (
            <span className="shrink-0 ps-0.5 text-xs font-semibold text-foreground/90">
              {label}
            </span>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={name}
                className={cn(
                  'relative h-6 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-black/15 shadow-2xs transition-[border-color,box-shadow] hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed dark:border-white/20',
                  open && 'border-primary/70',
                )}
              >
                {swatchFace}
              </button>
            </PopoverTrigger>

            <span aria-hidden className="h-4 w-px shrink-0 bg-border/70" />

            <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
              {QUICK_COLORS.map((quick) => {
                const isActive = color.toLowerCase() === quick.hex.toLowerCase();
                return (
                  <button
                    key={quick.hex}
                    type="button"
                    disabled={disabled}
                    aria-label={`لون ${quick.name}`}
                    aria-pressed={isActive}
                    onClick={() => onChange(quick.hex)}
                    className="group flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-4 w-4 rounded-full border shadow-2xs transition-transform group-hover:scale-110',
                        isActive
                          ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-card'
                          : 'border-black/20 dark:border-white/25',
                      )}
                      style={{ backgroundColor: quick.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <PopoverContent
        className="w-64 rounded-xl border border-border bg-popover/95 p-2.5 shadow-fluent-8 backdrop-blur-xl"
        sideOffset={8}
        align="start"
        collisionPadding={12}
        onPointerDownOutside={(e) => {
          if (isDropperActiveRef.current) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (isDropperActiveRef.current) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => {
          if (isDropperActiveRef.current) {
            e.preventDefault();
          }
        }}
      >
        <div className="pb-2">
          <span className="truncate text-xs font-semibold text-foreground/90">{name}</span>
        </div>
        {open && (
          <ColorWheelPicker
            color={color}
            onChange={onChange}
            onDropperActiveChange={(active) => {
              isDropperActiveRef.current = active;
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function sampleColorFromPoint(clientX: number, clientY: number): string | null {
  if (typeof document === 'undefined') return null;

  const elements = document.elementsFromPoint(clientX, clientY);

  // 1. أولاً: فحص طبقات الكانفاس (Konva Canvas Layers) وقراءة بيانات البكسل بدقة
  for (const el of elements) {
    if (el instanceof HTMLCanvasElement) {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const scaleX = el.width / rect.width;
        const scaleY = el.height / rect.height;
        const px = Math.floor((clientX - rect.left) * scaleX);
        const py = Math.floor((clientY - rect.top) * scaleY);
        const ctx = el.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const data = ctx.getImageData(px, py, 1, 1).data;
          if (data[3] > 0) {
            const r = data[0];
            const g = data[1];
            const b = data[2];
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
          }
        }
      } catch {
        // استمرار المحاولة مع الطبقات الأخرى
      }
    }
  }

  // 2. ثانياً: فحص ألوان خلفيات عناصر DOM كبديل احتياطي
  for (const el of elements) {
    if (el instanceof HTMLElement) {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0)')) {
        const match = bg.match(/\d+/g);
        if (match && match.length >= 3) {
          const r = Number(match[0]);
          const g = Number(match[1]);
          const b = Number(match[2]);
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        }
      }
    }
  }

  return null;
}

export function ColorWheelPicker({
  color,
  onChange,
  onDropperActiveChange,
}: {
  color: string;
  onChange: (hex: string) => void;
  onDropperActiveChange?: (active: boolean) => void;
}) {
  const isTransparent = color === 'transparent';
  const [inputValue, setInputValue] = useState(color);
  const [copied, setCopied] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);
  const dropperTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      if (dropperTimerRef.current !== null) clearTimeout(dropperTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setInputValue(color);
    });
    return () => cancelAnimationFrame(rafId);
  }, [color]);

  const handleHexInput = (value: string) => {
    setInputValue(value);

    const cleanValue = value.trim();
    if (cleanValue === 'transparent') {
      onChange('transparent');
      return;
    }

    let hexValue = cleanValue;
    if (!hexValue.startsWith('#')) {
      hexValue = '#' + hexValue;
    }

    if (/^#([0-9A-F]{3}){1,2}$/i.test(hexValue)) {
      onChange(hexValue.toUpperCase());
    }
  };

  const activateInAppSampler = () => {
    setIsDropping(true);
    onDropperActiveChange?.(true);
    document.body.style.cursor = 'crosshair';
    toast.info('انقر على أي صورة أو موضع في الكانفاس لسحب لونه (Esc للإلغاء)', {
      id: 'eyedropper-active-hint',
      duration: 10000,
    });

    const cleanup = () => {
      setIsDropping(false);
      document.body.style.cursor = '';
      toast.dismiss('eyedropper-active-hint');
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (dropperTimerRef.current !== null) clearTimeout(dropperTimerRef.current);
      dropperTimerRef.current = window.setTimeout(() => {
        dropperTimerRef.current = null;
        onDropperActiveChange?.(false);
      }, 300);
    };

    const handlePointerDown = (evt: PointerEvent) => {
      evt.preventDefault();
      evt.stopPropagation();

      const hex = sampleColorFromPoint(evt.clientX, evt.clientY);
      if (hex) {
        setInputValue(hex);
        onChange(hex);
        toast.success(`تم اختيار اللون: ${hex}`);
      }
      cleanup();
    };

    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        cleanup();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
  };

  const handleEyeDropper = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof window === 'undefined') return;

    if ('EyeDropper' in window) {
      setIsDropping(true);
      onDropperActiveChange?.(true);
      const startTime = Date.now();

      try {
        const eyeDropper = new (
          window as unknown as {
            EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
          }
        ).EyeDropper();

        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          const upper = result.sRGBHex.toUpperCase();
          setInputValue(upper);
          onChange(upper);
          toast.success(`تم اختيار اللون: ${upper}`);
          setIsDropping(false);
          if (dropperTimerRef.current !== null) clearTimeout(dropperTimerRef.current);
          dropperTimerRef.current = window.setTimeout(() => {
            dropperTimerRef.current = null;
            onDropperActiveChange?.(false);
          }, 300);
          return;
        }
      } catch (err: unknown) {
        const elapsed = Date.now() - startTime;
        const isAbort = (err as { name?: string })?.name === 'AbortError';

        // إلغاء يدوي صريح من المستخدم بعد استمرار الجلسة لأكثر من ربع ثانية
        if (isAbort && elapsed > 250) {
          setIsDropping(false);
          if (dropperTimerRef.current !== null) clearTimeout(dropperTimerRef.current);
          dropperTimerRef.current = window.setTimeout(() => {
            dropperTimerRef.current = null;
            onDropperActiveChange?.(false);
          }, 300);
          return;
        }
      }
    }

    // الانتقال التلقائي للقطارة التفاعلية الداخلية في حال تعذر أو رفض المتصفح
    activateInAppSampler();
  };

  const handleCopyHex = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(color.toUpperCase());
      setCopied(true);
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        copiedTimerRef.current = null;
        setCopied(false);
      }, 1500);
    }
  };

  const hasEyeDropper = typeof window !== 'undefined';
  const displayColor = isTransparent ? '#FFFFFF' : color;

  return (
    <div className="flex w-full select-none flex-col gap-2.5" dir="rtl" data-color-panel-wheel="">
      <ColorWheel
        color={displayColor}
        onChange={(newColor) => {
          setInputValue(newColor);
          onChange(newColor);
        }}
      />

      <div className="flex items-center gap-1.5" dir="ltr">
        <button
          type="button"
          onClick={() => {
            setInputValue('transparent');
            onChange('transparent');
          }}
          className={cn(
            'w-8 h-8 rounded-md border flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
            isTransparent
              ? 'bg-card text-foreground border border-border/80 dark:border-white/15 font-bold shadow-xs ring-1 ring-primary/40'
              : 'border-border/80 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
          title="خلفية شفافة"
          aria-label="شفاف"
        >
          <Palette
            className={cn('w-4 h-4', isTransparent ? 'text-primary' : 'text-muted-foreground')}
            weight={isTransparent ? 'fill' : 'regular'}
          />
        </button>

        {hasEyeDropper && (
          <button
            type="button"
            onClick={handleEyeDropper}
            className={cn(
              'w-8 h-8 rounded-lg border border-border/80 bg-card hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
              isDropping &&
                'border-primary bg-primary/15 text-primary ring-2 ring-primary/30 animate-pulse',
            )}
            title={
              isDropping ? 'انقر على أي نقطة بالشاشة لاختيار لونها (Esc للإلغاء)' : 'قطارة الشاشة'
            }
            aria-label="قطارة الشاشة"
            aria-pressed={isDropping}
          >
            <Eyedropper className="w-4 h-4" weight={isDropping ? 'fill' : 'regular'} />
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 bg-input/90 border border-border/80 rounded-lg px-2.5 h-8 shadow-2xs focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-colors">
          <span className="text-xs font-bold text-muted-foreground/60 select-none">#</span>
          <input
            type="text"
            dir="ltr"
            value={inputValue.startsWith('#') ? inputValue.slice(1) : inputValue}
            onChange={(event) => handleHexInput(event.target.value)}
            className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-start text-foreground font-semibold uppercase"
            placeholder="FFFFFF"
            aria-label="قيمة HEX"
          />
          <button
            type="button"
            onClick={handleCopyHex}
            className="text-muted-foreground/50 hover:text-foreground transition-colors p-0.5"
            title="نسخ اللون"
            aria-label="نسخ اللون"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" weight="bold" />
            ) : (
              <Copy className="w-3.5 h-3.5" weight="regular" />
            )}
          </button>
          <div
            className="w-4 h-4 rounded-md border border-black/15 dark:border-white/20 shadow-2xs shrink-0 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none"
            style={{ backgroundColor: displayColor }}
          >
            {isTransparent && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`,
                  backgroundSize: '4px 4px',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
