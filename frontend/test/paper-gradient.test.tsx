import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { Stage } from "react-konva";
import type Konva from "konva";
import { KonvaBackgroundLayer } from "../src/components/editor/konva/layers/konva-background-layer";
import { SheetPreview } from "../src/components/editor/print/print-preview";
import {
  canvasAngleToCss,
  gradientPixelPoints,
  gradientPointsFromAngle,
} from "../src/lib/canvas/gradient-geometry";
import { formatGradientCss } from "../src/components/editor/properties/gradient-utils";
import { getCollageGeometry, getSlotRect } from "../src/lib/canvas/collage-geometry";

/* ═══════════════════════════════════════════════════════════════
   خلفية الورقة المتدرجة — اختبارات انحدار على المخاطر الثلاث التي
   أظهرتها المراجعة:
   1) تمرير نقط التدرج النسبية (0-1) إلى Konva الذي يريد بكسل.
   2) انحراف اتجاه معاينات CSS عن اتجاه الكانفاس (فرق 90°).
   3) ازدواج هندسة شبكة الكولاج بين المرسم والشريط السريع.
   ═══════════════════════════════════════════════════════════════ */

const noop = () => {};

// Konva يرسم على canvas 2D لا تنفّذه jsdom — بديل صامت كما في بقية اختبارات Konva
class MockContext2D {
  canvas: HTMLCanvasElement | null = null;
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  fillStyle: unknown = "#000";
  strokeStyle: unknown = "#000";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  font = "10px sans-serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  shadowBlur = 0;
  shadowColor = "rgba(0,0,0,0)";
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
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = function (this: HTMLCanvasElement) {
    const self = this as HTMLCanvasElement & { __mockCtx?: MockContext2D };
    if (!self.__mockCtx) {
      self.__mockCtx = new MockContext2D();
      self.__mockCtx.canvas = this;
    }
    return self.__mockCtx;
  };
}

/** اتجاه متجه التدرج في فضاء الكانفاس: 0° يسار→يمين مع عقارب الساعة */
function canvasDirection(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { dx: Math.cos(rad), dy: Math.sin(rad) };
}

/** اتجاه متجه التدرج الذي يفهمه CSS من الزاوية المكتوبة في `linear-gradient` */
function cssDirection(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { dx: Math.sin(rad), dy: -Math.cos(rad) };
}

describe("Paper gradient geometry (single source of truth)", () => {
  it("converts normalized gradient points to local pixels for Konva/Canvas2D", () => {
    const W = 2480;
    const H = 3508;

    // 0° أفقي: من منتصف الحافة اليسرى إلى منتصف اليمنى
    const horizontal = gradientPixelPoints(0, W, H);
    expect(horizontal.start.x).toBeCloseTo(0);
    expect(horizontal.start.y).toBeCloseTo(H / 2);
    expect(horizontal.end.x).toBeCloseTo(W);
    expect(horizontal.end.y).toBeCloseTo(H / 2);

    // 90° عمودي هابط
    const vertical = gradientPixelPoints(90, W, H);
    expect(vertical.start.x).toBeCloseTo(W / 2);
    expect(vertical.start.y).toBeCloseTo(0);
    expect(vertical.end.x).toBeCloseTo(W / 2);
    expect(vertical.end.y).toBeCloseTo(H);

    // التدرج دائماً حول المركز، وامتداده نصف المقاس في كل محور
    for (const deg of [0, 45, 90, 135, 270]) {
      const { start, end } = gradientPixelPoints(deg, W, H);
      expect((start.x + end.x) / 2).toBeCloseTo(W / 2);
      expect((start.y + end.y) / 2).toBeCloseTo(H / 2);
      expect(Math.abs(end.x - start.x)).toBeCloseTo(Math.abs(Math.cos((deg * Math.PI) / 180)) * W);
      expect(Math.abs(end.y - start.y)).toBeCloseTo(Math.abs(Math.sin((deg * Math.PI) / 180)) * H);
      // النقاط النسبية وحدها لا تكفي: يجب أن تتجاوز 1px بكثير ليكون التدرج مرئياً
      expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(1);
    }
  });

  it("keeps CSS previews pointing the same way as the canvas (90° offset handled)", () => {
    expect(canvasAngleToCss(0)).toBe(90);
    expect(canvasAngleToCss(90)).toBe(180);
    expect(canvasAngleToCss(135)).toBe(225);
    expect(canvasAngleToCss(270)).toBe(0);

    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const css = cssDirection(canvasAngleToCss(deg));
      const canvas = canvasDirection(deg);
      expect(css.dx).toBeCloseTo(canvas.dx, 5);
      expect(css.dy).toBeCloseTo(canvas.dy, 5);
    }

    const cssString = formatGradientCss([0, "#FFFFFF", 1, "#000000"], "linear", 135);
    expect(cssString).toBe("linear-gradient(225deg, #FFFFFF 0%, #000000 100%)");
  });
});

describe("Konva paper background layer", () => {
  beforeEach(() => {
    installCanvasMock();
  });

  it("hands Konva pixel-space gradient points, not normalized ones", () => {
    const W = 1240;
    const H = 1754;
    let stage: Konva.Stage | null = null;

    render(
      <Stage ref={(s: Konva.Stage | null) => { stage = s; }} width={W} height={H}>
        <KonvaBackgroundLayer
          canvasWidth={W}
          canvasHeight={H}
          backgroundColor="#FFFFFF"
          backgroundGradientColor2="#1E40AF"
          backgroundGradientAngle={0}
          mode="single"
          showGrid={false}
          gridSize={50}
          gridColor="#000000"
          gridOpacity={0.15}
          gridSubdivisions={5}
          gridType="lines"
          showColumns={false}
          columnsMargin={20}
          columnsGutter={12}
          columnsCount={12}
          columnsColor="rgba(239,68,68,0.08)"
        />
      </Stage>
    );

    const currentStage = stage as unknown as Konva.Stage;
    expect(currentStage).toBeTruthy();
    const rect = currentStage.findOne(".bg-rect") as Konva.Rect | undefined;
    expect(rect).toBeTruthy();

    // الزاوية 0° = يسار→يمين: الامتداد يساوي عرض الورقة كاملاً بالبكسل
    const start = rect!.fillLinearGradientStartPoint();
    const end = rect!.fillLinearGradientEndPoint();
    expect(end.x - start.x).toBeCloseTo(W);
    expect(end.y - start.y).toBeCloseTo(0);
    // الخطأ القديم: تمرير النقاط النسبية كان يعطي امتداداً ≈ 1px فقط
    expect(end.x - start.x).not.toBeCloseTo(1, 0);

    expect(rect!.fillLinearGradientColorStops()).toEqual([0, "#FFFFFF", 1, "#1E40AF"]);
    // التعبئة المصمتة والتدرج حصريان: لا fill مصمت مع تدرج حاضر
    expect(rect!.fill()).toBeUndefined();
  });

  it("falls back to a solid fill when no second gradient color is set", () => {
    const W = 600;
    const H = 800;
    let stage: Konva.Stage | null = null;

    render(
      <Stage ref={(s: Konva.Stage | null) => { stage = s; }} width={W} height={H}>
        <KonvaBackgroundLayer
          canvasWidth={W}
          canvasHeight={H}
          backgroundColor="#F1F5F9"
          backgroundGradientColor2={null}
          mode="single"
          showGrid={false}
          gridSize={50}
          gridColor="#000000"
          gridOpacity={0.15}
          gridSubdivisions={5}
          gridType="lines"
          showColumns={false}
          columnsMargin={20}
          columnsGutter={12}
          columnsCount={12}
          columnsColor="rgba(239,68,68,0.08)"
        />
      </Stage>
    );

    const rect = (stage as unknown as Konva.Stage).findOne(".bg-rect") as Konva.Rect;
    expect(rect.fill()).toBe("#F1F5F9");
    expect(rect.fillLinearGradientColorStops()).toBeUndefined();
  });
});

describe("Print preview paper background", () => {
  const grid = {
    safeCols: 1,
    actualRows: 1,
    gridWidth: 100,
    gridHeight: 150,
    offsetX: 5,
    offsetY: 5,
    cellWidth: 100,
    cellHeight: 150,
  };

  const sheetProps = {
    grid,
    count: 1,
    imageWidthMM: 100,
    imageHeightMM: 150,
    gapMM: 0,
    zoom: 1,
    showCutLines: false,
    mode: "single" as const,
    previewImageSrc: "",
  };

  it("paints the gradient instead of a flat paper color", () => {
    const { container } = render(
      <SheetPreview
        {...sheetProps}
        backgroundColor="#FFFFFF"
        backgroundGradientColor2="#1E40AF"
        backgroundGradientAngle={0}
      />
    );

    const styled = Array.from(container.querySelectorAll("div")).filter((el) =>
      String((el as HTMLElement).style.background || "").includes("linear-gradient")
    );
    expect(styled.length).toBeGreaterThan(0);
    // الزاوية 0° في الكانفاس = 90deg في CSS (يسار→يمين)
    expect(String((styled[0] as HTMLElement).style.background)).toContain("linear-gradient(90deg");
  });

  it("keeps a flat color when there is no gradient", () => {
    const { container } = render(
      <SheetPreview {...sheetProps} backgroundColor="#F1F5F9" backgroundGradientColor2={null} />
    );
    const html = container.innerHTML;
    expect(html).not.toContain("linear-gradient");
  });
});

describe("Collage geometry (shared by Konva layer and quick bar)", () => {
  it("zeroes margin and gap for physical templates, keeps them otherwise", () => {
    const physical = getCollageGeometry(2480, 3508, 40, 12, true);
    expect(physical).toEqual({ margin: 0, gap: 0, availW: 2480, availH: 3508 });

    const flexible = getCollageGeometry(2480, 3508, 40, 12, false);
    expect(flexible.margin).toBe(40);
    expect(flexible.gap).toBe(12);
    expect(flexible.availW).toBe(2480 - 80);
    expect(flexible.availH).toBe(3508 - 80);
  });

  it("derives identical slot rects for rendering and for quick-bar anchoring", () => {
    const geo = getCollageGeometry(1000, 1400, 20, 10, false);
    const rect = getSlotRect({ x: 0.5, y: 0.25, w: 0.5, h: 0.25 }, geo);

    expect(rect.left).toBeCloseTo(20 + 0.5 * 960 + 5);
    expect(rect.top).toBeCloseTo(20 + 0.25 * 1360 + 5);
    expect(rect.width).toBeCloseTo(0.5 * 960 - 10);
    expect(rect.height).toBeCloseTo(0.25 * 1360 - 10);

    // نفس بكسل الكانفاس التي يرسم بها Konva تُقاس إلى بكسل العرض في الشريط
    // (505 = 20 هامش + 480 موضع + 5 نصف فجوة، بضرب 0.25 لمقاس العرض)
    const displayScale = 0.25;
    expect(rect.left * displayScale).toBeCloseTo(126.25);
    expect(rect.width * displayScale).toBeCloseTo(117.5);
  });

  it("keeps the normalized helpers the rest of the app already relies on", () => {
    const { start, end } = gradientPointsFromAngle(0);
    expect(start).toEqual({ x: 0, y: 0.5 });
    expect(end).toEqual({ x: 1, y: 0.5 });
  });
});
