import { FluentSection, FluentSettingRow, FluentSliderField } from '@/components/ui/blocks';
import { useEditorStore } from '@/lib/editor-store';

import { ColorField, ColorPanel } from '../../color-panel';

import type { CanvasElement } from '@/lib/editor-store';

export interface ShadowGlowSectionProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export function ShadowGlowSection({ element, onUpdate }: ShadowGlowSectionProps) {
  const applyShadowPatch = (patch: Partial<CanvasElement>) => {
    const next: Partial<CanvasElement> = {
      shadowColor: element.shadowColor || '#000000',
      ...patch,
    };
    const isActivatingShadow =
      (patch.shadowBlur !== undefined && patch.shadowBlur > 0) ||
      (patch.shadowOffsetX !== undefined && patch.shadowOffsetX !== 0) ||
      (patch.shadowOffsetY !== undefined && patch.shadowOffsetY !== 0) ||
      patch.shadowColor !== undefined;
    if (element.shadowOpacity === undefined && isActivatingShadow) {
      next.shadowOpacity = 0.5;
    }
    if (
      patch.shadowOpacity !== undefined &&
      patch.shadowOpacity > 0 &&
      element.shadowBlur === undefined &&
      element.shadowOffsetX === undefined &&
      element.shadowOffsetY === undefined
    ) {
      next.shadowBlur = 10;
    }
    onUpdate(element.id, next);
  };

  return (
    <ColorPanel wheelPosition="bottom">
      <FluentSection title="الظل والوهج" collapsible defaultOpen={true}>
        <FluentSettingRow
          layout="vertical"
          label="لون الظل"
          control={
            <ColorField
              color={element.shadowColor || '#000000'}
              onChange={(val) => applyShadowPatch({ shadowColor: val })}
              onCommit={() => useEditorStore.getState().pushHistory()}
              ariaLabel="لون الظل"
              className="w-full"
            />
          }
        />

        <FluentSliderField
          label="شدة الظل"
          value={Math.round((element.shadowOpacity ?? 0) * 100)}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => applyShadowPatch({ shadowOpacity: v / 100 })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        <FluentSliderField
          label="التمويه"
          value={element.shadowBlur || 0}
          min={0}
          max={50}
          step={1}
          unit="px"
          onChange={(v) => applyShadowPatch({ shadowBlur: v })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        <FluentSliderField
          label="إزاحة أفقية"
          value={element.shadowOffsetX || 0}
          min={-50}
          max={50}
          step={1}
          unit="px"
          onChange={(v) => applyShadowPatch({ shadowOffsetX: v })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        <FluentSliderField
          label="إزاحة عمودية"
          value={element.shadowOffsetY || 0}
          min={-50}
          max={50}
          step={1}
          unit="px"
          onChange={(v) => applyShadowPatch({ shadowOffsetY: v })}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />
      </FluentSection>
    </ColorPanel>
  );
}
