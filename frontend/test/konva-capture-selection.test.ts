import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { captureStageBlob, isStageCaptureActive } from '../src/lib/canvas/konva-export-utils';

const stages: Konva.Stage[] = [];

beforeEach(() => {
  // Real Konva tree/visibility semantics; raster/encoding are the only test doubles.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return new Proxy(
      {
        canvas: this,
        getImageData: () => ({ data: new Uint8ClampedArray(400).fill(40) }),
      },
      { get: (target, key) => Reflect.get(target, key) ?? (() => {}) },
    ) as unknown as CanvasRenderingContext2D;
  });
});

afterEach(() => {
  for (const stage of stages.splice(0)) stage.destroy();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function createStage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const stage = new Konva.Stage({ container, width: 100, height: 100 });
  stages.push(stage);
  const layer = new Konva.Layer({ name: 'elements-content-layer' });
  stage.add(layer);
  vi.spyOn(stage, 'batchDraw').mockReturnValue(stage);
  vi.spyOn(layer, 'batchDraw').mockReturnValue(layer);
  return { stage, layer };
}

function deferredCanvas(callbacks: BlobCallback[]) {
  const canvas = document.createElement('canvas');
  canvas.toBlob = (callback) => callbacks.push(callback);
  return canvas;
}

describe('capture selection isolation inside the Stage lock', () => {
  it.each(['success', 'toCanvas rejection', 'abort', 'toBlob timeout'] as const)(
    'isolates a queued newcomer and restores visibility/cache/transform on %s',
    async (outcome) => {
      const { stage, layer } = createStage();
      const selected = new Konva.Group({ id: 'selected' });
      const selectedChild = new Konva.Rect({ id: 'selected-child', width: 20, height: 16 });
      const hiddenChild = new Konva.Rect({ visible: false });
      selected.add(selectedChild, hiddenChild);
      const other = new Konva.Group({ id: 'other' });
      const otherChild = new Konva.Rect({ width: 10, height: 10 });
      other.add(otherChild);
      const alreadyHidden = new Konva.Rect({ id: 'already-hidden', visible: false });
      const overlay = new Konva.Group({ name: 'magic-ai-scanner' });
      layer.add(selected, other, alreadyHidden, overlay);
      const originalPos = { x: 17, y: 23 };
      const originalScale = { x: 1.5, y: 1.25 };
      stage.position(originalPos);
      stage.scale(originalScale);

      const callbacks: BlobCallback[] = [];
      const toCanvas = vi
        .spyOn(stage, 'toCanvas')
        .mockImplementation(() => deferredCanvas(callbacks));
      const first = captureStageBlob(stage, 1);
      await vi.waitFor(() => expect(callbacks).toHaveLength(1));

      const controller = new AbortController();
      const queued = captureStageBlob(stage, 2, 'image/png', undefined, undefined, {
        includeNodeIds: ['selected'],
        hiddenNodeIds: ['other'], // Compatible with the existing explicit exclusion API.
        signal: controller.signal,
        toBlobTimeoutMs: outcome === 'toBlob timeout' ? 25 : 1000,
      });
      // Attach rejection handling before the queued transaction can start.
      const result = queued.then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error }),
      );
      const newcomer = new Konva.Rect({ id: 'newcomer', width: 10, height: 10 });
      layer.add(newcomer);
      await Promise.resolve();
      expect(toCanvas).toHaveBeenCalledTimes(1);
      expect(newcomer.visible()).toBe(true);
      expect(other.visible()).toBe(true);
      expect(selected.visible()).toBe(true);

      callbacks[0](new Blob(['first']));
      await first;
      // Seed a screen-cache ratio after the first transaction has restored it.
      selectedChild._cache.set('canvas', {
        scene: { width: () => 50, height: () => 40 },
      });
      vi.spyOn(selectedChild, 'isCached').mockReturnValue(true);
      const clearCache = vi.spyOn(selectedChild, 'clearCache').mockReturnValue(selectedChild);
      const cache = vi.spyOn(selectedChild, 'cache').mockReturnValue(selectedChild);
      let observedIsolation = false;
      toCanvas.mockImplementation(() => {
        observedIsolation = true;
        expect(isStageCaptureActive(stage)).toBe(true);
        expect(stage.position()).toEqual({ x: 0, y: 0 });
        expect(stage.scale()).toEqual({ x: 1, y: 1 });
        expect(layer.visible()).toBe(true);
        expect(selected.isVisible()).toBe(true);
        expect(selectedChild.isVisible()).toBe(true);
        expect(hiddenChild.visible()).toBe(false);
        expect(other.isVisible()).toBe(false);
        expect(otherChild.visible()).toBe(false);
        expect(newcomer.isVisible()).toBe(false);
        expect(alreadyHidden.visible()).toBe(false);
        expect(overlay.visible()).toBe(false);
        expect(cache).toHaveBeenCalledWith({ pixelRatio: 2 });
        if (outcome === 'toCanvas rejection') throw new Error('encoding rejected');
        return deferredCanvas(callbacks);
      });

      await vi.waitFor(() => expect(observedIsolation).toBe(true));
      if (outcome === 'success') callbacks[1](new Blob(['selection']));
      if (outcome === 'abort') controller.abort();
      const settled = await result;
      if (outcome === 'success') expect(settled.value).toBeInstanceOf(Blob);
      else if (outcome === 'toCanvas rejection')
        expect(settled.error).toMatchObject({ message: 'encoding rejected' });
      else if (outcome === 'abort') expect(settled.error).toMatchObject({ name: 'AbortError' });
      else
        expect(settled.error).toMatchObject({ name: 'CaptureStageTimeoutError', phase: 'toBlob' });

      expect(stage.position()).toEqual(originalPos);
      expect(stage.scale()).toEqual(originalScale);
      expect(selected.visible()).toBe(true);
      expect(selectedChild.visible()).toBe(true);
      expect(hiddenChild.visible()).toBe(false);
      expect(other.visible()).toBe(true);
      expect(otherChild.visible()).toBe(true);
      expect(newcomer.visible()).toBe(true);
      expect(alreadyHidden.visible()).toBe(false);
      expect(overlay.visible()).toBe(true);
      expect(clearCache).toHaveBeenCalledTimes(2);
      expect(cache.mock.calls).toEqual([[{ pixelRatio: 2 }], [{ pixelRatio: 2.5 }]]);
      expect(isStageCaptureActive(stage)).toBe(false);
      toCanvas.mockImplementation(() => {
        expect(other.visible()).toBe(true);
        expect(newcomer.visible()).toBe(true);
        const canvas = document.createElement('canvas');
        canvas.toBlob = (callback) => callback(new Blob(['after']));
        return canvas;
      });
      await expect(captureStageBlob(stage, 1)).resolves.toBeInstanceOf(Blob);
    },
  );

  it('does not hide nodes when an included capture is rejected while still queued', async () => {
    const { stage, layer } = createStage();
    const selected = new Konva.Rect({ id: 'selected' });
    const other = new Konva.Rect({ id: 'other' });
    layer.add(selected, other);
    const callbacks: BlobCallback[] = [];
    const toCanvas = vi
      .spyOn(stage, 'toCanvas')
      .mockImplementation(() => deferredCanvas(callbacks));
    const first = captureStageBlob(stage, 1);
    await vi.waitFor(() => expect(callbacks).toHaveLength(1));
    const controller = new AbortController();
    const queued = captureStageBlob(stage, 1, 'image/png', undefined, undefined, {
      includeNodeIds: ['selected'],
      signal: controller.signal,
    });
    controller.abort();
    await expect(queued).rejects.toMatchObject({ name: 'AbortError' });
    expect(other.visible()).toBe(true);
    expect(selected.visible()).toBe(true);
    expect(toCanvas).toHaveBeenCalledTimes(1);
    callbacks[0](new Blob(['first']));
    await first;
    expect(isStageCaptureActive(stage)).toBe(false);
  });
});
