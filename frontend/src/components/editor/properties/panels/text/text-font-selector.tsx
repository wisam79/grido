import React, { useCallback, useEffect, useRef } from 'react';

import { FontSelector } from '@/components/ui/font-selector';
import { useEditorStore } from '@/lib/editor-store';
import { loadGoogleFont } from '@/lib/io/fonts';

import type { TextElement } from '@/lib/editor-store';
import type { FontOption } from '@/lib/io/fonts';

type FontSnapshot = Pick<
  TextElement,
  'id' | 'fontFamily' | 'x' | 'y' | 'width' | 'height' | 'textResizeAnchor'
>;

export const TextFontSelector = React.memo(function TextFontSelector({
  element,
}: {
  element: TextElement;
}) {
  const snapshotsRef = useRef<FontSnapshot[]>([]);
  const previewedRef = useRef(false);

  const cancelPreview = useCallback(() => {
    if (!previewedRef.current) return;
    previewedRef.current = false;
    const { elements, updateElements } = useEditorStore.getState();
    updateElements(
      snapshotsRef.current
        .filter((snapshot) => elements.some((item) => item.id === snapshot.id))
        .map(({ id, ...patch }) => ({ id, patch })),
    );
  }, []);

  useEffect(() => cancelPreview, [element.id, cancelPreview]);

  const applyFont = (font: FontOption) => {
    const { elements, updateElements } = useEditorStore.getState();
    const patches = snapshotsRef.current.flatMap(({ id, ...geometry }) => {
      const current = elements.find((item) => item.id === id);
      if (current?.type !== 'text' || current.locked) return [];
      void loadGoogleFont(font.family, current.fontWeight, current.fontStyle);
      return [{ id, patch: { ...geometry, fontFamily: font.family, textResizeAnchor: undefined } }];
    });
    updateElements(patches);
  };

  return (
    <FontSelector
      key={element.id}
      value={element.fontFamily || 'Cairo'}
      onOpen={() => {
        const { elements, selectedIds } = useEditorStore.getState();
        const targets = selectedIds.includes(element.id) ? selectedIds : [element.id];
        // لكل نص هندسته وخطه الأصلي؛ بث لقطة واحدة يفسد التحديد المتعدد.
        snapshotsRef.current = elements
          .filter(
            (item): item is TextElement =>
              item.type === 'text' && !item.locked && targets.includes(item.id),
          )
          .map(({ id, fontFamily, x, y, width, height, textResizeAnchor }) => ({
            id,
            fontFamily,
            x,
            y,
            width,
            height,
            textResizeAnchor,
          }));
        previewedRef.current = false;
      }}
      onPreview={(font) => {
        previewedRef.current = true;
        applyFont(font);
      }}
      onCancel={cancelPreview}
      onChange={(font) => {
        const cleanName = (family: string) =>
          family.split(',')[0].trim().replace(/['"]/g, '').toLowerCase();
        if (
          snapshotsRef.current.every(
            (snapshot) => cleanName(snapshot.fontFamily || 'Cairo') === cleanName(font.family),
          )
        ) {
          cancelPreview();
          return;
        }
        applyFont(font);
        previewedRef.current = false;
        useEditorStore.getState().pushHistory();
      }}
    />
  );
});
