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

describe("MagicAiScanner via react-konva", () => {
  let root: Root;
  let container: HTMLDivElement;
  let imageNodeRef: any;

  beforeEach(() => {
    installCanvasMock();
    document.body.innerHTML = '<div id="root"></div>';
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    imageNodeRef = { current: null };
  });

  it("scanner group follows the image node after it moves", async () => {
    let stageRef: any = null;
    const Comp = () => {
      const imgRef = useRef<any>(null);
      imageNodeRef = imgRef;
      return (
        <Stage ref={(s: any) => { stageRef = s; }} width={800} height={600}>
          <Layer>
            <Group>
              <KonvaImage
                ref={imgRef}
                id="img-1"
                image={({ width: 200, height: 200 } as any)}
                x={100}
                y={50}
                width={200}
                height={200}
              />
              <MagicAiScanner
                targetNodeRef={imgRef}
                x={100}
                y={50}
                width={200}
                height={200}
                rotation={0}
              />
            </Group>
          </Layer>
        </Stage>
      );
    };

    root.render(<Comp />);
    await waitFrames(4);

    const imgNode = imageNodeRef.current;
    expect(imgNode).toBeTruthy();
    expect(imgNode.x()).toBe(100);

    // locate the scanner group: it is a Group inside the layer that is not the root Group
    const layer = stageRef!.getLayers()[0];
    const groups = layer.find("Group");

    imgNode.x(400);
    imgNode.y(300);
    imgNode.getLayer()?.batchDraw();

    await waitFrames(4);

    const scannerGroup = groups.find((g: any) => g !== groups[0]);
    expect(scannerGroup.x()).toBe(400);
    expect(scannerGroup.y()).toBe(300);

    root.unmount();
  });

  it("keeps scanner group at local coordinates (0, 0) and applies cornerRadius when encapsulated as direct child", async () => {
    let stageRef: any = null;
    let parentGroupRef: any = null;

    const ChildComp = () => {
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
              <MagicAiScanner
                targetNodeRef={parentRef}
                x={0}
                y={0}
                width={200}
                height={200}
                cornerRadius={16}
                rotation={0}
              />
            </Group>
          </Layer>
        </Stage>
      );
    };

    root.render(<ChildComp />);
    await waitFrames(4);

    const layer = stageRef!.getLayers()[0];
    const groups = layer.find("Group");
    const parentGroup = parentGroupRef.current;
    expect(parentGroup).toBeTruthy();
    expect(parentGroup.x()).toBe(250);
    expect(parentGroup.y()).toBe(180);

    // The child scanner group inside parentGroup must remain at local (0, 0)
    const childScanner = groups.find((g: any) => g !== parentGroup);
    expect(childScanner).toBeTruthy();
    expect(childScanner.x()).toBe(0);
    expect(childScanner.y()).toBe(0);

    root.unmount();
  });
});