import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFilterCache, type CacheableKonvaNode } from '../src/hooks/use-filter-cache';
import {
  useCanvasInteraction,
  resetCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { useEditorStore } from '../src/lib/editor-store';

const capture = vi.hoisted(() => ({ active: false }));
vi.mock('@/lib/canvas/konva-export-utils', () => ({ isStageCaptureActive: () => capture.active }));
beforeEach(() => {
  vi.useFakeTimers();
  capture.active = false;
  useEditorStore.getState().reset();
  resetCanvasInteraction();
});
afterEach(() => vi.useRealTimers());

function setup(observeCropChanges = false) {
  const stage = { width: () => 1000, scaleX: () => 1 };
  const node: CacheableKonvaNode = {
    getStage: () => stage,
    width: () => 100,
    height: () => 100,
    clearCache: vi.fn(),
    cache: vi.fn(),
    isCached: () => true,
    on: vi.fn(),
    off: vi.fn(),
  };
  const nodeRef = { current: node };
  const view = renderHook(() =>
    useFilterCache({
      nodeRef,
      hasFilters: true,
      canvasWidth: 1000,
      image: null,
      observeCropChanges,
    }),
  );
  vi.mocked(node.cache!).mockClear();
  vi.mocked(node.clearCache!).mockClear();
  return { ...view, node, stage };
}

describe('useFilterCache all-image capture and gesture barrier', () => {
  it.each(['capture', 'drag', 'transform'] as const)(
    'defers cache mutation during %s and retries once settled',
    (reason) => {
      const view = setup();
      act(() => {
        if (reason === 'capture') capture.active = true;
        else if (reason === 'drag') useCanvasInteraction.getState().setIsDragging(true);
        else useCanvasInteraction.getState().setIsTransforming(true);
        view.result.current(true);
        vi.advanceTimersByTime(240);
      });
      expect(view.node.cache).not.toHaveBeenCalled();
      expect(view.node.clearCache).not.toHaveBeenCalled();
      act(() => {
        capture.active = false;
        resetCanvasInteraction();
        vi.advanceTimersByTime(120);
      });
      expect(view.node.cache).toHaveBeenCalledTimes(1);
      view.unmount();
    },
  );

  it.each(['capture', 'drag', 'transform'] as const)(
    'preserves pending crop settlement when the %s retry resumes',
    (reason) => {
      const view = setup(true);
      const invalidateCrop = vi.mocked(view.node.on!).mock.calls[0][1];
      act(() => invalidateCrop());
      vi.mocked(view.node.clearCache!).mockClear();
      act(() => {
        if (reason === 'capture') capture.active = true;
        else if (reason === 'drag') useCanvasInteraction.getState().setIsDragging(true);
        else useCanvasInteraction.getState().setIsTransforming(true);
        view.result.current(true);
        vi.advanceTimersByTime(500);
      });
      expect(view.node.cache).not.toHaveBeenCalled();
      expect(view.node.clearCache).not.toHaveBeenCalled();
      act(() => {
        capture.active = false;
        resetCanvasInteraction();
        vi.advanceTimersByTime(499);
      });
      expect(view.node.cache).not.toHaveBeenCalled();
      expect(view.node.clearCache).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
      expect(view.node.cache).toHaveBeenCalledTimes(1);
      expect(view.node.clearCache).toHaveBeenCalledTimes(1);
      act(() => vi.advanceTimersByTime(1000));
      expect(view.node.cache).toHaveBeenCalledTimes(1);
      view.unmount();
    },
  );

  it('debounces fit-mode changes and cancels deferred work on unmount', () => {
    const view = setup();
    view.stage.scaleX = () => 2;
    act(() => {
      useEditorStore.getState().setCanvasFitMode('width');
      vi.advanceTimersByTime(119);
    });
    expect(view.node.cache).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(view.node.cache).toHaveBeenCalledTimes(1);
    capture.active = true;
    act(() => view.result.current(true));
    view.unmount();
    capture.active = false;
    vi.advanceTimersByTime(500);
    expect(view.node.cache).toHaveBeenCalledTimes(1);
  });
});
