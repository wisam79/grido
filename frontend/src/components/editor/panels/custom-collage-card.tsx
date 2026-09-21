import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { GridFour, MagicWand } from "@phosphor-icons/react";
import { getCollageToolsForWorkflow, type CollageTab } from "@/lib/workspace-tools";
import { CollageTemplate } from "@/lib/templates";
import { FreeformCollageModal } from "@/features/freeform-collage";
import { FluentSegmentedControl } from "@/components/ui/blocks";
import {
  PhotoGridType,
  GridAlignment,
  getGridLimits,
  getPhotoDimensions,
  buildPhysicalGridCells,
  buildStretchGridCells,
  NormalizedCell,
} from "./collage/collage-grid-math";
import {
  STUDIO_COMBO_PRESETS,
  STUDIO_KEEPSAKE_PRESETS,
  CollagePresetCategory,
} from "./collage/collage-preset-data";
import { CollagePresetsTab } from "./collage/collage-presets-tab";
import { CollageCustomGridTab } from "./collage/collage-custom-grid-tab";
import { CollagePaperToolsTab } from "./collage/collage-paper-tools-tab";
import { CollageAutofillTab } from "./collage/collage-autofill-tab";
import { CollageBackdropTab } from "./collage/collage-backdrop-tab";
import { CollageArrangeTab } from "./collage/collage-arrange-tab";
import { CollageLayersTab } from "./collage/collage-layers-tab";

interface CustomCollageCardProps {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
  onSaveTemplate: (name: string, cells: NormalizedCell[]) => void;
  savedTemplates?: CollageTemplate[];
  onDeleteTemplate?: (id: string, e: React.MouseEvent) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  activeTab?: CollageTab;
  onActiveTabChange?: (tab: CollageTab) => void;
  showInternalTabs?: boolean;
}

const CustomCollageCard = React.memo(function CustomCollageCard({
  onSelect,
  activeTemplateId,
  onSaveTemplate,
  savedTemplates = [],
  onDeleteTemplate,
  fileInputRef,
  activeTab: propActiveTab,
  onActiveTabChange,
  showInternalTabs = false,
}: CustomCollageCardProps) {
  const { canvasWidth, canvasHeight, printSettings, collageTemplate, workflowMode } =
    useEditorStore(
      useShallow((state) => ({
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        printSettings: state.printSettings,
        collageTemplate: state.collageTemplate,
        workflowMode: state.workflowMode,
      }))
    );

  const storedDpi = printSettings?.dpi || 300;

  // التبويب الرئيسي للوحة الكولاج (الشبكة افتراضياً)
  const [localActiveTab, setLocalActiveTab] = useState<CollageTab>("custom");
  const effectiveTab = propActiveTab ?? localActiveTab;

  const handleTabChange = useCallback(
    (nextTab: CollageTab) => {
      setLocalActiveTab(nextTab);
      onActiveTabChange?.(nextTab);
      if (nextTab === "freeform") {
        setShowFreeformModal(true);
      }
    },
    [onActiveTabChange]
  );

  // تصنيف النماذج السريعة
  const [presetCategory, setPresetCategory] = useState<CollagePresetCategory>("all");

  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(4);
  const [photoType, setPhotoType] = useState<PhotoGridType>("iq-national-id");
  const [gridAlign, setGridAlign] = useState<GridAlignment>("top-left");
  const [showFreeformModal, setShowFreeformModal] = useState(false);

  const isCustomActive = activeTemplateId === "collage-custom";
  const isFreeformActive = typeof activeTemplateId === "string" && activeTemplateId.startsWith("freeform-");

  // تحديث التبويب النشط وفئة القالب تلقائياً عند تغيير القالب لاحقاً من قبل المستخدم
  // مع الحفاظ الإجباري على "الشبكة" (custom) كتبويب افتراضي عند فتح التطبيق
  const isInitialMount = useRef(true);
  const [prevTemplateId, setPrevTemplateId] = useState<string | null | undefined>(activeTemplateId);
  if (isInitialMount.current) {
    isInitialMount.current = false;
  } else if (activeTemplateId !== prevTemplateId) {
    setPrevTemplateId(activeTemplateId);
    if (activeTemplateId) {
      if (isCustomActive) {
        setLocalActiveTab("custom");
        onActiveTabChange?.("custom");
      } else if (isFreeformActive) {
        setLocalActiveTab("freeform");
        onActiveTabChange?.("freeform");
      } else if (savedTemplates.some((p) => p.id === activeTemplateId)) {
        setLocalActiveTab("presets");
        onActiveTabChange?.("presets");
        setPresetCategory("saved");
      } else if (STUDIO_COMBO_PRESETS.some((p) => p.id === activeTemplateId)) {
        setLocalActiveTab("presets");
        onActiveTabChange?.("presets");
        setPresetCategory("combo");
      } else if (STUDIO_KEEPSAKE_PRESETS.some((p) => p.id === activeTemplateId)) {
        setLocalActiveTab("presets");
        onActiveTabChange?.("presets");
        setPresetCategory("keepsake");
      }
    }
  }

  // مزامنة حالة عناصر التحكم المحلية مع القالب النشط حالياً على الكانفس
  useEffect(() => {
    if (!collageTemplate) return;
    if (collageTemplate.physicalLayout) {
      const pl = collageTemplate.physicalLayout;
      if (pl.rows) setRows(pl.rows);
      if (pl.cols) setCols(pl.cols);
      if (pl.type) setPhotoType(pl.type as PhotoGridType);
      if (pl.align) setGridAlign(pl.align as GridAlignment);
    } else if (collageTemplate.cells && collageTemplate.cells.length > 0) {
      const count = collageTemplate.cells.length;
      if (count === 4) { setRows(2); setCols(2); }
      else if (count === 6) { setRows(2); setCols(3); }
      else if (count === 8) { setRows(2); setCols(4); }
      else if (count === 9) { setRows(3); setCols(3); }
      else if (count === 12) { setRows(3); setCols(4); }
    }
  }, [collageTemplate]);

  const applyCustomCollage = useCallback(
    (
      targetRows: number,
      targetCols: number,
      customPhotoType?: PhotoGridType,
      customAlign?: GridAlignment
    ) => {
      const activePhotoType = customPhotoType ?? photoType;
      const activeAlign = customAlign ?? gridAlign;

      if (activePhotoType === "stretch") {
        onSelect({
          id: "collage-custom",
          name: `كولاج مخصص (${targetRows}×${targetCols})`,
          slots: targetRows * targetCols,
          cells: buildStretchGridCells(targetRows, targetCols),
          icon: GridFour,
        });
        return;
      }

      const { label } = getPhotoDimensions(activePhotoType);

      onSelect({
        id: "collage-custom",
        name: `كولاج ${label} (${targetRows}×${targetCols})`,
        slots: targetRows * targetCols,
        cells: buildPhysicalGridCells(activePhotoType, targetRows, targetCols, activeAlign, canvasWidth, canvasHeight, storedDpi),
        icon: GridFour,
        physicalLayout: {
          type: activePhotoType,
          rows: targetRows,
          cols: targetCols,
          align: activeAlign,
        },
      });
    },
    [canvasWidth, canvasHeight, photoType, gridAlign, onSelect, storedDpi]
  );

  // تطبيق موحّد بنداء واحد: يزامن عناصر التحكم المحلية ثم يطبّق الشبكة مرة واحدة
  // (كانت التعبئة السريعة تطلق ثلاثة تطبيقات متتالية فتلوّث سجل التراجع بحالات وسيطة)
  const handleApplyFromTab = useCallback(
    (r: number, c: number, customPhotoType?: PhotoGridType, customAlign?: GridAlignment) => {
      setRows(r);
      setCols(c);
      if (customPhotoType) setPhotoType(customPhotoType);
      if (customAlign) setGridAlign(customAlign);
      applyCustomCollage(r, c, customPhotoType, customAlign);
    },
    [applyCustomCollage]
  );

  const handleSaveCurrentAsTemplate = useCallback(
    (name: string) => {
      const cells =
        photoType === "stretch"
          ? buildStretchGridCells(rows, cols)
          : buildPhysicalGridCells(photoType, rows, cols, gridAlign, canvasWidth, canvasHeight, storedDpi);
      onSaveTemplate(name, cells);
    },
    [photoType, rows, cols, gridAlign, canvasWidth, canvasHeight, storedDpi, onSaveTemplate]
  );

  const handleExportAllSaved = useCallback(() => {
    if (savedTemplates.length === 0) {
      toast.info("لا توجد قوالب لتصديرها");
      return;
    }
    try {
      const exportData = savedTemplates.map((t) => ({ name: t.name, cells: t.cells }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grido-templates-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تصدير القوالب");
    } catch {
      toast.error("فشل التصدير");
    }
  }, [savedTemplates]);

  // تصحيح الحدود القصوى عند تبديل المقاس أو نوع الصورة
  useEffect(() => {
    const { maxRows, maxCols } = getGridLimits(photoType, canvasWidth, canvasHeight, storedDpi);
    let changed = false;
    let adjustedRows = rows;
    let adjustedCols = cols;
    if (rows > maxRows) { adjustedRows = maxRows; changed = true; }
    if (cols > maxCols) { adjustedCols = maxCols; changed = true; }
    if (changed) {
      setRows(adjustedRows);
      setCols(adjustedCols);
      // يُمنع استدعاء applyCustomCollage إلا إذا كان المستخدم فعلياً في تبويب الشبكة والقالب النشط مخصص
      if (effectiveTab === "custom" && isCustomActive) {
        applyCustomCollage(adjustedRows, adjustedCols, photoType, gridAlign);
      }
    }
  }, [photoType, canvasWidth, canvasHeight, rows, cols, applyCustomCollage, gridAlign, storedDpi, effectiveTab, isCustomActive]);

  // تبويبات الشاشات المدمجة تتبع نفس قائمة الأدوات المستخدمة في الشريط
  const collageTabOptions = useMemo(() => getCollageToolsForWorkflow(workflowMode).map((tool) => {
    const isInUse =
      tool.badge === "collage-grid"
        ? isCustomActive
        : tool.badge === "collage-freeform"
          ? isFreeformActive
          : false;
    return {
      id: tool.id,
      label: tool.label,
      icon: <tool.icon className="w-5 h-5 text-primary" weight="duotone" />,
      tooltip: tool.title,
      badge: isInUse ? (
        <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/30 animate-pulse" />
      ) : undefined,
    };
  }), [isCustomActive, isFreeformActive, workflowMode]);

  return (
    <div className="flex flex-col gap-2.5 font-cairo" dir="rtl">
      {/* 🧭 شريط تبويبات الكولاج للشاشات المدمجة — يُبنى من سجل الأدوات فلا
          تبقى أداة جديدة غير قابلة للوصول عند ضيق النافذة، ويمرّ أفقياً عند الحاجة */}
      {showInternalTabs && (
        <div className="overflow-x-auto pb-0.5 -mb-0.5">
          <FluentSegmentedControl
            layoutId="collage-main-tabs"
            fullWidth={false}
            options={collageTabOptions}
            value={effectiveTab}
            onChange={(val) => handleTabChange(val as CollageTab)}
            size="sm"
          />
        </div>
      )}

      {/* 1️⃣ تبويب تخصيص الشبكة الذاتي (صفوف وأعمدة ومقاسات رسمية) */}
      {effectiveTab === "custom" && (
        <CollageCustomGridTab
          rows={rows}
          cols={cols}
          photoType={photoType}
          gridAlign={gridAlign}
          isCustomActive={isCustomActive}
          canvasWidth={canvasWidth || 2480}
          canvasHeight={canvasHeight || 3508}
          storedDpi={storedDpi}
          onRowsChange={(r) => {
            // تطبيق فوري بقيمة نهائية واحدة — لا حالة قديمة ولا خطوات تراجع متعددة
            setRows(r);
            applyCustomCollage(r, cols, photoType, gridAlign);
          }}
          onColsChange={(c) => {
            setCols(c);
            applyCustomCollage(rows, c, photoType, gridAlign);
          }}
          onApply={handleApplyFromTab}
          onPhotoTypeChange={(t) => {
            setPhotoType(t);
            applyCustomCollage(rows, cols, t, gridAlign);
          }}
          onGridAlignChange={(a) => {
            setGridAlign(a);
            applyCustomCollage(rows, cols, photoType, a);
          }}
          onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
        />
      )}

      {/* 2️⃣ تبويب القوالب المنسقة + المحفوظات */}
      {effectiveTab === "presets" && (
        <CollagePresetsTab
          presetCategory={presetCategory}
          onPresetCategoryChange={setPresetCategory}
          activeTemplateId={activeTemplateId}
          onSelect={onSelect}
          savedTemplates={savedTemplates}
          onDeleteTemplate={onDeleteTemplate}
          onImportClick={() => fileInputRef?.current?.click()}
          onExportAllClick={handleExportAllSaved}
        />
      )}

      {/* 3️⃣ تبويب الكولاج الحر بالملم */}
      {effectiveTab === "freeform" && (
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs fluent-specular flex flex-col items-center text-center gap-2.5 animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shadow-2xs">
            <MagicWand className="w-6 h-6" weight="duotone" />
          </div>
          <span className="font-bold text-xs text-foreground">كولاج حر</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-micro text-muted-foreground select-none">
            <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40 font-mono">mm</span>
            <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">تحديد متعدد</span>
            <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">تعبئة ذكية</span>
            <span className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/40">تصدير/استيراد</span>
          </div>
          <p className="text-micro text-muted-foreground leading-relaxed">
            ارسم شبكتك بالمليمتر: تقسيم، محاذاة، مغناطيس
          </p>
          <button
            type="button"
            onClick={() => setShowFreeformModal(true)}
            className="w-full h-8 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none mt-1"
          >
            <MagicWand className="w-4 h-4" weight="bold" />
            <span>فتح المحرر</span>
          </button>
        </div>
      )}

      {/* 4️⃣ ورق وقص — جاهزية الطباعة (نزيف/قص/نسخ/إرشادات) */}
      {effectiveTab === "paper" && <CollagePaperToolsTab />}

      {/* 5️⃣ معالج التعبئة التلقائية */}
      {effectiveTab === "autofill" && <CollageAutofillTab />}

      {/* 6️⃣ خلفية وحدود الشبكة */}
      {effectiveTab === "backdrop" && <CollageBackdropTab />}

      {/* 7️⃣ فرز وترتيب الخانات */}
      {effectiveTab === "arrange" && <CollageArrangeTab />}

      {/* 8️⃣ طبقات الخانات — نظرة عامة وتحديد وإفراغ */}
      {effectiveTab === "layers" && <CollageLayersTab />}

      <FreeformCollageModal open={showFreeformModal} onOpenChange={setShowFreeformModal} />
    </div>
  );
});

export { CustomCollageCard };
