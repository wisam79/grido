import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { clientToLocal } from '@/lib/canvas/viewport-geometry';
import { getDocumentSession } from '@/lib/io/document-session';

import { readLocalViewportSize } from './use-stable-viewport-size';

interface RulerPreviewOptions {
  showRuler: boolean;
  printMode: boolean;
}

export function useRulerMetricsPreview(
  containerRef: RefObject<HTMLDivElement | null>,
  { showRuler, printMode }: RulerPreviewOptions,
) {
  const mouseMoveRafId = useRef<number | null>(null);
  const pendingEventRef = useRef<{
    clientX: number;
    clientY: number;
    target: EventTarget | null;
    session: number;
  } | null>(null);

  useEffect(
    () => () => {
      if (mouseMoveRafId.current !== null) cancelAnimationFrame(mouseMoveRafId.current);
      mouseMoveRafId.current = null;
      pendingEventRef.current = null;
    },
    [showRuler, printMode],
  );

  const handleWorkspaceMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!showRuler || printMode) return;
      pendingEventRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target,
        session: getDocumentSession(),
      };

      if (mouseMoveRafId.current !== null) return;

      mouseMoveRafId.current = requestAnimationFrame(() => {
        mouseMoveRafId.current = null;
        const pending = pendingEventRef.current;
        if (!pending || !containerRef.current || pending.session !== getDocumentSession()) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const local = clientToLocal(
          containerRect,
          readLocalViewportSize(containerRef.current),
          pending.clientX,
          pending.clientY,
        );
        // Snap in physical pixels, then return to local CSS coordinates.
        const dpr = window.devicePixelRatio || 1;
        const x = Math.round(local.x * local.scaleX * dpr) / (local.scaleX * dpr);
        const y = Math.round(local.y * local.scaleY * dpr) / (local.scaleY * dpr);

        const scope =
          (pending.target as HTMLElement | null)?.closest?.(
            '[data-testid="workspace-canvas-shell"]',
          ) ?? document;

        const hCursor = scope.querySelector('#h-ruler-cursor') as SVGLineElement | null;
        const vCursor = scope.querySelector('#v-ruler-cursor') as SVGLineElement | null;

        if (hCursor) {
          hCursor.setAttribute('x1', x.toString());
          hCursor.setAttribute('x2', x.toString());
          hCursor.style.display = 'block';
        }
        if (vCursor) {
          vCursor.setAttribute('y1', y.toString());
          vCursor.setAttribute('y2', y.toString());
          vCursor.style.display = 'block';
        }
      });
    },
    [containerRef, showRuler, printMode],
  );

  const handleWorkspaceMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!showRuler || printMode) return;
      const scope =
        (e.currentTarget as HTMLElement | null)?.closest?.(
          '[data-testid="workspace-canvas-shell"]',
        ) ?? document;

      const hCursor = scope.querySelector('#h-ruler-cursor') as SVGLineElement | null;
      const vCursor = scope.querySelector('#v-ruler-cursor') as SVGLineElement | null;

      if (hCursor) hCursor.style.display = 'none';
      if (vCursor) vCursor.style.display = 'none';
    },
    [showRuler, printMode],
  );

  return { handleWorkspaceMouseMove, handleWorkspaceMouseLeave };
}
