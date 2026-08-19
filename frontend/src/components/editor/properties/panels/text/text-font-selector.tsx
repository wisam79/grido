import React, { useState, useRef, useEffect, useMemo } from "react";
import { TextElement, useEditorStore } from "@/lib/editor-store";
import { ARABIC_FONTS, FONT_CATEGORIES, FontCategory, loadGoogleFont } from "@/lib/fonts";
import { Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextFontSelectorProps {
  element: TextElement;
  onUpdate: (id: string, patch: Partial<TextElement>) => void;
}

export const TextFontSelector = React.memo(function TextFontSelector({
  element,
  onUpdate,
}: TextFontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FontCategory>("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentFamily = element.fontFamily || ARABIC_FONTS[0].family;
  const currentFontObj = ARABIC_FONTS.find(
    (f) => f.family === currentFamily || f.family.includes(currentFamily.split(",")[0].trim())
  ) || ARABIC_FONTS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredFonts = useMemo(() => {
    return ARABIC_FONTS.filter((font) => {
      const matchCat = activeCategory === "all" || font.category === activeCategory;
      const matchQuery =
        !searchQuery.trim() ||
        font.arabicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        font.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  const handleSelectFont = (selectedFamily: string) => {
    loadGoogleFont(selectedFamily);
    onUpdate(element.id, { fontFamily: selectedFamily });
    useEditorStore.getState().pushHistory();
    setIsOpen(false);
  };

  return (
    <div className="relative font-cairo" ref={popoverRef}>
      {/* Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 bg-background border border-border/60 hover:border-primary/50 rounded-lg px-2.5 text-xs text-foreground font-semibold flex items-center justify-between shadow-2xs transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span 
            className="text-xs truncate text-foreground font-bold"
            style={{ fontFamily: currentFontObj.family }}
          >
            {currentFontObj.arabicName || currentFontObj.name}
          </span>
          <span className="text-[10px] text-muted-foreground font-normal truncate">
            ({currentFontObj.englishName})
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {currentFontObj.isOffline && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="مدمج أوفلاين" />
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
        </div>
      </button>

      {/* Searchable Categorized Dropdown Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card/95 backdrop-blur-xl border border-border/70 rounded-xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 font-cairo">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن خط..."
              className="w-full bg-background/80 border border-border/50 rounded-lg pr-8 pl-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar text-[10px]">
            {FONT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-2 py-0.5 rounded-md whitespace-nowrap font-bold transition-all cursor-pointer shrink-0 shadow-2xs",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Fonts List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
            {filteredFonts.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                لم يتم العثور على خط يطابق البحث
              </div>
            ) : (
              filteredFonts.map((font) => {
                const isSelected = currentFamily.includes(font.family.split(",")[0].trim());
                return (
                  <button
                    key={font.id}
                    type="button"
                    onMouseEnter={() => {
                      if (!font.isOffline) loadGoogleFont(font.family);
                    }}
                    onClick={() => handleSelectFont(font.family)}
                    className={cn(
                      "w-full text-right px-2 py-1.5 rounded-lg transition-all flex items-center justify-between cursor-pointer group",
                      isSelected
                        ? "bg-primary/15 border border-primary/40 text-primary"
                        : "hover:bg-muted/60 text-foreground border border-transparent"
                    )}
                  >
                    <div className="space-y-0.2 truncate">
                      <span 
                        className="text-xs font-semibold truncate block"
                        style={{ fontFamily: font.family }}
                      >
                        {font.sampleText || font.arabicName}
                      </span>
                      <div className="text-[9px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <span>{font.name}</span>
                        {font.isOffline && (
                          <span className="text-[7.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.1 rounded">
                            أوفلاين
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mr-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});
