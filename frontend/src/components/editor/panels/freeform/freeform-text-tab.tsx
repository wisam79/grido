import React, { useCallback, useEffect, useId, useMemo } from 'react';

import { Plus } from '@/components/ui/icons';
import { TEXT_LABEL_PREVIEW } from '@/lib/canvas/text-helpers';
import { useEditorStore } from '@/lib/editor-store';
import { loadGoogleFont } from '@/lib/io/fonts';
import {
  INSERT_TEXT_PRESETS,
  TEXT_INSERT_GROUPS,
  textPresetPreviewSize,
  type TextPresetCatalogItem,
  type TextPresetType,
} from '@/lib/templates';
import { cn } from '@/lib/utils';

const INSERT_PRESET_GROUPS = TEXT_INSERT_GROUPS.map((group) => ({
  ...group,
  items: INSERT_TEXT_PRESETS.filter((preset) => preset.group === group.id),
}));

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function PresetRow({
  preset,
  hasSelection,
  onApply,
  onInsert,
}: {
  preset: TextPresetCatalogItem;
  hasSelection: boolean;
  onApply: (preset: TextPresetType) => void;
  onInsert: (preset: TextPresetType) => void;
}) {
  const isTypography = preset.group === 'typography';
  const canApply = hasSelection && isTypography;
  const curveId = useId();
  const labelStyle: React.CSSProperties = {
    fontFamily: preset.config.fontFamily,
    fontWeight: preset.config.fontWeight,
    fontSize: textPresetPreviewSize(preset.config),
    lineHeight: 1.25,
    ...(preset.config.rotation && { transform: `rotate(${preset.config.rotation / 3}deg)` }),
    ...(preset.config.textBgColor && {
      borderRadius: preset.config.textBgRadius,
      padding: '4px 10px',
    }),
  };

  return (
    <div className="group/row flex h-11 items-center gap-1 rounded-md px-1 transition-colors duration-150 hover:bg-accent/50 focus-within:bg-accent/50">
      <button
        type="button"
        data-testid={`element-add-text-${preset.id}`}
        onClick={() => (canApply ? onApply(preset.id) : onInsert(preset.id))}
        title={canApply ? `تطبيق ${preset.label} على المحدد` : `إدراج ${preset.label}`}
        aria-label={preset.label}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center rounded-md px-2 text-start cursor-pointer',
          focusRing,
        )}
      >
        {preset.config.curve ? (
          <svg viewBox="0 0 104 44" className="h-11 w-26 text-foreground" aria-hidden="true">
            <defs>
              {/* قوس منخفض بما يكفي ليبقى صعود الحروف داخل إطار المعاينة */}
              <path id={curveId} d={`M 4 38 Q 52 ${38 - preset.config.curve / 2} 100 38`} />
            </defs>
            <text fill="currentColor" style={labelStyle} textAnchor="middle">
              <textPath href={`#${curveId}`} startOffset="50%">
                {preset.label}
              </textPath>
            </text>
          </svg>
        ) : (
          <span
            style={labelStyle}
            className={cn(
              'inline-block truncate text-foreground',
              preset.config.opacity !== undefined && 'text-muted-foreground',
              preset.config.textBgColor &&
                (preset.id === 'badge' ? 'bg-primary-action text-primary-foreground' : 'bg-muted'),
            )}
          >
            {preset.label}
          </span>
        )}
      </button>

      {canApply && (
        <button
          type="button"
          data-testid={`element-add-text-${preset.id}-new`}
          onClick={() => onInsert(preset.id)}
          title="إدراج كعنصر جديد"
          aria-label={`إدراج ${preset.label} كعنصر جديد`}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground cursor-pointer',
            focusRing,
          )}
        >
          <Plus className="w-3.5 h-3.5" weight="bold" />
        </button>
      )}
    </div>
  );
}

export const FreeformTextTab = React.memo(function FreeformTextTab() {
  const addTextElement = useEditorStore((state) => state.addTextElement);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const applyTextPreset = useEditorStore((state) => state.applyTextPreset);
  const setEditingTextId = useEditorStore((state) => state.setEditingTextId);

  const selectedTextElement = useEditorStore((state) => {
    if (state.selectedIds.length !== 1) return null;
    const element = state.elements.find((item) => item.id === state.selectedIds[0]);
    return element?.type === 'text' ? element : null;
  });

  // معاينة التسميات بخطوطها تتطلب تحميل الوجه الدقيق (عائلة + وزن) مرة واحدة
  useEffect(() => {
    for (const preset of INSERT_TEXT_PRESETS) {
      void loadGoogleFont(preset.config.fontFamily, preset.config.fontWeight);
    }
  }, []);

  const selectedExcerpt = useMemo(() => {
    const text = selectedTextElement?.text.trim();
    if (!text) return null;
    return text.length > TEXT_LABEL_PREVIEW ? `${text.slice(0, TEXT_LABEL_PREVIEW)}…` : text;
  }, [selectedTextElement]);

  const handleAddPlain = useCallback(() => {
    const id = addTextElement();
    setEditingTextId(id);
  }, [addTextElement, setEditingTextId]);

  const handleInsert = useCallback(
    (preset: TextPresetType) => {
      addTextPreset(preset);
    },
    [addTextPreset],
  );

  const handleApply = useCallback(
    (preset: TextPresetType) => {
      if (!selectedTextElement) return;
      applyTextPreset(selectedTextElement.id, preset);
    },
    [applyTextPreset, selectedTextElement],
  );

  return (
    <div data-testid="studio-elements-text" className="space-y-4 font-cairo" dir="rtl">
      <button
        type="button"
        data-testid="element-add-text-plain"
        onClick={handleAddPlain}
        className={cn(
          'flex h-8 w-full items-center justify-center rounded-md bg-primary-action px-3 text-control font-bold text-primary-foreground transition-colors duration-150 hover:bg-primary-action-hover cursor-pointer select-none',
          focusRing,
        )}
      >
        <span>إضافة نص</span>
      </button>

      {INSERT_PRESET_GROUPS.map((group) => (
        <section
          key={group.id}
          className="space-y-1.5"
          aria-labelledby={`text-preset-group-${group.id}`}
        >
          <h3
            id={`text-preset-group-${group.id}`}
            className="px-1 text-control font-semibold text-muted-foreground"
          >
            {group.label}
          </h3>

          {group.id === 'typography' && selectedExcerpt && (
            <div className="flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/5 px-2 py-1.5 text-mini leading-tight">
              <span className="min-w-0 truncate font-semibold text-foreground">
                «{selectedExcerpt}»
              </span>
              <span className="shrink-0 text-muted-foreground">سيُطبَّق النمط على المحدد</span>
            </div>
          )}

          <div className="divide-y divide-border/50">
            {group.items.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                hasSelection={Boolean(selectedTextElement)}
                onApply={handleApply}
                onInsert={handleInsert}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
});
