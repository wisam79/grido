import React, { useState, useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Lightning, GridFour, Folder, Plus } from "@phosphor-icons/react";
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
import { STUDIO_SINGLE_ROW_PRESETS, STUDIO_FULL_SHEET_PRESETS } from "./collage/collage-preset-data";
import { CollagePresetsTab } from "./collage/collage-presets-tab";
import { CollageCustomGridTab } from "./collage/collage-custom-grid-tab";
import { CollageLibraryTab } from "./collage/collage-library-tab";

interface CustomCollageCardProps {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
  onSaveTemplate: (name: string, cells: NormalizedCell[]) => void;
  savedTemplates?: CollageTemplate[];
  onDeleteTemplate?: (id: string, e: React.MouseEvent) => void;
  onOpenTemplatesDialog?: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

const CustomCollageCard = React.memo(function CustomCollageCard({
  onSelect,
  activeTemplateId,
  onSaveTemplate,
  savedTemplates = [],
  onDeleteTemplate,
  onOpenTemplatesDialog,
  fileInputRef,
}: CustomCollageCardProps) {
  const { canvasWidth, canvasHeight, printSettings, collageTemplate, backgroundColor, setBackgroundColor } =
    useEditorStore(
      useShallow((state) => ({
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        printSettings: state.printSettings,
        collageTemplate: state.collageTemplate,
        backgroundColor: state.backgroundColor,
        setBackgroundColor: state.setBackgroundColor,
      }))
    );

  const storedDpi = printSettings?.dpi || 300;

  // التبويب الرئيسي للوحة الكولاج (3-Tab Navigation)
  const [activeTab, setActiveTab] = useState<"presets" | "custom" | "library">("presets");

  // تصنيف النماذج السريعة
  const [presetCategory, setPresetCategory] = useState<"row" | "full">("row");

  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(4);
  const [photoType, setPhotoType] = useState<PhotoGridType>("iq-national-id");
  const [gridAlign, setGridAlign] = useState<GridAlignment>("top-left");
  const [showFreeformModal, setShowFreeformModal] = useState(false);

  const isCustomActive =
    activeTemplateId === "collage-custom" ||
    (typeof activeTemplateId === "string" && activeTemplateId.startsWith("freeform-"));

  // تحديث التبويب النشط بناء على القالب الحالي
  // 🛡️ نمط "ضبط الحالة أثناء الرسم" المعتمد رسمياً في React بدل useEffect —
  // يتجنّب الرندر المتتالي (cascading render) ويزامن فوراً مع تغير القالب
  // 🛡️ نبدأ بـ null لضمان تنفيذ الضبط في أول رسم أيضاً (سلوك مطابق لـ
  // useEffect القديم الذي كان يعمل عند التركيب) دون رندر متتالي
  const [prevTemplateId, setPrevTemplateId] = useState<string | null | undefined>(null);
  if (activeTemplateId !== prevTemplateId) {
    setPrevTemplateId(activeTemplateId);
    if (activeTemplateId) {
      if (isCustomActive) {
        setActiveTab("custom");
      } else if (STUDIO_SINGLE_ROW_PRESETS.some((p) => p.id === activeTemplateId)) {
        setPresetCategory("row");
      } else if (STUDIO_FULL_SHEET_PRESETS.some((p) => p.id === activeTemplateId)) {
        setPresetCategory("full");
      }
    }
  }

  // مزامنة حالة عناصر التحكم المحلية مع القالب النشط حالياً على الكانفس
  useEffect(() => {
    if (!collageTemplate) return;
    queueMicrotask(() => {
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
    });
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

  // ضبط الصفوف/الأعمدة تلقائياً عند تغيّر حدود الورقة أو مقاس الصورة
  useEffect(() => {
    const { maxRows: currentMaxRows, maxCols: currentMaxCols } = getGridLimits(photoType, canvasWidth, canvasHeight, storedDpi);
    let changed = false;
    let adjustedRows = rows;
    let adjustedCols = cols;

    if (rows > currentMaxRows) {
      adjustedRows = currentMaxRows;
      changed = true;
    }
    if (cols > currentMaxCols) {
      adjustedCols = currentMaxCols;
      changed = true;
    }

    if (changed) {
      queueMicrotask(() => {
        setRows(adjustedRows);
        setCols(adjustedCols);
        applyCustomCollage(adjustedRows, adjustedCols, photoType, gridAlign);
      });
    }
  }, [photoType, canvasWidth, canvasHeight, rows, cols, applyCustomCollage, gridAlign, storedDpi]);

  return (
    <div className="flex flex-col gap-3 font-cairo" dir="rtl">
      {/* 🧭 شريط التبويبات الثلاثي الذكي للعمود الأيمن */}
      <div className="bg-muted/50 p-1 rounded-xl border border-border/60 shadow-2xs">
        <FluentSegmentedControl
          options={[
            {
              id: "presets",
              label: "نماذج سريعة",
              icon: <Lightning className="w-4 h-4 text-amber-500" weight="fill" />,
            },
            {
              id: "custom",
              label: "تخصيص الشبكة",
              icon: <Plus className="w-4 h-4 text-primary" weight="bold" />,
              badge: isCustomActive ? <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> : undefined,
            },
            {
              id: "library",
              label: "مكتبتي",
              icon: <Folder className="w-4 h-4 text-primary" weight="duotone" />,
              badge: savedTemplates.length > 0 ? (
                <span className="text-[9px] bg-primary/20 text-primary font-bold px-1 rounded-full">
                  {savedTemplates.length}
                </span>
              ) : undefined,
            },
          ]}
          value={activeTab}
          onChange={(val) => setActiveTab(val as "presets" | "custom" | "library")}
          size="sm"
        />
      </div>

      {activeTab === "presets" && (
        <CollagePresetsTab
          presetCategory={presetCategory}
          onPresetCategoryChange={setPresetCategory}
          activeTemplateId={activeTemplateId}
          onSelect={onSelect}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
        />
      )}

      {activeTab === "custom" && (
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
            setRows(r);
            applyCustomCollage(r, cols);
          }}
          onColsChange={(c) => {
            setCols(c);
            applyCustomCollage(rows, c);
          }}
          onApply={applyCustomCollage}
          onPhotoTypeChange={(t) => {
            setPhotoType(t);
            applyCustomCollage(rows, cols, t);
          }}
          onGridAlignChange={(a) => {
            setGridAlign(a);
            applyCustomCollage(rows, cols, photoType, a);
          }}
          onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
        />
      )}

      {activeTab === "library" && (
        <CollageLibraryTab
          savedTemplates={savedTemplates}
          activeTemplateId={activeTemplateId}
          onSelect={onSelect}
          onDeleteTemplate={onDeleteTemplate}
          onOpenFreeformModal={() => setShowFreeformModal(true)}
          onImportClick={() => fileInputRef?.current?.click()}
          onOpenTemplatesDialog={onOpenTemplatesDialog}
        />
      )}

      <FreeformCollageModal open={showFreeformModal} onOpenChange={setShowFreeformModal} />
    </div>
  );
});

export { CustomCollageCard };
