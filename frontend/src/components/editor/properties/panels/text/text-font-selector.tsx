import React, { useCallback, useEffect, useRef } from 'react';

import { FontSelector } from '@/components/ui/font-selector';
import { fitTextGeometry } from '@/lib/canvas/text-fit';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { loadGoogleFont, resolveSupportedFontWeight } from '@/lib/io/fonts';

import type { TextElement } from '@/lib/editor-store';
import type { FontOption } from '@/lib/io/fonts';
import type { HistoryEntry } from '@/lib/store/types';

type FontSnapshot = Pick<
  TextElement,
  'id' | 'fontFamily' | 'fontWeight' | 'x' | 'y' | 'width' | 'height' | 'textResizeAnchor'
>;

type ExpectedFitState = Pick<
  TextElement,
  'id' | 'text' | 'fontFamily' | 'fontWeight' | 'fontStyle' | 'x' | 'y' | 'width' | 'height'
>;

const approxEq = (a: number, b: number) => Math.abs(a - b) <= 1e-6;

function elementMatchesExpected(
  current: TextElement | undefined,
  expected: ExpectedFitState,
): current is TextElement {
  if (!current || current.type !== 'text' || current.locked) return false;
  return (
    current.text === expected.text &&
    current.fontFamily === expected.fontFamily &&
    (current.fontWeight ?? 400) === (expected.fontWeight ?? 400) &&
    (current.fontStyle ?? 'normal') === (expected.fontStyle ?? 'normal') &&
    approxEq(current.x, expected.x) &&
    approxEq(current.y, expected.y) &&
    approxEq(current.width, expected.width) &&
    approxEq(current.height, expected.height)
  );
}

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

  const applyFont = (font: FontOption, commit: boolean) => {
    const generation = ++generationRef.current;
    const docSession = sessionRef.current;
    const { elements, canvasWidth, canvasHeight, updateElements, pushHistory } =
      useEditorStore.getState();
    const cw = canvasWidth || 2480;
    const ch = canvasHeight || 2480;

    const patches: Array<{ id: string; patch: Partial<TextElement> }> = [];
    const expectedList: ExpectedFitState[] = [];
    const loadRequests: Array<{ family: string; weight: number; style?: 'normal' | 'italic' }> = [];

    for (const { id, ...geometry } of snapshotsRef.current) {
      const current = elements.find((item) => item.id === id);
      if (current?.type !== 'text' || current.locked) continue;
      const fontWeight = resolveSupportedFontWeight(font.family, geometry.fontWeight);
      const baseNext: TextElement = {
        ...current,
        ...geometry,
        fontFamily: font.family,
        fontWeight,
        textResizeAnchor: undefined,
      };
      const fit = fitTextGeometry(baseNext, cw, ch);
      const nextDims = fit?.measured
        ? { width: fit.width, height: fit.height, x: fit.x, y: fit.y }
        : {
            width: geometry.width,
            height: geometry.height,
            x: geometry.x,
            y: geometry.y,
          };

      patches.push({
        id,
        patch: {
          ...geometry,
          fontFamily: font.family,
          fontWeight,
          textResizeAnchor: undefined,
          ...(fit?.measured ? nextDims : {}),
        },
      });
      expectedList.push({
        id,
        text: current.text,
        fontFamily: font.family,
        fontWeight,
        fontStyle: current.fontStyle ?? 'normal',
        ...nextDims,
      });
      loadRequests.push({ family: font.family, weight: fontWeight, style: current.fontStyle });
    }

    updateElements(patches);
    let committedEntry: HistoryEntry | undefined;
    if (commit) {
      previewedRef.current = false;
      pushHistory();
      const afterPush = useEditorStore.getState();
      committedEntry = afterPush.history[afterPush.historyIndex];
    }

    if (loadRequests.length > 0) {
      void Promise.all(loadRequests.map((req) => loadGoogleFont(req.family, req.weight, req.style)))
        .then(() => {
          if (generation !== generationRef.current || docSession !== getDocumentSession()) return;
          const latestState = useEditorStore.getState();
          if (commit) {
            if (latestState.history[latestState.historyIndex] !== committedEntry) return;
          } else if (!previewedRef.current) {
            return;
          }

          const latestCw = latestState.canvasWidth || 2480;
          const latestCh = latestState.canvasHeight || 2480;
          const asyncPatches: Array<{ id: string; patch: Partial<TextElement> }> = [];

          for (const expected of expectedList) {
            const found = latestState.elements.find((item) => item.id === expected.id);
            const current = found?.type === 'text' ? found : undefined;
            if (!elementMatchesExpected(current, expected)) return;

            const fit = fitTextGeometry(current, latestCw, latestCh);
            if (!fit?.measured) continue;
            if (
              approxEq(fit.width, current.width) &&
              approxEq(fit.height, current.height) &&
              approxEq(fit.x, current.x) &&
              approxEq(fit.y, current.y)
            ) {
              continue;
            }
            asyncPatches.push({
              id: expected.id,
              patch: { width: fit.width, height: fit.height, x: fit.x, y: fit.y },
            });
          }

          if (asyncPatches.length > 0) {
            latestState.updateElements(asyncPatches);
            if (commit) {
              useEditorStore.getState().replaceCurrentHistoryEntry();
            }
          }
        })
        .catch(() => {});
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
        applyFont(font, false);
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
        applyFont(font, true);
      }}
    />
  );
});
