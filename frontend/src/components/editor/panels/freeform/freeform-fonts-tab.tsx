import { useMemo, useState } from 'react';
import { MagnifyingGlass, Star, X } from '@/components/ui/icons';
import { ARABIC_FONTS, loadGoogleFont, type FontOption } from '@/lib/io/fonts';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_FAVORITE_FONTS,
  PREF_KEYS,
  pushStoredRecent,
  readStoredList,
  toggleStoredValue,
  writeStoredList,
} from '@/lib/local-prefs';

/* ═══════════════════════════════════════════════════════════════
   مكتبة الخطوط — تصميم رشيق، بسيط، ومباشر بنمط استوديو احترافي:
   - بدون تصنيفات أو عناوين متداخلة أو حقول زائدة.
   - بطاقات رشيقة ومرتبة تعرض اسم الخط وعينة رسمه الحقيقية بوضوح.
   - بحث فوري مع خيار فلترة المفضلة بنقرة واحدة.
   ═══════════════════════════════════════════════════════════════ */

export function FreeformFontsTab() {
  const { elements, selectedIds, updateElements, updateElement, addTextElement } = useEditorStore(
    useShallow((state) => ({
      elements: state.elements,
      selectedIds: state.selectedIds,
      updateElements: state.updateElements,
      updateElement: state.updateElement,
      addTextElement: state.addTextElement,
    })),
  );

  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStoredList(PREF_KEYS.favoriteFonts, DEFAULT_FAVORITE_FONTS),
  );

  const selectedTexts = useMemo(
    () => elements.filter((element) => element.type === 'text' && selectedIds.includes(element.id)),
    [elements, selectedIds],
  );

  const currentAppliedFontFamily = useMemo(() => {
    if (selectedTexts.length === 0) return null;
    const textElem = selectedTexts[0] as { fontFamily?: string };
    return textElem.fontFamily ?? null;
  }, [selectedTexts]);

  const visibleFonts = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = ARABIC_FONTS;

    if (onlyFavorites) {
      list = list.filter((font) => favorites.includes(font.id));
    }

    if (query) {
      list = list.filter(
        (font) =>
          font.arabicName.toLowerCase().includes(query) ||
          font.englishName.toLowerCase().includes(query) ||
          font.name.toLowerCase().includes(query),
      );
    }

    // وضع المفضلة في المقدمة دائماً لتسهيل الوصول السريع
    if (!onlyFavorites && !query) {
      return [
        ...list.filter((f) => favorites.includes(f.id)),
        ...list.filter((f) => !favorites.includes(f.id)),
      ];
    }

    return list;
  }, [search, onlyFavorites, favorites]);

  const rememberRecent = (fontId: string) => {
    writeStoredList(
      PREF_KEYS.recentFonts,
      pushStoredRecent(readStoredList(PREF_KEYS.recentFonts), fontId),
    );
  };

  const applyFont = (font: FontOption) => {
    loadGoogleFont(font.family);
    rememberRecent(font.id);

    if (selectedTexts.length > 0) {
      updateElements(
        selectedTexts.map((element) => ({ id: element.id, patch: { fontFamily: font.family } })),
      );
      return;
    }

    addTextElement();
    const newId = useEditorStore.getState().selectedId;
    if (newId) updateElement(newId, { fontFamily: font.family });
  };

  const toggleFavorite = (fontId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavorites((previous) => {
      const next = toggleStoredValue(previous, fontId);
      writeStoredList(PREF_KEYS.favoriteFonts, next);
      return next;
    });
  };

  const isCurrentFont = (font: FontOption) => {
    if (!currentAppliedFontFamily) return false;
    return (
      currentAppliedFontFamily === font.family ||
      currentAppliedFontFamily.toLowerCase().startsWith(font.englishName.toLowerCase()) ||
      font.family.toLowerCase().includes(currentAppliedFontFamily.toLowerCase())
    );
  };

  return (
    <div className="flex flex-col gap-2 font-cairo select-none" dir="rtl">
      {/* ── شريط البحث المبسط مع زر المفضلة ──────────────────────── */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none"
            weight="bold"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الخطوط…"
            aria-label="بحث في الخطوط"
            className="h-8 ps-8 pe-7 text-xs rounded-lg bg-card border-border/80 hover:border-foreground/30 focus-visible:ring-1 focus-visible:ring-primary shadow-2xs transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* فلترة المفضلة بنقرة واحدة */}
        <button
          type="button"
          onClick={() => setOnlyFavorites((prev) => !prev)}
          title={onlyFavorites ? 'عرض جميع الخطوط' : 'عرض الخطوط المفضلة'}
          aria-pressed={onlyFavorites}
          className={cn(
            'h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0',
            onlyFavorites
              ? 'bg-warning/15 text-warning border-warning/40 shadow-xs'
              : 'bg-card border-border/80 text-muted-foreground hover:border-foreground/30 hover:text-foreground',
          )}
        >
          <Star className="w-3.5 h-3.5" weight={onlyFavorites ? 'fill' : 'regular'} />
          {favorites.length > 0 && (
            <span className="text-[10px] font-mono font-semibold">{favorites.length}</span>
          )}
        </button>
      </div>

      {/* ── بطاقات الخطوط الرشيقة ──────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-170px)] pe-0.5">
        {visibleFonts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs">
            {onlyFavorites ? 'لا توجد خطوط مفضلة حالياً' : 'لم يتم العثور على أي خط مطابق'}
          </div>
        ) : (
          visibleFonts.map((font) => {
            const isFavorite = favorites.includes(font.id);
            const isActive = isCurrentFont(font);
            const sample = font.sampleText || 'أبجد هوز حطي كلمن سعفص';

            return (
              <div
                key={font.id}
                onClick={() => applyFont(font)}
                className={cn(
                  'group relative flex flex-col justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer',
                  'bg-card hover:bg-muted/40 hover:border-foreground/30 shadow-2xs',
                  isActive
                    ? 'border-primary bg-primary/[0.05] ring-1 ring-primary/30'
                    : 'border-border/70',
                )}
              >
                {/* سطر معلومات الخط: الاسم العربي واللاتيني + النجمة */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {font.arabicName}
                    </span>
                    <span
                      className="text-[10px] text-muted-foreground/60 font-sans truncate"
                      dir="ltr"
                    >
                      {font.englishName}
                    </span>
                    {isActive && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-primary text-primary-foreground">
                        مطبّق
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(font.id, e)}
                    aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    className={cn(
                      'p-1 -m-1 rounded-md transition-colors cursor-pointer',
                      isFavorite
                        ? 'text-warning'
                        : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-foreground',
                    )}
                  >
                    <Star className="w-3.5 h-3.5" weight={isFavorite ? 'fill' : 'regular'} />
                  </button>
                </div>

                {/* سطر المعاينة الحية بخط الخط الفعلي: واسع ومقروء */}
                <div className="pt-1 overflow-hidden">
                  <span
                    className="block text-sm text-foreground/90 truncate leading-relaxed select-none"
                    style={{ fontFamily: font.family }}
                    dir="auto"
                  >
                    {sample}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
