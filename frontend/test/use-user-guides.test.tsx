import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useUserGuides } from '../src/components/editor/canvas/use-user-guides';
import { useEditorStore } from '../src/lib/editor-store';

import type React from 'react';

/** إطار الورقة المعروض: يسار 40 وأعلى 100 بمقاس 600×800. */
function makePaperRef() {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ left: 40, top: 100, width: 600, height: 800 }) as DOMRect;
  return { current: el };
}

function pointerEvent(clientX: number, clientY: number) {
  return {
    clientX,
    clientY,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent<SVGSVGElement>;
}

function releasePointer() {
  act(() => {
    window.dispatchEvent(new Event('pointerup'));
  });
}

describe('useUserGuides — بدء سحب الخطوط من المساطر', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 });
  });

  it('starts a horizontal guide from the vertical mouse offset and commits it on release', () => {
    const innerRef = makePaperRef();
    const { result } = renderHook(() => useUserGuides(innerRef, 600, 800, false, []));
    const event = pointerEvent(0, 300); // (300 - 100) / 800 = 0.25

    act(() => result.current.handleStartDragHGuide(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.dragGuideState).toEqual({ type: 'h', pos: 0.25 });

    releasePointer();

    expect(result.current.dragGuideState).toBeNull();
    expect(useEditorStore.getState().userGuides).toHaveLength(1);
    expect(useEditorStore.getState().userGuides[0]).toMatchObject({ type: 'h', pos: 0.25 });
  });

  it('starts a vertical guide from the horizontal mouse offset and commits it on release', () => {
    const innerRef = makePaperRef();
    const { result } = renderHook(() => useUserGuides(innerRef, 600, 800, false, []));
    const event = pointerEvent(190, 0); // (190 - 40) / 600 = 0.25

    act(() => result.current.handleStartDragVGuide(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.dragGuideState).toEqual({ type: 'v', pos: 0.25 });

    releasePointer();

    expect(useEditorStore.getState().userGuides).toHaveLength(1);
    expect(useEditorStore.getState().userGuides[0]).toMatchObject({ type: 'v', pos: 0.25 });
  });

  it('does not start a drag in print mode', () => {
    const innerRef = makePaperRef();
    const { result } = renderHook(() => useUserGuides(innerRef, 600, 800, true, []));

    act(() => result.current.handleStartDragHGuide(pointerEvent(0, 300)));
    act(() => result.current.handleStartDragVGuide(pointerEvent(190, 0)));

    expect(result.current.dragGuideState).toBeNull();
  });

  it('does not start a drag while guides are locked', () => {
    useEditorStore.setState({ lockUserGuides: true });
    const innerRef = makePaperRef();
    const { result } = renderHook(() => useUserGuides(innerRef, 600, 800, false, []));

    act(() => result.current.handleStartDragHGuide(pointerEvent(0, 300)));
    act(() => result.current.handleStartDragVGuide(pointerEvent(190, 0)));

    expect(result.current.dragGuideState).toBeNull();
  });
});
