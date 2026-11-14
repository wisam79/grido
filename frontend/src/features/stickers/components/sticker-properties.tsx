import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { FluentSegmentedControl } from '@/components/ui/blocks';
import { StickerDesignTab } from './sticker-design-tab';
import { StickerPresetsTab } from './sticker-presets-tab';
import { StickerSheetTab } from './sticker-sheet-tab';
import {
  loadStickerPresets,
  saveStickerPreset,
  deleteStickerPreset,
  getPresetsForTemplate,
} from '../lib/preset-utils';
import { autoFitSheetGrid } from '../lib/sheet-generator';
import { contrastRatio, textColorRoles } from '../lib/sticker-a11y';
import { buildStickerSvg } from '../lib/sticker-design/build-svg';
import { getStickerFontWeights } from '../lib/sticker-font-embed';

import type { StickerTemplate, StickerParams, SheetGridConfig, StickerUserPreset } from '../types';

export interface StickerPropertiesProps {
  template: StickerTemplate;
  params: StickerParams;
  onChangeParams: (updater: (prev: StickerParams) => StickerParams) => void;
  /** التزام صريح كخطوة تراجع مستقلة (لوحات جاهزة، قوالب محفوظة، تبديل الخط) */
  onCommitParams?: (updater: (prev: StickerParams) => StickerParams) => void;
  onPreviewFont?: (family: string) => void;
  onCancelFontPreview?: () => void;
  gridConfig: SheetGridConfig;
  onChangeGridConfig: (
    config: SheetGridConfig | ((prev: SheetGridConfig) => SheetGridConfig),
  ) => void;
  /** حقول بلا عنصر مرئي في المعاينة (اختياري للتوافق) */
  hiddenFieldIds?: string[];
  /** أبعاد ورقة الطباعة بالمم لحساب الملاءمة التلقائية (اختياري — A4 افتراضياً) */
  sheetMm?: { width: number; height: number };
}

export const StickerProperties = React.memo(function StickerProperties({
  template,
  params,
  onChangeParams,
  onCommitParams,
  onPreviewFont,
  onCancelFontPreview,
  gridConfig,
  onChangeGridConfig,
  sheetMm,
}: StickerPropertiesProps) {
  // تحذير التباين المنخفض: نص باهت يُطبع مقروءاً بصعوبة — يُحسب حياً بلا مكتبات
  const { textRoles, fontWeights } = useMemo(() => {
    const svg = buildStickerSvg(template, params);
    return { textRoles: textColorRoles(svg, params), fontWeights: getStickerFontWeights(svg) };
  }, [template, params]);
  const contrastWarning = useMemo(() => {
    if (params.isTransparent) return null;
    const pairs: { role: 'primary' | 'secondary'; label: string; ratio: number | null }[] = [
      {
        role: 'primary',
        label: 'الأساسي',
        ratio: contrastRatio(params.primaryColor, params.backgroundColor),
      },
      {
        role: 'secondary',
        label: 'الثانوي',
        ratio: contrastRatio(params.secondaryColor, params.backgroundColor),
      },
    ];
    // اللون الزخرفي الذي لا يرسم نصاً لا يستوجب تحذير تباين
    const low = pairs.filter(
      (p) =>
        (textRoles === null || textRoles.has(p.role)) &&
        p.ratio !== null &&
        (p.ratio as number) < 3.0,
    );
    if (low.length === 0) return null;
    return low.map((p) => `${p.label} (${(p.ratio as number).toFixed(1)}:1)`).join('، ');
  }, [
    textRoles,
    params.primaryColor,
    params.secondaryColor,
    params.backgroundColor,
    params.isTransparent,
  ]);

  const handleAutoFitSheet = () => {
    const stickerMm = template.defaultMm || {
      width: 50,
      height: Math.round(50 / template.aspectRatio),
    };
    const sheet = sheetMm || { width: 210, height: 297 };
    const fit = autoFitSheetGrid({
      stickerWidthMm: stickerMm.width,
      stickerHeightMm: stickerMm.height,
      sheetWidthMm: sheet.width,
      sheetHeightMm: sheet.height,
      spacingMm: gridConfig.spacingMm,
    });
    onChangeGridConfig((prev) => ({ ...prev, rows: fit.rows, cols: fit.cols }));
    toast.success(`ملاءمة تلقائية: ${fit.rows}×${fit.cols} (${fit.count} ملصقات)`);
  };
  /** التزام إذا توفر المعالج، وإلا تعديل حي (توافق مع الاستدعاءات الاختيارية) */
  const commit = onCommitParams ?? onChangeParams;
  const [activeTab, setActiveTab] = useState<'design' | 'sheet' | 'presets'>('design');
  const [presets, setPresets] = useState<StickerUserPreset[]>(() => loadStickerPresets());
  const [newPresetName, setNewPresetName] = useState('');

  const templatePresets = useMemo(
    () => getPresetsForTemplate(presets, template.id),
    [presets, template.id],
  );

  const handleSavePreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      toast.error('اكتب اسم القالب');
      return;
    }
    const saved = saveStickerPreset(trimmed, template.id, params);
    setPresets((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
    setNewPresetName('');
    toast.success(`حُفظ القالب "${saved.name}"`);
  };

  const handleDeletePreset = (id: string, name: string) => {
    const remaining = deleteStickerPreset(id);
    setPresets(remaining);
    toast.success(`حُذف القالب "${name}"`);
  };

  const handleApplyPreset = (preset: StickerUserPreset) => {
    commit(() => ({ ...preset.params }));
    toast.success(`طُبّق القالب "${preset.name}"`);
    setActiveTab('design');
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    onChangeParams((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: value,
      },
    }));
  };

  const handleColorChange = (
    key: 'primaryColor' | 'secondaryColor' | 'backgroundColor',
    color: string,
  ) => {
    onChangeParams((prev) => ({
      ...prev,
      [key]: color,
    }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-sidebar select-none">
      {/* ── Subheader / Tabs Header ── */}
      <div className="p-2.5 border-b border-border/30 shrink-0 bg-sidebar">
        {/* Fluent Segmented Tabs: Design vs Sheet vs Presets */}
        <FluentSegmentedControl<'design' | 'sheet' | 'presets'>
          layoutId="sticker-properties-tabs"
          variant="panel"
          value={activeTab}
          onChange={setActiveTab}
          size="sm"
          ariaLabel="أقسام استوديو الملصقات"
          options={[
            {
              id: 'design',
              label: 'التصميم',
            },
            {
              id: 'sheet',
              label: 'الشيت',
              badge: (
                <span className="text-2xs font-mono px-1 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                  {gridConfig.rows * gridConfig.cols}
                </span>
              ),
            },
            {
              id: 'presets',
              label: 'قوالبي',
              badge:
                templatePresets.length > 0 ? (
                  <span className="text-2xs font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    {templatePresets.length}
                  </span>
                ) : undefined,
            },
          ]}
        />
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-3">
        {activeTab === 'design' ? (
          <StickerDesignTab
            template={template}
            params={params}
            onChangeParams={onChangeParams}
            commit={commit}
            fontWeights={fontWeights}
            onPreviewFont={onPreviewFont}
            onCancelFontPreview={onCancelFontPreview}
            contrastWarning={contrastWarning}
            onFieldChange={handleFieldChange}
            onColorChange={handleColorChange}
          />
        ) : activeTab === 'sheet' ? (
          <StickerSheetTab
            template={template}
            params={params}
            gridConfig={gridConfig}
            onChangeGridConfig={onChangeGridConfig}
            onAutoFitSheet={handleAutoFitSheet}
          />
        ) : (
          <StickerPresetsTab
            templatePresets={templatePresets}
            presetsTotal={presets.length}
            newPresetName={newPresetName}
            setNewPresetName={setNewPresetName}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
            onApplyPreset={handleApplyPreset}
          />
        )}
      </div>
    </div>
  );
});

StickerProperties.displayName = 'StickerProperties';
