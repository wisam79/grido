import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  useStableViewportSize,
  notifyPanelTransition,
} from '../src/components/editor/canvas/use-stable-viewport-size';

describe('useStableViewportSize', () => {
  let mockElement: HTMLElement;
  let resizeObserverCallback: (entries: ResizeObserverEntry[]) => void;

  beforeEach(() => {
    mockElement = document.createElement('div');
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      width: 1024,
      height: 768,
      top: 0,
      left: 0,
      right: 1024,
      bottom: 768,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    global.ResizeObserver = class {
      constructor(callback: (entries: ResizeObserverEntry[]) => void) {
        resizeObserverCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يلتزم بالقياس الأولي فور التركيب', () => {
    const containerRef = { current: mockElement };
    const { result } = renderHook(() => useStableViewportSize(containerRef));

    expect(result.current).toEqual({ w: 1024, h: 768 });
  });

  it('يحدّث المقاس بسلاسة عبر requestAnimationFrame عند استلام أحداث ResizeObserver', async () => {
    const containerRef = { current: mockElement };
    const { result } = renderHook(() => useStableViewportSize(containerRef));

    expect(result.current).toEqual({ w: 1024, h: 768 });

    // محاكاة توسع الحاوية نتيجة طي اللوح الجانبي (1024 -> 1312)
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      width: 1312,
      height: 768,
      top: 0,
      left: 0,
      right: 1312,
      bottom: 768,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    act(() => {
      resizeObserverCallback([]);
    });

    // استدعاء رشفة الفريم (requestAnimationFrame)
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(result.current).toEqual({ w: 1312, h: 768 });
  });

  it('يبدأ حلقة المزامنة النشطة فور استدعاء notifyPanelTransition', async () => {
    const containerRef = { current: mockElement };
    const { result } = renderHook(() => useStableViewportSize(containerRef));

    expect(result.current).toEqual({ w: 1024, h: 768 });

    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      width: 1150,
      height: 768,
      top: 0,
      left: 0,
      right: 1150,
      bottom: 768,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    act(() => {
      notifyPanelTransition();
    });

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(result.current).toEqual({ w: 1150, h: 768 });
  });

  it('يلتزم بالمقاس الحالي فوراً عند وقوع حدث transitionend', () => {
    const containerRef = { current: mockElement };
    const { result } = renderHook(() => useStableViewportSize(containerRef));

    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      width: 1200,
      height: 768,
      top: 0,
      left: 0,
      right: 1200,
      bottom: 768,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    act(() => {
      const panel = document.createElement('aside');
      panel.className = 'fluent-panel-motion';
      const event = new TransitionEvent('transitionend');
      Object.defineProperty(event, 'target', { value: panel });
      window.dispatchEvent(event);
    });

    expect(result.current).toEqual({ w: 1200, h: 768 });
  });
});
