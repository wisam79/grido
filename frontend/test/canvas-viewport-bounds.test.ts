import { render, renderHook, act } from '@testing-library/react';
import React from 'react';
import { Stage } from 'react-konva';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  clampStagePos,
  computeDefaultStageOrigin,
  useCanvasViewport,
} from '../src/components/editor/canvas/use-canvas-viewport';
import {
  RESET_CANVAS_PAN_EVENT,
  fitZoomStore,
  fitWidthZoomStore,
  autoFitZoomStore,
  actualSizeZoomStore,
  resetZoomStore,
  zoomInStore,
} from '../src/hooks/use-canvas-zoom';
import { createCanvasCamera, reconcileCanvasCamera } from '../src/lib/canvas/viewport-geometry';
import { stepZoom } from '../src/lib/canvas/zoom';
import { useEditorStore } from '../src/lib/editor-store';
import { getDocumentSession } from '../src/lib/io/document-session';
import { serializeEditorState } from '../src/lib/io/project-serializer';

import type Konva from 'konva';

const noop = () => {};

class MockContext2D {
  canvas: HTMLCanvasElement | null = null;
  globalAlpha = 1;
  globalCompositeOperation = 'source-over';
  fillStyle: unknown = '#000';
  strokeStyle: unknown = '#000';
  lineWidth = 1;
  lineCap = 'butt';
  lineJoin = 'miter';
  font = '10px sans-serif';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  shadowBlur = 0;
  shadowColor = 'rgba(0,0,0,0)';
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  scale = noop;
  rotate = noop;
  translate = noop;
  transform = noop;
  setTransform = noop;
  resetTransform = noop;
  save = noop;
  restore = noop;
  beginPath = noop;
  closePath = noop;
  moveTo = noop;
  lineTo = noop;
  bezierCurveTo = noop;
  quadraticCurveTo = noop;
  arc = noop;
  arcTo = noop;
  ellipse = noop;
  rect = noop;
  fill = noop;
  stroke = noop;
  clip = noop;
  clearRect = noop;
  fillRect = noop;
  strokeRect = noop;
  fillText = noop;
  strokeText = noop;
  drawImage = noop;
  setLineDash = noop;
  createImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  getImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  putImageData = noop;
  createLinearGradient = () => ({ addColorStop: noop });
  createRadialGradient = () => ({ addColorStop: noop });
  createPattern = () => null;
  measureText = () => ({ width: 0 });
}

function installCanvasMock() {
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = function (
    this: HTMLCanvasElement,
  ) {
    const self = this as HTMLCanvasElement & { __mockCtx?: MockContext2D };
    if (!self.__mockCtx) {
      self.__mockCtx = new MockContext2D();
      self.__mockCtx.canvas = self;
    }
    return self.__mockCtx;
  };
}

describe('use-canvas-viewport — clampStagePos boundaries', () => {
  beforeEach(() => {
    installCanvasMock();
  });
  it('يمنع snap-back: يحافظ على هامش 150px مرئي بدل فرض توسيط عند التمرير بعيداً', () => {
    const viewportW = 1000;
    const viewportH = 800;
    const displayW = 600;
    const displayH = 500;

    const scrolledAway = { x: -500, y: -2000 };
    const clamped = clampStagePos(scrolledAway, displayW, displayH, viewportW, viewportH);

    // minX = 150 - 600 = -450 | minY = 150 - 500 = -350
    expect(clamped.x).toBe(-450);
    expect(clamped.y).toBe(-350);
  });

  it('يسمح بالتمرير الحر على المحورين عندما تكون الورقة أطول من النافذة', () => {
    const viewportW = 1000;
    const viewportH = 800;
    const displayW = 600;
    const displayH = 1600;

    // موضع ظاهر بالكامل ضمن الحدود يُقبل كما هو
    const topExcess = clampStagePos({ x: 200, y: 500 }, displayW, displayH, viewportW, viewportH);
    expect(topExcess.y).toBe(500);

    // minY = minVisible - displayH = 150 - 1600 = -1450
    const bottomExcess = clampStagePos(
      { x: 200, y: -2500 },
      displayW,
      displayH,
      viewportW,
      viewportH,
    );
    expect(bottomExcess.y).toBe(-1450);

    const midScroll = clampStagePos({ x: 200, y: -400 }, displayW, displayH, viewportW, viewportH);
    expect(midScroll.y).toBe(-400);
  });

  it('يمنع هروب الورقة كلياً خارج حدود الشاشة عند التحريك الحر', () => {
    const viewportW = 1200;
    const viewportH = 900;
    const displayW = 800;
    const displayH = 600;

    // محاولة رمي الورقة لليسار في الفراغ اللانهائي
    const farLeft = clampStagePos({ x: -10000, y: 150 }, displayW, displayH, viewportW, viewportH);
    // minX = 150 - displayW = 150 - 800 = -650
    expect(farLeft.x).toBe(-650);
    // الورقة تحتفظ بـ 150px مرئية على يسار الشاشة (-650 + 800 = 150px)
    expect(farLeft.x + displayW).toBe(150);

    // محاولة رمي الورقة لليمين في الفراغ اللانهائي
    const farRight = clampStagePos({ x: 10000, y: 150 }, displayW, displayH, viewportW, viewportH);
    // maxX = viewportW - 150 = 1200 - 150 = 1050
    expect(farRight.x).toBe(1050);

    // محاولة رمي الورقة لأعلى في الفراغ اللانهائي
    const farTop = clampStagePos({ x: 200, y: -10000 }, displayW, displayH, viewportW, viewportH);
    expect(farTop.y + displayH).toBe(150);

    // محاولة رمي الورقة لأسفل في الفراغ اللانهائي
    const farBottom = clampStagePos({ x: 200, y: 10000 }, displayW, displayH, viewportW, viewportH);
    expect(farBottom.y).toBe(viewportH - 150);
  });

  it('KonvaOverlayLayer: يتم تصدير مكوّن الطبقة التفاعلية العلوية بنجاح لفصل الأدوات عن المحتوى', async () => {
    const { KonvaOverlayLayer } =
      await import('../src/components/editor/konva/layers/konva-overlay-layer');
    expect(KonvaOverlayLayer).toBeDefined();
    expect(typeof KonvaOverlayLayer).toBe('object'); // React.memo component
  });

  it('KonvaSingleLayer: يفرض قص العناصر عند حواف الورقة (clipX, clipY, clipWidth, clipHeight)', async () => {
    const { KonvaSingleLayer } =
      await import('../src/components/editor/konva/layers/konva-single-layer');
    expect(KonvaSingleLayer).toBeDefined();
    let stage: Konva.Stage | null = null;
    const { unmount } = render(
      React.createElement(
        Stage,
        {
          ref: (s: Konva.Stage | null) => {
            stage = s;
          },
          width: 1200,
          height: 800,
        },
        React.createElement(KonvaSingleLayer, {
          sortedElements: [],
          selectedIds: [],
          canvasWidth: 1200,
          canvasHeight: 800,
          snapToGrid: false,
          gridSize: 20,
          elementsRefs: { current: {} },
          altPressedRef: { current: false },
          shiftPressedRef: { current: false },
          setActiveGuides: vi.fn(),
          handleDoubleClick: vi.fn(),
          handleElementChange: vi.fn(),
          createElementMouseDown: () => () => {},
          createElementClick: () => () => {},
          createElementRef: () => ({ current: null }),
        }),
      ),
    );

    const layer = (stage as unknown as Konva.Stage)?.getLayers()[0];
    expect(layer).toBeDefined();
    expect(layer?.name()).toBe('elements-content-layer');
    expect(layer?.clipX()).toBe(0);
    expect(layer?.clipY()).toBe(0);
    expect(layer?.clipWidth()).toBe(1200);
    expect(layer?.clipHeight()).toBe(800);
    unmount();
  });

  it('KonvaCollageLayer: يفرض قص الكولاج عند حواف الورقة (clipX, clipY, clipWidth, clipHeight)', async () => {
    const { KonvaCollageLayer } =
      await import('../src/components/editor/konva/layers/konva-collage-layer');
    expect(KonvaCollageLayer).toBeDefined();
    let stage: Konva.Stage | null = null;
    const { unmount } = render(
      React.createElement(
        Stage,
        {
          ref: (s: Konva.Stage | null) => {
            stage = s;
          },
          width: 1000,
          height: 700,
        },
        React.createElement(KonvaCollageLayer, {
          slots: [],
          canvasWidth: 1000,
          canvasHeight: 700,
          collageMargin: 10,
          collageGap: 10,
          collageRadius: 0,
          collageStrokeWidth: 0,
          collageStrokeColor: '#000',
          collageShowCutLines: false,
          selectedId: null,
          handleSlotWheel: vi.fn(),
          updateSlot: vi.fn(),
          pushHistory: vi.fn(),
        }),
      ),
    );

    const layer = (stage as unknown as Konva.Stage)?.getLayers()[0];
    expect(layer).toBeDefined();
    expect(layer?.name()).toBe('collage-layer');
    expect(layer?.clipX()).toBe(0);
    expect(layer?.clipY()).toBe(0);
    expect(layer?.clipWidth()).toBe(1000);
    expect(layer?.clipHeight()).toBe(700);
    unmount();
  });

  it('computeDefaultStageOrigin: يوسط الورقة عندما تلائم الشاشة ويبدأ من الهامش العلوي عندما تكون أطول', () => {
    // 1. تلائم الشاشة تماماً: توسيط رياضي
    const fitted = computeDefaultStageOrigin(600, 400, 1000, 800, 32);
    expect(fitted.x).toBe(200); // (1000 - 600) / 2
    expect(fitted.y).toBe(200); // (800 - 400) / 2

    // 2. ملاءمة العرض (أطول من الشاشة): عرض موسط ورأس يبدأ من هامش 16px دون قطع الرأس
    const wideTall = computeDefaultStageOrigin(968, 1400, 1000, 800, 32);
    expect(wideTall.x).toBe(16); // (1000 - 968) / 2
    expect(wideTall.y).toBe(16); // margin = 32 / 2

    // 3. الحجم الفعلي 1:1 (أعرض وأطول من الشاشة): يبدأ من أعلى اليسار بهامش 16px
    const actualHuge = computeDefaultStageOrigin(2480, 3508, 1200, 800, 32);
    expect(actualHuge.x).toBe(16);
    expect(actualHuge.y).toBe(16);
  });

  it('أفعال الملاءمة والزوم تُطلق حدث RESET_CANVAS_PAN_EVENT لإعادة التوسيط الفوري', () => {
    const handler = vi.fn();
    window.addEventListener(RESET_CANVAS_PAN_EVENT, handler);

    fitZoomStore();
    expect(handler).toHaveBeenCalledTimes(1);

    fitWidthZoomStore();
    expect(handler).toHaveBeenCalledTimes(2);

    autoFitZoomStore();
    expect(handler).toHaveBeenCalledTimes(3);

    actualSizeZoomStore();
    expect(handler).toHaveBeenCalledTimes(4);

    resetZoomStore();
    expect(handler).toHaveBeenCalledTimes(5);

    window.removeEventListener(RESET_CANVAS_PAN_EVENT, handler);
  });
});

describe('use-canvas-viewport — تراكم زوم العجلة عبر الهدف المعلق (إصلاح Bug#2)', () => {
  const rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    installCanvasMock();
    useEditorStore.getState().reset();
    useEditorStore.setState({ canvasFitMode: 'height' });
    vi.useFakeTimers();
    rafCallbacks.length = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    useEditorStore.getState().reset();
  });

  function mountViewport(uiScale = 1) {
    let width = 800;
    let height = 600;
    let observeResize: ResizeObserverCallback;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observeResize = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const container = document.createElement('div');
    const inner = document.createElement('div');
    Object.defineProperties(container, {
      clientWidth: { get: () => width },
      clientHeight: { get: () => height },
    });
    vi.spyOn(container, 'getBoundingClientRect').mockImplementation(() => ({
      left: 20,
      top: 30,
      width: width * uiScale,
      height: height * uiScale,
      right: 20 + width * uiScale,
      bottom: 30 + height * uiScale,
      x: 20,
      y: 30,
      toJSON: () => {},
    }));
    document.body.appendChild(container);
    document.body.appendChild(inner);
    const containerRef = { current: container };
    const innerRef = { current: inner };
    const view = renderHook(() => useCanvasViewport(containerRef, innerRef));
    return {
      ...view,
      container,
      inner,
      resize: (w: number, h: number, notify = true) => {
        width = w;
        height = h;
        if (notify) act(() => observeResize([], {} as ResizeObserver));
      },
      unmount: () => {
        view.unmount();
        container.remove();
        inner.remove();
      },
    };
  }

  function dispatchWheel(
    node: HTMLElement,
    opts: { x?: number; y?: number; ctrl?: boolean; clientX?: number; clientY?: number },
  ) {
    const event = new MouseEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: opts.ctrl ?? false,
      clientX: opts.clientX ?? 0,
      clientY: opts.clientY ?? 0,
    });
    Object.defineProperty(event, 'deltaX', { value: opts.x ?? 0 });
    Object.defineProperty(event, 'deltaY', { value: opts.y ?? 0 });
    node.dispatchEvent(event);
  }

  function flushLatestFrame() {
    const cb = rafCallbacks[rafCallbacks.length - 1];
    act(() => {
      cb(16);
    });
  }

  it('يزوم إطاران بعاملين f1 وf2 بتراكم أسي كامل: z0*f1*f2 لا z0*f2', () => {
    useEditorStore.setState({ canvasZoom: 2 });
    const { container, unmount } = mountViewport();

    dispatchWheel(container, { y: -100, ctrl: true });
    flushLatestFrame(); // الإطار الأول: 2 * e^0.3
    dispatchWheel(container, { y: -100, ctrl: true });
    flushLatestFrame(); // الإطار الثاني: (2 * e^0.3) * e^0.3 — الأساس المعلق لا القيمة الملتزمة

    // بلا أي كتابة زوم لكل إطار — قيمة المتجر ما تزال الملتزمة القديمة
    expect(useEditorStore.getState().canvasZoom).toBe(2);

    act(() => {
      vi.advanceTimersByTime(150); // اكتمال مؤقت التثبيت (100ms)
    });

    // السلوك المعيب كان يعطي 2 * e^0.3 ≈ 2.7 — التراكم الصحيح 2 * e^0.6 ≈ 3.644
    expect(useEditorStore.getState().canvasZoom).toBeCloseTo(2 * Math.exp(0.6), 9);
    unmount();
  });

  it('يصرّف الهدف المعلق بكتابة واحدة عند تبديل الإيماءة من زوم إلى تحريك', () => {
    useEditorStore.setState({ canvasZoom: 2 });
    const { container, unmount } = mountViewport();

    dispatchWheel(container, { y: -100, ctrl: true });
    flushLatestFrame(); // هدف معلق: 2 * e^0.3 ومؤقت تثبيت 100ms مسلّح
    expect(useEditorStore.getState().canvasZoom).toBe(2); // لم يُثبَّت بعد

    dispatchWheel(container, { x: 40 }); // تحريك بلا Ctrl — مؤقت الزوم سيُستبدل بمؤقت التمرير
    flushLatestFrame();

    // الزوم المطبَّق على المسرح فعلياً يُثبَّت فوراً بكتابة واحدة عند التبديل
    expect(useEditorStore.getState().canvasZoom).toBeCloseTo(2 * Math.exp(0.3), 9);
    unmount();
  });

  it('does not wipe a pending wheel target when unrelated state rerenders the parent', () => {
    const view = mountViewport();
    dispatchWheel(view.container, { y: -100, ctrl: true });
    flushLatestFrame();
    const transform = view.inner.style.transform;
    act(() => useEditorStore.getState().setSelectedIds(['unrelated-selection']));
    view.rerender();
    expect(view.inner.style.transform).toBe(transform);
    dispatchWheel(view.container, { y: -100, ctrl: true });
    flushLatestFrame();
    act(() => vi.advanceTimersByTime(150));
    expect(useEditorStore.getState().canvasZoom).toBeCloseTo(Math.exp(0.6), 9);
    view.unmount();
  });

  it('reset100 cancels an already queued wheel frame even if the cancelled callback runs', () => {
    const view = mountViewport();
    dispatchWheel(view.container, { y: -100, ctrl: true });
    const staleFrame = rafCallbacks[rafCallbacks.length - 1];
    act(() => resetZoomStore());
    const origin = view.result.current.stagePos;
    act(() => {
      staleFrame(16);
      vi.advanceTimersByTime(150);
    });
    expect(useEditorStore.getState().canvasZoom).toBe(1);
    expect(view.result.current.stagePos).toEqual(origin);
    expect(view.result.current.viewIntent).toBe('fit');
    view.unmount();
  });

  it.each(['reset', 'load'] as const)(
    'same-sized document %s invalidates wheel/pan and resets zoom',
    (action) => {
      const project = serializeEditorState(useEditorStore.getState());
      const view = mountViewport();
      const session = getDocumentSession();
      act(() => view.result.current.setStagePos({ x: -50, y: -80 }));
      dispatchWheel(view.container, { y: -100, ctrl: true });
      flushLatestFrame();
      dispatchWheel(view.container, { y: -80, ctrl: true });
      const staleFrame = rafCallbacks[rafCallbacks.length - 1];
      act(() => {
        if (action === 'reset') useEditorStore.getState().reset();
        else useEditorStore.getState().loadProject(project);
      });
      expect(getDocumentSession()).toBeGreaterThan(session);
      const reset = view.result.current;
      act(() => {
        staleFrame(16);
        vi.advanceTimersByTime(150);
      });
      expect(useEditorStore.getState().canvasZoom).toBe(1);
      expect(view.result.current.stagePos).toEqual(
        computeDefaultStageOrigin(
          reset.displayW,
          reset.displayH,
          reset.viewportSize.w,
          reset.viewportSize.h,
        ),
      );
      expect(view.result.current.viewIntent).toBe('fit');
      view.unmount();
    },
  );

  it('flushes live zoom before text entry and button zoom steps', () => {
    const view = mountViewport();
    dispatchWheel(view.container, { y: -100, ctrl: true });
    flushLatestFrame();
    act(() => useEditorStore.getState().setEditingTextId('text'));
    expect(view.result.current.effectiveZoom).toBeCloseTo(Math.exp(0.3), 9);
    expect(useEditorStore.getState().editingTextId).toBe('text');
    dispatchWheel(view.container, { y: -100, ctrl: true });
    act(() => zoomInStore()); // flushes even an unpainted wheel frame
    expect(view.result.current.effectiveZoom).toBeCloseTo(stepZoom(Math.exp(0.6), 1), 9);
    view.unmount();
  });

  it('live manual resize holds center/scale, while reset100 remeasures the real container', () => {
    const view = mountViewport();
    act(() => zoomInStore());
    const before = view.result.current;
    const anchorX = (before.viewportSize.w / 2 - before.stagePos.x) / before.stageScale;
    const anchorY = (before.viewportSize.h / 2 - before.stagePos.y) / before.stageScale;
    view.resize(1100, 740);
    flushLatestFrame();
    const after = view.result.current;
    expect(after.stageScale).toBe(before.stageScale);
    expect((after.viewportSize.w / 2 - after.stagePos.x) / after.stageScale).toBeCloseTo(
      anchorX,
      9,
    );
    expect((after.viewportSize.h / 2 - after.stagePos.y) / after.stageScale).toBeCloseTo(
      anchorY,
      9,
    );
    view.resize(1300, 900, false); // RO has not settled yet
    act(() => resetZoomStore());
    expect(view.result.current.viewportSize).toEqual({ w: 1300, h: 900 });
    expect(view.result.current.effectiveZoom).toBe(1);
    expect(view.result.current.stageScale).not.toBe(after.stageScale);
    expect(view.result.current.viewIntent).toBe('fit');
    expect(view.result.current.displayH).toBeCloseTo(900 - 32, 9);
    view.unmount();
  });

  it('CSS zoom converts wheel pointer and pan distances to local CSS pixels', () => {
    const view = mountViewport(1.5);
    const before = view.result.current;
    const localPointer = { x: 350, y: 250 };
    const anchorX = (localPointer.x - before.stagePos.x) / before.stageScale;
    const anchorY = (localPointer.y - before.stagePos.y) / before.stageScale;
    dispatchWheel(view.container, {
      y: -100,
      ctrl: true,
      clientX: 20 + localPointer.x * 1.5,
      clientY: 30 + localPointer.y * 1.5,
    });
    flushLatestFrame();
    act(() => vi.advanceTimersByTime(150));
    const zoomed = view.result.current;
    expect((localPointer.x - zoomed.stagePos.x) / zoomed.stageScale).toBeCloseTo(anchorX, 9);
    expect((localPointer.y - zoomed.stagePos.y) / zoomed.stageScale).toBeCloseTo(anchorY, 9);
    dispatchWheel(view.container, { x: 45, y: 30 });
    flushLatestFrame();
    act(() => vi.advanceTimersByTime(100));
    expect(view.result.current.stagePos.x).toBeCloseTo(zoomed.stagePos.x - 30, 9);
    expect(view.result.current.stagePos.y).toBeCloseTo(zoomed.stagePos.y - 20, 9);
    view.unmount();
  });

  it('pointer pan uses CSS-local deltas and a document reset cancels its listeners', () => {
    const view = mountViewport(1.5);
    const initial = view.result.current;
    const pointer = (target: EventTarget, type: string, x: number, y: number) => {
      const event = new MouseEvent(type, {
        clientX: x,
        clientY: y,
        button: 1,
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'pointerId', { value: 9 });
      act(() => target.dispatchEvent(event));
    };
    pointer(view.container, 'pointerdown', 400, 300);
    pointer(window, 'pointermove', 445, 330);
    pointer(window, 'pointerup', 445, 330);
    expect(view.result.current.stagePos.x).toBeCloseTo(initial.stagePos.x + 30, 9);
    expect(view.result.current.stagePos.y).toBeCloseTo(initial.stagePos.y + 20, 9);
    pointer(view.container, 'pointerdown', 445, 330);
    act(() => useEditorStore.getState().reset());
    const reset = view.result.current.stagePos;
    pointer(window, 'pointermove', 900, 650);
    pointer(window, 'pointerup', 900, 650);
    expect(view.result.current.stagePos).toEqual(reset);
    expect(view.result.current.isPanning).toBe(false);
    view.unmount();
  });

  it('loadProject resets zoom even without a mounted canvas', () => {
    const project = serializeEditorState(useEditorStore.getState());
    useEditorStore.setState({ canvasZoom: 3 });
    useEditorStore.getState().loadProject(project);
    expect(useEditorStore.getState().canvasZoom).toBe(1);
  });
});

describe('transient camera geometry', () => {
  const input = {
    session: 1,
    canvasW: 2480,
    canvasH: 3508,
    fitMode: 'auto' as const,
    zoom: 1,
    viewport: { w: 620, h: 571 },
  };
  const anchor = (camera: ReturnType<typeof createCanvasCamera>) => ({
    x: (camera.viewport.w / 2 - camera.pos.x) / camera.metrics.scale,
    y: (camera.viewport.h / 2 - camera.pos.y) / camera.metrics.scale,
  });
  it('refits only fit intent on resize, preserving the auto width/height heuristic', () => {
    const initial = createCanvasCamera(input);
    expect(initial.metrics.resolved).toBe('height');
    const wide = reconcileCanvasCamera(initial, { ...input, viewport: { w: 1236, h: 756 } });
    expect(wide.metrics.resolved).toBe('width');
    expect(wide.metrics.scale).not.toBe(initial.metrics.scale);
    expect(reconcileCanvasCamera(wide, { ...input, viewport: wide.viewport })).toBe(wide);
  });
  it('manual resize/panel/ruler changes preserve effective scale and center world point', () => {
    let manual = reconcileCanvasCamera(createCanvasCamera(input), { ...input, zoom: 2 });
    manual = { ...manual, pos: { x: manual.pos.x - 60, y: manual.pos.y - 80 } };
    const start = anchor(manual);
    for (const viewport of [
      { w: 908, h: 571 },
      { w: 948, h: 611 },
      { w: 620, h: 571 },
    ]) {
      manual = reconcileCanvasCamera(manual, { ...input, zoom: 2, viewport });
      expect(manual.metrics.scale).toBe(createCanvasCamera(input).metrics.scale * 2);
      expect(anchor(manual).x).toBeCloseTo(start.x, 9);
      expect(anchor(manual).y).toBeCloseTo(start.y, 9);
    }
  });
  it('clamps an extreme pan after resize while preserving the in-bounds center anchor', () => {
    const originalInput = {
      ...input,
      canvasW: 400,
      canvasH: 600,
      fitMode: 'actual' as const,
      viewport: { w: 1000, h: 800 },
    };
    const manual = {
      ...createCanvasCamera(originalInput),
      intent: 'manual' as const,
      pos: { x: 850, y: 100 },
    };
    const resized = reconcileCanvasCamera(manual, {
      ...originalInput,
      viewport: { w: 500, h: 800 },
    });
    // Center preservation alone gives x=600: the paper would be wholly hidden.
    expect(resized.pos.x).toBe(350);
    expect(resized.viewport.w - resized.pos.x).toBe(150);
    expect(resized.metrics.scale).toBe(manual.metrics.scale);
    expect(resized.intent).toBe('manual');
    expect(anchor(resized).y).toBe(anchor(manual).y);
  });
  it('paper geometry refits in fit intent but preserves manual scale/center without pan reset', () => {
    const fitted = createCanvasCamera(input);
    const resizedInput = { ...input, canvasW: 3508, canvasH: 2480 };
    expect(reconcileCanvasCamera(fitted, resizedInput).metrics.scale).not.toBe(
      fitted.metrics.scale,
    );
    const manual = { ...fitted, intent: 'manual' as const, pos: { x: -70, y: -50 } };
    const changed = reconcileCanvasCamera(manual, resizedInput);
    expect(changed.metrics.scale).toBe(manual.metrics.scale);
    expect(anchor(changed)).toEqual(anchor(manual));
    expect(changed.pos).toEqual(manual.pos);
  });
});
