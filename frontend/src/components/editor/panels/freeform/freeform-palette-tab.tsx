import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Star,
  Palette,
  Eyedropper,
  Warning,
  Sparkle,
  ArrowsOutCardinal,
} from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FluentEmptyState,
  FluentSection,
  FluentSegmentedControl,
  FluentSettingRow,
} from '@/components/ui/blocks';
import { PopoverColorPicker } from '@/components/editor/properties/shared-controls';
import { STUDIO_PALETTE } from '@/lib/canvas/canvas-colors';
import { colorPatchFor } from '@/lib/canvas/apply-color';
import { extractPaletteFromSources } from '@/lib/canvas/palette-extract';
import {
  PREF_KEYS,
  pushStoredRecent,
  readStoredList,
  toggleStoredValue,
  writeStoredList,
} from '@/lib/local-prefs';

/* ═══════════════════════════════════════════════════════════════
   الألوان والهوية — تطبيق لون واحد أو توزيع هوية كاملة على المحدد،
   مع استخراج بالِتة من صور التصميم محلياً (بلا أي إرسال للخارج).
   ═══════════════════════════════════════════════════════════════ */

type ColorTarget = 'element' | 'canvas';

interface IdentityPalette {
  id: string;
  name: string;
  colors: string[];
}

const IDENTITY_PALETTES: IdentityPalette[] = [
  {
    id: 'official',
    name: 'وثائق رسمية',
    colors: ['#0f172a', '#1e3a8a', '#475569', '#cbd5e1', '#f8fafc'],
  },
  {
    id: 'studio-gold',
    name: 'استوديو ذهبي',
    colors: ['#78350f', '#b45309', '#d97706', '#fbbf24', '#fffbeb'],
  },
  {
    id: 'royal-blue',
    name: 'أزرق ملكي',
    colors: ['#0c1a3a', '#1e40af', '#3b82f6', '#93c5fd', '#eff6ff'],
  },
  {
    id: 'emerald',
    name: 'زمردي هادئ',
    colors: ['#064e3b', '#047857', '#10b981', '#a7f3d0', '#ecfdf5'],
  },
  {
    id: 'warm-earth',
    name: 'ترابي دافئ',
    colors: ['#7c2d12', '#c2410c', '#f59e0b', '#f5d0a9', '#fffbeb'],
  },
  {
    id: 'mono',
    name: 'رمادي أحادي',
    colors: ['#09090b', '#3f3f46', '#71717a', '#d4d4d8', '#fafafa'],
  },
];

export function FreeformPaletteTab() {
  const { elements, selectedIds, updateElements, setBackgroundColor, backgroundColor } =
    useEditorStore(
      useShallow((state) => ({
        elements: state.elements,
        selectedIds: state.selectedIds,
        updateElements: state.updateElements,
        setBackgroundColor: state.setBackgroundColor,
        backgroundColor: state.backgroundColor,
      })),
    );

  const [target, setTarget] = useState<ColorTarget>('element');
  const [customColor, setCustomColor] = useState<string>('#2563eb');
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteColors),
  );
  const [recents, setRecents] = useState<string[]>(() => readStoredList(PREF_KEYS.recentColors));
  const [extracted, setExtracted] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIds.includes(element.id)),
    [elements, selectedIds],
  );

  const imageSources = useMemo(() => {
    const images = elements.filter((element) => element.type === 'image');
    const selectedImages = images.filter((element) => selectedIds.includes(element.id));
    const pool = selectedImages.length > 0 ? selectedImages : images;
    return pool
      .map((element) => (element.type === 'image' ? element.imageSrc : ''))
      .filter((src): src is string => Boolean(src))
      .slice(0, 4);
  }, [elements, selectedIds]);

  const rememberRecent = (color: string) => {
    setRecents((previous) => {
      const next = pushStoredRecent(previous, color.toLowerCase());
      writeStoredList(PREF_KEYS.recentColors, next);
      return next;
    });
  };

  const applyColor = (color: string) => {
    rememberRecent(color);

    if (target === 'canvas') {
      setBackgroundColor(color);
      toast.success('خلفية الورقة');
      return;
    }

    if (selectedElements.length === 0) {
      toast.info('حدّد عنصراً أو الخلفية');
      return;
    }

    updateElements(
      selectedElements.map((element) => ({ id: element.id, patch: colorPatchFor(element, color) })),
    );
    toast.success(
      selectedElements.length === 1 ? 'لون المحدد' : `لون ${selectedElements.length} عناصر`,
    );
  };

  /** توزيع ألوان الهوية دورياً على العناصر المحددة (شارات/بطاقات دفعة واحدة) */
  const distributePalette = (palette: IdentityPalette) => {
    if (selectedElements.length < 2) {
      toast.info('حدّد عنصرين للتوزيع');
      return;
    }
    updateElements(
      selectedElements.map((element, index) => ({
        id: element.id,
        patch: colorPatchFor(element, palette.colors[index % palette.colors.length]),
      })),
    );
    rememberRecent(palette.colors[0]);
    toast.success(`توزيع «${palette.name}» على ${selectedElements.length}`);
  };

  const toggleFavorite = (color: string) => {
    setFavorites((previous) => {
      const next = toggleStoredValue(previous, color.toLowerCase());
      writeStoredList(PREF_KEYS.favoriteColors, next);
      return next;
    });
  };

  const runExtraction = async () => {
    if (imageSources.length === 0) {
      toast.info('لا صور للاستخراج');
      return;
    }
    setIsExtracting(true);
    try {
      const palette = await extractPaletteFromSources(imageSources, 8);
      setExtracted(palette);
      if (palette.length === 0) {
        toast.info('تعذّر الاستخراج');
      } else {
        toast.success(`استخراج ${palette.length} لون`);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const targetLabel = target === 'canvas' ? 'خلفية الورقة' : 'العنصر المحدد';

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      <FluentSection
        icon={<Palette className="w-3.5 h-3.5" weight="duotone" />}
        title="وجهة اللون"
        subtitle={targetLabel}
      >
        <FluentSegmentedControl<ColorTarget>
          value={target}
          onChange={setTarget}
          layoutId="palette-target"
          options={[
            { id: 'element', label: 'العنصر المحدد' },
            { id: 'canvas', label: 'خلفية الورقة' },
          ]}
        />

        <div className="mt-2">
          <FluentSettingRow
            label="لون مخصص"
            description={
              target === 'canvas'
                ? 'خلفية الورقة الحالية'
                : selectedElements.length > 0
                  ? `${selectedElements.length} عنصر محدد`
                  : 'لا عنصر محدد'
            }
            control={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFavorite(customColor)}
                  aria-pressed={favorites.includes(customColor.toLowerCase())}
                  aria-label="إضافة اللون المخصص للمفضلة"
                  className={cn(
                    'w-8 h-8 rounded-md border border-border/80 flex items-center justify-center transition-colors cursor-pointer',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    favorites.includes(customColor.toLowerCase())
                      ? 'text-primary bg-primary/10 border-primary/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                >
                  <Star
                    className="w-3.5 h-3.5"
                    weight={favorites.includes(customColor.toLowerCase()) ? 'fill' : 'regular'}
                  />
                </button>
                <PopoverColorPicker
                  swatchOnly
                  color={customColor}
                  onChange={(hex) => {
                    setCustomColor(hex);
                    applyColor(hex);
                  }}
                />
              </div>
            }
          />
        </div>
      </FluentSection>

      <FluentSection
        icon={<Sparkle className="w-3.5 h-3.5" weight="duotone" />}
        title="بالِتة الاستوديو"
        subtitle="ثمانية ألوان جاهزة"
      >
        <div className="grid grid-cols-8 gap-1.5">
          {STUDIO_PALETTE.map((item) => (
            <Tooltip key={item.color}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => applyColor(item.color)}
                  aria-label={item.label}
                  className={cn(
                    'aspect-square rounded-md border border-black/10 dark:border-white/15 transition-colors cursor-pointer shadow-2xs',
                    'before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none relative overflow-hidden',
                    'hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                  )}
                  style={{ backgroundColor: item.color }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-bold font-cairo">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </FluentSection>

      <FluentSection
        icon={<Palette className="w-3.5 h-3.5" weight="duotone" />}
        title="هويات جاهزة"
        subtitle="انقر أو وزّع"
      >
        <div className="flex flex-col gap-2">
          {IDENTITY_PALETTES.map((palette) => (
            <div
              key={palette.id}
              className="rounded-xl border border-border/70 bg-muted/20 p-2 flex items-center gap-2"
            >
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {palette.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyColor(color)}
                    aria-label={`${palette.name} ${color}`}
                    title={color}
                    className="flex-1 h-6 rounded-sm border border-black/10 dark:border-white/15 transition-colors cursor-pointer hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => distributePalette(palette)}
                disabled={selectedElements.length < 2}
                title={`توزيع هوية ${palette.name} على العناصر المحددة`}
                aria-label={`توزيع هوية ${palette.name}`}
                className="w-7 h-7 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ArrowsOutCardinal className="w-3.5 h-3.5" weight="bold" />
              </Button>
            </div>
          ))}
        </div>
      </FluentSection>

      <FluentSection
        icon={<Eyedropper className="w-3.5 h-3.5" weight="duotone" />}
        title="ألوان من صور التصميم"
        subtitle={
          imageSources.length > 0
            ? `${imageSources.length} صورة${selectedElements.some((el) => el.type === 'image') ? ' محددة' : ''}`
            : 'لا صور'
        }
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runExtraction}
          disabled={isExtracting || imageSources.length === 0}
          className="w-full justify-center"
        >
          <Eyedropper className="w-3.5 h-3.5" weight="bold" />
          {isExtracting ? 'جاري الاستخراج ...' : 'استخراج البالِتة'}
        </Button>

        {extracted.length > 0 ? (
          <div className="grid grid-cols-8 gap-1.5 mt-2">
            {extracted.map((color) => (
              <div key={color} className="relative group">
                <button
                  type="button"
                  onClick={() => applyColor(color)}
                  aria-label={`تطبيق ${color}`}
                  title={color}
                  className="w-full aspect-square rounded-md border border-black/10 dark:border-white/15 transition-colors cursor-pointer hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  style={{ backgroundColor: color }}
                />
                <button
                  type="button"
                  onClick={() => toggleFavorite(color)}
                  aria-label={`إضافة ${color} للمفضلة`}
                  className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-card border border-border text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <Star className="w-2.5 h-2.5" weight="fill" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-micro text-muted-foreground leading-relaxed mt-2 flex items-start gap-1.5">
            <Warning
              className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground"
              weight="duotone"
            />
            استخراج محلي بلا إرسال.
          </p>
        )}
      </FluentSection>

      <FluentSection
        icon={<Star className="w-3.5 h-3.5" weight="fill" />}
        title="المفضلة وآخر استخدام"
        subtitle={targetLabel}
        badge={favorites.length}
        action={
          favorites.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFavorites([]);
                writeStoredList(PREF_KEYS.favoriteColors, []);
              }}
              className="text-micro text-muted-foreground hover:text-foreground"
            >
              تفريغ
            </Button>
          ) : undefined
        }
      >
        {favorites.length === 0 && recents.length === 0 ? (
          <FluentEmptyState
            icon={<Star className="w-5 h-5" weight="duotone" />}
            title="لا ألوان محفوظة"
            description="نجّم لوناً للوصول السريع"
            actionLabel="احفظ المخصص"
            actionIcon={<Star className="w-3.5 h-3.5" weight="fill" />}
            onAction={() => toggleFavorite(customColor)}
          />
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="grid grid-cols-8 gap-1.5">
                {favorites.map((color) => (
                  <div key={`fav-${color}`} className="relative group">
                    <button
                      type="button"
                      onClick={() => applyColor(color)}
                      aria-label={`تطبيق ${color}`}
                      title={color}
                      className="w-full aspect-square rounded-md border border-border transition-colors cursor-pointer hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                      style={{ backgroundColor: color }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleFavorite(color)}
                      aria-label={`إزالة ${color} من المفضلة`}
                      className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-card border border-border text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Star className="w-2.5 h-2.5" weight="regular" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {recents.length > 0 && (
              <div className="mt-2">
                <span className="block text-micro font-semibold text-muted-foreground mb-1">
                  آخر استخدام
                </span>
                <div className="grid grid-cols-8 gap-1.5">
                  {recents.map((color) => (
                    <button
                      key={`recent-${color}`}
                      type="button"
                      onClick={() => applyColor(color)}
                      aria-label={`تطبيق ${color}`}
                      title={color}
                      className="aspect-square rounded-md border border-dashed border-border transition-colors cursor-pointer hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-mini text-muted-foreground mt-2">
          لون الورقة الحالي:{' '}
          <span className="font-mono" dir="ltr">
            {backgroundColor}
          </span>
        </p>
      </FluentSection>
    </div>
  );
}
