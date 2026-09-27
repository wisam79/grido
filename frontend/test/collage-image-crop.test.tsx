import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { waitFor } from '@testing-library/react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { KonvaCollageImage } from '../src/components/editor/konva/elements/collage-image';

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
    onUpdateOffsets: (x: number, y: number) => void;
  }>,
): Promise<Konva.Image> {
  const { srcW, srcH, slotW, slotH, zoom, dragX, dragY, draggable, onUpdateOffsets } = props;
  const keyParts = [srcW, srcH, slotW, slotH, zoom ?? 1, dragX ?? 0, dragY ?? 0, draggable ? 1 : 0];
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
            onUpdateOffsets={onUpdateOffsets}
          />
        </Layer>
      </Stage>,
    );
    // إفراغ الميكرومهام: تحميل useAsyncImage + نسخة العرض المخفّضة
    await new Promise((r) => setTimeout(r, 0));
  });

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
    installCanvasMock();
    globalThis.Image = MockImage as unknown as typeof Image;
    document.body.innerHTML = '<div id="root"></div>';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
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
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onUpdateOffsets).toHaveBeenCalledTimes(1);
    expect(onUpdateOffsets).toHaveBeenCalledWith(200, 0);
    // الإطار ثابت بعد دورة صفرية: لا قفزة من خلط الفضاءين
    expect(node.cropX()).toBe(100);
  });
});
