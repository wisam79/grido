import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MagnifyingGlass, Star, TextAa, X } from "@phosphor-icons/react";
import {
  ARABIC_FONTS,
  FONT_CATEGORIES,
  loadGoogleFont,
  type FontCategory,
  type FontOption,
} from "@/lib/io/fonts";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  FluentEmptyState,
  FluentFilterChips,
  FluentSection,
} from "@/components/ui/blocks";
import {
  DEFAULT_FAVORITE_FONTS,
  PREF_KEYS,
  pushStoredRecent,
  readStoredList,
  toggleStoredValue,
  writeStoredList,
} from "@/lib/local-prefs";

/* ═══════════════════════════════════════════════════════════════
   مكتبة الخطوط العربية — تصفّح ومعاينة حيّة وتطبيق مباشر.
   التطبيق يتبع التحديد: نص/نصوص محددة تُحدَّث، وإن لم يوجد نص
   مُحدد يُضاف نص جديد بالخط المختار فلا ينتهي النقر بلا أثر.
   ═══════════════════════════════════════════════════════════════ */

const PREVIEW_FALLBACK = "أبجد هوز حطي كلمن سعفص ١٢٣";

export function FreeformFontsTab() {
  const { elements, selectedIds, updateElements, updateElement, addTextElement } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      updateElements: state.updateElements,
      updateElement: state.updateElement,
      addTextElement: state.addTextElement,
    }))
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FontCategory>("all");
  const [previewText, setPreviewText] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteFonts, DEFAULT_FAVORITE_FONTS)
  );

  const previewSample = previewText.trim() || PREVIEW_FALLBACK;

  const selectedTexts = useMemo(
    () => elements.filter((element) => element.type === "text" && selectedIds.includes(element.id)),
    [elements, selectedIds]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<FontCategory, number>();
    for (const font of ARABIC_FONTS) {
      counts.set(font.category, (counts.get(font.category) ?? 0) + 1);
    }
    return counts;
  }, []);

  const visibleFonts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ARABIC_FONTS.filter((font) => {
      if (category !== "all" && font.category !== category) return false;
      if (!query) return true;
      return (
        font.arabicName.includes(query) ||
        font.englishName.toLowerCase().includes(query) ||
        font.name.toLowerCase().includes(query)
      );
    });
  }, [search, category]);

  const favoriteFonts = useMemo(
    () => favorites.map((id) => ARABIC_FONTS.find((font) => font.id === id)).filter(Boolean) as FontOption[],
    [favorites]
  );

  const rememberRecent = (fontId: string) => {
    writeStoredList(
      PREF_KEYS.recentFonts,
      pushStoredRecent(readStoredList(PREF_KEYS.recentFonts), fontId)
    );
  };

  const applyFont = (font: FontOption) => {
    loadGoogleFont(font.family);
    rememberRecent(font.id);

    if (selectedTexts.length > 0) {
      updateElements(
        selectedTexts.map((element) => ({ id: element.id, patch: { fontFamily: font.family } }))
      );
      toast.success(
        selectedTexts.length === 1
          ? `تم تطبيق خط «${font.arabicName}»`
          : `تم تطبيق خط «${font.arabicName}» على ${selectedTexts.length} نصوص`
      );
      return;
    }

    addTextElement();
    const newId = useEditorStore.getState().selectedId;
    if (newId) updateElement(newId, { fontFamily: font.family });
    toast.success(`أُضيف نص جديد بخط «${font.arabicName}»`);
  };

  const toggleFavorite = (fontId: string) => {
    setFavorites((previous) => {
      const next = toggleStoredValue(previous, fontId);
      writeStoredList(PREF_KEYS.favoriteFonts, next);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 font-cairo animate-in fade-in duration-200" dir="rtl">
      <FluentSection
        icon={<MagnifyingGlass className="w-3.5 h-3.5" weight="duotone" />}
        title="البحث والتصنيف"
        subtitle={`${ARABIC_FONTS.length} خط عربي متاح`}
      >
        <div className="relative">
          <MagnifyingGlass
            className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
            weight="bold"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الخط…"
            aria-label="بحث في الخطوط"
            className="h-8 ps-8 pe-8 text-xs rounded-md bg-input/50 border-border"
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
              className="absolute end-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <X className="w-3 h-3" weight="bold" />
            </button>
          )}
        </div>

        <FluentFilterChips<FontCategory>
          value={category}
          onChange={setCategory}
          layoutId="fonts-category-chips"
          className="mt-1.5"
          options={FONT_CATEGORIES.map((item) => ({
            id: item.id,
            label: item.name,
            count: item.id === "all" ? ARABIC_FONTS.length : (categoryCounts.get(item.id) ?? 0),
          }))}
        />

        <div className="mt-2">
          <label
            htmlFor="fonts-preview-text"
            className="block text-micro font-semibold text-muted-foreground mb-1"
          >
            نص المعاينة
          </label>
          <Input
            id="fonts-preview-text"
            value={previewText}
            onChange={(event) => setPreviewText(event.target.value)}
            placeholder={PREVIEW_FALLBACK}
            className="h-8 text-xs rounded-md bg-input/50 border-border"
            dir="rtl"
          />
        </div>
      </FluentSection>

      {favoriteFonts.length > 0 && (
        <FluentSection
          icon={<Star className="w-3.5 h-3.5" weight="fill" />}
          title="المفضلة"
          subtitle="انقر للنسخ على المحدد"
          badge={favoriteFonts.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {favoriteFonts.map((font) => (
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
        </FluentSection>
      )}

      <FluentSection
        icon={<TextAa className="w-3.5 h-3.5" weight="duotone" />}
        title="كل الخطوط"
        subtitle={
          selectedTexts.length > 0
            ? `سيُطبَّق على ${selectedTexts.length} نص محدد`
            : "لا يوجد نص محدد — سيُضاف نص جديد"
        }
        badge={visibleFonts.length}
      >
        {visibleFonts.length === 0 ? (
          <FluentEmptyState
            icon={<MagnifyingGlass className="w-5 h-5" weight="duotone" />}
            title="لا خطوط مطابقة"
            description="جرّب كلمة أخرى أو اختر تصنيفاً مختلفاً"
            actionLabel="مسح الفلاتر"
            onAction={() => {
              setSearch("");
              setCategory("all");
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {visibleFonts.map((font) => {
              const isFavorite = favorites.includes(font.id);
              return (
                <div key={font.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => applyFont(font)}
                    title={`تطبيق ${font.name}`}
                    className="w-full text-start p-2 pe-6 rounded-xl border border-border/80 bg-card hover:border-primary/60 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    <span
                      className="block text-xs font-bold text-foreground truncate"
                      style={{ fontFamily: font.family }}
                    >
                      {font.arabicName}
                    </span>
                    <span
                      className="block text-micro text-muted-foreground truncate mt-0.5"
                      style={{ fontFamily: font.family }}
                      dir="auto"
                    >
                      {previewSample}
                    </span>
                    <span className="block text-mini text-muted-foreground/70 truncate mt-0.5">
                      {font.isOffline ? "مضمّن أوفلاين" : "يُحمَّل عند الاستخدام"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(font.id)}
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? `إزالة ${font.arabicName} من المفضلة` : `إضافة ${font.arabicName} للمفضلة`}
                    className={cn(
                      "absolute top-1.5 end-1.5 w-6 h-6 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                      isFavorite
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/70"
                    )}
                  >
                    <Star className="w-3.5 h-3.5" weight={isFavorite ? "fill" : "regular"} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </FluentSection>
    </div>
  );
}
