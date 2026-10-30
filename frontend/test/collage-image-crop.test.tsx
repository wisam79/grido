import { waitFor } from '@testing-library/react';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage, Layer } from 'react-konva';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { KonvaCollageImage } from '../src/components/editor/konva/elements/collage-image';
import {
  useCanvasInteraction,
  resetCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { captureStageBlob, isStageCaptureActive } from '../src/lib/canvas/konva-export-utils';
import { useEditorStore } from '../src/lib/editor-store';

import type Konva from 'konva';
import type { Root } from 'react-dom/client';

/**
 * انحدار إطار الصورة داخل خانة الكولاج:
 *
 * كل حسابات القصّة (object-fit: cover + zoom + dragX/dragY) يجب أن تتم على
 * أبعاد الصورة المُمرَّرة لعقدة Konva فعلياً — وهي نسخة العرض المخفّضة
 * (سقف 2048px من display-image.ts) للصور الأكبر من السقف — لأن Konva يطبّق
 * cropX/cropY/cropWidth/cropHeight على تلك النسخة نفسها (shapes/Image.js).
 *
 * الانحدار المُصلَّح: الحساب كان على أبعاد الأصل، فكانت القصّة تقع خارج
 * نطاق النسخة المخفّضة وتظهر الصورة مصغَّرة ومزاحة داخل الخلية. أوضح تجلٍّ:
 * لقطة «نقل التصميم إلى الكولاج» (2480px+) كانت تظهر بحجم أصغر من الوضع الحر.
 */

const noop = () => {};
class MockContext2D {
  canvas: unknown = null;
  globalAlpha = 1;
  globalCompositeOperation = 'source-over';
  imageSmoothingEnabled = true;
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  font = '10px sans-serif';
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
  createImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  getImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  putImageData = noop;
  createLinearGradient = () => ({ addColorStop: noop });
  createRadialGradient = () => ({ addColorStop: noop });
  createPattern = () => null;
  measureText = () => ({ width: 0 });
}

function installCanvasMock() {
  (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = function (
    this: HTMLCanvasElement,
  ) {
    const self = this as HTMLCanvasElement & { __mockCtx?: MockContext2D };
    if (!self.__mockCtx) {
      self.__mockCtx = new MockContext2D();
      (self.__mockCtx as { canvas: unknown }).canvas = self;
    }
    return self.__mockCtx;
  };
}

// ── محاكاة Image: أبعاد مُعلنة من خريطة + تحميل فوري في ميكروتاسك ──
const imageDims = new Map<string, { w: number; h: number }>();

class MockImage {
  onload: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  width = 0;
  height = 0;
  private _src = '';
  decode() {
    return Promise.resolve();
  }
  set src(v: string) {
    this._src = v;
    const dims = imageDims.get(v) ?? { w: 100, h: 100 };
    this.naturalWidth = dims.w;
    this.naturalHeight = dims.h;
    this.width = dims.w;
    this.height = dims.h;
    queueMicrotask(() => {
      this.complete = true;
      this.onload?.({ target: this });
    });
  }
  get src() {
    return this._src;
  }
}

const RealImage = globalThis.Image;

/** يُركِّب الخانة داخل Stage حقيقي ويُعيد عقدة Konva.Image بعد اكتمال التحميل */
async function mountSlot(
  props: { srcW: number; srcH: number; slotW: number; slotH: number } & Partial<{
    zoom: number;
    dragX: number;
    dragY: number;
    draggable: boolean;
    rotation: number;
    flipX: boolean;
    brightness: number;
    onUpdateOffsets: (x: number, y: number) => void;
  }>,
): Promise<Konva.Image> {
  const {
    srcW,
    srcH,
    slotW,
    slotH,
    zoom,
    dragX,
    dragY,
    draggable,
    rotation,
    flipX,
    brightness,
    onUpdateOffsets,
  } = props;
  const keyParts = [srcW, srcH];
  const src = `test://crop-${keyParts.join('x')}.png`;
  imageDims.set(src, { w: srcW, h: srcH });

  const stageRef: { current: Konva.Stage | null } = { current: null };
  await act(async () => {
    root.render(
      <Stage
        width={400}
        height={300}
        ref={(s: Konva.Stage | null) => {
          stageRef.current = s;
        }}
      >
        <Layer>
          <KonvaCollageImage
            id="slot-probe"
            imageSrc={src}
            width={slotW}
            height={slotH}
            canvasWidth={400}
            zoom={zoom}
            dragX={dragX}
            dragY={dragY}
            draggable={draggable}
            rotation={rotation}
            flipX={flipX}
            brightness={brightness}
            onUpdateOffsets={onUpdateOffsets}
          />
        </Layer>
      </Stage>,
    );
    // إفراغ الميكرومهام: تحميل useAsyncImage + نسخة العرض المخفّضة
    await Promise.resolve();
  });

  const immediateFound = stageRef.current?.find('Image') ?? [];
  if (immediateFound.length > 0) {
    return immediateFound[0] as Konva.Image;
  }

  // العقدة لا تُركَّب إلا بعد تحميل الصورة (useAsyncImage) — ننتظر ظهورها
  return await waitFor(() => {
    const found = stageRef.current?.find('Image') ?? [];
    expect(found.length).toBeGreaterThan(0);
    return found[0] as Konva.Image;
  });
}

let root: Root;
let container: HTMLDivElement;

describe('KonvaCollageImage — إطار الصورة داخل الخانة (فضاء نسخة العرض)', () => {
  beforeEach(() => {
    resetCanvasInteraction();
    useEditorStore.setState({ canvasZoom: 1 });
    installCanvasMock();
    globalThis.Image = MockImage as unknown as typeof Image;
    document.body.innerHTML = '<div id="root"></div>';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
    vi.restoreAllMocks();
    resetCanvasInteraction();
    container.remove();
    globalThis.Image = RealImage;
    imageDims.clear();
  });

  it('صورة أصغر من سقف العرض: القصّة cover ممركزة على الصورة الكاملة', async () => {
    // 600×800 (أطول جهة ≤ 2048 → تُعرض الأصل نفسها)
    // خلية 200×400 (نسبة 0.5) → القصّة: sh=800، sw=400، sx=100
    const node = await mountSlot({ srcW: 600, srcH: 800, slotW: 200, slotH: 400 });
    expect(node.cropWidth()).toBe(400);
    expect(node.cropHeight()).toBe(800);
    expect(node.cropX()).toBe(100);
    expect(node.cropY()).toBe(0);
  });

  it('صورة أكبر من سقف العرض (لقطة النقل): القصّة على نسخة العرض المخفّضة فتملأ الخلية كاملة', async () => {
    // لقطة النقل 2480×3508 تُعرض بنسخة 1448×2048 (مقياس 2048/3508)
    // خلية 200×400 → القصّة المتوقعة: sh=2048، sw=1024، sx=(1448-1024)/2=212 —
    // كان الانحدار يعطي sw=1742/sx=174 (فضاء الأصل) فتظهر الصورة مصغَّرة ومزاحة.
    const node = await mountSlot({ srcW: 2480, srcH: 3508, slotW: 200, slotH: 400 });
    expect(node.cropWidth()).toBe(1024);
    expect(node.cropHeight()).toBe(2048);
    expect(node.cropX()).toBe(212);
    expect(node.cropY()).toBe(0);
  });

  it('dragX بالفضاء الأصلي يُعاد قياسه لفضاء نسخة العرض', async () => {
    // أصل 4096×4096 → نسخة عرض 2048×2048 (srcToShown = 0.5)
    // خلية مربعة 300×300 مع zoom=2: sw=2048/2=1024 → maxDragX=512.
    // dragX=200 (أصلي) → 100 معروض: sx = defaultSx(0) + 100 = 100 —
    // كان الانحدار يكتب 200 خارج نطاق النسخة المخفّضة.
    const node = await mountSlot({
      srcW: 4096,
      srcH: 4096,
      slotW: 300,
      slotH: 300,
      zoom: 2,
      dragX: 200,
    });
    expect(node.cropX()).toBe(100);
    expect(node.cropWidth()).toBe(1024);
  });

  it('دورة السحب ذهاباً وإياباً لصورة مخفّضة: الإزاحة تعود لفضاء الأصل بلا قفزة', async () => {
    // أصل 4096×4096 → عرض 2048×2048 (النسبة 0.5)، خلية مربعة 300×300 مع
    // zoom=2 وdragX=200 (أصلي): العرض الأولي sx=100. سحب بصفر حركة ثم
    // onDragEnd يجب أن يكتب للستور 200 نفسها (فضاء الأصل) لا 50 (قسمة مزدوجة)
    // ولا 400 (تراكم بفضاء خاطئ) — وإلا قفز الإطار عند أول سحب.
    const onUpdateOffsets = vi.fn();
    const node = await mountSlot({
      srcW: 4096,
      srcH: 4096,
      slotW: 300,
      slotH: 300,
      zoom: 2,
      dragX: 200,
      draggable: true,
      onUpdateOffsets,
    });
    expect(node.cropX()).toBe(100);

    await act(async () => {
      node.fire('dragstart', { target: node });
      node.fire('dragmove', { target: node });
      node.fire('dragend', { target: node });
      await Promise.resolve();
    });

    expect(onUpdateOffsets).toHaveBeenCalledTimes(1);
    expect(onUpdateOffsets).toHaveBeenCalledWith(200, 0);
    // الإطار ثابت بعد دورة صفرية: لا قفزة من خلط الفضاءين
    expect(node.cropX()).toBe(100);
  });

  it.each([90, 270, -90, 450])(
    'ربع الدورة %s يملأ الخانة غير المربعة دون تمديد',
    async (rotation) => {
      const node = await mountSlot({
        srcW: 400,
        srcH: 200,
        slotW: 200,
        slotH: 400,
        rotation,
        flipX: true,
      });
      expect(node.width()).toBe(400);
      expect(node.height()).toBe(200);
      expect(node.cropWidth()).toBe(400);
      expect(node.cropHeight()).toBe(200);
      const box = node.getClientRect({ relativeTo: node.getLayer()! });
      expect(box.x).toBeCloseTo(0);
      expect(box.y).toBeCloseTo(0);
      expect(box.width).toBeCloseTo(200);
      expect(box.height).toBeCloseTo(400);
    },
  );

  it('يبطل الكاش عند تعديل القص ويعيده مرة واحدة بعد استقرار التغييرات البرمجية', async () => {
    const props = { srcW: 600, srcH: 800, slotW: 200, slotH: 400, brightness: 120 };
    const node = await mountSlot(props);
    expect(node.isCached()).toBe(true);
    const cache = vi.spyOn(node, 'cache');
    vi.useFakeTimers();

    expect(await mountSlot({ ...props, zoom: 2 })).toBe(node);
    expect(node.isCached()).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(cache).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(cache).toHaveBeenCalledTimes(1);
    expect(node.isCached()).toBe(true);

    // تغيير القص أثناء نافذة التسوية يعيد ضبط المؤقت ولا يخبز مرتين.
    cache.mockClear();
    await mountSlot({ ...props, zoom: 2, dragX: 20, dragY: 10 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await mountSlot(props);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(cache).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(cache).toHaveBeenCalledTimes(1);

    // الاستعادة عبر props (مسار Undo/Redo) تغيّر القص ولو بقيت أبعاد العقدة ثابتة.
    cache.mockClear();
    await mountSlot({ ...props, zoom: 2, dragX: 20 });
    expect(node.isCached()).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(cache).toHaveBeenCalledTimes(1);
  });

  it('لا يعيد الكاش أثناء السحب وينظف المؤقت عند فك العقدة', async () => {
    const props = {
      srcW: 600,
      srcH: 800,
      slotW: 200,
      slotH: 400,
      brightness: 120,
      draggable: true,
    };
    const node = await mountSlot(props);
    const cache = vi.spyOn(node, 'cache');
    vi.useFakeTimers();
    await act(async () => {
      node.fire('dragstart', { target: node });
      node.cropX(30);
      useEditorStore.setState({ canvasZoom: 2 });
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(useCanvasInteraction.getState().isDragging).toBe(true);
    expect(cache).not.toHaveBeenCalled();
    await act(async () => {
      node.fire('dragend', { target: node });
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(cache).toHaveBeenCalledTimes(1);

    cache.mockClear();
    await act(async () => {
      node.cropX(40);
      root.render(null);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(cache).not.toHaveBeenCalled();
  });

  it('يلتقط الفلاتر من الأصل حتى قبل انتهاء مؤقت القص ولا يغيّر الكاش أثناء الالتقاط', async () => {
    const node = await mountSlot({
      srcW: 4096,
      srcH: 4096,
      slotW: 300,
      slotH: 300,
      brightness: 120,
      zoom: 2,
    });
    const stage = node.getStage()!;
    vi.useFakeTimers();
    await act(async () => {
      node.cropX(100);
    });
    expect(node.isCached()).toBe(false);
    let finish: BlobCallback | undefined;
    vi.spyOn(stage, 'toCanvas').mockImplementation(() => {
      expect(isStageCaptureActive(stage)).toBe(true);
      expect(node.isCached()).toBe(true);
      expect(node.cropX()).toBe(200);
      const canvas = document.createElement('canvas');
      canvas.toBlob = (callback) => {
        finish = callback;
      };
      return canvas;
    });
    const cache = vi.spyOn(node, 'cache');
    const capture = captureStageBlob(stage, 2, 'image/png', 1, undefined, {
      useFullResolution: true,
    });
    const captureCalls = cache.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(cache).toHaveBeenCalledTimes(captureCalls);
    finish!(new Blob(['ok']));
    await capture;
    expect(isStageCaptureActive(stage)).toBe(false);
    expect(node.cropX()).toBe(100);
    expect(node.isCached()).toBe(true);
  });

  it('captureStageBlob(useFullResolution): يحجّم cropX/cropWidth لأبعاد الأصل أثناء الالتقاط ثم يستعيدهما', async () => {
    const node = await mountSlot({
      srcW: 4096,
      srcH: 4096,
      slotW: 300,
      slotH: 300,
      zoom: 2,
      dragX: 200,
    });
    const stage = node.getStage()!;
    expect(node.cropX()).toBe(100);
    expect(node.cropWidth()).toBe(1024);

    let capturedCropX = 0;
    let capturedCropW = 0;
    const origToCanvas = stage.toCanvas.bind(stage);
    vi.spyOn(stage, 'toCanvas').mockImplementation((cfg) => {
      capturedCropX = node.cropX();
      capturedCropW = node.cropWidth();
      const c = origToCanvas(cfg);
      c.toBlob = (cb) => cb(new Blob(['ok'], { type: 'image/png' }));
      return c;
    });

    await captureStageBlob(stage, 2, 'image/png', 1, undefined, { useFullResolution: true });

    // أثناء الالتقاط بدقة الأصل (4096 = 2× نسخة العرض 2048): القص يُضرب بـ 2
    expect(capturedCropX).toBe(200);
    expect(capturedCropW).toBe(2048);
    // بعد انتهاء الالتقاط: تعود إحداثيات القص لنسخة العرض المخفّضة
    expect(node.cropX()).toBe(100);
    expect(node.cropWidth()).toBe(1024);
  });
});
