import {
  commandsFromPathData,
  FillRule,
  PathBoolean,
  PathBooleanOperation,
  pathFromPathData,
} from 'path-bool';

import { CanvasElementSchema } from '@/lib/schema';
import { canArrangeSelection } from '@/lib/selection-properties';

import { normalizeSegments, segmentsBounds } from './path-geometry';

import type { CanvasElement, ImageElement, ShapeElement } from '@/lib/store/types';

function hasFiniteGeometry(element: CanvasElement): boolean {
  return (
    [
      element.x,
      element.y,
      element.width,
      element.height,
      element.rotation,
      element.opacity,
      element.zIndex,
    ].every(Number.isFinite) &&
    element.width > 0 &&
    element.height > 0 &&
    element.opacity >= 0 &&
    element.opacity <= 1
  );
}

// Eligibility runs during pointer targeting too: bound memoization like svg-path-bounds.
const PATH_FILL_CACHE_LIMIT = 200;
const pathFillCache = new Map<string, boolean>();

function hasClosedPathFill(data: string): boolean {
  const cached = pathFillCache.get(data);
  if (cached !== undefined) return cached;
  let fillable = false;
  try {
    let drawing = false;
    let closed = false;
    let allClosed = true;
    for (const command of commandsFromPathData(data)) {
      if (command[0] === 'M' || command[0] === 'm') {
        if (drawing) allClosed = false;
        drawing = false;
      } else if (command[0] === 'Z' || command[0] === 'z') {
        closed = closed || drawing;
        drawing = false;
      } else drawing = true;
    }
    if (closed && allClosed && !drawing) {
      const path = pathFromPathData(data);
      const segments = normalizeSegments(path);
      if (
        segments.every((segment) =>
          segment.slice(1).every((point) => Array.isArray(point) && point.every(Number.isFinite)),
        )
      ) {
        // A diagonal/retraced contour has positive bounding dimensions but no fill.
        // Resolve the actual nonzero-filled faces, including holes/self intersections.
        const filled = new PathBoolean([{ path, fillRule: FillRule.NonZero }]).get(
          PathBooleanOperation.Union,
        );
        const bounds = segmentsBounds(normalizeSegments(filled.flat()));
        fillable =
          !!bounds &&
          Number.isFinite(bounds.w) &&
          Number.isFinite(bounds.h) &&
          bounds.w > 0 &&
          bounds.h > 0;
      }
    }
  } catch {
    fillable = false;
  }
  if (pathFillCache.size >= PATH_FILL_CACHE_LIMIT) {
    const oldest = pathFillCache.keys().next().value;
    if (oldest !== undefined) pathFillCache.delete(oldest);
  }
  pathFillCache.set(data, fillable);
  return fillable;
}

/** Shared drop/menu/store eligibility; never let stroke-only or malformed paths accept fills. */
export function isFillableImageShape(element: CanvasElement | undefined): element is ShapeElement {
  if (
    !element ||
    element.type !== 'shape' ||
    element.visible === false ||
    element.locked ||
    !element.shape ||
    element.shape === 'line' ||
    element.shape === 'arrow' ||
    !hasFiniteGeometry(element) ||
    !CanvasElementSchema.safeParse(element).success
  )
    return false;

  if (element.shape !== 'path') return true;
  return !!element.svgPath?.trim() && hasClosedPathFill(element.svgPath);
}

/** Drop/hover eligibility also respects group completeness and locked group siblings. */
export function isDropFillableImageShape(
  elements: readonly CanvasElement[],
  element: CanvasElement | undefined,
): element is ShapeElement {
  return isFillableImageShape(element) && canArrangeSelection(elements, [element.id]);
}

/** Replace the image recipe, not the target's identity, vector geometry or styling. */
export function buildShapeImageFillPatch(src: string): Partial<ShapeElement> {
  return {
    fillType: 'image',
    fillImageSrc: src,
    fillImageFit: 'cover',
    fillImageScale: undefined,
    fillImageRotation: undefined,
    fillImageOffsetX: undefined,
    fillImageOffsetY: undefined,
  };
}

export function getImageShapePair(
  elements: readonly CanvasElement[],
  ids: readonly string[],
): { image: ImageElement; shape: ShapeElement } | null {
  if (ids.length !== 2 || ids[0] === ids[1]) return null;
  const selected = elements.filter((element) => ids.includes(element.id));
  if (selected.length !== 2 || !ids.every((id) => selected.some((element) => element.id === id)))
    return null;
  if (!canArrangeSelection(elements, ids)) return null;
  const image = selected.find((element): element is ImageElement => element.type === 'image');
  const shape = selected.find(isFillableImageShape);
  return image && shape && image.visible !== false && !image.locked && hasFiniteGeometry(image)
    ? { image, shape }
    : null;
}
