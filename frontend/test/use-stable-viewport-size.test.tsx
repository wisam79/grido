import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  useStableViewportSize,
  notifyPanelTransition,
} from '../src/components/editor/canvas/use-stable-viewport-size';

describe('useStableViewportSize', () => {
  let node: HTMLElement;
  let width: number;
  let height: number;
  let resizeObserverCallback: ResizeObserverCallback;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;

  beforeEach(() => {
    width = 1024;
    height = 768;
    node = document.createElement('div');
    Object.defineProperties(node, {
      clientWidth: { get: () => width },
      clientHeight: { get: () => height },
    });
    // Simulate UI CSS zoom: screen rect must never determine the fit dimensions.
    vi.spyOn(node, 'getBoundingClientRect').mockImplementation(() => ({
      width: width * 1.5,
      height: height * 1.5,
      top: 0,
      left: 0,
      right: width * 1.5,
      bottom: height * 1.5,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeObserverCallback = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.useFakeTimers();
    frames = new Map();
    nextFrame = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.set(++nextFrame, cb);
      return nextFrame;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function resize(contentWidth = width, contentHeight = height) {
    act(() =>
      resizeObserverCallback(
        [
          {
            target: node,
            contentRect: { width: contentWidth, height: contentHeight },
          } as unknown as ResizeObserverEntry,
        ],
        {} as ResizeObserver,
      ),
    );
  }
  function frame() {
    const callbacks = [...frames.values()];
    frames.clear();
    act(() => callbacks.forEach((cb) => cb(16)));
  }
  function endTransition() {
    act(() => {
      const panel = document.createElement('aside');
      panel.className = 'fluent-panel-motion';
      const event = new Event('transitionend');
      Object.defineProperty(event, 'target', { value: panel });
      window.dispatchEvent(event);
    });
  }

  it('measures initial local CSS size, never the zoomed bounding rect', () => {
    const { result } = renderHook(() => useStableViewportSize({ current: node }));
    expect(result.current).toEqual({ w: 1024, h: 768 });
    expect(node.getBoundingClientRect).not.toHaveBeenCalled();
  });

  it('uses the RO content box with rAF coalescing and equality gating', () => {
    const ref = { current: node };
    const { result } = renderHook(() => useStableViewportSize(ref));
    resize(1150.1);
    resize(1312.2, 768.1);
    expect(frames.size).toBe(1);
    frame();
    expect(result.current).toEqual({ w: 1312, h: 768 });
    const previous = result.current;
    resize(1312.3, 768.2);
    frame();
    expect(result.current).toBe(previous);
  });

  it('cancels queued RO frames when a panel transition starts', () => {
    const ref = { current: node };
    const { result } = renderHook(() => useStableViewportSize(ref));
    width = 1100;
    resize();
    act(() => notifyPanelTransition());
    expect(frames.size).toBe(0);
    frame();
    width = 1250;
    resize();
    frame();
    expect(result.current).toEqual({ w: 1024, h: 768 });
    endTransition();
    expect(result.current).toEqual({ w: 1250, h: 768 });
  });

  it('settles to current local dimensions after the transition safety timeout', () => {
    const ref = { current: node };
    const { result } = renderHook(() => useStableViewportSize(ref));
    act(() => notifyPanelTransition());
    width = 1250;
    act(() => vi.advanceTimersByTime(250));
    expect(result.current).toEqual({ w: 1250, h: 768 });
  });

  it('clears queued frames and timers on unmount', () => {
    const ref = { current: node };
    const { unmount } = renderHook(() => useStableViewportSize(ref));
    resize(1200);
    act(() => notifyPanelTransition());
    unmount();
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
