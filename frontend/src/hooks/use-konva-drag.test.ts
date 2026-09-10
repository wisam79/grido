import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKonvaDrag } from './use-konva-drag';
import { useEditorStore } from '@/lib/editor-store';
import { CanvasElement } from '@/lib/store/types';
import type { KonvaEventObject } from 'konva/lib/Node';

describe('useKonvaDrag canonical architecture', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
  });

  it('allows flipped elements to drag freely across the entire canvas without half-width restriction', () => {
    const canvasWidth = 1000;
    const canvasHeight = 1000;

    const flippedElement: CanvasElement = {
      id: 'el-flipped-1',
      type: 'image',
      imageSrc: 'test.png',
      x: 0.2,
      y: 0.2,
      width: 0.3,
      height: 0.3,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      flipX: true,
      flipY: false,
    };

    useEditorStore.setState({
      elements: [flippedElement],
      selectedIds: [flippedElement.id],
      selectedId: flippedElement.id,
      canvasWidth,
      canvasHeight,
    });

    const mockStage = {
      scaleX: () => 1,
    };
    const mockNode = {
      x: vi.fn().mockReturnValue(200),
      y: vi.fn().mockReturnValue(200),
      getStage: () => mockStage,
    };

    const altPressedRef = { current: false };
    const shiftPressedRef = { current: false };
    const setActiveGuides = vi.fn();
    const getKonvaNode = vi.fn().mockReturnValue(mockNode);

    const { result } = renderHook(() =>
      useKonvaDrag({
        element: flippedElement,
        canvasWidth,
        canvasHeight,
        snapToGrid: false,
        altPressedRef,
        shiftPressedRef,
        getKonvaNode,
        setActiveGuides,
      })
    );

    // 1. Candidate position in the second half of canvas (e.g. x = 700px, 70% of canvas)
    // Previously, flawed coordinate math or inverted margin clamping would trap it near center (500px).
    const boundedRight = result.current.dragBoundFunc({ x: 700, y: 400 });
    expect(boundedRight.x).toBe(700);
    expect(boundedRight.y).toBe(400);

    // 2. Candidate position near right boundary (x = 700 + width = 1000px, right edge of canvas)
    const boundedFarRight = result.current.dragBoundFunc({ x: 700, y: 100 });
    expect(boundedFarRight.x).toBe(700);

    // 3. Candidate position near left boundary (x = 0)
    const boundedLeft = result.current.dragBoundFunc({ x: 0, y: 100 });
    expect(boundedLeft.x).toBe(0);

    // 4. Clamping respects canvas width margin (-25% to +125% - width)
    const clampedOverRight = result.current.dragBoundFunc({ x: 2000, y: 0 });
    // max allowable is canvasWidth * (1 + 0.25) - elW = 1250 - 300 = 950
    expect(clampedOverRight.x).toBe(950);
  });

  it('updates store with exact top-left position on drag end without flip compensation offsets', () => {
    const canvasWidth = 1000;
    const canvasHeight = 1000;

    const flippedElement: CanvasElement = {
      id: 'el-flipped-2',
      type: 'image',
      imageSrc: 'test.png',
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.2,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      flipX: true,
      flipY: true,
    };

    useEditorStore.setState({
      elements: [flippedElement],
      selectedIds: [flippedElement.id],
      selectedId: flippedElement.id,
      canvasWidth,
      canvasHeight,
    });

    let nodeX = 100;
    let nodeY = 100;
    const mockNode = {
      x: () => nodeX,
      y: () => nodeY,
      getStage: () => ({ scaleX: () => 1 }),
    };

    const altPressedRef = { current: false };
    const shiftPressedRef = { current: false };
    const setActiveGuides = vi.fn();
    const getKonvaNode = vi.fn().mockReturnValue(mockNode);

    const { result } = renderHook(() =>
      useKonvaDrag({
        element: flippedElement,
        canvasWidth,
        canvasHeight,
        snapToGrid: false,
        altPressedRef,
        shiftPressedRef,
        getKonvaNode,
        setActiveGuides,
      })
    );

    // Simulate drag start
    result.current.onDragStart();

    // Move to x = 600, y = 350 (past the center of canvas)
    nodeX = 600;
    nodeY = 350;

    const mockDragEvent = {
      target: mockNode,
    } as unknown as KonvaEventObject<DragEvent>;

    result.current.onDragEnd(mockDragEvent);

    const updated = useEditorStore.getState().elements.find(e => e.id === flippedElement.id);
    expect(updated).toBeDefined();
    // In canonical architecture, x is simply 600 / 1000 = 0.6 and y is 350 / 1000 = 0.35
    expect(updated?.x).toBeCloseTo(0.6, 4);
    expect(updated?.y).toBeCloseTo(0.35, 4);
    // Flipping states are preserved
    expect(updated?.flipX).toBe(true);
    expect(updated?.flipY).toBe(true);
  });

  it('snaps 180° rotated element to canvas center (0.5) and emits guide at 0.5 instead of node.x', () => {
    const canvasWidth = 1000;
    const canvasHeight = 1000;

    // A 180° rotated element with width 200px (0.2).
    // In Konva with rotation=180, node.x represents the right visual edge.
    // When the element is visually centered at 0.5:
    // visual bounds are [400px, 600px] (center at 500px).
    // node.x is 600px!
    const rotatedElement: CanvasElement = {
      id: 'el-rotated-180',
      type: 'image',
      imageSrc: 'test.png',
      x: 0.6,
      y: 0.6,
      width: 0.2,
      height: 0.2,
      rotation: 180,
      opacity: 1,
      zIndex: 1,
      flipX: false,
      flipY: false,
    };

    useEditorStore.setState({
      elements: [rotatedElement],
      selectedIds: [rotatedElement.id],
      selectedId: rotatedElement.id,
      canvasWidth,
      canvasHeight,
    });

    let nodeX = 600;
    const nodeY = 600;
    const mockStage = {
      scaleX: () => 1,
    };
    const mockNode = {
      x: () => nodeX,
      y: () => nodeY,
      getStage: () => mockStage,
    };

    const altPressedRef = { current: false };
    const shiftPressedRef = { current: false };
    const setActiveGuides = vi.fn();
    const getKonvaNode = vi.fn().mockReturnValue(mockNode);

    const { result } = renderHook(() =>
      useKonvaDrag({
        element: rotatedElement,
        canvasWidth,
        canvasHeight,
        snapToGrid: true,
        altPressedRef,
        shiftPressedRef,
        getKonvaNode,
        setActiveGuides,
      })
    );

    result.current.onDragStart();

    // Drag to near-center: proposed node position where visual center is near 500px (e.g. node.x = 603px -> visual center = 503px)
    const bounded = result.current.dragBoundFunc({ x: 603, y: 600 });
    // It should snap the visual center to 500px!
    // Since visual center is 500px and width is 200px, node.x (right edge) must snap to 600px!
    expect(bounded.x).toBe(600);

    // Call onDragMove with the node near center to verify emitted guide line
    nodeX = 602;
    const mockDragEvent = {
      target: {
        x: () => 602,
        y: () => 600,
        getStage: () => mockStage,
        getLayer: () => ({ batchDraw: vi.fn() }),
      },
    } as unknown as KonvaEventObject<DragEvent>;

    result.current.onDragMove(mockDragEvent);

    // The active guide must be emitted at coord: 0.5 (center of canvas, 500px), NOT at 0.602 or 0.6!
    expect(setActiveGuides).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'v', coord: 0.5 })
      ])
    );
  });

  it('alignSelectedElements centers a 180° rotated element with exact visual center at 0.5', () => {
    const canvasWidth = 1000;
    const canvasHeight = 1000;

    // Element initially at visual [100, 300], so node.x = 300 (0.3)
    const rotatedElement: CanvasElement = {
      id: 'el-align-180',
      type: 'image',
      imageSrc: 'test.png',
      x: 0.3,
      y: 0.3,
      width: 0.2,
      height: 0.2,
      rotation: 180,
      opacity: 1,
      zIndex: 1,
      flipX: false,
      flipY: false,
    };

    useEditorStore.setState({
      elements: [rotatedElement],
      selectedIds: [rotatedElement.id],
      selectedId: rotatedElement.id,
      canvasWidth,
      canvasHeight,
    });

    useEditorStore.getState().alignSelectedElements('center');

    const updated = useEditorStore.getState().elements.find(e => e.id === rotatedElement.id);
    expect(updated).toBeDefined();
    // Visual center must be at 0.5 (500px).
    // For width 0.2 (200px) and rotation 180, visual bounds are [400px, 600px].
    // Therefore node.x must be 0.6 (600px)!
    expect(updated?.x).toBeCloseTo(0.6, 4);
  });
});
