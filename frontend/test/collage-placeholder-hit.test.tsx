import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import { KonvaCollageLayer } from '../src/components/editor/konva/layers/konva-collage-layer';
import type { CanvasSlot } from '../src/lib/store/types';

/* ═══════════════════════════════════════════════════════════════
   حارس قابلية نقر الخلية الفارغة في الكولاج:
   إعادة تصميم «حاوية الإفلات» وضعت listening={false} على كل عناصر
   الخلية الفارغة، فلم يبقَ هدف للفأرة داخل الخلية — تعطّل معه:
   تحديد الخلية بالنقر، مؤشر المرور (hover)، وفتح منتقي الصور
   بالنقر المزدوج. الاختبار يثبّت أن خلفية الحاوية وحدها تستقبل
   الفأرة وأن بقية عناصر الزينة تبقى غير ملامِسة لها.
   ═══════════════════════════════════════════════════════════════ */

const noop = () => {};

// Konva يرسم على canvas 2D لا تنفّذه jsdom — بديل صامت كما في بقية اختبارات Konva
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
      self.__mockCtx.canvas = this;
    }
    return self.__mockCtx;
  };
}

const emptySlot = {
  id: 'slot-a',
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  bgColor: 'transparent',
} as unknown as CanvasSlot;

function renderEmptySlotLayer() {
  let stage: Konva.Stage | null = null;
  const handleSlotClick = vi.fn();
  const handleSlotDblClick = vi.fn();

  const { unmount } = render(
    <Stage
      ref={(s: Konva.Stage | null) => {
        stage = s;
      }}
      width={800}
      height={1000}
    >
      <KonvaCollageLayer
        slots={[emptySlot]}
        canvasWidth={800}
        canvasHeight={1000}
        collageMargin={20}
        collageGap={10}
        collageRadius={8}
        collageStrokeWidth={1}
        collageStrokeColor="#94a3b8"
        collageShowCutLines={false}
        selectedId={null}
        handleSlotClick={handleSlotClick}
        handleSlotDblClick={handleSlotDblClick}
        handleSlotWheel={noop}
        updateSlot={noop}
        pushHistory={noop}
      />
    </Stage>,
  );

  const placeholder = (stage as unknown as Konva.Stage).findOne<Konva.Group>('.slot-placeholder');
  return {
    stage: stage as unknown as Konva.Stage,
    placeholder,
    handleSlotClick,
    handleSlotDblClick,
    unmount,
  };
}

describe('خلية الكولاج الفارغة تستقبل الفأرة', () => {
  beforeEach(() => {
    installCanvasMock();
  });

  it('تعرض حاوية إفلات بزر مركزي واحد وهدف نقر قابل للالتقاط', () => {
    const { placeholder, unmount } = renderEmptySlotLayer();

    expect(placeholder).toBeTruthy();
    const [background] = placeholder!.getChildren() as unknown as Konva.Rect[];
    expect(background).toBeTruthy();
    // جوهر الإصلاح: خلفية الحاوية تلتقط مؤشر الفأرة
    expect(background.listening()).toBe(true);
    expect(background.fill()).toBeTruthy();

    unmount();
  });

  it('تبقي عناصر الزينة (الإطار المتقطع والشارة) غير ملامِسة للفأرة', () => {
    const { placeholder, unmount } = renderEmptySlotLayer();

    const children = placeholder!.getChildren() as unknown as Konva.Node[];
    // [خلفية, إطار متقطع, شارة/زائد]
    expect(children.length).toBeGreaterThanOrEqual(3);
    expect(children[1].listening()).toBe(false);
    expect(children[2].listening()).toBe(false);

    unmount();
  });

  it('يمرّر النقر والنقر المزدوج إلى معالجات الشريط مع معرّف الخلية', () => {
    const { placeholder, handleSlotClick, handleSlotDblClick, unmount } = renderEmptySlotLayer();

    const background = (placeholder!.getChildren() as unknown as Konva.Rect[])[0];

    background.fire('click', { evt: {} }, true);
    expect(handleSlotClick).toHaveBeenCalledWith('slot-a');
    // معالج واحد فقط على مستوى مجموعة القص الأب — لا تكرار مع صعود الحدث من الابن
    expect(handleSlotClick).toHaveBeenCalledTimes(1);

    background.fire('dblclick', { evt: {} }, true);
    expect(handleSlotDblClick).toHaveBeenCalledWith('slot-a');

    unmount();
  });
});
