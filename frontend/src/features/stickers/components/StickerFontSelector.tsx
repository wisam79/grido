import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  TextAa,
  MagnifyingGlass,
  CaretDown,
  Check,
  Cloud,
} from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ARABIC_FONTS, FONT_CATEGORIES, loadGoogleFont, FontOption } from "@/lib/io/fonts";
import { cn } from "@/lib/utils";

export interface StickerFontSelectorProps {
  value?: string;
  onChange: (fontFamily: string) => void;
  className?: string;
}

export const StickerFontSelector = React.memo(function StickerFontSelector({
  value = "Cairo",
  onChange,
  className,
}: StickerFontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cleanCurrentName = value.split(",")[0].trim().replace(/['"]/g, "");

  const currentFont: FontOption = useMemo(() => {
    return (
      ARABIC_FONTS.find(
        (f) =>
          f.family.includes(cleanCurrentName) ||
          f.englishName.toLowerCase() === cleanCurrentName.toLowerCase() ||
          f.arabicName === cleanCurrentName ||
          f.id === cleanCurrentName.toLowerCase()
      ) || ARABIC_FONTS[0]
    );
  }, [cleanCurrentName]);

  const filteredFonts = useMemo(() => {
    return ARABIC_FONTS.filter((font) => {
      if (activeCategory !== "all" && font.category !== activeCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        font.arabicName.toLowerCase().includes(q) ||
        font.englishName.toLowerCase().includes(q) ||
        font.name.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const handleSelectFont = useCallback(
    (font: FontOption) => {
      if (!font.isOffline) {
        loadGoogleFont(font.family);
      }
      // استخراج الاسم النظيف لعائلة الخط لاستخدامه في مولّدات الملصقات
      const cleanFamily = font.family.split(",")[0].trim().replace(/['"]/g, "");
      onChange(cleanFamily);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setSearchQuery("");
      setActiveCategory("all");
    }
    setIsOpen(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-8 bg-card/60 hover:bg-card border border-border/50 hover:border-primary/50 rounded-md px-2.5 text-xs text-foreground font-semibold flex items-center justify-between gap-2 shadow-2xs transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
            isOpen && "border-primary ring-1 ring-primary/30 bg-card",
            className
          )}
          title="نوع الخط"
        >
          <div className="flex items-center gap-2 min-w-0 truncate">
            <TextAa className="w-3.5 h-3.5 text-primary shrink-0" />
            <span
              className="text-xs truncate font-bold text-foreground"
              style={{ fontFamily: currentFont.family }}
            >
              {currentFont.arabicName}
            </span>
            <span className="text-micro text-muted-foreground font-normal truncate hidden sm:inline">
              ({currentFont.englishName})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentFont.isOffline ? (
              <span className="text-3xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">
                مدمج
              </span>
            ) : (
              <span className="text-3xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1 py-0.5 rounded flex items-center gap-0.5">
                <Cloud className="w-2.5 h-2.5" />
                <span>سحابي</span>
              </span>
            )}
            <CaretDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180 text-primary"
              )}
              weight="bold"
            />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[285px] bg-card/95 backdrop-blur-2xl border border-border/80 rounded-xl shadow-fluent-28 z-50 p-2.5 space-y-2 font-cairo fluent-specular"
        dir="rtl"
      >
        {/* مربع البحث */}
        <div className="relative flex items-center">
          <MagnifyingGlass
            className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            weight="regular"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الخطوط..."
            className="w-full h-7 bg-muted/40 border border-border/60 rounded-md pr-7 pl-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        {/* تصنيفات الخطوط */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {FONT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "h-6 px-2 text-micro rounded-md font-semibold whitespace-nowrap cursor-pointer transition-colors shrink-0",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-border/40"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* قائمة الخطوط التفاعلية مع المعاينة الحية */}
        <div className="max-h-[240px] overflow-y-auto space-y-1 pr-0.5">
          {filteredFonts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              لا توجد خطوط
            </div>
          ) : (
            filteredFonts.map((font) => {
              const cleanFontName = font.family.split(",")[0].trim().replace(/['"]/g, "");
              const isSelected = cleanFontName.toLowerCase() === cleanCurrentName.toLowerCase();

              return (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectFont(font)}
                  onMouseEnter={() => {
                    if (!font.isOffline) {
                      loadGoogleFont(font.family);
                    }
                  }}
                  className={cn(
                    "w-full text-start p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 group",
                    isSelected
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-transparent hover:border-border/60 hover:bg-muted/30 text-foreground"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-bold truncate"
                        style={{ fontFamily: font.family }}
                      >
                        {font.arabicName}
                      </span>
                      <span className="text-micro text-muted-foreground font-mono truncate">
                        {font.englishName}
                      </span>
                    </div>
                    <p
                      className="text-mini text-muted-foreground/80 mt-0.5 truncate"
                      style={{ fontFamily: font.family }}
                    >
                      {font.sampleText || "أبجد هوز 123"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {font.isOffline ? (
                      <span className="text-3xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">
                        مدمج
                      </span>
                    ) : (
                      <span className="text-3xs font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1 py-0.5 rounded">
                        سحابي
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" weight="bold" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

StickerFontSelector.displayName = "StickerFontSelector";
