import { minZIndex, nextZIndex, normalizeSelection } from './types';
import { resolveRingInnerRadius } from '../../../canvas/ring-geometry';
import { uid } from '../../../utils';

import type { ElementCross, ElementSlice } from './types';
import type { CanvasElement, ShapeElement } from '../../types';
import type { StateCreator } from 'zustand';

export const createShapeElementsSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<
    ElementSlice,
    'addShapeElement' | 'addBackdropRect' | 'centerElementHorizontally' | 'centerElementVertically'
  >
> = (set, get) => ({
  centerElementHorizontally: (id: string) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el) return;
    const newX = Math.max(0, 0.5 - el.width / 2);
    set((s) => ({
      elements: s.elements.map((item: CanvasElement) =>
        item.id === id ? { ...item, x: newX } : item,
      ),
    }));
    get().pushHistory();
  },

  centerElementVertically: (id: string) => {
    const el = get().elements.find((x) => x.id === id);
    if (!el) return;
    const newY = Math.max(0, 0.5 - el.height / 2);
    set((s) => ({
      elements: s.elements.map((item: CanvasElement) =>
        item.id === id ? { ...item, y: newY } : item,
      ),
    }));
    get().pushHistory();
  },

  addShapeElement: (shape, svgPath, options) => {
    const id = uid();
    const state = get();

    const isLinear = shape === 'line' || shape === 'arrow';
    const basePx = Math.min(state.canvasWidth, state.canvasHeight) * 0.25;
    const aspect = options?.aspect && options.aspect > 0 ? options.aspect : 1;
    const wPx = isLinear ? basePx * 1.5 : basePx * aspect;
    const hPx = isLinear ? Math.max(24, basePx * 0.1) : basePx;

    const wPercent = wPx / state.canvasWidth;
    const hPercent = hPx / state.canvasHeight;

    const newEl: CanvasElement = {
      id,
      type: 'shape',
      x: 0.5 - wPercent / 2,
      y: 0.5 - hPercent / 2,
      width: wPercent,
      height: hPercent,
      rotation: 0,
      opacity: 1,
      zIndex: nextZIndex(state.elements),
      shape,
      fill: '#3b82f6',
      stroke: '#3b82f6',
      strokeWidth: isLinear ? 4 : 0,
      radius: 8,
      svgPath,
      sides: shape === 'polygon' ? 6 : undefined,
      pointerLength: shape === 'arrow' ? 14 : undefined,
      pointerWidth: shape === 'arrow' ? 14 : undefined,
      arcAngle: shape === 'wedge' ? 90 : shape === 'arc' ? 270 : undefined,
      // القوس الحلقي يشارك الحلقة هندستها الداخلية نفسها (مصدر واحد: ring-geometry)
      innerRadius:
        shape === 'ring' || shape === 'arc'
          ? resolveRingInnerRadius(undefined, basePx, basePx)
          : undefined,
      ...options?.defaults,
    };
    set((s) => ({
      elements: [...s.elements, newEl],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
  },

  addBackdropRect: (patch = {}) => {
    const id = uid();
    const state = get();
    // دائماً خلف كل العناصر: أدنى zIndex ناقص خطوة الترتيب المعتادة
    // (حلقة لا نشر مصفوفة — Math.min(0, ...elements) يفشل بـ RangeError
    // على كانفاسات بكثير من العناصر)
    const minZ = minZIndex(state.elements);

    const backdrop: CanvasElement = {
      id,
      type: 'shape',
      shape: 'rect',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      opacity: 1,
      zIndex: minZ - 10,
      radius: 0,
      fill: '#3b82f6',
      stroke: 'transparent',
      strokeWidth: 0,
      ...patch,
    } as ShapeElement;

    set((s) => ({
      elements: [...s.elements, backdrop],
      ...normalizeSelection(id),
    }));
    get().pushHistory();
    return id;
  },
});
