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
} from '../src/hooks/use-canvas-zoom';
import { useEditorStore } from '../src/lib/editor-store';

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
    vi.useRealTimers();
    useEditorStore.getState().reset();
  });

  function mountViewport() {
    const container = document.createElement('div');
    const inner = document.createElement('div');
    document.body.appendChild(container);
    document.body.appendChild(inner);
    const view = renderHook(() =>
      useCanvasViewport(
        { current: container } as React.RefObject<HTMLDivElement | null>,
        { current: inner } as React.RefObject<HTMLDivElement | null>,
      ),
    );
    return {
      container,
      unmount: () => {
        view.unmount();
        container.remove();
        inner.remove();
      },
    };
  }

  function dispatchWheel(node: HTMLElement, opts: { x?: number; y?: number; ctrl?: boolean }) {
    const event = new MouseEvent('wheel', {
      bubbles: true,
      cancelable: true,
      ctrlKey: opts.ctrl ?? false,
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
});
