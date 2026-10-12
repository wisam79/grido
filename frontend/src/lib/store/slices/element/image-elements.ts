import type { StateCreator } from 'zustand';
import type { CanvasElement } from '../../types';
import { uid } from '../../../utils';
import { computeSmartGridLayout } from '../../../canvas/grid-layout-math';
import { nextZIndex, normalizeSelection } from './types';
import type { ElementCross, ElementSlice } from './types';

export const createImageElementsSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<ElementSlice, 'addImageElement' | 'addImageElementsBatch'>
> = (set, get) => ({
  addImageElement: (src, imageAspectRatio = 1, stickerSource) => {
    const id = uid();
    const state = get();

    let hPercent = 0.5;
    let wPercent = hPercent * (state.canvasHeight / state.canvasWidth) * imageAspectRatio;

    if (wPercent > 0.8) {
      wPercent = 0.8;
      hPercent = (wPercent * (state.canvasWidth / state.canvasHeight)) / imageAspectRatio;
    }

    const newEl: CanvasElement = {
      id,
      type: 'image',
      x: 0.5 - wPercent / 2,
      y: 0.5 - hPercent / 2,
      width: wPercent,
      height: hPercent,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(state.elements),
      imageSrc: src,
      filter: 'none',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      ...(stickerSource ? { stickerSource } : {}),
    };
    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
      lastEditedImage: src,
      lastEditedImageAspect: imageAspectRatio,
    }));
    get().pushHistory();
  },

  addImageElementsBatch: (items, options) => {
    if (!items || items.length === 0) return;
    const state = get();
    const canvasWidth = state.canvasWidth || 2480;
    const canvasHeight = state.canvasHeight || 3508;

    // Check if items already have fully specified layout coordinates
    const hasPredefinedCoords = items.every(
      (it) =>
        it.x !== undefined &&
        it.y !== undefined &&
        it.width !== undefined &&
        it.height !== undefined,
    );

    const placedItems = hasPredefinedCoords
      ? items.map((it) => ({
          src: it.src,
          aspectRatio: it.aspectRatio || 1,
          x: it.x!,
          y: it.y!,
          width: it.width!,
          height: it.height!,
        }))
      : computeSmartGridLayout(items, {
          canvasWidth,
          canvasHeight,
          columns: options?.columns,
          gapPx: options?.gapPx,
          marginPx: options?.marginPx,
          centerLastRow: options?.centerLastRow ?? true,
          layoutMode: options?.layoutMode ?? 'grid',
        });

    let currentZ = nextZIndex(state.elements);
    const newElements: CanvasElement[] = placedItems.map((placed) => {
      const elId = uid();
      const el: CanvasElement = {
        id: elId,
        type: 'image',
        x: placed.x,
        y: placed.y,
        width: placed.width,
        height: placed.height,
        rotation: 0,
        opacity: 1,
        zIndex: currentZ,
        imageSrc: placed.src,
        filter: 'none',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
      };
      currentZ += 10;
      return el;
    });

    const newIds = newElements.map((e) => e.id);
    const lastItem = items[items.length - 1];

    set((s) => ({
      elements: [...s.elements, ...newElements],
      ...normalizeSelection(newIds, newIds[0]),
      lastEditedImage: lastItem?.src ?? s.lastEditedImage,
      lastEditedImageAspect: lastItem?.aspectRatio ?? s.lastEditedImageAspect,
    }));
    get().pushHistory();
  },
});
