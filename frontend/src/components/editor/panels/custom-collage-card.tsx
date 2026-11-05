import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { FluentSegmentedControl } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { GridFour } from '@/components/ui/icons';
import { setFreeformDialogOpen } from '@/features/freeform-collage/lib/freeform-dialog-state';
import { getTemplateGrid } from '@/lib/canvas/collage-grid';
import { useEditorStore } from '@/lib/editor-store';
import { downloadJsonFile } from '@/lib/io/download';
import { getCollageSectionForTab, type CollageTab } from '@/lib/workspace-tools';
import { CollageArrangeTab } from './collage/collage-arrange-tab';
import { CollageAutofillTab } from './collage/collage-autofill-tab';
import { CollageCustomGridTab } from './collage/collage-custom-grid-tab';
import {
  getGridLimits,
  getPhotoDimensions,
  buildPhysicalGridCells,
  buildStretchGridCells,
} from './collage/collage-grid-math';
import { CollagePaperToolsTab } from './collage/collage-paper-tools-tab';
import { CollagePresetsTab } from './collage/collage-presets-tab';
import type { PhotoGridType, GridAlignment, NormalizedCell } from './collage/collage-grid-math';
import type { CollagePresetCategory } from './collage/collage-preset-data';
import type { CollageTemplate } from '@/lib/templates';

interface CustomCollageCardProps {
  onSelect: (t: CollageTemplate) => void;
  activeTemplateId: string | undefined;
  onSaveTemplate: (name: string, cells: NormalizedCell[]) => void;
  savedTemplates?: CollageTemplate[];
  onDeleteTemplate?: (id: string, e: React.MouseEvent) => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  activeTab?: CollageTab;
  onActiveTabChange?: (tab: CollageTab) => void;
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
}: CustomCollageCardProps) {
  const { canvasWidth, canvasHeight, printSettings, collageTemplate, collageGap, collageMargin } =
    useEditorStore(
      useShallow((state) => ({
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        printSettings: state.printSettings,
        collageTemplate: state.collageTemplate,
        collageGap: state.collageGap,
        collageMargin: state.collageMargin,
      })),
    );

  const storedDpi = printSettings?.dpi || 300;

  // التبويب الرئيسي للوحة الكولاج (الشبكة افتراضياً)
  const [localActiveTab, setLocalActiveTab] = useState<CollageTab>('custom');
  const effectiveTab = propActiveTab ?? localActiveTab;

  const handleTabChange = useCallback(
    (nextTab: CollageTab) => {
      setLocalActiveTab(nextTab);
      onActiveTabChange?.(nextTab);
    },
    [onActiveTabChange],
  );

  // تصنيف النماذج السريعة
  const [presetCategory, setPresetCategory] = useState<CollagePresetCategory>('saved');

  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(1);
  const [photoType, setPhotoType] = useState<PhotoGridType>('iq-civil-id');
  const [gridAlign, setGridAlign] = useState<GridAlignment>('top-left');

  const isCustomActive = activeTemplateId === 'collage-custom';
  const isFreeformActive =
    typeof activeTemplateId === 'string' && activeTemplateId.startsWith('freeform-');
  const resumableLayout =
    collageTemplate?.metadata?.kind === 'freeform' || collageTemplate?.id.startsWith('freeform-')
      ? collageTemplate
      : null;
  const previewHeight =
    (100 * (resumableLayout?.metadata?.paperHeightMM ?? canvasHeight)) /
    (resumableLayout?.metadata?.paperWidthMM ?? canvasWidth);

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
        setLocalActiveTab('custom');
        onActiveTabChange?.('custom');
      } else if (isFreeformActive) {
        setLocalActiveTab('freeform');
        onActiveTabChange?.('freeform');
      } else if (savedTemplates.some((p) => p.id === activeTemplateId)) {
        setLocalActiveTab('presets');
        onActiveTabChange?.('presets');
        setPresetCategory('saved');
      }
    }
  }

  // شبكة القالب المطبقة فعلياً على الكانفس — تُشتق من الإحداثيات لا من تعداد
  // حالات ثابت (كان 4/6/8/9/12 فقط يترك أي عدد آخر بقيم قديمة في النموذج)
  const appliedGrid = useMemo(() => getTemplateGrid(collageTemplate), [collageTemplate]);

  // مزامنة حالة عناصر التحكم المحلية مع القالب النشط حالياً على الكانفس
  useEffect(() => {
    if (!collageTemplate) return;
    if (appliedGrid) {
      setRows(appliedGrid.rows);
      setCols(appliedGrid.cols);
    }
    const pl = collageTemplate.physicalLayout;
    if (pl?.type) setPhotoType(pl.type as PhotoGridType);
    if (pl?.align) setGridAlign(pl.align as GridAlignment);
  }, [collageTemplate, appliedGrid]);

  const applyCustomCollage = useCallback(
    (
      targetRows: number,
      targetCols: number,
      customPhotoType?: PhotoGridType,
      customAlign?: GridAlignment,
    ) => {
      const activePhotoType = customPhotoType ?? photoType;
      const activeAlign = customAlign ?? gridAlign;

      if (activePhotoType === 'stretch') {
        onSelect({
          id: 'collage-custom',
          name: `كولاج مخصص (${targetRows}×${targetCols})`,
          slots: targetRows * targetCols,
          cells: buildStretchGridCells(targetRows, targetCols),
          icon: GridFour,
        });
        return;
      }

      const { label } = getPhotoDimensions(activePhotoType);

      onSelect({
        id: 'collage-custom',
        name: `كولاج ${label} (${targetRows}×${targetCols})`,
        slots: targetRows * targetCols,
        cells: buildPhysicalGridCells(
          activePhotoType,
          targetRows,
          targetCols,
          activeAlign,
          canvasWidth,
          canvasHeight,
          storedDpi,
          collageGap,
          collageMargin,
        ),
        icon: GridFour,
        physicalLayout: {
          type: activePhotoType,
          rows: targetRows,
          cols: targetCols,
          align: activeAlign,
        },
      });
    },
    [
      canvasWidth,
      canvasHeight,
      photoType,
      gridAlign,
      onSelect,
      storedDpi,
      collageGap,
      collageMargin,
    ],
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
    [applyCustomCollage],
  );

  const handleSaveCurrentAsTemplate = useCallback(
    (name: string) => {
      const cells =
        photoType === 'stretch'
          ? buildStretchGridCells(rows, cols)
          : buildPhysicalGridCells(
              photoType,
              rows,
              cols,
              gridAlign,
              canvasWidth,
              canvasHeight,
              storedDpi,
              collageGap,
              collageMargin,
            );
      onSaveTemplate(name, cells);
    },
    [
      photoType,
      rows,
      cols,
      gridAlign,
      canvasWidth,
      canvasHeight,
      storedDpi,
      collageGap,
      collageMargin,
      onSaveTemplate,
    ],
  );

  const handleExportAllSaved = useCallback(() => {
    if (savedTemplates.length === 0) {
      toast.info('لا توجد قوالب لتصديرها');
      return;
    }
    try {
      const exportData = savedTemplates.map((t) => ({ name: t.name, cells: t.cells }));
      downloadJsonFile(exportData, `grido-templates-${Date.now()}.json`);
      toast.success('تم تصدير القوالب');
    } catch {
      toast.error('فشل التصدير');
    }
  }, [savedTemplates]);

  // تصحيح الحدود القصوى عند تبديل المقاس أو نوع الصورة أو المسافات
  useEffect(() => {
    const { maxRows, maxCols } = getGridLimits(
      photoType,
      canvasWidth,
      canvasHeight,
      storedDpi,
      collageGap,
      collageMargin,
    );
    let changed = false;
    let adjustedRows = rows;
    let adjustedCols = cols;
    if (rows > maxRows) {
      adjustedRows = maxRows;
      changed = true;
    }
    if (cols > maxCols) {
      adjustedCols = maxCols;
      changed = true;
    }
    if (changed) {
      setRows(adjustedRows);
      setCols(adjustedCols);
      // يُمنع استدعاء applyCustomCollage إلا إذا كان المستخدم فعلياً في تبويب الشبكة والقالب النشط مخصص
      if (effectiveTab === 'custom' && isCustomActive) {
        applyCustomCollage(adjustedRows, adjustedCols, photoType, gridAlign);
      }
    }
  }, [
    photoType,
    canvasWidth,
    canvasHeight,
    rows,
    cols,
    applyCustomCollage,
    gridAlign,
    storedDpi,
    collageGap,
    collageMargin,
    effectiveTab,
    isCustomActive,
  ]);

  // 🧭 تبويبات الوجهة النشطة — تظهر دائماً (سطح مكتب وcompact) لأن الوجهة
  // سطح واحد وتبويباتها تفاصيلها. تُبنى من وجهة التبويب نفسها فلا تُعرض
  // تبويبات وجهة أخرى، ووجهة «القص» ذات التبويب الواحد تختفي تلقائياً.
  const activeSection = useMemo(() => getCollageSectionForTab(effectiveTab), [effectiveTab]);
  const collageTabOptions = useMemo(
    () =>
      activeSection.tabs.map((tool) => ({
        id: tool.id,
        label: tool.label,
        tooltip: tool.title,
      })),
    [activeSection],
  );

  return (
    <div className="flex min-w-0 flex-col gap-2 font-cairo" dir="rtl">
      {collageTabOptions.length > 1 && (
        <div className="sticky top-0 z-20 -mx-3 bg-sidebar px-3 pb-2">
          <FluentSegmentedControl
            layoutId={`collage-section-tabs-${activeSection.id}`}
            idPrefix={`collage-section-${activeSection.id}`}
            ariaLabel={activeSection.title}
            variant="tabs"
            size="md"
            options={collageTabOptions}
            value={effectiveTab}
            onChange={(val) => handleTabChange(val as CollageTab)}
          />
        </div>
      )}

      {collageTabOptions.length > 1 &&
        collageTabOptions
          .filter((tab) => tab.id !== effectiveTab)
          .map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              id={`collage-section-${activeSection.id}-content-${tab.id}`}
              aria-labelledby={`collage-section-${activeSection.id}-trigger-${tab.id}`}
              hidden
            />
          ))}
      <div
        role={collageTabOptions.length > 1 ? 'tabpanel' : undefined}
        id={`collage-section-${activeSection.id}-content-${effectiveTab}`}
        aria-labelledby={
          collageTabOptions.length > 1
            ? `collage-section-${activeSection.id}-trigger-${effectiveTab}`
            : undefined
        }
        className="min-w-0"
      >
        {/* 1️⃣ تبويب تخصيص الشبكة الذاتي (صفوف وأعمدة ومقاسات رسمية) */}
        {effectiveTab === 'custom' && (
          <CollageCustomGridTab
            rows={rows}
            cols={cols}
            photoType={photoType}
            gridAlign={gridAlign}
            isCustomActive={isCustomActive}
            appliedGrid={appliedGrid}
            canvasWidth={canvasWidth || 2480}
            canvasHeight={canvasHeight || 3508}
            storedDpi={storedDpi}
            gapPx={collageGap}
            marginPx={collageMargin}
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
        {effectiveTab === 'presets' && (
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

        {effectiveTab === 'freeform' && (
          <div className="flex flex-col gap-3 py-1">
            <Button type="button" className="w-full" onClick={() => setFreeformDialogOpen(true)}>
              {resumableLayout ? 'تحرير التخطيط' : 'فتح المحرر'}
            </Button>
            {resumableLayout ? (
              <figure className="space-y-2">
                <div className="flex h-48 items-center justify-center rounded-md bg-muted/60 p-3">
                  <svg
                    viewBox={`-1 -1 102 ${previewHeight + 2}`}
                    className="h-full max-w-full"
                    role="img"
                    aria-label={`التخطيط المطبق: ${resumableLayout.name}`}
                  >
                    <rect
                      width="100"
                      height={previewHeight}
                      className="fill-background stroke-muted-foreground/60"
                    />
                    {resumableLayout.cells.map((cell, index) => (
                      <rect
                        key={index}
                        x={cell.x * 100}
                        y={cell.y * previewHeight}
                        width={cell.w * 100}
                        height={cell.h * previewHeight}
                        transform={
                          cell.rotation
                            ? `rotate(${cell.rotation} ${(cell.x + cell.w / 2) * 100} ${(cell.y + cell.h / 2) * previewHeight})`
                            : undefined
                        }
                        className="fill-primary/25 stroke-primary"
                        strokeWidth="0.75"
                      />
                    ))}
                  </svg>
                </div>
                <figcaption className="flex items-start justify-between gap-2 text-control">
                  <span className="min-w-0 break-words font-medium">{resumableLayout.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {resumableLayout.cells.length} خانات
                  </span>
                </figcaption>
              </figure>
            ) : (
              <p className="text-control text-muted-foreground leading-relaxed">
                يبدأ بورقة جديدة؛ يبقى الكولاج الحالي حتى تطبيق التخطيط.
              </p>
            )}
          </div>
        )}

        {/* 4️⃣ ورق وقص — جاهزية الطباعة (نزيف/قص/نسخ/إرشادات) */}
        {effectiveTab === 'paper' && <CollagePaperToolsTab />}

        {/* 5️⃣ معالج التعبئة التلقائية */}
        {effectiveTab === 'autofill' && <CollageAutofillTab />}

        {/* 6️⃣ فرز وترتيب الخانات */}
        {effectiveTab === 'arrange' && <CollageArrangeTab />}
      </div>
    </div>
  );
});

export { CustomCollageCard };
