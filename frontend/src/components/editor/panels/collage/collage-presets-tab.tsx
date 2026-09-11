import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  FolderSimple,
  UploadSimple,
  DownloadSimple,
  Trash,
  Stack,
  File,
  Rows,
  Star,
  SquaresFour,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { CollageTemplate, COLLAGE_TEMPLATES } from "@/lib/templates";
import {
  CollagePresetCategory,
  ALL_STUDIO_PRESETS,
  STUDIO_FULL_SHEET_PRESETS,
  STUDIO_SINGLE_ROW_PRESETS,
  STUDIO_COMBO_PRESETS,
  STUDIO_KEEPSAKE_PRESETS,
  StudioPreset,
} from "./collage-preset-data";
import { FluentEmptyState } from "@/components/ui/blocks";

/**
 * 🎴 المعاينة الفوتوغرافية المصغرة لورقة الاستوديو
 * تحاكي ورقة الطباعة الحقيقية (A4 / 10×15) مع خيال بورتريه واقعي داخل كل خلية
 */
function StudioPaperThumbnail({
  templateId,
  cells: directCells,
  active,
  scale = 1,
}: {
  templateId?: string;
  cells?: Array<{ x: number; y: number; w: number; h: number }>;
  active: boolean;
  /** معامل تصغير الورقة داخل الحاوية (1 = حجم كامل 60×78) */
  scale?: number;
}) {
  const tpl = templateId ? COLLAGE_TEMPLATES.find((t) => t.id === templateId) : undefined;
  const cells = directCells || tpl?.cells || [];
  const paperW = 60 * scale;
  const paperH = 78 * scale;

  return (
    <div className="w-full flex items-center justify-center py-1 select-none">
      <div
        className={cn(
          "rounded-[4px] relative transition-all duration-200 p-0.5 flex items-center justify-center overflow-hidden",
          active
            ? "bg-white dark:bg-zinc-900 border-2 border-primary shadow-[0_0_10px_rgba(var(--primary-rgb,37,99,235),0.3)] ring-1 ring-primary/40"
            : "bg-white dark:bg-zinc-900/90 border border-border/80 shadow-2xs group-hover:border-primary/50 group-hover:shadow-xs"
        )}
        style={{ width: paperW, height: paperH }}
        dir="ltr"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 100 142"
          className="w-full h-full block relative z-1"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* إطار ورقة الطباعة الرقيق */}
          <rect
            x="0.5"
            y="0.5"
            width="99"
            height="141"
            rx="3"
            ry="3"
            fill="none"
            className="stroke-border/25"
            strokeWidth="0.5"
          />

          {cells.map((cell, idx) => {
            const x = cell.x * 100;
            const y = cell.y * 142;
            const w = cell.w * 100;
            const h = cell.h * 142;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const headRadius = Math.min(w, h) * 0.18;
            const shoulderW = w * 0.34;
            const shoulderTop = cy + headRadius * 0.7;
            const shoulderBottom = cy + h * 0.44;

            const isFamilyLandscape = w > 50 && h > 40;
            const showPortrait = w >= 13 && h >= 15;

            return (
              <g key={idx} className="transition-all duration-150">
                {/* إطار الصورة الفوتوغرافية بتدرج استوديو حيادي */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx="1.5"
                  ry="1.5"
                  className={cn(
                    "transition-colors duration-150",
                    active
                      ? "fill-primary/[0.14] stroke-primary/80 stroke-[1.2]"
                      : "fill-slate-100/90 dark:fill-zinc-800/80 stroke-slate-300/80 dark:stroke-zinc-700/80 stroke-[0.8]"
                  )}
                />

                {/* خيال البورتريه الفوتوغرافي الواقعي */}
                {showPortrait && !isFamilyLandscape && (
                  <g
                    className={cn(
                      "transition-opacity duration-150",
                      active
                        ? "fill-primary/70"
                        : "fill-slate-400/80 dark:fill-zinc-500/80"
                    )}
                  >
                    <circle cx={cx} cy={cy - headRadius * 0.65} r={headRadius} />
                    <path
                      d={`M ${cx - shoulderW} ${shoulderBottom} C ${cx - shoulderW * 0.8} ${shoulderTop}, ${cx + shoulderW * 0.8} ${shoulderTop}, ${cx + shoulderW} ${shoulderBottom} Z`}
                    />
                  </g>
                )}

                {/* خيال البورتريه المزدوج للصور العائلية الكبرى */}
                {isFamilyLandscape && (
                  <g
                    className={cn(
                      active
                        ? "fill-primary/70"
                        : "fill-slate-400/80 dark:fill-zinc-500/80"
                    )}
                  >
                    <circle cx={cx - 10} cy={cy - 6} r={headRadius * 0.8} />
                    <path
                      d={`M ${cx - 20} ${cy + 14} C ${cx - 19} ${cy + 1}, ${cx - 1} ${cy + 1}, ${cx} ${cy + 14} Z`}
                    />
                    <circle cx={cx + 10} cy={cy - 5} r={headRadius * 0.75} />
                    <path
                      d={`M ${cx} ${cy + 14} C ${cx + 1} ${cy + 2}, ${cx + 19} ${cy + 2}, ${cx + 20} ${cy + 14} Z`}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export interface CollagePresetsTabProps {
  presetCategory: CollagePresetCategory;
  onPresetCategoryChange: (category: CollagePresetCategory) => void;
  activeTemplateId: string | undefined;
  onSelect: (t: CollageTemplate) => void;
  savedTemplates?: CollageTemplate[];
  onDeleteTemplate?: (id: string, e: React.MouseEvent) => void;
  onImportClick?: () => void;
  onExportAllClick?: () => void;
}

export function CollagePresetsTab({
  presetCategory,
  onPresetCategoryChange,
  activeTemplateId,
  onSelect,
  savedTemplates = [],
  onDeleteTemplate,
  onImportClick,
  onExportAllClick,
}: CollagePresetsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const categories: {
    id: CollagePresetCategory;
    label: string;
    title: string;
    icon: React.ElementType;
    badgeCount?: number;
  }[] = [
    { id: "all", label: "الكل", title: "كافة قوالب الاستوديو الرسمية", icon: SquaresFour, badgeCount: ALL_STUDIO_PRESETS.length },
    { id: "combo", label: "كومبو", title: "أطقم تجارية مركبة", icon: Stack },
    { id: "full", label: "شيت", title: "قوالب الشيت الكامل", icon: File },
    { id: "row", label: "أشرطة", title: "أشرطة سريعة صف واحد", icon: Rows },
    { id: "keepsake", label: "تذكار", title: "كروت المحفظة والفوتوبوث", icon: Star },
    { id: "saved", label: "محفوظ", title: "قوالبي المحفوظة", icon: FolderSimple, badgeCount: savedTemplates.length > 0 ? savedTemplates.length : undefined },
  ];

  // تصفية القوالب بالبحث الفوري
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedOfficial = ALL_STUDIO_PRESETS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.spec.toLowerCase().includes(q) ||
        (p.tag && p.tag.toLowerCase().includes(q)) ||
        (p.badge && p.badge.toLowerCase().includes(q))
    );

    const matchedSaved = savedTemplates.filter(
      (s) => s.name.toLowerCase().includes(q) || `${s.slots}`.includes(q)
    );

    return { official: matchedOfficial, saved: matchedSaved };
  }, [searchQuery, savedTemplates]);

  const activePresetsList: StudioPreset[] =
    presetCategory === "all"
      ? ALL_STUDIO_PRESETS
      : presetCategory === "combo"
      ? STUDIO_COMBO_PRESETS
      : presetCategory === "full"
      ? STUDIO_FULL_SHEET_PRESETS
      : presetCategory === "row"
      ? STUDIO_SINGLE_ROW_PRESETS
      : presetCategory === "keepsake"
      ? STUDIO_KEEPSAKE_PRESETS
      : [];

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150 font-cairo" dir="rtl">
      {/* 🔍 حقل البحث الفوري المدمج وفق Fluent 2 */}
      <div className="relative w-full">
        <MagnifyingGlass className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في القوالب (جواز، وطنية، فيزا، شيت...)"
          className="w-full h-8 pr-8 pl-7 text-xs bg-background/80 border border-border/80 rounded-lg text-right font-cairo placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground flex items-center justify-center cursor-pointer transition-colors"
            title="مسح البحث"
          >
            <X className="w-2.5 h-2.5" weight="bold" />
          </button>
        )}
      </div>

      {/* 🏷️ شريط فلاتر الفئات — كبسولات Fluent 2 رشيقة وأنيقة */}
      {!searchQuery && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
          {categories.map((cat) => {
            const isCatActive = presetCategory === cat.id;
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                title={cat.title}
                aria-pressed={isCatActive}
                onClick={() => onPresetCategoryChange(cat.id)}
                className={cn(
                  "h-7.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border select-none active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  isCatActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                <IconComponent
                  className={cn("w-3.5 h-3.5", isCatActive ? "text-primary-foreground" : "text-primary")}
                  weight={isCatActive ? "fill" : "duotone"}
                />
                <span className="leading-none">{cat.label}</span>
                {cat.badgeCount !== undefined && (
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1 py-0.2 rounded font-bold",
                      isCatActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/80 text-muted-foreground border border-border/40"
                    )}
                    dir="ltr"
                  >
                    {cat.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 🔍 حالة البحث النشط */}
      {searchResults !== null ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground select-none px-0.5">
            <span>
              نتائج البحث: <strong className="text-foreground">{searchResults.official.length + searchResults.saved.length}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
            >
              إلغاء البحث
            </button>
          </div>

          {searchResults.official.length === 0 && searchResults.saved.length === 0 ? (
            <FluentEmptyState
              icon={<MagnifyingGlass className="w-8 h-8 text-muted-foreground/60" weight="duotone" />}
              title="لم يتم العثور على قوالب"
              description="جرب البحث بكلمات أخرى مثل 'جواز'، 'وطنية'، أو 'شيت'."
            />
          ) : (
            <div className="space-y-2">
              {/* نتائج القوالب الرسمية */}
              {searchResults.official.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.official.map((preset) => {
                    const isActive = activeTemplateId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          const tpl = COLLAGE_TEMPLATES.find((t) => t.id === preset.id);
                          if (tpl) onSelect(tpl);
                        }}
                        className={cn(
                          "p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-between select-none relative active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none group min-h-[126px] fluent-specular",
                          isActive
                            ? "border-primary bg-primary/[0.08] text-primary shadow-xs ring-1 ring-primary/40 hover:shadow-2xs"
                            : "bg-card border-border/70 text-foreground shadow-2xs hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs hover:-translate-y-0.5"
                        )}
                      >
                        {isActive && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs z-10">
                            <Check className="w-2.5 h-2.5" weight="bold" />
                          </div>
                        )}
                        <StudioPaperThumbnail templateId={preset.id} active={isActive} />
                        <div className="w-full flex flex-col items-center mt-1 pt-1.5 border-t border-border/40 min-w-0">
                          <div className="flex items-center justify-center gap-1 w-full min-w-0">
                            <span className="text-xs font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                              {preset.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground/80 bg-muted/60 px-1 py-0.2 rounded shrink-0">
                              {preset.slots}×
                            </span>
                          </div>
                          <span className="text-[9.5px] text-muted-foreground mt-0.5 leading-none truncate w-full text-center font-mono" dir="ltr">
                            {preset.spec}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* نتائج القوالب المحفوظة */}
              {searchResults.saved.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  <span className="text-[11px] font-bold text-muted-foreground block text-right">قوالب محفوظة مطابقة</span>
                  {searchResults.saved.map((t) => {
                    const isActive = activeTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(t)}
                        className={cn(
                          "p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none group relative overflow-hidden",
                          isActive
                            ? "border-primary bg-primary/[0.08] text-primary font-bold shadow-xs ring-1 ring-primary/30"
                            : "bg-card border-border/70 hover:bg-muted/40 hover:border-primary/40 hover:shadow-2xs text-foreground active:scale-[0.99]"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <div className="w-8 h-10 shrink-0 flex items-center justify-center">
                            <StudioPaperThumbnail cells={t.cells} active={isActive} scale={0.5} />
                          </div>
                          <div className="flex flex-col items-start min-w-0 gap-0.5">
                            <span className="text-xs font-bold truncate text-right">{t.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{t.slots}× صور</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : presetCategory === "saved" ? (
        /* 🎴 قسم القوالب المحفوظة */
        savedTemplates.length === 0 ? (
          <div className="py-7 px-4 rounded-xl border border-dashed border-border/70 bg-card/40 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <FolderSimple className="w-5 h-5" weight="duotone" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">لا توجد قوالب مخصصة محفوظة</p>
              <p className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
                خصص شبكتك في تبويب "شبكة" واضغط "حفظ كقالب" للوصول إليها هنا بنقرة واحدة.
              </p>
            </div>
            {onImportClick && (
              <button
                type="button"
                onClick={onImportClick}
                className="mt-1 h-7 px-3 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border/60 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
              >
                <UploadSimple className="w-3.5 h-3.5 text-primary" weight="bold" />
                <span>استيراد قالب JSON</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* شريط الإجراءات للقوالب المحفوظة */}
            <div className="flex items-center justify-between pb-0.5 select-none">
              <span className="text-xs font-bold text-foreground/80">
                {savedTemplates.length} {savedTemplates.length === 1 ? "قالب محفوظ" : "قوالب محفوظة"}
              </span>
              <div className="flex items-center gap-1.5">
                {onImportClick && (
                  <button
                    type="button"
                    onClick={onImportClick}
                    className="h-6.5 px-2 text-[10px] font-bold rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                    title="استيراد قوالب من ملف"
                  >
                    <UploadSimple className="w-3 h-3 text-primary" weight="bold" />
                    <span>استيراد</span>
                  </button>
                )}
                {onExportAllClick && (
                  <button
                    type="button"
                    onClick={onExportAllClick}
                    className="h-6.5 px-2 text-[10px] font-bold rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border/60 transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                    title="تصدير كافة القوالب المحفوظة"
                  >
                    <DownloadSimple className="w-3 h-3 text-primary" weight="bold" />
                    <span>تصدير الكل</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
              {savedTemplates.map((t) => {
                const isActive = activeTemplateId === t.id;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(t);
                      }
                    }}
                    onClick={() => onSelect(t)}
                    className={cn(
                      "p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none group relative overflow-hidden",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none",
                      isActive
                        ? "border-primary bg-primary/[0.08] text-primary font-bold shadow-xs ring-1 ring-primary/30"
                        : "bg-card border-border/70 hover:bg-muted/40 hover:border-primary/40 hover:shadow-2xs text-foreground active:scale-[0.99]"
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-y-0 right-0 w-1 bg-primary rounded-l-full" />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0 pr-1">
                      <div className="w-9 h-11.5 shrink-0 flex items-center justify-center">
                        <StudioPaperThumbnail cells={t.cells} active={isActive} scale={0.55} />
                      </div>
                      <div className="flex flex-col items-start min-w-0 gap-0.5">
                        <span className="text-xs font-bold truncate w-full text-right">{t.name}</span>
                        <span
                          className={cn(
                            "text-[10px] font-mono",
                            isActive ? "text-primary font-bold" : "text-muted-foreground"
                          )}
                        >
                          {t.slots}× صور
                        </span>
                      </div>
                    </div>
                    {onDeleteTemplate && (
                      <button
                        type="button"
                        onClick={(e) => onDeleteTemplate(t.id, e)}
                        title="حذف القالب"
                        aria-label="حذف القالب"
                        className="w-6.5 h-6.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer shrink-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                      >
                        <Trash className="w-3.5 h-3.5" weight="regular" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* 🎴 شبكة بطاقات القوالب الرسمية */
        <div className="grid grid-cols-2 gap-2">
          {activePresetsList.map((preset) => {
            const isActive = activeTemplateId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isActive}
                aria-label={`${preset.title} - ${preset.spec}`}
                onClick={() => {
                  const tpl = COLLAGE_TEMPLATES.find((t) => t.id === preset.id);
                  if (tpl) onSelect(tpl);
                }}
                className={cn(
                  "p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-between select-none relative active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none group min-h-[128px] fluent-specular",
                  isActive
                    ? "border-primary bg-primary/[0.08] text-primary shadow-xs ring-1 ring-primary/40 hover:shadow-2xs"
                    : "bg-card border-border/70 text-foreground shadow-2xs hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs hover:-translate-y-0.5"
                )}
              >
                {/* شارة التحديد النشطة */}
                {isActive && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs z-10">
                    <Check className="w-2.5 h-2.5" weight="bold" />
                  </div>
                )}

                {/* شارة التصنيف الخاصة */}
                {preset.tag && !isActive && (
                  <span className="absolute top-2 right-2 text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/50 leading-none z-10">
                    {preset.tag}
                  </span>
                )}

                {/* المعاينة المصغرة لورقة الطباعة الحقيقية كبطل للبطاقة */}
                <StudioPaperThumbnail templateId={preset.id} active={isActive} />

                {/* الاسم والمقاس بالملم */}
                <div className="w-full flex flex-col items-center mt-1 pt-1.5 border-t border-border/40 min-w-0">
                  <div className="flex items-center justify-center gap-1 w-full min-w-0">
                    <span className="text-xs font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                      {preset.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground/80 bg-muted/60 px-1 py-0.2 rounded shrink-0">
                      {preset.slots}×
                    </span>
                  </div>
                  <span className="text-[9.5px] text-muted-foreground mt-0.5 leading-none truncate w-full text-center font-mono" dir="ltr">
                    {preset.spec}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
