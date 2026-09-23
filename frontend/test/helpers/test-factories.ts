import { expect } from "vitest";
import type {
  ImageElement,
  TextElement,
  ShapeElement,
  PrintSettings,
} from "../../src/lib/store/types";
import { DEFAULT_PRINT_SETTINGS } from "../../src/lib/store/slices/print-slice";
import { useEditorStore } from "../../src/lib/editor-store";

let idCounter = 0;

/**
 * Creates a valid ImageElement for test suites with customizable overrides.
 */
export function createMockImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  idCounter += 1;
  return {
    id: `img-${idCounter}-${Date.now()}`,
    type: "image",
    imageSrc: "/local-image/test-sample.jpg",
    x: 0,
    y: 0,
    width: 0.5,
    height: 0.5,
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
  };
}

/**
 * Creates a valid TextElement for test suites with customizable overrides.
 */
export function createMockTextElement(overrides: Partial<TextElement> = {}): TextElement {
  idCounter += 1;
  return {
    id: `txt-${idCounter}-${Date.now()}`,
    type: "text",
    text: "نص تجريبي",
    fontSize: 24,
    fontFamily: "Arial",
    color: "#000000",
    textAlign: "right",
    x: 0,
    y: 0,
    width: 0.4,
    height: 0.15,
    rotation: 0,
    opacity: 1,
    zIndex: 2,
    wrap: "word",
    ...overrides,
  };
}

/**
 * Creates a valid ShapeElement for test suites with customizable overrides.
 */
export function createMockShapeElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  idCounter += 1;
  return {
    id: `shp-${idCounter}-${Date.now()}`,
    type: "shape",
    shape: "rect",
    fill: "#0078D4",
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.3,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    stroke: "#000000",
    strokeWidth: 1,
    cornerRadius: 0,
    ...overrides,
  };
}

/**
 * Creates valid PrintSettings with sensible defaults and explicit overrides.
 */
export function createMockPrintSettings(overrides: Partial<PrintSettings> = {}): PrintSettings {
  return {
    ...DEFAULT_PRINT_SETTINGS,
    paperWidthMM: 210,
    paperHeightMM: 297,
    orientation: "portrait",
    marginMM: 5,
    gapMM: 2,
    copiesPerSheet: 1,
    repeatMode: "all",
    fitToPage: false,
    dpi: 300,
    ...overrides,
  };
}

/**
 * Resets the Zustand editor store to a clean, default state.
 * Useful in beforeEach hooks to avoid cross-test state pollution.
 */
export function resetEditorStore(): void {
  useEditorStore.setState({
    mode: "single",
    elements: [],
    selectedIds: [],
    slots: [],
    template: null,
    collageTemplate: null,
    canvasZoom: 1,
    canvasWidth: 1200,
    canvasHeight: 1800,
    backgroundColor: "#ffffff",
    backgroundGradientColor2: null,
    printSettings: { ...DEFAULT_PRINT_SETTINGS },
  });
}

/**
 * Lightweight in-memory canvas 2D mock for simulating pixel buffers in headless tests.
 */
export function createMockCanvasContext(width = 100, height = 100) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const mockData = new Uint8ClampedArray(width * height * 4);

  const ctx = {
    canvas,
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    getImageData: (sx = 0, sy = 0, sw = width, sh = height) => {
      const data = new Uint8ClampedArray(sw * sh * 4);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const sIdx = ((sy + y) * width + (sx + x)) * 4;
          const dIdx = (y * sw + x) * 4;
          if (sIdx >= 0 && sIdx < mockData.length) {
            data[dIdx] = mockData[sIdx];
            data[dIdx + 1] = mockData[sIdx + 1];
            data[dIdx + 2] = mockData[sIdx + 2];
            data[dIdx + 3] = mockData[sIdx + 3];
          }
        }
      }
      return { data, width: sw, height: sh };
    },
    putImageData: (imgData: ImageData, dx = 0, dy = 0) => {
      for (let y = 0; y < imgData.height && y + dy < height; y++) {
        for (let x = 0; x < imgData.width && x + dx < width; x++) {
          const sIdx = (y * imgData.width + x) * 4;
          const dIdx = ((y + dy) * width + (x + dx)) * 4;
          if (sIdx < imgData.data.length && dIdx < mockData.length) {
            mockData[dIdx] = imgData.data[sIdx];
            mockData[dIdx + 1] = imgData.data[sIdx + 1];
            mockData[dIdx + 2] = imgData.data[sIdx + 2];
            mockData[dIdx + 3] = imgData.data[sIdx + 3];
          }
        }
      }
    },
    clearRect: () => mockData.fill(0),
    fillRect: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
  } as unknown as CanvasRenderingContext2D;

  return { canvas, ctx, mockData };
}

/**
 * Asserts that two numbers are within an acceptable numerical tolerance (useful for floating point geometry).
 */
export function assertWithinTolerance(actual: number, expected: number, tolerance = 0.01): void {
  expect(
    Math.abs(actual - expected),
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  ).toBeLessThanOrEqual(tolerance);
}
