import React, { useCallback, useEffect, useRef } from 'react';

import { FontSelector } from '@/components/ui/font-selector';
import { fitTextGeometry } from '@/lib/canvas/text-fit';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { loadGoogleFont, resolveSupportedFontWeight } from '@/lib/io/fonts';

import type { TextElement } from '@/lib/editor-store';
import type { FontOption } from '@/lib/io/fonts';

type FontSnapshot = Pick<
  TextElement,
  'id' | 'fontFamily' | 'fontWeight' | 'x' | 'y' | 'width' | 'height' | 'textResizeAnchor'
>;

export const TextFontSelector = React.memo(function TextFontSelector({
  element,
}: {
  element: TextElement;
}) {
  const snapshotsRef = useRef<FontSnapshot[]>([]);
  const previewedRef = useRef(false);
  const generationRef = useRef(0);
  const sessionRef = useRef(getDocumentSession());

  const cancelPreview = useCallback(() => {
    generationRef.current += 1;
    if (!previewedRef.current) return;
    previewedRef.current = false;
    if (sessionRef.current !== getDocumentSession()) return;
    const { elements, updateElements } = useEditorStore.getState();
    updateElements(
      snapshotsRef.current
        .filter((snapshot) => elements.some((item) => item.id === snapshot.id))
        .map(({ id, ...patch }) => ({ id, patch })),
    );
  }, []);

  useEffect(() => cancelPreview, [element.id, cancelPreview]);

  const applyFont = (font: FontOption) => {
    const generation = ++generationRef.current;
    const docSession = sessionRef.current;
    const { elements, canvasWidth, canvasHeight, updateElements } = useEditorStore.getState();
    const cw = canvasWidth || 2480;
    const ch = canvasHeight || 2480;
    const loadTasks: Promise<boolean>[] = [];

    const patches = snapshotsRef.current.flatMap(({ id, ...geometry }) => {
      const current = elements.find((item) => item.id === id);
      if (current?.type !== 'text' || current.locked) return [];
      const fontWeight = resolveSupportedFontWeight(font.family, geometry.fontWeight);
      const baseNext: TextElement = {
        ...current,
        ...geometry,
        fontFamily: font.family,
        fontWeight,
        textResizeAnchor: undefined,
      };
      const fit = fitTextGeometry(baseNext, cw, ch);
      loadTasks.push(loadGoogleFont(font.family, fontWeight, current.fontStyle));
      return [
        {
          id,
          patch: {
            ...geometry,
            fontFamily: font.family,
            fontWeight,
            textResizeAnchor: undefined,
            ...(fit?.measured ? { width: fit.width, height: fit.height, x: fit.x, y: fit.y } : {}),
          },
        },
      ];
    });
    updateElements(patches);

    if (loadTasks.length > 0) {
      void Promise.all(loadTasks).then(() => {
        if (generation !== generationRef.current || docSession !== getDocumentSession()) return;
        const latestState = useEditorStore.getState();
        const latestCw = latestState.canvasWidth || 2480;
        const latestCh = latestState.canvasHeight || 2480;
        const asyncPatches = snapshotsRef.current.flatMap(({ id }) => {
          const current = latestState.elements.find((item) => item.id === id);
          if (current?.type !== 'text' || current.locked) return [];
          const fit = fitTextGeometry(current, latestCw, latestCh);
          if (!fit?.measured) return [];
          if (
            Math.abs(fit.width - current.width) <= 1e-6 &&
            Math.abs(fit.height - current.height) <= 1e-6 &&
            Math.abs(fit.x - current.x) <= 1e-6 &&
            Math.abs(fit.y - current.y) <= 1e-6
          ) {
            return [];
          }
          return [
            {
              id,
              patch: { width: fit.width, height: fit.height, x: fit.x, y: fit.y },
            },
          ];
        });
        if (asyncPatches.length > 0) {
          latestState.updateElements(asyncPatches);
        }
      });
    }
  };

  return (
    <FontSelector
      key={element.id}
      value={element.fontFamily || 'Cairo'}
      onOpen={() => {
        sessionRef.current = getDocumentSession();
        generationRef.current += 1;
        const { elements, selectedIds } = useEditorStore.getState();
        const targets = selectedIds.includes(element.id) ? selectedIds : [element.id];
        // لكل نص هندسته وخطه الأصلي؛ بث لقطة واحدة يفسد التحديد المتعدد.
        snapshotsRef.current = elements
          .filter(
            (item): item is TextElement =>
              item.type === 'text' && !item.locked && targets.includes(item.id),
          )
          .map(({ id, fontFamily, fontWeight, x, y, width, height, textResizeAnchor }) => ({
            id,
            fontFamily,
            fontWeight,
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
