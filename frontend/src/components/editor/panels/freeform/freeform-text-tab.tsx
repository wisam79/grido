import React, { useCallback, useEffect, useMemo } from 'react';

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

const TYPOGRAPHY_PRESETS = INSERT_TEXT_PRESETS.filter((preset) => preset.group === 'typography');

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
  // الأنماط الطباعية تُعرض تسميتها بخطها ووزنها الحقيقيين (هرمية مضغوطة)،
  // وكتل الاستوديو تبقى تسمية واجهة عادية لأنها وظيفة لا مظهر.
  const labelStyle: React.CSSProperties | undefined = isTypography
    ? {
        fontFamily: preset.config.fontFamily,
        fontWeight: preset.config.fontWeight,
        fontSize: textPresetPreviewSize(preset.config),
        lineHeight: 1.25,
      }
    : undefined;

  return (
    <div
      className={cn(
        'group/row flex items-center gap-1 px-1 transition-colors duration-150 hover:bg-accent/50',
        isTypography ? 'h-10' : 'h-8',
      )}
    >
      <button
        type="button"
        data-testid={`element-add-text-${preset.id}`}
        onClick={() => (canApply ? onApply(preset.id) : onInsert(preset.id))}
        title={canApply ? `تطبيق ${preset.label} على المحدد` : `إدراج ${preset.label}`}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center rounded-sm px-1.5 text-start cursor-pointer',
          focusRing,
        )}
      >
        <span
          style={labelStyle}
          className={cn('truncate text-foreground', !isTypography && 'text-xs font-medium')}
        >
          {preset.label}
        </span>
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
    for (const preset of TYPOGRAPHY_PRESETS) {
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
          'flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground shadow-2xs transition-colors duration-150 hover:bg-primary/90 cursor-pointer select-none',
          focusRing,
        )}
      >
        <Plus className="w-3.5 h-3.5" weight="bold" />
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
            className="px-1 text-mini font-bold text-muted-foreground"
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

          <div className="divide-y divide-border/50 overflow-hidden rounded-md border border-border/60 bg-card/40">
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
