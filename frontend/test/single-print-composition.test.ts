import { describe, it, expect } from "vitest";
import { buildSingleComposition } from "../src/lib/print/single-print-composition";
import type { ImageElement } from "../src/lib/store/types";

const base = {
  canvasWidth: 1240,
  canvasHeight: 1754,
  canvasWidthMM: 101.6,
  canvasHeightMM: 152.4,
  backgroundColor: "#FFFFFF",
};

const imageElement = (overrides: Partial<ImageElement> = {}): ImageElement => ({
  id: "img1",
  type: "image",
  imageSrc: "/local-image/photo.jpg",
  x: 0.1,
  y: 0.2,
  width: 0.5,
  height: 0.4,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  filter: "none",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  flipX: false,
  flipY: false,
  ...overrides,
});

describe("buildSingleComposition", () => {
  it("maps eligible image elements to canvas pixel coordinates", () => {
    const result = buildSingleComposition({
      ...base,
      elements: [imageElement()],
    });

    expect(result.eligible).toBe(true);
    expect(result.composition).toBeDefined();
    const comp = result.composition!;
    expect(comp.canvasWidthPx).toBe(1240);
    expect(comp.canvasWidthMM).toBe(101.6);
    expect(comp.backgroundColor).toBe("#FFFFFF");
    expect(comp.items).toHaveLength(1);
    expect(comp.items[0]).toMatchObject({
      imageSrc: "/local-image/photo.jpg",
      x: 124,
      y: 350.8,
      w: 620,
      h: 701.6,
      flipX: false,
      cornerRadius: 0,
    });
  });

  it("sorts items by zIndex ascending (Konva draw order)", () => {
    const result = buildSingleComposition({
      ...base,
      elements: [
        imageElement({ id: "a", zIndex: 5 }),
        imageElement({ id: "b", zIndex: 1, imageSrc: "/local-image/b.jpg" }),
      ],
    });

    expect(result.composition!.items.map((i) => i.imageSrc)).toEqual([
      "/local-image/b.jpg",
      "/local-image/photo.jpg",
    ]);
  });

  it("supports filters implemented in the Go service", () => {
    const result = buildSingleComposition({
      ...base,
      elements: [imageElement({ filter: "cinematic", brightness: 110 })],
    });

    expect(result.eligible).toBe(true);
    expect(result.composition!.items[0].filter).toBe("cinematic");
    expect(result.composition!.items[0].brightness).toBe(110);
  });

  it("falls back to capture for text elements", () => {
    const result = buildSingleComposition({
      ...base,
      elements: [imageElement(), { id: "t", type: "text", x: 0, y: 0, width: 0.2, height: 0.1, rotation: 0, opacity: 1, zIndex: 2, text: "مرحباً", fontSize: 32 }],
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("غير صورة");
  });

  it.each([
    ["rotated element", imageElement({ rotation: 90 })],
    ["partial opacity", imageElement({ opacity: 0.5 })],
    ["blurred element", imageElement({ blur: 4 })],
    ["shadowed element", imageElement({ shadowColor: "#000", shadowOpacity: 0.5 })],
    ["custom blend mode", imageElement({ globalCompositeOperation: "multiply" })],
    ["non-local image source", imageElement({ imageSrc: "data:image/png;base64,AAAA" })],
    ["unsupported filter", imageElement({ filter: "vivid" })],
  ])("falls back to capture for %s", (_name, el) => {
    const result = buildSingleComposition({ ...base, elements: [el] });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("falls back to capture for non-solid backgrounds", () => {
    const result = buildSingleComposition({
      ...base,
      backgroundColor: "transparent",
      elements: [imageElement()],
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("خلفية");
  });

  it("falls back to capture for a 4-digit hex background", () => {
    const result = buildSingleComposition({
      ...base,
      backgroundColor: "#FFF",
      elements: [imageElement()],
    });
    expect(result.eligible).toBe(false);
  });

  it("ignores hidden elements and produces an empty composition (solid canvas)", () => {
    const result = buildSingleComposition({
      ...base,
      elements: [imageElement({ visible: false })],
    });

    expect(result.eligible).toBe(true);
    expect(result.composition!.items).toHaveLength(0);
  });
});
