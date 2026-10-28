import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampStudioPointer,
  fitStudioView,
  rgbToCmyk,
  studioPixelRatio,
} from "./scene-math";
import { createStudioLoop } from "./scene-loop";
import {
  disposeStudioResources,
  studioBodyGeometry,
  studioFaceGeometry,
} from "./studio-geometry";
import * as THREE from "three";

function animationHarness() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (frame: number) =>
    callbacks.delete(frame),
  );
  return {
    pending: () => callbacks.size,
    advance(timestamp: number) {
      const scheduled = [...callbacks.values()];
      callbacks.clear();
      scheduled.forEach((callback) => callback(timestamp));
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("studio viewport", () => {
  it.each([
    [320, 264],
    [640, 284],
    [1280, 500],
    [0, 0],
  ])("fits content without clipping at %i × %i", (width, height) => {
    const view = fitStudioView(width, height, { width: 4.7, height: 3.55 });
    expect(view.right - view.left).toBeGreaterThanOrEqual(4.7 - 1e-10);
    expect(view.top - view.bottom).toBeGreaterThanOrEqual(3.55 - 1e-10);
    expect((view.right - view.left) / (view.top - view.bottom)).toBeCloseTo(
      Math.max(width, 1) / Math.max(height, 1),
    );
    expect(view.right).toBe(-view.left);
    expect(view.top).toBe(-view.bottom);
  });

  it("caps device scaling and drawing-buffer allocation", () => {
    expect(studioPixelRatio(640, 320, 3)).toBe(2);
    const ratio = studioPixelRatio(3840, 2160, 2);
    expect(3840 * 2160 * ratio * ratio).toBeLessThanOrEqual(1_500_001);
    expect(studioPixelRatio(0, 0, Number.NaN)).toBe(1);
    expect(clampStudioPointer(-4)).toBe(-1);
    expect(clampStudioPointer(4)).toBe(1);
    expect(clampStudioPointer(0.4)).toBe(0.4);
  });
});

describe("illustrative CMYK separations", () => {
  it.each([
    [255, 255, 255, [0, 0, 0, 0]],
    [0, 0, 0, [0, 0, 0, 1]],
    [0, 255, 255, [1, 0, 0, 0]],
    [255, 0, 255, [0, 1, 0, 0]],
    [255, 255, 0, [0, 0, 1, 0]],
  ])("separates RGB %i/%i/%i", (r, g, b, expected) => {
    expect(rgbToCmyk(r as number, g as number, b as number)).toEqual(expected);
  });

  it("keeps neutral gray on the black plate and clamps out-of-range RGB", () => {
    const [c, m, y, k] = rgbToCmyk(128, 128, 128);
    expect([c, m, y]).toEqual([0, 0, 0]);
    expect(k).toBeCloseTo(127 / 255);
    expect(rgbToCmyk(-4, 999, 255)).toEqual([1, 0, 0, 0]);
  });
});

describe("studio frame lifecycle", () => {
  it("renders only once when motion is disabled, including after resize invalidation", () => {
    const frames = animationHarness();
    const render = vi.fn();
    const loop = createStudioLoop(render);
    loop.setAnimated(false);
    loop.invalidate();
    expect(frames.pending()).toBe(1);
    frames.advance(100);
    expect(render).toHaveBeenCalledWith(0, 0, false);
    expect(frames.pending()).toBe(0);
    loop.invalidate();
    frames.advance(200);
    expect(render).toHaveBeenCalledTimes(2);
    expect(frames.pending()).toBe(0);
    loop.dispose();
  });

  it("cancels offscreen work and resumes without hidden-time jumps", () => {
    const frames = animationHarness();
    const render = vi.fn();
    const loop = createStudioLoop(render);
    loop.invalidate();
    frames.advance(0);
    frames.advance(40);
    expect(frames.pending()).toBe(1);
    loop.setVisible(false);
    expect(frames.pending()).toBe(0);
    frames.advance(30_000);
    expect(render).toHaveBeenCalledTimes(2);
    loop.setVisible(true);
    frames.advance(40_000);
    expect(render).toHaveBeenLastCalledWith(0.04, 0, true);
    loop.dispose();
    expect(frames.pending()).toBe(0);
    loop.invalidate();
    expect(frames.pending()).toBe(0);
  });

  it("caps drawing at 30 fps and switches live between motion and a static frame", () => {
    const frames = animationHarness();
    const render = vi.fn();
    const loop = createStudioLoop(render);
    loop.invalidate();
    frames.advance(0);
    frames.advance(16);
    expect(render).toHaveBeenCalledTimes(1);
    frames.advance(34);
    expect(render).toHaveBeenCalledTimes(2);
    loop.setAnimated(false);
    frames.advance(50);
    expect(render).toHaveBeenLastCalledWith(0.034, 0, false);
    expect(frames.pending()).toBe(0);
    loop.setAnimated(true);
    frames.advance(60_000);
    expect(render).toHaveBeenLastCalledWith(0.034, 0, true);
    loop.dispose();
  });
});

describe("studio geometry and cleanup", () => {
  it("normalizes rounded face UVs and centers the thin body depth", () => {
    const face = studioFaceGeometry(2.8, 1.78, 0.115);
    const uv = face.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-6);
      expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-6);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-6);
      expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6);
    }
    const body = studioBodyGeometry(2.8, 1.78, 0.115, 0.042);
    body.computeBoundingBox();
    expect(body.boundingBox!.min.z).toBeCloseTo(-body.boundingBox!.max.z);
    face.dispose();
    body.dispose();
  });

  it("disposes shared resources once without disposing Three shared sprite geometry", () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    scene.add(
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, material),
      sprite,
    );
    const geometryDispose = vi.spyOn(geometry, "dispose");
    const materialDispose = vi.spyOn(material, "dispose");
    const textureDispose = vi.spyOn(texture, "dispose");
    const spriteDispose = vi.spyOn(spriteMaterial, "dispose");
    const spriteGeometryDispose = vi.spyOn(sprite.geometry, "dispose");
    disposeStudioResources(scene);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(spriteDispose).toHaveBeenCalledTimes(1);
    expect(spriteGeometryDispose).not.toHaveBeenCalled();
    expect(scene.children).toHaveLength(0);
  });
});
