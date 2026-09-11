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
  List,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

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
  /** معامل تصغير الورقة داخل الحاوية */
  scale?: number;
}) {
  const tpl = templateId ? COLLAGE_TEMPLATES.find((t) => t.id === templateId) : undefined;
  const cells = directCells || tpl?.cells || [];
  const paperW = Math.round(56 * scale);
  const paperH = Math.round(74 * scale);

  return (
    <div className="flex items-center justify-center select-none shrink-0" aria-hidden="true">
      <div
        className={cn(
          "rounded-[4px] relative transition-all duration-200 p-0.5 flex items-center justify-center overflow-hidden",
          active
            ? "bg-white dark:bg-zinc-900 border-2 border-primary shadow-[0_0_10px_rgba(var(--primary-rgb,37,99,235),0.3)] ring-1 ring-primary/40"
            : "bg-white dark:bg-zinc-900/90 border border-border/80 shadow-2xs group-hover:border-primary/50 group-hover:shadow-xs"
        )}
        style={{ width: paperW, height: paperH }}
        dir="ltr"
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
                {/* إطار الصورة الفوتوغرافية */}
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
  // نمط العرض: قائمة عريضة واضحة ومفصلة (الافتراضي)، أو شبكة مصغرة
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const categories: {
    id: CollagePresetCategory;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    badgeCount?: number;
  }[] = [
    { id: "all", label: "كافة قوالب الاستوديو", shortLabel: "الكل", icon: SquaresFour, badgeCount: ALL_STUDIO_PRESETS.length },
    { id: "combo", label: "أطقم تجارية (كومبو)", shortLabel: "كومبو", icon: Stack, badgeCount: STUDIO_COMBO_PRESETS.length },
    { id: "full", label: "قوالب الشيت الكامل", shortLabel: "شيت", icon: File, badgeCount: STUDIO_FULL_SHEET_PRESETS.length },
    { id: "row", label: "أشرطة سريعة صف واحد", shortLabel: "أشرطة", icon: Rows, badgeCount: STUDIO_SINGLE_ROW_PRESETS.length },
    { id: "keepsake", label: "كروت المحفظة والتذكار", shortLabel: "تذكار", icon: Star, badgeCount: STUDIO_KEEPSAKE_PRESETS.length },
    { id: "saved", label: "قوالبي المحفوظة", shortLabel: "محفوظ", icon: FolderSimple, badgeCount: savedTemplates.length > 0 ? savedTemplates.length : undefined },
  ];

  const currentCat = categories.find((c) => c.id === presetCategory) || categories[0];

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

  const activePresetsList: StudioPreset[] = useMemo(() => {
    switch (presetCategory) {
      case "all":
        return ALL_STUDIO_PRESETS;
      case "combo":
        return STUDIO_COMBO_PRESETS;
      case "full":
        return STUDIO_FULL_SHEET_PRESETS;
      case "row":
        return STUDIO_SINGLE_ROW_PRESETS;
      case "keepsake":
        return STUDIO_KEEPSAKE_PRESETS;
      default:
        return [];
    }
  }, [presetCategory]);

  // أقسام القوالب عند اختيار "الكل" لتنظيم بصري مريح
  const groupedSections: { title: string; icon: React.ElementType; presets: StudioPreset[] }[] = useMemo(() => [
    { title: "أطقم تجارية مركبة", icon: Stack, presets: STUDIO_COMBO_PRESETS },
    { title: "قوالب الشيت الكامل", icon: File, presets: STUDIO_FULL_SHEET_PRESETS },
    { title: "أشرطة سريعة صف واحد", icon: Rows, presets: STUDIO_SINGLE_ROW_PRESETS },
    { title: "كروت المحفظة والتذكار", icon: Star, presets: STUDIO_KEEPSAKE_PRESETS },
  ], []);

  // دالة مشتركة لتطبيق القالب
  const handleApplyPreset = (presetId: string) => {
    const tpl = COLLAGE_TEMPLATES.find((t) => t.id === presetId);
    if (tpl) onSelect(tpl);
  };

  /** بطاقة القالب في نمط القائمة (List View - كاملة العرض بدون أي حشر أو قص) */
  const renderListCard = (preset: StudioPreset) => {
    const isActive = activeTemplateId === preset.id;
    return (
      <button
        key={preset.id}
        type="button"
        aria-pressed={isActive}
        aria-label={`${preset.title} - ${preset.spec}`}
        onClick={() => handleApplyPreset(preset.id)}
        className={cn(
          "w-full p-2 rounded-xl border text-right transition-all duration-150 cursor-pointer flex items-center gap-2.5 select-none relative group active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none min-h-[58px] fluent-specular",
          isActive
            ? "border-primary bg-primary/[0.09] dark:bg-primary/20 text-primary shadow-xs ring-1 ring-primary/40"
            : "bg-card border-border/75 text-foreground shadow-2xs hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs"
        )}
      >
        {/* شارة النشاط الزرقاء على الحافة اليمنى */}
        {isActive && (
          <span className="absolute inset-y-1 right-0 w-1 bg-primary rounded-l-full" />
        )}

        {/* المعاينة المصغرة للورقة الحقيقية */}
        <div className="shrink-0 w-9 h-12 flex items-center justify-center">
          <StudioPaperThumbnail templateId={preset.id} active={isActive} scale={0.6} />
        </div>

        {/* البيانات النصية للقالب — مساحة كاملة ومريحة للقراءة */}
        <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5 text-right">
          <div className="w-full flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-xs font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
              {preset.title}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {preset.tag && (
                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 leading-none">
                  {preset.tag}
                </span>
              )}
              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/70 px-1 py-0.2 rounded border border-border/40 leading-none">
                {preset.slots}×
              </span>
            </div>
          </div>

          <span className="text-[10px] text-muted-foreground font-mono leading-tight" dir="ltr">
            {preset.spec}
          </span>
        </div>

        {/* أيقونة التحديد النشط */}
        {isActive && (
          <div className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
            <Check className="w-3 h-3" weight="bold" />
          </div>
        )}
      </button>
    );
  };

  /** بطاقة القالب في نمط الشبكة (Grid View - ثنائية الأعمدة) */
  const renderGridCard = (preset: StudioPreset) => {
    const isActive = activeTemplateId === preset.id;
    return (
      <button
        key={preset.id}
        type="button"
        aria-pressed={isActive}
        aria-label={`${preset.title} - ${preset.spec}`}
        onClick={() => handleApplyPreset(preset.id)}
        className={cn(
          "p-2 rounded-xl border text-center transition-all duration-150 cursor-pointer flex flex-col items-center justify-between select-none relative active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none group min-h-[120px] fluent-specular",
          isActive
            ? "border-primary bg-primary/[0.09] dark:bg-primary/20 text-primary shadow-xs ring-1 ring-primary/40"
            : "bg-card border-border/75 text-foreground shadow-2xs hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs hover:-translate-y-0.5"
        )}
      >
        {/* شارة التحديد النشطة */}
        {isActive && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs z-10">
            <Check className="w-2.5 h-2.5" weight="bold" />
          </div>
        )}

        {/* شارة التصنيف */}
        {preset.tag && !isActive && (
          <span className="absolute top-1.5 right-1.5 text-[8.5px] font-bold px-1.2 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/50 leading-none z-10">
            {preset.tag}
          </span>
        )}

        {/* المعاينة المصغرة لورقة الطباعة */}
        <StudioPaperThumbnail templateId={preset.id} active={isActive} scale={0.7} />

        {/* الاسم والمقاس بالملم */}
        <div className="w-full flex flex-col items-center mt-1 pt-1.5 border-t border-border/40 min-w-0">
          <div className="flex items-center justify-center gap-1 w-full min-w-0">
            <span className="text-xs font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
              {preset.title}
            </span>
            <span className="text-[9.5px] font-mono font-bold text-muted-foreground/80 bg-muted/60 px-1 py-0.2 rounded shrink-0">
              {preset.slots}×
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5 leading-none truncate w-full text-center font-mono" dir="ltr">
            {preset.spec}
          </span>
        </div>
      </button>
    );
  };

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

      {/* 🧭 شريط التحكم الذكي: قائمة التصنيف المنسدلة + زر تبديل نمط العرض (قائمة / شبكة) */}
      {!searchQuery && (
        <div className="flex items-center gap-1.5 select-none">
          {/* قائمة التصنيف المنسدلة وفق Fluent 2 — لا حشر ولا انقطاع */}
          <div className="flex-1 min-w-0">
            <Select
              value={presetCategory}
              onValueChange={(val) => onPresetCategoryChange(val as CollagePresetCategory)}
            >
              <SelectTrigger className="w-full h-8 px-2.5 text-xs font-bold bg-card border-border/80 rounded-lg shadow-2xs hover:bg-muted/40 transition-all cursor-pointer">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <currentCat.icon className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                  <span className="truncate">{currentCat.label}</span>
                  {currentCat.badgeCount !== undefined && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {currentCat.badgeCount}
                    </span>
                  )}
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="font-cairo min-w-[210px] rounded-xl border border-border bg-popover shadow-fluent-16">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold cursor-pointer py-2">
                      <div className="flex items-center justify-between w-full gap-2 min-w-[170px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 text-primary shrink-0" weight="duotone" />
                          <span className="truncate">{cat.label}</span>
                        </div>
                        {cat.badgeCount !== undefined && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold shrink-0">
                            {cat.badgeCount}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* زر التبديل بين نمط القائمة العريضة ونمط الشبكة */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="عرض قائمة مفصلة (مظهر كامل وعريض)"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              <List className="w-4 h-4" weight={viewMode === "list" ? "bold" : "regular"} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="عرض شبكي مصغر (بطاقات ثنائية)"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              <SquaresFour className="w-4 h-4" weight={viewMode === "grid" ? "bold" : "regular"} />
            </button>
          </div>
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
                viewMode === "list" ? (
                  <div className="space-y-1.5">
                    {searchResults.official.map(renderListCard)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.official.map(renderGridCard)}
                  </div>
                )
              )}

              {/* نتائج القوالب المحفوظة */}
              {searchResults.saved.length > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-border/40">
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
                            ? "border-primary bg-primary/[0.09] text-primary font-bold shadow-xs ring-1 ring-primary/30"
                            : "bg-card border-border/70 hover:bg-muted/40 hover:border-primary/40 hover:shadow-2xs text-foreground active:scale-[0.99]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
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
                className="mt-1 h-7.5 px-3 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border/60 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-2xs"
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
                        ? "border-primary bg-primary/[0.09] text-primary font-bold shadow-xs ring-1 ring-primary/30"
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
      ) : presetCategory === "all" ? (
        /* 🌐 عرض كافة القوالب مقسمة حسب الفئات في نمط القائمة أو الشبكة */
        <div className="space-y-3.5">
          {groupedSections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title} className="space-y-1.5">
                {/* ترويسة القسم الأنيقة */}
                <div className="flex items-center justify-between text-xs font-bold text-foreground/80 px-1 pt-1 select-none border-b border-border/40 pb-1">
                  <div className="flex items-center gap-1.5">
                    <SectionIcon className="w-3.5 h-3.5 text-primary" weight="duotone" />
                    <span>{section.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded font-bold" dir="ltr">
                    {section.presets.length}
                  </span>
                </div>

                {/* بطاقات القسم */}
                {viewMode === "list" ? (
                  <div className="space-y-1.5">
                    {section.presets.map(renderListCard)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {section.presets.map(renderGridCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 🎴 عرض فئة محددة */
        <div className={viewMode === "list" ? "space-y-1.5" : "grid grid-cols-2 gap-2"}>
          {activePresetsList.map(viewMode === "list" ? renderListCard : renderGridCard)}
        </div>
      )}
    </div>
  );
}
