import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { FLUSH_CANVAS_VIEW_EVENT, RESET_CANVAS_PAN_EVENT } from '@/hooks/use-canvas-zoom';
import { computeCanvasDisplay } from '@/lib/canvas/fit';
import { useStageRef } from '@/lib/canvas/stage-context';
import {
  CANVAS_VIEW_TRANSFORM_EVENT,
  clampStagePos,
  clientToLocal,
  computeDefaultStageOrigin,
  computeScrollbarMetrics,
  createCanvasCamera,
  getStageClampBounds,
  reconcileCanvasCamera,
} from '@/lib/canvas/viewport-geometry';
import { clampZoomRaw } from '@/lib/canvas/zoom';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';

import { readLocalViewportSize, useStableViewportSize } from './use-stable-viewport-size';

import type { ViewportPoint, ViewportSize } from '@/lib/canvas/viewport-geometry';

export {
  clampStagePos,
  computeDefaultStageOrigin,
  getStageClampBounds,
} from '@/lib/canvas/viewport-geometry';

const SPACE_CONSUMED_TAGS = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'BUTTON',
  'A',
  'SUMMARY',
]);

export function isSpaceHandledByTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return SPACE_CONSUMED_TAGS.has(el.tagName) || el.isContentEditable === true;
}

function cameraInput(viewport: ViewportSize) {
  const state = useEditorStore.getState();
  return {
    session: getDocumentSession(),
    canvasW: state.canvasWidth,
    canvasH: state.canvasHeight,
    fitMode: state.canvasFitMode,
    zoom: state.canvasZoom,
    viewport,
  };
}

type StagePositionUpdate = ViewportPoint | ((prev: ViewportPoint) => ViewportPoint);
interface ViewportController {
  apply: () => void;
  resize: (size: ViewportSize) => void;
  flush: () => void;
  setPos: (pos: StagePositionUpdate) => void;
  resetPan: () => void;
}

/**
 * Viewport-sized backing buffers + a transient camera. React receives only
 * settled camera/geometry snapshots; wheel targets accumulate imperatively.
 * Fit is an intent, not an effect of rendering or selecting/editing an element.
 */
export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement | null>,
  innerRef?: RefObject<HTMLDivElement | null>,
) {
  const measuredSize = useStableViewportSize(containerRef);
  const stageRef = useStageRef();
  const [camera, setCamera] = useState(() => createCanvasCamera(cameraInput(measuredSize)));
  const [isPanning, setIsPanning] = useState(false);
  const liveRef = useRef(camera);
  const committedRef = useRef(camera);
  const controllerRef = useRef<ViewportController | null>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const node: HTMLDivElement = containerRef.current;
    let disposed = false;
    let generation = 0;
    let writingZoom = false;
    let wheelRaf: number | null = null;
    let commitTimer: ReturnType<typeof setTimeout> | null = null;
    let wheelPanX = 0;
    let wheelPanY = 0;
    let wheelZoomDelta = 0;
    let wheelClientX = 0;
    let wheelClientY = 0;
    let spacePressed = false;
    let pointerId: number | null = null;
    let pointerX = 0;
    let pointerY = 0;

    let shell: HTMLElement | null = null;
    let hContent: SVGGElement | null = null;
    let vContent: SVGGElement | null = null;
    let hThumb: HTMLElement | null = null;
    let vThumb: HTMLElement | null = null;

    const currentSize = () => {
      const size = readLocalViewportSize(node);
      return size.w > 0 && size.h > 0 ? size : liveRef.current.viewport;
    };
    const isCurrent = (epoch: number) =>
      !disposed && epoch === generation && liveRef.current.session === getDocumentSession();

    const apply = () => {
      const live = liveRef.current;
      const committed = committedRef.current;
      const { metrics, pos, viewport } = live;
      const stage = stageRef.current;
      if (stage) {
        stage.scale({ x: metrics.scale, y: metrics.scale });
        stage.position(pos);
        stage.batchDraw();
      }
      // Keep the committed overlay geometry and scale its entire contents. Just
      // resizing the wrapper leaves the textarea's pixel geometry at old zoom.
      const ratio = metrics.scale / committed.metrics.scale;
      if (innerRef?.current) {
        innerRef.current.style.transformOrigin = '0 0';
        innerRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${ratio})`;
        innerRef.current.dataset.viewIntent = live.intent;
      }
      if (!shell?.isConnected) shell = node.closest('[data-testid="workspace-canvas-shell"]');
      // Ruler toggles can replace these nodes without replacing the shell.
      if (!hContent?.isConnected) hContent = shell?.querySelector('#h-ruler-content') ?? null;
      if (!vContent?.isConnected) vContent = shell?.querySelector('#v-ruler-content') ?? null;
      if (!hThumb?.isConnected) hThumb = shell?.querySelector('[data-canvas-h-thumb]') ?? null;
      if (!vThumb?.isConnected) vThumb = shell?.querySelector('[data-canvas-v-thumb]') ?? null;
      if (hContent) {
        hContent.style.transformOrigin = '0 0';
        hContent.style.transform = `matrix(${ratio}, 0, 0, 1, ${pos.x - committed.pos.x * ratio}, 0)`;
      }
      if (vContent) {
        vContent.style.transformOrigin = '0 0';
        vContent.style.transform = `matrix(1, 0, 0, ${ratio}, 0, ${pos.y - committed.pos.y * ratio})`;
      }
      const bounds = getStageClampBounds(
        metrics.displayW,
        metrics.displayH,
        viewport.w,
        viewport.h,
      );
      const syncThumb = (thumb: HTMLElement | null, horizontal: boolean) => {
        if (!thumb) return;
        const m = horizontal
          ? computeScrollbarMetrics(viewport.w, bounds.minX, bounds.maxX, pos.x)
          : computeScrollbarMetrics(viewport.h, bounds.minY, bounds.maxY, pos.y);
        thumb.style[horizontal ? 'width' : 'height'] = `${m.thumbLength}px`;
        thumb.style.transform = horizontal
          ? `translate3d(${m.thumbOffset}px, 0, 0)`
          : `translate3d(0, ${m.thumbOffset}px, 0)`;
        thumb.dataset.maxOffset = String(m.maxOffset);
      };
      syncThumb(hThumb, true);
      syncThumb(vThumb, false);
      node.dispatchEvent(
        new CustomEvent(CANVAS_VIEW_TRANSFORM_EVENT, {
          detail: { settled: live === committed },
        }),
      );
    };

    const writeZoom = () => {
      const live = liveRef.current;
      if (
        live.session !== getDocumentSession() ||
        useEditorStore.getState().canvasZoom === live.zoom
      )
        return;
      writingZoom = true;
      try {
        useEditorStore.getState().setCanvasZoom(live.zoom);
      } finally {
        writingZoom = false;
      }
    };
    const publish = () => {
      if (!isCurrent(generation)) return;
      writeZoom();
      setCamera(liveRef.current);
    };
    const clearCommit = () => {
      if (commitTimer !== null) clearTimeout(commitTimer);
      commitTimer = null;
    };
    const scheduleCommit = (delay: number) => {
      clearCommit();
      const epoch = generation;
      commitTimer = setTimeout(() => {
        commitTimer = null;
        if (isCurrent(epoch)) publish();
      }, delay);
    };
    const clearWheel = () => {
      if (wheelRaf !== null) cancelAnimationFrame(wheelRaf);
      wheelRaf = null;
      wheelPanX = wheelPanY = wheelZoomDelta = 0;
    };
    const detachPointer = () => {
      pointerId = null;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      node.style.cursor = spacePressed ? 'grab' : '';
    };
    const cancelGestures = () => {
      generation += 1;
      clearWheel();
      clearCommit();
      detachPointer();
      spacePressed = false;
      node.style.cursor = '';
      if (!disposed) setIsPanning(false);
    };

    const flushWheel = () => {
      wheelRaf = null;
      if (!isCurrent(generation)) {
        clearWheel();
        return;
      }
      const live = liveRef.current;
      const { viewport, metrics } = live;
      const zooming = Math.abs(wheelZoomDelta) >= 0.5;
      if (zooming) {
        const pointer = clientToLocal(
          node.getBoundingClientRect(),
          currentSize(),
          wheelClientX,
          wheelClientY,
        );
        const zoom = clampZoomRaw(live.zoom * Math.exp(-wheelZoomDelta * 0.003));
        const nextMetrics = computeCanvasDisplay({
          containerW: viewport.w,
          containerH: viewport.h,
          canvasW: live.canvasW,
          canvasH: live.canvasH,
          aspect: live.canvasW / live.canvasH,
          zoom,
          fitMode: live.fitMode,
          fitBasis: metrics,
        });
        const scaleRatio = nextMetrics.scale / metrics.scale;
        const pos = clampStagePos(
          {
            x: pointer.x - (pointer.x - live.pos.x) * scaleRatio - wheelPanX,
            y: pointer.y - (pointer.y - live.pos.y) * scaleRatio - wheelPanY,
          },
          nextMetrics.displayW,
          nextMetrics.displayH,
          viewport.w,
          viewport.h,
        );
        liveRef.current = { ...live, intent: 'manual', zoom, metrics: nextMetrics, pos };
        apply();
        scheduleCommit(100);
      } else if (wheelPanX !== 0 || wheelPanY !== 0) {
        // A zoom→pan switch must not lose the uncommitted accumulated zoom.
        writeZoom();
        liveRef.current = {
          ...live,
          intent: 'manual',
          pos: clampStagePos(
            { x: live.pos.x - wheelPanX, y: live.pos.y - wheelPanY },
            metrics.displayW,
            metrics.displayH,
            viewport.w,
            viewport.h,
          ),
        };
        apply();
        scheduleCommit(80);
      }
      wheelPanX = wheelPanY = wheelZoomDelta = 0;
    };
    const flushQueuedWheel = () => {
      if (wheelRaf !== null) {
        cancelAnimationFrame(wheelRaf);
        flushWheel();
      }
    };
    const flush = () => {
      flushQueuedWheel();
      clearCommit();
      publish();
    };
    const freezeFit = () => {
      const live = liveRef.current;
      if (live.intent !== 'manual') liveRef.current = { ...live, intent: 'manual' };
    };
    const handleWheel = (e: WheelEvent) => {
      // Text scrolling/composition keeps its normal focus and input behavior.
      if ((e.target as HTMLElement | null)?.closest?.('textarea,input,[contenteditable="true"]'))
        return;
      e.preventDefault();
      const local = clientToLocal(
        node.getBoundingClientRect(),
        currentSize(),
        e.clientX,
        e.clientY,
      );
      const { viewport } = liveRef.current;
      const normalize = (delta: number, axis: 'x' | 'y') =>
        e.deltaMode === 1
          ? delta * 16
          : e.deltaMode === 2
            ? delta * (axis === 'x' ? viewport.w : viewport.h)
            : delta / (axis === 'x' ? local.scaleX : local.scaleY);
      const dx = normalize(e.deltaX, 'x');
      const dy = normalize(e.deltaY, 'y');
      if (e.ctrlKey || e.metaKey) {
        // Zoom sensitivity is not a client distance; CSS zoom must not change it.
        wheelZoomDelta += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        wheelClientX = e.clientX;
        wheelClientY = e.clientY;
        if (Math.abs(wheelZoomDelta) >= 0.5) freezeFit();
      } else {
        wheelPanX += dx;
        wheelPanY += dy;
        if (dx !== 0 || dy !== 0) freezeFit();
      }
      if (wheelRaf === null) {
        const epoch = generation;
        wheelRaf = requestAnimationFrame(() => {
          if (isCurrent(epoch)) flushWheel();
        });
      }
    };

    function handlePointerMove(e: PointerEvent) {
      if (pointerId === null || e.pointerId !== pointerId || !isCurrent(generation)) return;
      e.preventDefault();
      const local = clientToLocal(
        node.getBoundingClientRect(),
        currentSize(),
        e.clientX,
        e.clientY,
      );
      const live = liveRef.current;
      const pos = clampStagePos(
        {
          x: live.pos.x + (e.clientX - pointerX) / local.scaleX,
          y: live.pos.y + (e.clientY - pointerY) / local.scaleY,
        },
        live.metrics.displayW,
        live.metrics.displayH,
        live.viewport.w,
        live.viewport.h,
      );
      pointerX = e.clientX;
      pointerY = e.clientY;
      liveRef.current = { ...live, intent: 'manual', pos };
      apply();
    }
    function handlePointerUp(e?: PointerEvent) {
      if (pointerId === null || (e && e.pointerId !== pointerId)) return;
      detachPointer();
      setIsPanning(false);
      publish();
    }
    const handlePointerDown = (e: PointerEvent) => {
      if (isSpaceHandledByTarget(e.target)) return;
      if (e.button !== 1 && !(e.button === 0 && spacePressed)) return;
      e.preventDefault();
      flush();
      freezeFit();
      pointerId = e.pointerId;
      pointerX = e.clientX;
      pointerY = e.clientY;
      setIsPanning(true);
      node.style.cursor = 'grabbing';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.isComposing && !isSpaceHandledByTarget(e.target)) {
        e.preventDefault();
        spacePressed = true;
        node.style.cursor = pointerId === null ? 'grab' : 'grabbing';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      spacePressed = false;
      if (pointerId === null) node.style.cursor = '';
    };
    const handleBlur = () => {
      flush();
      cancelGestures();
    };
    const resetFit = () => {
      cancelGestures();
      liveRef.current = createCanvasCamera({ ...cameraInput(currentSize()), zoom: 1 });
      apply();
      publish();
    };
    const resize = (viewport: ViewportSize) => {
      const live = liveRef.current;
      if (live.viewport.w === viewport.w && live.viewport.h === viewport.h) return;
      flushQueuedWheel();
      clearCommit();
      liveRef.current = reconcileCanvasCamera(liveRef.current, {
        ...cameraInput(viewport),
        zoom: liveRef.current.zoom,
      });
      apply();
      publish();
    };
    controllerRef.current = {
      apply,
      resize,
      flush,
      setPos: (update) => {
        flushQueuedWheel();
        const live = liveRef.current;
        const pos = typeof update === 'function' ? update(live.pos) : update;
        liveRef.current = {
          ...live,
          intent: 'manual',
          pos: clampStagePos(
            pos,
            live.metrics.displayW,
            live.metrics.displayH,
            live.viewport.w,
            live.viewport.h,
          ),
        };
        apply();
        scheduleCommit(80);
      },
      resetPan: () => {
        flushQueuedWheel();
        cancelGestures();
        const live = liveRef.current;
        liveRef.current = {
          ...live,
          pos: computeDefaultStageOrigin(
            live.metrics.displayW,
            live.metrics.displayH,
            live.viewport.w,
            live.viewport.h,
          ),
        };
        apply();
        publish();
      },
    };

    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (writingZoom) return;
      if (liveRef.current.session !== getDocumentSession()) {
        // Session advances before the store write, even for same-sized documents.
        // Cancel synchronously, before an old rAF/timer/pointerup can write back.
        resetFit();
        return;
      }
      if (
        state.canvasWidth !== prev.canvasWidth ||
        state.canvasHeight !== prev.canvasHeight ||
        state.canvasFitMode !== prev.canvasFitMode ||
        state.canvasZoom !== prev.canvasZoom
      ) {
        const zoom = state.canvasZoom === prev.canvasZoom ? liveRef.current.zoom : state.canvasZoom;
        cancelGestures();
        liveRef.current = reconcileCanvasCamera(liveRef.current, {
          ...cameraInput(liveRef.current.viewport),
          zoom,
        });
        apply();
        publish();
      } else if (state.editingTextId && state.editingTextId !== prev.editingTextId) {
        // Keyboard/tool entry as well as direct double-click sees the live zoom.
        flush();
      }
    });
    node.addEventListener('wheel', handleWheel, { passive: false });
    node.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener(RESET_CANVAS_PAN_EVENT, resetFit);
    window.addEventListener(FLUSH_CANVAS_VIEW_EVENT, flush);
    liveRef.current = reconcileCanvasCamera(liveRef.current, cameraInput(currentSize()));
    publish();
    apply();

    return () => {
      disposed = true;
      cancelGestures();
      unsubscribe();
      controllerRef.current = null;
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener(RESET_CANVAS_PAN_EVENT, resetFit);
      window.removeEventListener(FLUSH_CANVAS_VIEW_EVENT, flush);
      if (hContent) hContent.style.transform = '';
      if (vContent) vContent.style.transform = '';
    };
  }, [containerRef, innerRef, stageRef]);

  useLayoutEffect(() => {
    controllerRef.current?.resize(measuredSize);
  }, [measuredSize]);

  // Only committed camera changes establish a new DOM/ruler basis. An unrelated
  // selection/text render must never copy stale props over an accumulated wheel.
  useLayoutEffect(() => {
    committedRef.current = camera;
  }, [camera]);
  useLayoutEffect(() => {
    // A ruler toggle can mount fresh DOM while the RO resize is still gated.
    // Reapply the live transform, but never overwrite it from render props.
    controllerRef.current?.apply();
  });

  const setStagePos = useCallback(
    (pos: StagePositionUpdate) => controllerRef.current?.setPos(pos),
    [],
  );
  const resetPan = useCallback(() => controllerRef.current?.resetPan(), []);
  const flushViewport = useCallback(() => controllerRef.current?.flush(), []);

  return {
    viewportSize: camera.viewport,
    stagePos: camera.pos,
    displayW: camera.metrics.displayW,
    displayH: camera.metrics.displayH,
    stageScale: camera.metrics.scale,
    effectiveZoom: camera.zoom,
    resolvedFitMode: camera.metrics.resolved,
    leftoverRatio: camera.metrics.leftoverRatio,
    viewIntent: camera.intent,
    isPanning,
    setStagePos,
    resetPan,
    flushViewport,
  };
}
