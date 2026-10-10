import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  Star,
  Eyedropper,
  Sparkle,
  ArrowsOutCardinal,
  Copy,
  Check,
  PaintBucket,
} from '@/components/ui/icons';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FluentSegmentedControl,
  FluentFilterChips,
  type FilterChipOption,
} from '@/components/ui/blocks';
import { PopoverColorPicker } from '@/components/editor/properties/shared-controls';
import { STUDIO_PALETTE } from '@/lib/canvas/canvas-colors';
import { colorPatchFor } from '@/lib/canvas/apply-color';
import {
  extractPaletteFromSources,
  buildColorHarmony,
  type ColorHarmonyKind,
} from '@/lib/canvas/palette-extract';
import {
  PREF_KEYS,
  pushStoredRecent,
  readStoredList,
  toggleStoredValue,
  writeStoredList,
} from '@/lib/local-prefs';
import {
  IDENTITY_PALETTES,
  type IdentityPalette,
  type PaletteCategory,
} from './freeform-panel-constants';

/* ═══════════════════════════════════════════════════════════════
   الألوان والهوية — تصميم رشيق، مضغوط، واحترافي بنمط استوديو Grido:
   - تحكم سريع بالوجهة واللون النشط في بطاقة علوية واحدة مدمجة.
   - ألوان الاستوديو القياسية في شريط فوري بنقرة واحدة.
   - هويات بصرية مصنفة ببطاقات مدمجة عالية الكثافة بلا هدر للمساحات.
   - تناغم لوني ذكي (OKLCH) واستخراج من الصور بأزرار رشيقة.
   ═══════════════════════════════════════════════════════════════ */

export type ColorTarget = 'element' | 'canvas';

const CATEGORY_CHIPS: FilterChipOption<PaletteCategory>[] = [
  { id: 'all', label: 'الكل' },
  { id: 'official', label: 'وثائق' },
  { id: 'studio', label: 'استوديو' },
  { id: 'business', label: 'أعمال' },
  { id: 'creative', label: 'إبداعي' },
];

const HARMONY_CHIPS: FilterChipOption<ColorHarmonyKind>[] = [
  { id: 'analogous', label: 'متماثل' },
  { id: 'complementary', label: 'مكمّل' },
  { id: 'triadic', label: 'ثلاثي' },
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
  const [selectedCategory, setSelectedCategory] = useState<PaletteCategory>('all');
  const [harmonyKind, setHarmonyKind] = useState<ColorHarmonyKind>('analogous');
  const [showHarmonies, setShowHarmonies] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteColors),
  );
  const [recents, setRecents] = useState<string[]>(() => readStoredList(PREF_KEYS.recentColors));
  const [extracted, setExtracted] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  // 🛡️ مؤقّت شارة «تم النسخ» — يُحفظ في ref ويُلغى عند إلغاء التركيب حتى لا
  // يُطلق setState على مكوّن مفكوك ويُعلّق الشارة إلى الأبد
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    },
    [],
  );

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

  // تصفية الهويات الجاهزة حسب الفئة
  const filteredPalettes = useMemo(() => {
    if (selectedCategory === 'all') return IDENTITY_PALETTES;
    return IDENTITY_PALETTES.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // التناغم اللوني المشتق من اللون النشط
  const harmonies = useMemo(() => {
    try {
      return buildColorHarmony(customColor, harmonyKind);
    } catch {
      return [customColor];
    }
  }, [customColor, harmonyKind]);

  const rememberRecent = useCallback((color: string) => {
    setRecents((previous) => {
      const next = pushStoredRecent(previous, color.toLowerCase());
      writeStoredList(PREF_KEYS.recentColors, next);
      return next;
    });
  }, []);

  const copyColorHex = useCallback(async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setCopiedColor(hex);
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        copiedTimerRef.current = null;
        setCopiedColor(null);
      }, 1200);
      toast.success(`تم نسخ ${hex.toUpperCase()}`);
    } catch {
      toast.info(hex.toUpperCase());
    }
  }, []);

  const applyColor = useCallback(
    (color: string) => {
      rememberRecent(color);
      setCustomColor(color);

      if (target === 'canvas') {
        setBackgroundColor(color);
        return;
      }

      if (selectedElements.length === 0) {
        toast.info('حدّد عنصراً أو بدّل الوجهة لخلفية الورقة');
        return;
      }

      updateElements(
        selectedElements.map((element) => ({
          id: element.id,
          patch: colorPatchFor(element, color),
        })),
      );
    },
    [target, selectedElements, rememberRecent, setBackgroundColor, updateElements],
  );

  /** توزيع درجات الهوية على العناصر المحددة */
  const distributePalette = useCallback(
    (palette: IdentityPalette) => {
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
      toast.success(`توزيع «${palette.name}» على ${selectedElements.length} عناصر`);
    },
    [selectedElements, updateElements, rememberRecent],
  );

  /** تطبيق لون خلفية الهوية على الورقة */
  const applyPaletteBg = useCallback(
    (palette: IdentityPalette) => {
      const bg = palette.colors[palette.colors.length - 1];
      setBackgroundColor(bg);
      rememberRecent(bg);
      toast.success(`خلفية «${palette.name}» للورقة`);
    },
    [setBackgroundColor, rememberRecent],
  );

  /** توزيع التناغم اللوني على العناصر المحددة */
  const distributeHarmony = useCallback(() => {
    if (selectedElements.length < 2) {
      toast.info('حدّد عنصرين لتوزيع التناغم');
      return;
    }
    updateElements(
      selectedElements.map((element, index) => ({
        id: element.id,
        patch: colorPatchFor(element, harmonies[index % harmonies.length]),
      })),
    );
    toast.success(`توزيع التناغم على ${selectedElements.length} عناصر`);
  }, [selectedElements, harmonies, updateElements]);

  const toggleFavorite = useCallback((color: string) => {
    setFavorites((previous) => {
      const next = toggleStoredValue(previous, color.toLowerCase());
      writeStoredList(PREF_KEYS.favoriteColors, next);
      return next;
    });
  }, []);

  const runExtraction = useCallback(async () => {
    if (imageSources.length === 0) {
      toast.info('لا توجد صور في الكانفاس');
      return;
    }
    setIsExtracting(true);
    try {
      const palette = await extractPaletteFromSources(imageSources, 8);
      setExtracted(palette);
      if (palette.length > 0) {
        toast.success(`تم استخراج ${palette.length} ألوان`);
      }
    } finally {
      setIsExtracting(false);
    }
  }, [imageSources]);

  return (
    <div className="space-y-2 font-cairo animate-in fade-in duration-150" dir="rtl">
      {/* 🎛️ 1. بطاقة التحكم المدمجة بالوجهة واللون النشط */}
      <div className="p-2 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular space-y-2">
        {/* مبدل الوجهة السريع مع مؤشر اللون النشط وأزراره في سطر واحد */}
        <div className="flex items-center justify-between gap-1.5">
          <FluentSegmentedControl<ColorTarget>
            value={target}
            onChange={setTarget}
            layoutId="palette-target-compact"
            size="sm"
            className="flex-1"
            options={[
              {
                id: 'element',
                label: selectedElements.length > 0 ? `عنصر (${selectedElements.length})` : 'عنصر',
              },
              { id: 'canvas', label: 'ورقة' },
            ]}
          />

          {/* منتقي اللون وكود الـ HEX وزر المفضلة والنسخ في كبسولة مدمجة */}
          <div className="flex items-center gap-1 shrink-0 bg-muted/60 p-0.5 rounded-lg border border-border/50">
            <PopoverColorPicker
              swatchOnly
              color={customColor}
              onChange={(hex) => {
                setCustomColor(hex);
                applyColor(hex);
              }}
              className="w-6 h-6 rounded-md shadow-none border-0"
              ariaLabel="لون مخصص"
            />
            <span className="font-mono font-bold text-micro text-foreground px-1 uppercase select-all">
              {customColor}
            </span>

            {/* زر نسخ الـ HEX */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => copyColorHex(customColor)}
                  aria-label="نسخ كود اللون"
                  className="w-5 h-5 rounded hover:bg-card text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  {copiedColor === customColor ? (
                    <Check className="w-2.5 h-2.5 text-success" weight="bold" />
                  ) : (
                    <Copy className="w-2.5 h-2.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-cairo">
                نسخ
              </TooltipContent>
            </Tooltip>

            {/* زر المفضلة */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggleFavorite(customColor)}
                  aria-pressed={favorites.includes(customColor.toLowerCase())}
                  aria-label="إضافة للمفضلة"
                  className={cn(
                    'w-5 h-5 rounded flex items-center justify-center transition-colors cursor-pointer',
                    favorites.includes(customColor.toLowerCase())
                      ? 'text-warning'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card',
                  )}
                >
                  <Star
                    className="w-3 h-3"
                    weight={favorites.includes(customColor.toLowerCase()) ? 'fill' : 'regular'}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-cairo">
                {favorites.includes(customColor.toLowerCase()) ? 'مفضل' : 'تفضيل'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* شريط عينات الاستوديو القياسية السريعة (Studio Essentials) */}
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40">
          <div className="flex items-center gap-1 flex-1">
            {STUDIO_PALETTE.map((item) => (
              <Tooltip key={item.color}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => applyColor(item.color)}
                    aria-label={item.label}
                    className="flex-1 h-5 rounded border border-black/10 dark:border-white/15 transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs relative overflow-hidden"
                    style={{ backgroundColor: item.color }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-cairo">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* أزرار الإجراءات المدمجة: التناغم واستخراج الألوان */}
          <div className="flex items-center gap-0.5 shrink-0 border-e border-border/40 pe-1">
            {/* زر فتح التناغم اللوني الذكي */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowHarmonies(!showHarmonies)}
                  aria-label="تناغم لوني"
                  aria-pressed={showHarmonies}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer text-xs',
                    showHarmonies
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Sparkle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-cairo">
                تناغم لوني ذكي (OKLCH)
              </TooltipContent>
            </Tooltip>

            {/* زر استخراج من الصور إن وُجدت */}
            {imageSources.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={runExtraction}
                    disabled={isExtracting}
                    aria-label="استخراج ألوان الهوية من الصور"
                    className="w-6 h-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Eyedropper className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-cairo">
                  {isExtracting ? 'جاري الاستخراج ...' : 'استخراج ألوان الهوية من الصور'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 🌈 كبسولة التناغم اللوني الذكي القابلة للفتح السريع */}
        {showHarmonies && (
          <div className="pt-1.5 border-t border-border/40 space-y-1.5 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between gap-1">
              <FluentFilterChips<ColorHarmonyKind>
                layoutId="harmony-compact-chips"
                value={harmonyKind}
                onChange={setHarmonyKind}
                size="sm"
                className="flex-1"
                options={HARMONY_CHIPS}
              />
              {selectedElements.length >= 2 && (
                <button
                  type="button"
                  onClick={distributeHarmony}
                  className="text-micro font-bold text-primary hover:underline px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                >
                  توزيع
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 p-0.5 bg-muted/40">
              {harmonies.map((color, index) => (
                <Tooltip key={`${color}-${index}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => applyColor(color)}
                      aria-label={`تطبيق ${color}`}
                      className="flex-1 h-5 rounded border border-black/10 dark:border-white/15 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    {color.toUpperCase()}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}

        {/* 📷 شريط الألوان المستخرجة من الصور إذا تم استخراجها */}
        {extracted.length > 0 && (
          <div className="pt-1.5 border-t border-border/40 space-y-1 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between text-micro text-muted-foreground">
              <span>ألوان مستخرجة من التصميم</span>
              {selectedElements.length >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    updateElements(
                      selectedElements.map((el, idx) => ({
                        id: el.id,
                        patch: colorPatchFor(el, extracted[idx % extracted.length]),
                      })),
                    );
                    toast.success('تم توزيع الألوان المستخرجة');
                  }}
                  className="font-bold text-primary hover:underline cursor-pointer"
                >
                  توزيع
                </button>
              )}
            </div>
            <div className="grid grid-cols-8 gap-1">
              {extracted.map((color) => (
                <Tooltip key={color}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => applyColor(color)}
                      aria-label={`تطبيق ${color}`}
                      className="aspect-square rounded border border-black/10 dark:border-white/15 transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs"
                      style={{ backgroundColor: color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    {color.toUpperCase()}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🧭 2. كبسولات تصفية فئات الهويات */}
      <FluentFilterChips<PaletteCategory>
        layoutId="palette-category-chips-compact"
        value={selectedCategory}
        onChange={setSelectedCategory}
        size="sm"
        className="w-full justify-between"
        options={CATEGORY_CHIPS}
      />

      {/* 🏛️ 3. قائمة الهويات البصرية المدمجة والرشيقة */}
      <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pe-1 ps-0.5 custom-scrollbar">
        {filteredPalettes.map((palette) => (
          <div
            key={palette.id}
            className="p-2 rounded-lg bg-card/50 hover:bg-card border border-border/60 hover:border-foreground/20 transition-all select-none group space-y-1.5 shadow-2xs"
          >
            {/* معلومات الهوية وأزرار الإجراءات السريعة */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-bold text-foreground truncate">{palette.name}</span>
                <span className="text-3xs px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/40 shrink-0 font-medium">
                  {palette.categoryLabel}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                {/* زر تطبيق خلفية الهوية */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => applyPaletteBg(palette)}
                      aria-label={`تطبيق خلفية ${palette.name}`}
                      className="w-5 h-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <PaintBucket className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    تطبيق كخلفية للورقة
                  </TooltipContent>
                </Tooltip>

                {/* زر توزيع الهوية على العناصر */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => distributePalette(palette)}
                      disabled={selectedElements.length < 2}
                      aria-label={`توزيع ${palette.name}`}
                      className="w-5 h-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ArrowsOutCardinal className="w-3 h-3" weight="bold" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-cairo">
                    توزيع الهوية على العناصر
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* شريط عينات الهوية المتصل والمضغوط */}
            <div className="flex items-center rounded-md overflow-hidden border border-black/10 dark:border-white/15 h-5 shadow-2xs">
              {palette.colors.map((color, idx) => {
                const roleName = palette.roles[idx] || `لون ${idx + 1}`;
                return (
                  <Tooltip key={`${palette.id}-${color}-${idx}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => applyColor(color)}
                        aria-label={`${roleName}: ${color}`}
                        className="flex-1 h-full transition-all cursor-pointer hover:brightness-110 active:scale-95 focus-visible:ring-1 focus-visible:ring-primary focus-visible:z-10 focus-visible:outline-none"
                        style={{ backgroundColor: color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs font-cairo text-center">
                      <div className="font-bold">{roleName}</div>
                      <div className="text-3xs font-mono text-muted-foreground">
                        {color.toUpperCase()}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ⭐ 4. شريط الألوان المفضلة المدمج أسفل القائمة */}
      {favorites.length > 0 && (
        <div className="p-1.5 rounded-lg bg-card/40 border border-border/50 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar flex-1 py-0.5">
            {favorites.slice(0, 10).map((color) => (
              <Tooltip key={`fav-${color}`}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => applyColor(color)}
                    aria-label={`تطبيق ${color}`}
                    className="w-5 h-5 rounded border border-border shrink-0 transition-transform hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: color }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs font-cairo">
                  {color.toUpperCase()}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setFavorites([]);
              writeStoredList(PREF_KEYS.favoriteColors, []);
            }}
            className="text-micro text-muted-foreground hover:text-foreground shrink-0 px-1 cursor-pointer"
          >
            مسح
          </button>
        </div>
      )}
    </div>
  );
}
