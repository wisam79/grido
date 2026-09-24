import { describe, it, expect, beforeEach } from "vitest";
import React, { useRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { Stage, Layer, Group, Image as KonvaImage } from "react-konva";
import { MagicAiScanner } from "../src/components/editor/konva/elements/magic-ai-scanner";

const noop = () => {};
class MockContext2D {
  canvas: any = null;
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  imageSmoothingEnabled = true;
  fillStyle = "#000";
  strokeStyle = "#000";
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
  createImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  getImageData = () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
  putImageData = noop;
  createLinearGradient = () => ({ addColorStop: noop });
  createRadialGradient = () => ({ addColorStop: noop });
  createPattern = () => null;
  measureText = () => ({ width: 0 });
  getContext = () => null;
}

function installCanvasMock() {
  (HTMLCanvasElement.prototype as any).getContext = function (this: any) {
    if (!this.__mockCtx) this.__mockCtx = new MockContext2D();
    this.__mockCtx.canvas = this;
    return this.__mockCtx;
  };
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

const waitFrames = async (n = 3) => {
  for (let i = 0; i < n; i++) await waitFrame();
};

/**
 * ثابت «عزل إحداثيات الأنيميشن داخل مجموعات Konva» (.agents/AGENTS.md):
 * السكنر يُركَّب كابن داخل مجموعة العنصر عند (0, 0) دائماً، ويتبع أباه في
 * المساحة المطلقة بلا إعادة كتابة إحداثياته المحلية. هذه الاختبارات تقفل
 * هذا العقد صراحةً بعد إزالة واجهة المزامنة مع عقدة شقيقة (ازدواجية ميتة).
 */
describe("MagicAiScanner via react-konva", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    installCanvasMock();
    document.body.innerHTML = '<div id="root"></div>';
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it("يبقى عند الإحداثيات المحلية (0,0) ويتبع الأب في المساحة المطلقة", async () => {
    let stageRef: any = null;
    let parentGroupRef: any = null;

    const Comp = () => {
      const parentRef = useRef<any>(null);
      parentGroupRef = parentRef;

      return (
        <Stage ref={(s: any) => { stageRef = s; }} width={800} height={600}>
          <Layer>
            <Group ref={parentRef} x={250} y={180} width={200} height={200}>
              <KonvaImage
                id="img-child"
                image={({ width: 200, height: 200 } as any)}
                x={0}
                y={0}
                width={200}
                height={200}
              />
              <MagicAiScanner x={0} y={0} width={200} height={200} cornerRadius={16} />
            </Group>
          </Layer>
        </Stage>
      );
    };

    root.render(<Comp />);
    await waitFrames(4);

    const layer = stageRef!.getLayers()[0];
    const parentGroup = parentGroupRef.current;
    expect(parentGroup).toBeTruthy();
    expect(parentGroup.x()).toBe(250);

    const scannerGroup = layer.find("Group").find((g: any) => g !== parentGroup);
    expect(scannerGroup).toBeTruthy();
    // إحداثيات محلية ثابتة — لا إزاحة مزدوجة
    expect(scannerGroup.x()).toBe(0);
    expect(scannerGroup.y()).toBe(0);
    expect(scannerGroup.getAbsolutePosition()).toEqual({ x: 250, y: 180 });

    // تحريك الأب: يبقى الابن محلياً ويسافر معه مطلقاً
    parentGroup.x(420);
    parentGroup.y(310);
    parentGroup.getLayer()?.batchDraw();
    await waitFrames(4);

    expect(scannerGroup.x()).toBe(0);
    expect(scannerGroup.y()).toBe(0);
    expect(scannerGroup.getAbsolutePosition()).toEqual({ x: 420, y: 310 });

    root.unmount();
  });

  it("يحدّث أبعاد الحدود والاستدارة مع تغيّر مقاس الأب (بلا إعادة تركيب)", async () => {
    let stageRef: any = null;
    let setPropsFn: any = null;

    const Comp = () => {
      const [dims, setDims] = React.useState({ w: 200, h: 250 });
      setPropsFn = setDims;

      return (
        <Stage ref={(s: any) => { stageRef = s; }} width={800} height={600}>
          <Layer>
            <Group x={100} y={150} width={dims.w} height={dims.h}>
              <Group
                x={dims.w / 2}
                y={dims.h / 2}
                offsetX={dims.w / 2}
                offsetY={dims.h / 2}
                width={dims.w}
                height={dims.h}
              >
                <KonvaImage
                  id="img-nested"
                  image={({ width: dims.w, height: dims.h } as any)}
                  x={0}
                  y={0}
                  width={dims.w}
                  height={dims.h}
                />
                <MagicAiScanner x={0} y={0} width={dims.w} height={dims.h} cornerRadius={8} />
              </Group>
            </Group>
          </Layer>
        </Stage>
      );
    };

    root.render(<Comp />);
    await waitFrames(4);

    const layer = stageRef!.getLayers()[0];
    const scannerGroup = layer.find("Group").at(-1) as any;
    expect(scannerGroup.x()).toBe(0);
    expect(scannerGroup.y()).toBe(0);

    const borderRect = scannerGroup.findOne("Rect");
    expect(borderRect.width()).toBe(200);
    expect(borderRect.height()).toBe(250);
    expect(borderRect.cornerRadius()).toBe(8);

    setPropsFn({ w: 320, h: 420 });
    await waitFrames(4);

    expect(scannerGroup.x()).toBe(0);
    expect(scannerGroup.y()).toBe(0);
    expect(borderRect.width()).toBe(320);
    expect(borderRect.height()).toBe(420);

    root.unmount();
  });

  it("يرسم طبقة السكنر كل إطار عبر batchDraw (بلا وسيط layers للأنيميشن)", async () => {
    let stageRef: any = null;

    const Comp = () => (
      <Stage ref={(s: any) => { stageRef = s; }} width={800} height={600}>
        <Layer>
          <Group x={0} y={0} width={200} height={200}>
            <MagicAiScanner x={0} y={0} width={200} height={200} />
          </Group>
        </Layer>
      </Stage>
    );

    root.render(<Comp />);
    await waitFrames(3);

    const layer = stageRef!.getLayers()[0];
    let draws = 0;
    const originalBatchDraw = layer.batchDraw.bind(layer);
    layer.batchDraw = () => {
      draws += 1;
      return originalBatchDraw();
    };

    await waitFrames(4);
    // بلا رسم صريح داخل الكولباك لا يرسم Konva.Animation أي طبقة إطلاقاً
    expect(draws).toBeGreaterThan(1);

    root.unmount();
  });
});
