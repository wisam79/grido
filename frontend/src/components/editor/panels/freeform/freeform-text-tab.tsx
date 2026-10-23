import React, { useCallback, useMemo } from 'react';

import { Plus } from '@/components/ui/icons';
import { TEXT_LABEL_PREVIEW } from '@/lib/canvas/text-helpers';
import { useEditorStore } from '@/lib/editor-store';
import {
  INSERT_TEXT_PRESETS,
  TEXT_INSERT_GROUPS,
  type TextPresetCatalogItem,
  type TextPresetType,
} from '@/lib/templates';

const INSERT_PRESET_GROUPS = TEXT_INSERT_GROUPS.map((group) => ({
  ...group,
  items: INSERT_TEXT_PRESETS.filter((preset) => preset.group === group.id),
}));

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
  const canApply = hasSelection && preset.group === 'typography';

  return (
    <div className="flex h-8 items-center gap-1 px-1.5 transition-colors hover:bg-accent/45">
      <button
        type="button"
        data-testid={`element-add-text-${preset.id}`}
        onClick={() => (canApply ? onApply(preset.id) : onInsert(preset.id))}
        title={canApply ? `تطبيق نمط ${preset.label} على النص المحدد` : `إدراج ${preset.label}`}
        className="flex h-full min-w-0 flex-1 items-center rounded-sm px-1.5 text-start cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="truncate text-xs font-medium text-foreground">{preset.label}</span>
      </button>

      {canApply && (
        <button
          type="button"
          data-testid={`element-add-text-${preset.id}-new`}
          onClick={() => onInsert(preset.id)}
          title="إدراج كعنصر جديد"
          aria-label={`إدراج ${preset.label} كعنصر جديد`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
    <div data-testid="studio-elements-text" className="space-y-3.5 font-cairo" dir="rtl">
      <button
        type="button"
        data-testid="element-add-text-plain"
        onClick={handleAddPlain}
        className="flex h-8 w-full items-center justify-between rounded-md border border-border/80 bg-card px-2.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-accent cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span>إضافة نص</span>
        <Plus className="w-3.5 h-3.5 text-muted-foreground" weight="bold" />
      </button>

      {INSERT_PRESET_GROUPS.map((group) => (
        <section
          key={group.id}
          className="space-y-1.5"
          aria-labelledby={`text-preset-group-${group.id}`}
        >
          <h3
            id={`text-preset-group-${group.id}`}
            className="px-1 text-xs font-bold text-muted-foreground/80"
          >
            {group.label}
          </h3>

          {group.id === 'typography' && selectedExcerpt && (
            <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/35 px-2 py-1.5 text-xs leading-tight">
              <span className="min-w-0 truncate text-foreground/90">«{selectedExcerpt}»</span>
              <span className="shrink-0 text-muted-foreground/70">سيُطبَّق النمط على المحدد</span>
            </div>
          )}

          <div className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border/60 bg-card/35">
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
