import { CANVAS_FIT_PADDING, computeCanvasDisplay } from './fit';

import type { CanvasDisplay, CanvasFitMode } from './fit';

/** Canvas-owned transform notification for DOM overlays outside the paper. */
export const CANVAS_VIEW_TRANSFORM_EVENT = 'grido:canvas-view-transform';

/** Shared pixel thickness of the four canvas viewport edge rails (rulers & scrollbars). */
export const CANVAS_RAIL_THICKNESS = 20;

export interface ViewportSize {
  w: number;
  h: number;
}

export interface ViewportPoint {
  x: number;
  y: number;
}

export interface CanvasCameraInput {
  session: number;
  canvasW: number;
  canvasH: number;
  fitMode: CanvasFitMode;
  zoom: number;
  viewport: ViewportSize;
}

/** Transient camera only: never serialized or included in document history. */
export interface CanvasCamera extends CanvasCameraInput {
  intent: 'fit' | 'manual';
  metrics: CanvasDisplay;
  pos: ViewportPoint;
}

export function computeDefaultStageOrigin(
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
  padding = CANVAS_FIT_PADDING,
): ViewportPoint {
  return {
    x: displayW <= viewportW ? (viewportW - displayW) / 2 : padding / 2,
    y: displayH <= viewportH ? (viewportH - displayH) / 2 : padding / 2,
  };
}

export function getStageClampBounds(
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
) {
  // A tiny paper/viewport cannot promise 40px of visibility. Keep the normal
  // 40–150px guard, but never invert the bounds or push a contained paper out.
  const minVisible = Math.min(
    displayW,
    displayH,
    viewportW / 2,
    viewportH / 2,
    Math.max(40, Math.min(150, Math.min(displayW, displayH) * 0.4)),
  );
  return {
    minX: minVisible - displayW,
    maxX: viewportW - minVisible,
    minY: minVisible - displayH,
    maxY: viewportH - minVisible,
    minVisible,
  };
}

export function clampStagePos(
  pos: ViewportPoint,
  displayW: number,
  displayH: number,
  viewportW: number,
  viewportH: number,
): ViewportPoint {
  const { minX, maxX, minY, maxY } = getStageClampBounds(displayW, displayH, viewportW, viewportH);
  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y)),
  };
}

export function createCanvasCamera(input: CanvasCameraInput): CanvasCamera {
  const metrics = computeCanvasDisplay({
    containerW: input.viewport.w,
    containerH: input.viewport.h,
    aspect: input.canvasW / input.canvasH,
    canvasW: input.canvasW,
    canvasH: input.canvasH,
    fitMode: input.fitMode,
    zoom: input.zoom,
  });
  return {
    ...input,
    intent: input.zoom === 1 ? 'fit' : 'manual',
    metrics,
    pos: computeDefaultStageOrigin(
      metrics.displayW,
      metrics.displayH,
      input.viewport.w,
      input.viewport.h,
    ),
  };
}

/** Preserve the world point at the viewport center, including paper-size changes. */
export function reconcileCanvasCamera(
  camera: CanvasCamera,
  input: CanvasCameraInput,
): CanvasCamera {
  if (camera.session !== input.session) return createCanvasCamera({ ...input, zoom: 1 });
  if (camera.fitMode !== input.fitMode) return createCanvasCamera(input);
  if (
    camera.canvasW === input.canvasW &&
    camera.canvasH === input.canvasH &&
    camera.viewport.w === input.viewport.w &&
    camera.viewport.h === input.viewport.h &&
    camera.zoom === input.zoom
  )
    return camera;

  const intent = input.zoom !== camera.zoom ? 'manual' : camera.intent;
  if (intent === 'fit') return createCanvasCamera(input);
  const metrics = computeCanvasDisplay({
    containerW: input.viewport.w,
    containerH: input.viewport.h,
    aspect: input.canvasW / input.canvasH,
    canvasW: input.canvasW,
    canvasH: input.canvasH,
    fitMode: input.fitMode,
    zoom: input.zoom,
    fitBasis: camera.metrics,
  });
  const worldX = (camera.viewport.w / 2 - camera.pos.x) / camera.metrics.scale;
  const worldY = (camera.viewport.h / 2 - camera.pos.y) / camera.metrics.scale;
  return {
    ...input,
    intent,
    metrics,
    // Preserve the center anchor unless it exceeds the paper-visibility bounds.
    pos: clampStagePos(
      {
        x: input.viewport.w / 2 - worldX * metrics.scale,
        y: input.viewport.h / 2 - worldY * metrics.scale,
      },
      metrics.displayW,
      metrics.displayH,
      input.viewport.w,
      input.viewport.h,
    ),
  };
}

/** Shared by declarative scrollbars and imperative pan/zoom frames. */
export function computeScrollbarMetrics(viewport: number, min: number, max: number, pos: number) {
  const span = Math.max(0, max - min);
  const progress = span > 0 ? Math.max(0, Math.min(1, (max - pos) / span)) : 0.5;
  const trackLength = Math.max(1, viewport);
  const ratio = viewport + span > 0 ? viewport / (viewport + span) : 1;
  const thumbLength = Math.min(trackLength, Math.max(28, Math.round(trackLength * ratio)));
  const maxOffset = Math.max(0, trackLength - thumbLength);
  return { span, progress, thumbLength, maxOffset, thumbOffset: Math.round(progress * maxOffset) };
}

/** Screen/client space → local CSS space. DPR belongs to snapping, never zoom. */
export function clientToLocal(
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  size: ViewportSize,
  clientX: number,
  clientY: number,
) {
  const scaleX = rect.width > 0 && size.w > 0 ? rect.width / size.w : 1;
  const scaleY = rect.height > 0 && size.h > 0 ? rect.height / size.h : 1;
  return {
    x: (clientX - rect.left) / scaleX,
    y: (clientY - rect.top) / scaleY,
    scaleX,
    scaleY,
  };
}
