import React, { useState, useRef, useMemo, useCallback } from "react";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { ARABIC_FONTS, FONT_CATEGORIES, loadGoogleFont, FontOption } from "@/lib/io/fonts";
import { Search, ChevronDown, Star, Clock, X, Sparkles, Cloud, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TextFontSelectorProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

const FAVORITES_STORAGE_KEY = "grido_favorite_fonts";
const RECENTS_STORAGE_KEY = "grido_recent_fonts";

export const TextFontSelector = React.memo(function TextFontSelector({
  element,
  onUpdate,
}: TextFontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [previewText, setPreviewText] = useState<string>("");
  const [showCustomPreviewInput, setShowCustomPreviewInput] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const originalFamilyRef = useRef<string>(element.fontFamily || "");
  const hasCommittedRef = useRef<boolean>(false);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ["cairo", "tajawal", "amiri"];
    } catch {
      return ["cairo", "tajawal", "amiri"];
    }
  });

  // Recents state
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const currentFamily = element.fontFamily || ARABIC_FONTS[0].family;
  const currentFontObj = ARABIC_FONTS.find(
    (f) => f.family === currentFamily || f.family.includes(currentFamily.split(",")[0].trim())
  ) || ARABIC_FONTS[0];

  const effectivePreviewText = previewText.trim() || (element.text?.trim() || "أبجد هوز 123");

  const toggleFavorite = (fontId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(fontId) ? prev.filter((id) => id !== fontId) : [...prev, fontId];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore localstorage errors
      }
      return next;
    });
  };

  const addRecent = useCallback((fontId: string) => {
    setRecents((prev) => {
      const filtered = prev.filter((id) => id !== fontId);
      const next = [fontId, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      originalFamilyRef.current = element.fontFamily || "";
      hasCommittedRef.current = false;
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      if (!hasCommittedRef.current && originalFamilyRef.current) {
        onUpdate(element.id, { fontFamily: originalFamilyRef.current });
      }
      setSearchQuery("");
      setShowCustomPreviewInput(false);
      setFocusedIndex(-1);
    }
    setIsOpen(open);
  };

  const allCategoryPills = useMemo(() => {
    const pills: { id: string; name: string; icon?: React.ReactNode; count?: number }[] = [
      { id: "all", name: "الكل" },
    ];
    if (favorites.length > 0) {
      pills.push({ id: "favorites", name: "المفضلة", icon: <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />, count: favorites.length });
    }
    if (recents.length > 0) {
      pills.push({ id: "recents", name: "الأخيرة", icon: <Clock className="w-2.5 h-2.5" /> });
    }
    FONT_CATEGORIES.filter((c) => c.id !== "all").forEach((cat) => {
      pills.push({ id: cat.id, name: cat.name });
    });
    return pills;
  }, [favorites, recents]);

  const filteredFonts = useMemo(() => {
    return ARABIC_FONTS.filter((font) => {
      // Category check
      if (activeCategory === "favorites") {
        if (!favorites.includes(font.id)) return false;
      } else if (activeCategory === "recents") {
        if (!recents.includes(font.id)) return false;
      } else if (activeCategory !== "all") {
        if (font.category !== activeCategory) return false;
      }

      // Query check
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        font.arabicName.toLowerCase().includes(q) ||
        font.englishName.toLowerCase().includes(q) ||
        font.name.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, favorites, recents, searchQuery]);

  const handlePreviewFont = (font: FontOption) => {
    if (!font.isOffline) {
      loadGoogleFont(font.family);
    }
    onUpdate(element.id, { fontFamily: font.family });
  };

  const handleSelectFont = (font: FontOption) => {
    if (!font.isOffline) {
      loadGoogleFont(font.family);
    }
    hasCommittedRef.current = true;
    addRecent(font.id);
    onUpdate(element.id, { fontFamily: font.family });
    useEditorStore.getState().pushHistory();
    setIsOpen(false);
  };

  // Keyboard navigation with live canvas preview
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = focusedIndex < filteredFonts.length - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(nextIdx);
      if (filteredFonts[nextIdx]) {
        handlePreviewFont(filteredFonts[nextIdx]);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = focusedIndex > 0 ? focusedIndex - 1 : filteredFonts.length - 1;
      setFocusedIndex(nextIdx);
      if (filteredFonts[nextIdx]) {
        handlePreviewFont(filteredFonts[nextIdx]);
      }
    } else if (e.key === "Enter" && focusedIndex >= 0 && focusedIndex < filteredFonts.length) {
      e.preventDefault();
      handleSelectFont(filteredFonts[focusedIndex]);
    } else if (e.key === "Escape") {
      handleOpenChange(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* Compact Trigger Button */}
        <button
          type="button"
          className={cn(
            "w-full h-8 bg-background/90 hover:bg-background border border-border/60 hover:border-primary/50 rounded-md px-2.5 text-xs text-foreground font-semibold flex items-center justify-between shadow-2xs transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            isOpen && "border-primary ring-2 ring-primary/20 bg-background"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <span 
              className="text-xs truncate text-foreground font-bold"
              style={{ fontFamily: currentFontObj.family }}
            >
              {currentFontObj.arabicName || currentFontObj.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium truncate">
              ({currentFontObj.englishName})
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {currentFontObj.isOffline ? (
              <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.5 rounded" title="مدمج أوفلاين">
                أوفلاين
              </span>
            ) : (
              <span className="text-[8px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/15 border border-sky-500/30 px-1 py-0.5 rounded flex items-center gap-0.5" title="سحابي Google Fonts">
                <Cloud className="w-2 h-2" />
                <span>سحابي</span>
              </span>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180 text-primary")} />
          </div>
        </button>
      </PopoverTrigger>

      {/* Searchable Categorized Dropdown Portaled above EVERYTHING */}
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[305px] max-w-[calc(100vw-24px)] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-xl shadow-2xl z-[99999] p-2.5 space-y-2 font-cairo fluent-specular"
        onKeyDown={handleKeyDown}
      >
        {/* Search Box & Custom Preview Toggle */}
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              placeholder="بحث في الخطوط..."
              className="w-full h-8 bg-background/90 border border-border/60 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-md pr-8 pl-8 text-xs text-foreground placeholder:text-muted-foreground/60 outline-hidden transition-all shadow-2xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomPreviewInput(!showCustomPreviewInput)}
                className={cn(
                  "w-5 h-5 absolute left-2 top-1/2 -translate-y-1/2 rounded flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-primary",
                  showCustomPreviewInput && "text-primary bg-primary/10"
                )}
                title="تخصيص نص المعاينة"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Custom Preview Text Field */}
          {showCustomPreviewInput && (
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-md border border-border/40 animate-in fade-in duration-150">
              <input
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder={`نص المعاينة (افتراضي: ${element.text || "أبجد هوز"})`}
                className="w-full h-6 bg-transparent text-[11px] px-1 text-foreground placeholder:text-muted-foreground/50 outline-hidden"
              />
              {previewText && (
                <button
                  type="button"
                  onClick={() => setPreviewText("")}
                  className="w-4 h-4 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                  title="إعادة ضبط"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
          {allCategoryPills.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setFocusedIndex(-1);
              }}
              className={cn(
                "px-2 py-1 rounded-md whitespace-nowrap font-bold transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
              )}
            >
              {cat.icon}
              <span>{cat.name}</span>
              {cat.count !== undefined && (
                <span className="text-[8.5px] opacity-80">({cat.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Fonts List */}
        <div 
          ref={listContainerRef}
          className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-0.5"
        >
          {filteredFonts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">لم يتم العثور على خط يطابق البحث</p>
              <p className="text-[10px] text-muted-foreground/70">جرب كتابة اسم خط آخر أو اختيار فئة مختلفة</p>
            </div>
          ) : (
            filteredFonts.map((font, idx) => {
              const isSelected = currentFamily.includes(font.family.split(",")[0].trim());
              const isFav = favorites.includes(font.id);
              const isFocused = focusedIndex === idx;

              return (
                <div
                  key={font.id}
                  onMouseEnter={() => {
                    setFocusedIndex(idx);
                    handlePreviewFont(font);
                  }}
                  onClick={() => handleSelectFont(font)}
                  className={cn(
                    "w-full text-right px-2.5 py-2 rounded-md transition-all flex items-center justify-between cursor-pointer group border select-none",
                    isSelected
                      ? "bg-primary/15 border-primary/50 text-primary shadow-2xs"
                      : isFocused
                      ? "bg-muted/80 border-border/60 text-foreground"
                      : "hover:bg-muted/50 text-foreground border-transparent"
                  )}
                >
                  <div className="space-y-0.5 truncate flex-1 min-w-0 pr-1">
                    {/* Font Sample Preview Text */}
                    <span 
                      className="text-sm font-semibold truncate block leading-tight text-foreground/90 group-hover:text-foreground"
                      style={{ fontFamily: font.family }}
                    >
                      {effectivePreviewText}
                    </span>
                    
                    {/* Font Meta Details */}
                    <div className="text-[9.5px] text-muted-foreground font-medium flex items-center gap-1.5 truncate">
                      <span className="font-bold text-foreground/75 truncate">{font.arabicName}</span>
                      <span className="text-[9px] opacity-70 truncate font-mono">({font.englishName})</span>
                      {font.isOffline ? (
                        <span className="text-[7.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1 py-0.1 rounded font-bold">
                          أوفلاين
                        </span>
                      ) : (
                        <span className="text-[7.5px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-1 py-0.1 rounded font-bold">
                          Google Font
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Favorite Star & Checkmark */}
                  <div className="flex items-center gap-1 shrink-0 mr-1.5">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(font.id, e)}
                      className={cn(
                        "w-5.5 h-5.5 rounded flex items-center justify-center transition-all cursor-pointer hover:bg-muted",
                        isFav ? "text-amber-400" : "text-muted-foreground/40 hover:text-amber-400"
                      )}
                      title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                    >
                      <Star className={cn("w-3.5 h-3.5", isFav && "fill-amber-400")} />
                    </button>

                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});


