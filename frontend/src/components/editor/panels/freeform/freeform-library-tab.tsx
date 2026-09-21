import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Star,
  ClockCounterClockwise,
  TextAa,
  Palette,
  Shapes,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  FluentEmptyState,
  FluentFilterChips,
  FluentSection,
  FluentSegmentedControl,
} from "@/components/ui/blocks";
import {
  ARABIC_FONTS,
  loadGoogleFont,
  type FontOption,
} from "@/lib/io/fonts";
import { colorPatchFor } from "@/lib/canvas/apply-color";
import { QUICK_SHAPES, QUICK_TEXT_PRESETS } from "./freeform-panel-constants";
import {
  elementPrefKey,
  parseElementPrefKey,
  PREF_KEYS,
  pushStoredRecent,
  readStoredList,
  toggleStoredValue,
  writeStoredList,
} from "@/lib/local-prefs";

/* ═══════════════════════════════════════════════════════════════
   المفضلة وآخر استخدام — وصول سريع لما يستخدمه المستخدم فعلاً.
   يجمع ما تفرّق بين الأدوات (خطوط، ألوان، أشكال ونصوص) في لوحة
   واحدة، فلا يحتاج التنقل بين أربع أدوات لإعادة استخدام نفس العنصر.
   ═══════════════════════════════════════════════════════════════ */

type ColorTarget = "element" | "canvas";
type ItemFilter = "all" | "shape" | "text";

interface LibraryItem {
  key: string;
  kind: "shape" | "text";
  id: string;
  label: string;
  detail: string;
  preview: ReactNode;
}

export function FreeformLibraryTab() {
  const {
    elements,
    selectedIds,
    updateElement,
    updateElements,
    addTextElement,
    addShapeElement,
    addTextPreset,
    setBackgroundColor,
    backgroundColor,
  } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      updateElement: state.updateElement,
      updateElements: state.updateElements,
      addTextElement: state.addTextElement,
      addShapeElement: state.addShapeElement,
      addTextPreset: state.addTextPreset,
      setBackgroundColor: state.setBackgroundColor,
      backgroundColor: state.backgroundColor,
    }))
  );

  const [colorTarget, setColorTarget] = useState<ColorTarget>("element");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");

  const [favoriteFonts, setFavoriteFonts] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteFonts)
  );
  const [favoriteColors, setFavoriteColors] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteColors)
  );
  const [favoriteShapes, setFavoriteShapes] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteShapes)
  );
  const [favoriteTextPresets, setFavoriteTextPresets] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteTextPresets)
  );
  const [recentItems, setRecentItems] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.recentItems)
  );

  const selectedElements = useMemo(
    () => elements.filter((element) => selectedIds.includes(element.id)),
    [elements, selectedIds]
  );
  const selectedTexts = useMemo(
    () => selectedElements.filter((element) => element.type === "text"),
    [selectedElements]
  );

  const allItems = useMemo<LibraryItem[]>(
    () => [
      ...QUICK_SHAPES.map((shape) => ({
        key: elementPrefKey("shape", shape.id),
        kind: "shape" as const,
        id: shape.id,
        label: shape.label,
        detail: "شكل هندسي",
        preview: (
          <span
            className={cn(
              "block w-4 h-4 border border-black/10 dark:border-white/20",
              shape.shape === "ellipse" ? "rounded-full" : "rounded-sm"
            )}
            style={{ backgroundColor: shape.color ?? "#2563eb" }}
          />
        ),
      })),
      ...QUICK_TEXT_PRESETS.map((preset) => ({
        key: elementPrefKey("text", preset.id),
        kind: "text" as const,
        id: preset.id,
        label: preset.label,
        detail: preset.description,
        preview: (
          <span className="text-micro font-bold" style={{ color: preset.previewColor }}>
            {preset.sampleText ?? preset.label}
          </span>
        ),
      })),
    ],
    []
  );

  const itemByKey = useMemo(
    () => new Map(allItems.map((item) => [item.key, item])),
    [allItems]
  );

  const isFavoriteItem = useCallback(
    (item: LibraryItem) =>
      item.kind === "shape"
        ? favoriteShapes.includes(item.id)
        : favoriteTextPresets.includes(item.id),
    [favoriteShapes, favoriteTextPresets]
  );

  const favorites = useMemo(() => allItems.filter(isFavoriteItem), [allItems, isFavoriteItem]);

  const recentEntries = useMemo(
    () => recentItems.map(parseElementPrefKey).filter(Boolean) as { kind: "shape" | "text"; id: string }[],
    [recentItems]
  );

  // المفضلة أولاً دائماً، ثم بقية العناصر بترتيبها الأصلي
  const visibleItems = useMemo(() => {
    const pool = itemFilter === "all" ? allItems : allItems.filter((item) => item.kind === itemFilter);
    return [...pool.filter(isFavoriteItem), ...pool.filter((item) => !isFavoriteItem(item))];
  }, [allItems, itemFilter, isFavoriteItem]);

  const favoriteFontOptions = useMemo(
    () =>
      favoriteFonts
        .map((id) => ARABIC_FONTS.find((font) => font.id === id))
        .filter(Boolean) as FontOption[],
    [favoriteFonts]
  );

  /* ── الإجراءات ───────────────────────────────────────────── */

  const rememberItem = (key: string) => {
    setRecentItems((previous) => {
      const next = pushStoredRecent(previous, key);
      writeStoredList(PREF_KEYS.recentItems, next);
      return next;
    });
  };

  const addItem = (item: LibraryItem) => {
    if (item.kind === "shape") {
      const shape = QUICK_SHAPES.find((entry) => entry.id === item.id);
      if (!shape) return;
      addShapeElement(shape.shape, shape.svgPath);
    } else {
      addTextPreset(item.id as (typeof QUICK_TEXT_PRESETS)[number]["id"]);
    }
    rememberItem(item.key);
    toast.success(`تمت إضافة ${item.label}`);
  };

  const toggleItemFavorite = (item: LibraryItem) => {
    if (item.kind === "shape") {
      setFavoriteShapes((previous) => {
        const next = toggleStoredValue(previous, item.id);
        writeStoredList(PREF_KEYS.favoriteShapes, next);
        return next;
      });
      return;
    }
    setFavoriteTextPresets((previous) => {
      const next = toggleStoredValue(previous, item.id);
      writeStoredList(PREF_KEYS.favoriteTextPresets, next);
      return next;
    });
  };

  const applyFont = (font: FontOption) => {
    loadGoogleFont(font.family);
    writeStoredList(
      PREF_KEYS.recentFonts,
      pushStoredRecent(readStoredList(PREF_KEYS.recentFonts), font.id)
    );

    if (selectedTexts.length > 0) {
      updateElements(
        selectedTexts.map((element) => ({ id: element.id, patch: { fontFamily: font.family } }))
      );
      toast.success(`تم تطبيق خط «${font.arabicName}»`);
      return;
    }

    addTextElement();
    const newId = useEditorStore.getState().selectedId;
    if (newId) updateElement(newId, { fontFamily: font.family });
    toast.success(`أُضيف نص جديد بخط «${font.arabicName}»`);
  };

  const applyColor = (color: string) => {
    writeStoredList(
      PREF_KEYS.recentColors,
      pushStoredRecent(readStoredList(PREF_KEYS.recentColors), color.toLowerCase())
    );

    if (colorTarget === "canvas") {
      setBackgroundColor(color);
      toast.success("تم تحديث خلفية الورقة");
      return;
    }

    if (selectedElements.length === 0) {
      toast.info("لا عنصر محدد — اختر «خلفية الورقة» أو حدّد عنصراً على الكانفاس");
      return;
    }

    updateElements(selectedElements.map((element) => ({ id: element.id, patch: colorPatchFor(element, color) })));
    toast.success(
      selectedElements.length === 1
        ? "تم تطبيق اللون على العنصر المحدد"
        : `تم تطبيق اللون على ${selectedElements.length} عناصر`
    );
  };

  const clearAll = () => {
    setFavoriteFonts([]);
    setFavoriteColors([]);
    setFavoriteShapes([]);
    setFavoriteTextPresets([]);
    setRecentItems([]);
    for (const key of Object.values(PREF_KEYS)) writeStoredList(key, []);
    toast.success("تم تفريغ المفضلة وآخر استخدام");
  };

  const totalFavorites =
    favoriteFonts.length + favoriteColors.length + favoriteShapes.length + favoriteTextPresets.length;

  return (
    <div className="flex flex-col gap-2.5 font-cairo animate-in fade-in duration-200" dir="rtl">
      {/* آخر استخدام — أنواع مختلفة (أشكال/نصوص/خطوط/ألوان) في شريط واحد */}
      <FluentSection
        icon={<ClockCounterClockwise className="w-4 h-4" weight="duotone" />}
        title="آخر استخدام"
        subtitle="أحدث ما أضفته أو طبّقته"
        badge={recentEntries.length}
      >
        {recentEntries.length === 0 ? (
          <FluentEmptyState
            icon={<ClockCounterClockwise className="w-6 h-6" weight="duotone" />}
            title="لا سجل استخدام بعد"
            description="كل عنصر تضيفه من هذه اللوحة أو من أدوات الخطوط والألوان يظهر هنا"
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {recentEntries.map(({ kind, id }) => {
              const item = itemByKey.get(elementPrefKey(kind, id));
              if (!item) return null;
              return (
                <Button
                  key={`recent-${item.key}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addItem(item)}
                  title={`إعادة إضافة ${item.label}`}
                >
                  {item.preview}
                  <span className="truncate">{item.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </FluentSection>

      {/* عناصر سريعة: أشكال ونصوص جاهزة مع تثبيت المفضلة في الأعلى */}
      <FluentSection
        icon={<Shapes className="w-4 h-4" weight="duotone" />}
        title="عناصر سريعة"
        subtitle={favorites.length > 0 ? `${favorites.length} مفضلة مثبّتة في الأعلى` : "انقر للنجمة لتثبيت الأكثر استخداماً"}
        badge={allItems.length}
      >
        <FluentFilterChips<ItemFilter>
          value={itemFilter}
          onChange={setItemFilter}
          layoutId="library-item-filter"
          options={[
            { id: "all", label: "الكل", count: allItems.length },
            { id: "shape", label: "أشكال", count: QUICK_SHAPES.length },
            { id: "text", label: "نصوص", count: QUICK_TEXT_PRESETS.length },
          ]}
        />

        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {visibleItems.map((item) => {
            const isFavorite = isFavoriteItem(item);
            return (
              <div key={item.key} className="relative group">
                <button
                  type="button"
                  onClick={() => addItem(item)}
                  title={`إضافة ${item.label}`}
                  className="w-full text-start p-2 pe-7 rounded-xl border border-border/80 bg-card hover:border-primary/60 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    {item.preview}
                    <span className="text-xs font-bold text-foreground truncate">{item.label}</span>
                  </span>
                  <span className="block text-mini text-muted-foreground truncate mt-0.5">
                    {item.detail}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleItemFavorite(item)}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? `إزالة ${item.label} من المفضلة` : `إضافة ${item.label} للمفضلة`}
                  className={cn(
                    "absolute top-1 end-1 w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                    isFavorite
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70"
                  )}
                >
                  <Star className="w-4 h-4" weight={isFavorite ? "fill" : "regular"} />
                </button>
              </div>
            );
          })}
        </div>
      </FluentSection>

      {/* الخطوط المفضلة */}
      <FluentSection
        icon={<TextAa className="w-4 h-4" weight="duotone" />}
        title="الخطوط المفضلة"
        subtitle={
          selectedTexts.length > 0
            ? `سيُطبَّق على ${selectedTexts.length} نص محدد`
            : "لا نص محدد — سيُضاف نص جديد"
        }
        badge={favoriteFontOptions.length}
      >
        {favoriteFontOptions.length === 0 ? (
          <FluentEmptyState
            icon={<TextAa className="w-6 h-6" weight="duotone" />}
            title="لا خطوط مفضلة"
            description="نجّم أياً من الخطوط في «مكتبة الخطوط» ليظهر هنا"
          />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {favoriteFontOptions.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => applyFont(font)}
                title={`تطبيق ${font.arabicName}`}
                className="px-2 h-7 rounded-md border border-border/80 bg-card hover:border-primary/60 hover:bg-muted/50 transition-colors cursor-pointer text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                style={{ fontFamily: font.family }}
              >
                {font.arabicName}
              </button>
            ))}
          </div>
        )}
      </FluentSection>

      {/* الألوان المفضلة + آخر استخدام */}
      <FluentSection
        icon={<Palette className="w-4 h-4" weight="duotone" />}
        title="الألوان المحفوظة"
        subtitle={colorTarget === "canvas" ? "تُطبَّق على خلفية الورقة" : "تُطبَّق على العناصر المحددة"}
        badge={favoriteColors.length}
        action={
          totalFavorites > 0 || recentItems.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-micro text-muted-foreground hover:text-foreground"
            >
              تفريغ الكل
            </Button>
          ) : undefined
        }
      >
        <FluentSegmentedControl<ColorTarget>
          value={colorTarget}
          onChange={setColorTarget}
          layoutId="library-color-target"
          options={[
            { id: "element", label: "العنصر المحدد" },
            { id: "canvas", label: "خلفية الورقة" },
          ]}
        />

        {favoriteColors.length === 0 ? (
          <div className="mt-2">
            <FluentEmptyState
              icon={<Palette className="w-6 h-6" weight="duotone" />}
              title="لا ألوان محفوظة"
              description="نجّم أي لون في «الألوان والهوية» ليصل هنا"
            />
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1.5 mt-2">
            {favoriteColors.map((color) => (
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
                  onClick={() =>
                    setFavoriteColors((previous) => {
                      const next = toggleStoredValue(previous, color);
                      writeStoredList(PREF_KEYS.favoriteColors, next);
                      return next;
                    })
                  }
                  aria-label={`إزالة ${color} من المفضلة`}
                  className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-card border border-border text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <Star className="w-2.5 h-2.5" weight="regular" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-mini text-muted-foreground mt-2">
          لون الورقة الحالي:{" "}
          <span className="font-mono" dir="ltr">
            {backgroundColor}
          </span>
        </p>
      </FluentSection>
    </div>
  );
}
