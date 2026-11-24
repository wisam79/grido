import Konva from 'konva';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearDisplayCache, registerDisplayOwnership } from '../src/lib/canvas/display-image';
import { captureStageBlob, isStageCaptureActive } from '../src/lib/canvas/konva-export-utils';

import type { CaptureStageOptions } from '../src/lib/canvas/konva-export-utils';

const stages: Konva.Stage[] = [];

beforeEach(() => {
  // Prevent RAF draws from being queued during Layer construction/Stage.add,
  // before the capture tests install their deliberately non-raster cache doubles.
  vi.spyOn(Konva.Layer.prototype, 'batchDraw').mockImplementation(function (this: Konva.Layer) {
    return this;
  });
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
  clearDisplayCache();
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
  return { stage, layer };
}

function deferredCanvas(callbacks: BlobCallback[]) {
  const canvas = document.createElement('canvas');
  canvas.toBlob = (callback) => callbacks.push(callback);
  return canvas;
}

function readyImage(width = 100, height = 80, src = '/original.png') {
  const image = document.createElement('img');
  image.src = src;
  Object.defineProperties(image, {
    complete: { configurable: true, value: true },
    naturalWidth: { configurable: true, value: width },
    naturalHeight: { configurable: true, value: height },
  });
  image.decode = vi.fn().mockResolvedValue(undefined);
  return image;
}

function controlledImageLoads() {
  const loads: Array<{
    image: HTMLImageElement;
    src: string;
    load: (width?: number, height?: number) => void;
    fail: () => void;
  }> = [];
  vi.spyOn(globalThis, 'Image').mockImplementation(function () {
    const image = readyImage(0, 0);
    Object.defineProperty(image, 'complete', { configurable: true, value: false });
    const pending = {
      image,
      src: '',
      load: (width = 200, height = 160) => {
        Object.defineProperties(image, {
          complete: { configurable: true, value: true },
          naturalWidth: { configurable: true, value: width },
          naturalHeight: { configurable: true, value: height },
        });
        image.dispatchEvent(new Event('load'));
      },
      fail: () => image.dispatchEvent(new Event('error')),
    };
    Object.defineProperty(image, 'src', {
      configurable: true,
      get: () => pending.src,
      set: (src: string) => {
        pending.src = src;
        loads.push(pending);
      },
    });
    return image;
  } as unknown as typeof Image);
  return loads;
}

function imageRoot(layer: Konva.Layer, source: CanvasImageSource = readyImage()) {
  const root = new Konva.Group({ id: 'image-root' });
  const node = new Konva.Image({
    image: source,
    width: 20,
    height: 16,
    cropX: 10,
    cropY: 8,
    cropWidth: 50,
    cropHeight: 40,
  });
  root.add(node);
  layer.add(root);
  return { root, node };
}

function captureRequired(stage: Konva.Stage, options: CaptureStageOptions = {}) {
  return captureStageBlob(stage, 2, 'image/png', undefined, undefined, {
    includeNodeIds: ['image-root'],
    requireImageNodeIds: ['image-root'],
    ...options,
  });
}

function encodedCanvas() {
  const canvas = document.createElement('canvas');
  canvas.toBlob = (callback) => callback(new Blob(['captured']));
  return canvas;
}

describe('required-image capture inside the Stage lock', () => {
  it.each(['missing root', 'empty Group', 'non-image root'] as const)(
    'rejects %s rather than encoding blank selection',
    async (kind) => {
      const { stage, layer } = createStage();
      if (kind === 'empty Group') layer.add(new Konva.Group({ id: 'image-root' }));
      if (kind === 'non-image root') layer.add(new Konva.Rect({ id: 'image-root' }));
      const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      await expect(captureRequired(stage)).rejects.toThrow('is missing');
      expect(toCanvas).not.toHaveBeenCalled();
      expect(isStageCaptureActive(stage)).toBe(false);
      // The existing optional selection API remains tolerant of absent Images.
      await expect(
        captureStageBlob(stage, 1, 'image/png', undefined, undefined, {
          includeNodeIds: ['image-root'],
        }),
      ).resolves.toBeInstanceOf(Blob);
    },
  );

  it.each([
    'unloaded',
    'zero natural size',
    'missing source',
    'zero canvas',
    'hidden root',
    'hidden child',
  ] as const)('rejects a required %s before any capture mutation', async (kind) => {
    const { stage, layer } = createStage();
    const source = readyImage();
    const { root, node } = imageRoot(layer, source);
    if (kind === 'unloaded') Object.defineProperty(source, 'complete', { value: false });
    if (kind === 'zero natural size') {
      source.width = 100;
      source.height = 80;
      Object.defineProperty(source, 'naturalWidth', { value: 0 });
    }
    if (kind === 'missing source') node.setAttr('image', undefined);
    if (kind === 'zero canvas') {
      const canvas = document.createElement('canvas');
      canvas.width = 0;
      node.image(canvas);
    }
    if (kind === 'hidden root') root.hide();
    if (kind === 'hidden child') node.hide();
    stage.position({ x: 17, y: 23 });
    stage.scale({ x: 1.5, y: 1.25 });
    const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
    await expect(captureRequired(stage)).rejects.toThrow(/is not (ready|visible)/);
    expect(toCanvas).not.toHaveBeenCalled();
    expect(stage.position()).toEqual({ x: 17, y: 23 });
    expect(stage.scale()).toEqual({ x: 1.5, y: 1.25 });
    expect(root.visible()).toBe(kind !== 'hidden root');
    expect(node.visible()).toBe(kind !== 'hidden child');
    expect(isStageCaptureActive(stage)).toBe(false);
  });

  it('propagates displayed-source decode failure without enabling general readiness', async () => {
    const { stage, layer } = createStage();
    const source = readyImage();
    source.decode = vi.fn().mockRejectedValue(new Error('display decode failed'));
    imageRoot(layer, source);
    const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
    await expect(captureRequired(stage)).rejects.toThrow('display decode failed');
    expect(toCanvas).not.toHaveBeenCalled();
    await expect(captureStageBlob(stage, 1)).resolves.toBeInstanceOf(Blob);
  });

  it.each(['load error', 'zero size', 'decode error'] as const)(
    'rejects full-resolution %s without retaining the registered display derivative',
    async (failure) => {
      const { stage, layer } = createStage();
      const display = readyImage(100, 80, '/display-2048.png');
      registerDisplayOwnership(display, '/full-original.png');
      const { node } = imageRoot(layer, display);
      const loads = controlledImageLoads();
      const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      const result = captureRequired(stage, { useFullResolution: true }).catch(
        (error: unknown) => error,
      );
      await vi.waitFor(() => expect(loads).toHaveLength(1));
      expect(loads[0].src).toBe('/full-original.png');
      if (failure === 'load error') loads[0].fail();
      else {
        if (failure === 'decode error')
          loads[0].image.decode = vi.fn().mockRejectedValue(new Error('original decode failed'));
        loads[0].load(failure === 'zero size' ? 0 : 200);
      }
      expect(await result).toBeInstanceOf(Error);
      expect(toCanvas).not.toHaveBeenCalled();
      expect(node.image()).toBe(display);
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      expect(isStageCaptureActive(stage)).toBe(false);
      // No new strict failure policy leaks into default full-resolution callers.
      const tolerant = captureStageBlob(stage, 1, 'image/png', undefined, undefined, {
        useFullResolution: true,
      });
      await vi.waitFor(() => expect(loads).toHaveLength(2));
      loads[1].fail();
      await expect(tolerant).resolves.toBeInstanceOf(Blob);
    },
  );

  it.each(['load error', 'zero size', 'decode error', 'missing src'] as const)(
    'propagates required override %s and restores an already upgraded original',
    async (failure) => {
      const { stage, layer } = createStage();
      const display = readyImage();
      const { node } = imageRoot(layer, display);
      const loads = controlledImageLoads();
      const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      const result = captureRequired(stage, {
        useFullResolution: true,
        imageOverrides: [
          { nodeId: 'image-root', src: failure === 'missing src' ? '' : '/override.png' },
        ],
      }).catch((error: unknown) => error);
      await vi.waitFor(() => expect(loads).toHaveLength(1));
      loads[0].load();
      if (failure !== 'missing src') {
        await vi.waitFor(() => expect(loads).toHaveLength(2));
        expect(node.image()).toBe(loads[0].image);
        if (failure === 'load error') loads[1].fail();
        else {
          if (failure === 'decode error')
            loads[1].image.decode = vi.fn().mockRejectedValue(new Error('override decode failed'));
          loads[1].load(failure === 'zero size' ? 0 : 400);
        }
      }
      const error = await result;
      expect(error).toBeInstanceOf(failure === 'load error' ? Event : Error);
      expect(toCanvas).not.toHaveBeenCalled();
      expect(node.image()).toBe(display);
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      expect(isStageCaptureActive(stage)).toBe(false);
    },
  );

  it.each(['remove root', 'remove child', 'replace child', 'unready source'] as const)(
    'rejects %s while an override is awaited',
    async (mutation) => {
      const { stage, layer } = createStage();
      const source = readyImage();
      const { root, node } = imageRoot(layer, source);
      const loads = controlledImageLoads();
      const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      const result = captureRequired(stage, {
        imageOverrides: [{ nodeId: 'image-root', src: '/override.png' }],
      }).catch((error: unknown) => error);
      await vi.waitFor(() => expect(loads).toHaveLength(1));
      if (mutation === 'remove root') root.remove();
      if (mutation === 'remove child') node.remove();
      if (mutation === 'replace child') {
        node.remove();
        root.add(new Konva.Image({ image: source }));
      }
      if (mutation === 'unready source') node.setAttr('image', undefined);
      loads[0].load();
      expect(await result).toBeInstanceOf(Error);
      expect(toCanvas).not.toHaveBeenCalled();
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      expect(isStageCaptureActive(stage)).toBe(false);
      // Removed test nodes are not descendants when the Stage is destroyed.
      if (!root.getStage()) root.destroy();
      if (!node.getStage()) node.destroy();
    },
  );

  it('rechecks required identity immediately before toCanvas, after overlay hiding', async () => {
    const { stage, layer } = createStage();
    const { node } = imageRoot(layer);
    const other = new Konva.Rect({ id: 'other' });
    layer.add(other);
    const hide = other.hide.bind(other);
    vi.spyOn(other, 'hide').mockImplementation(() => {
      node.remove();
      return hide();
    });
    const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
    await expect(captureRequired(stage)).rejects.toThrow('is missing');
    expect(toCanvas).not.toHaveBeenCalled();
    expect(other.visible()).toBe(true);
    expect(isStageCaptureActive(stage)).toBe(false);
    node.destroy();
  });

  it.each(['abort', 'queue timeout'] as const)(
    'does not load or mutate required Images when rejected by %s before acquiring the lock',
    async (outcome) => {
      const { stage, layer } = createStage();
      const source = readyImage();
      const { root, node } = imageRoot(layer, source);
      const callbacks: BlobCallback[] = [];
      const toCanvas = vi
        .spyOn(stage, 'toCanvas')
        .mockImplementation(() => deferredCanvas(callbacks));
      const first = captureStageBlob(stage, 1);
      await vi.waitFor(() => expect(callbacks).toHaveLength(1));
      const loads = controlledImageLoads();
      const controller = new AbortController();
      const queued = captureRequired(stage, {
        useFullResolution: true,
        imageOverrides: [{ nodeId: 'image-root', src: '/override.png' }],
        signal: controller.signal,
        queueTimeoutMs: 25,
      }).catch((error: unknown) => error);
      if (outcome === 'abort') controller.abort();
      const error = await queued;
      expect(error).toMatchObject(
        outcome === 'abort'
          ? { name: 'AbortError' }
          : { name: 'CaptureStageTimeoutError', phase: 'queue' },
      );
      expect(loads).toHaveLength(0);
      expect(node.image()).toBe(source);
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      expect(root.visible()).toBe(true);
      expect(toCanvas).toHaveBeenCalledTimes(1);
      callbacks[0](new Blob(['first']));
      await first;
      expect(isStageCaptureActive(stage)).toBe(false);
    },
  );

  it('resolves required roots after the queue wait, not from a stale prequeue tree', async () => {
    const { stage, layer } = createStage();
    const { root } = imageRoot(layer);
    const callbacks: BlobCallback[] = [];
    const toCanvas = vi
      .spyOn(stage, 'toCanvas')
      .mockImplementation(() => deferredCanvas(callbacks));
    const first = captureStageBlob(stage, 1);
    await vi.waitFor(() => expect(callbacks).toHaveLength(1));
    const queued = captureRequired(stage).catch((error: unknown) => error);
    root.remove();
    callbacks[0](new Blob(['first']));
    await first;
    expect(await queued).toMatchObject({
      message: 'Required capture image "image-root" is missing',
    });
    expect(toCanvas).toHaveBeenCalledTimes(1);
    expect(isStageCaptureActive(stage)).toBe(false);
    root.destroy();
  });

  it.each(['abort', 'readiness timeout'] as const)(
    'restores upgraded Images on %s during override loading, with no late node mutations',
    async (outcome) => {
      const { stage, layer } = createStage();
      const source = readyImage();
      const { node } = imageRoot(layer, source);
      const loads = controlledImageLoads();
      const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      const controller = new AbortController();
      const result = captureRequired(stage, {
        useFullResolution: true,
        imageOverrides: [{ nodeId: 'image-root', src: '/override.png' }],
        signal: controller.signal,
        readinessTimeoutMs: outcome === 'readiness timeout' ? 100 : 1000,
      }).catch((error: unknown) => error);
      await vi.waitFor(() => expect(loads).toHaveLength(1));
      loads[0].load();
      await vi.waitFor(() => expect(loads).toHaveLength(2));
      expect(node.image()).toBe(loads[0].image);
      if (outcome === 'abort') controller.abort();
      const error = await result;
      expect(error).toMatchObject(
        outcome === 'abort'
          ? { name: 'AbortError' }
          : { name: 'CaptureStageTimeoutError', phase: 'readiness' },
      );
      expect(node.image()).toBe(source);
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      loads[1].load(400, 320);
      await Promise.resolve();
      await Promise.resolve();
      expect(node.image()).toBe(source);
      expect(toCanvas).not.toHaveBeenCalled();
      expect(isStageCaptureActive(stage)).toBe(false);
    },
  );

  it.each(['original upgrade', 'override swap'] as const)(
    'rolls back image/crop records when a required %s setter throws after mutation',
    async (phase) => {
      const { stage, layer } = createStage();
      const source = readyImage();
      const { node } = imageRoot(layer, source);
      const cropHeight = node.cropHeight.bind(node);
      let thrown = false;
      vi.spyOn(node, 'cropHeight').mockImplementation(((value?: number) => {
        if (value === undefined) return cropHeight();
        const result = cropHeight(value);
        if (value !== 40 && !thrown) {
          thrown = true;
          throw new Error('crop setter failed after mutation');
        }
        return result;
      }) as typeof node.cropHeight);
      const loads = controlledImageLoads();
      const toCanvas = vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      const result = captureRequired(stage, {
        useFullResolution: phase === 'original upgrade',
        imageOverrides:
          phase === 'override swap' ? [{ nodeId: 'image-root', src: '/override.png' }] : undefined,
      }).catch((error: unknown) => error);
      await vi.waitFor(() => expect(loads).toHaveLength(1));
      loads[0].load();
      expect(await result).toMatchObject({ message: 'crop setter failed after mutation' });
      expect(node.image()).toBe(source);
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      expect(toCanvas).not.toHaveBeenCalled();
      expect(isStageCaptureActive(stage)).toBe(false);
    },
  );

  it.each(['Image', 'Group'] as const)(
    'accepts a ready canvas source identified by its %s without forcing an HTML original reload',
    async (kind) => {
      const { stage, layer } = createStage();
      const source = document.createElement('canvas');
      source.width = 100;
      source.height = 80;
      const { root, node } = imageRoot(layer, source);
      if (kind === 'Image') {
        root.id('');
        node.id('image-root');
      }
      const loads = controlledImageLoads();
      vi.spyOn(stage, 'toCanvas').mockImplementation(encodedCanvas);
      await expect(captureRequired(stage, { useFullResolution: true })).resolves.toBeInstanceOf(
        Blob,
      );
      expect(loads).toHaveLength(0);
      expect(node.image()).toBe(source);
    },
  );

  it.each(['success', 'abort', 'toBlob timeout'] as const)(
    'captures a Group child from full resolution plus override and restores everything on %s',
    async (outcome) => {
      const { stage, layer } = createStage();
      const source = readyImage();
      const { root, node } = imageRoot(layer, source);
      const other = new Konva.Rect({ id: 'other' });
      const overlay = new Konva.Group({ name: 'magic-ai-scanner' });
      layer.add(other, overlay);
      stage.position({ x: 17, y: 23 });
      stage.scale({ x: 1.5, y: 1.25 });
      node._cache.set('canvas', { scene: { width: () => 50, height: () => 40 } });
      vi.spyOn(node, 'isCached').mockReturnValue(true);
      vi.spyOn(node, 'clearCache').mockReturnValue(node);
      const cache = vi.spyOn(node, 'cache').mockReturnValue(node);
      const loads = controlledImageLoads();
      const callbacks: BlobCallback[] = [];
      vi.spyOn(stage, 'toCanvas').mockImplementation(() => {
        expect(node.image()).toBe(loads[1].image);
        expect(node.crop()).toEqual({ x: 40, y: 32, width: 200, height: 160 });
        expect(root.isVisible()).toBe(true);
        expect(other.isVisible()).toBe(false);
        expect(overlay.isVisible()).toBe(false);
        expect(stage.position()).toEqual({ x: 0, y: 0 });
        expect(stage.scale()).toEqual({ x: 1, y: 1 });
        return deferredCanvas(callbacks);
      });
      const controller = new AbortController();
      const result = captureRequired(stage, {
        useFullResolution: true,
        // One-shot iterable is reused by validation/preload/upgrade/override checks.
        requireImageNodeIds: (function* () {
          yield 'image-root';
        })(),
        imageOverrides: [{ nodeId: 'image-root', src: '/override.png' }],
        signal: controller.signal,
        toBlobTimeoutMs: outcome === 'toBlob timeout' ? 25 : 1000,
      }).then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error }),
      );
      await vi.waitFor(() => expect(loads).toHaveLength(1));
      expect(loads[0].src).toContain('/original.png');
      loads[0].load();
      await vi.waitFor(() => expect(loads).toHaveLength(2));
      loads[1].load(400, 320);
      await vi.waitFor(() => expect(callbacks).toHaveLength(1));
      if (outcome === 'success') callbacks[0](new Blob(['strict']));
      if (outcome === 'abort') controller.abort();
      const settled = await result;
      if (outcome === 'success') expect(settled.value).toBeInstanceOf(Blob);
      else if (outcome === 'abort') expect(settled.error).toMatchObject({ name: 'AbortError' });
      else
        expect(settled.error).toMatchObject({ name: 'CaptureStageTimeoutError', phase: 'toBlob' });
      expect(node.image()).toBe(source);
      expect(node.crop()).toEqual({ x: 10, y: 8, width: 50, height: 40 });
      expect(stage.position()).toEqual({ x: 17, y: 23 });
      expect(stage.scale()).toEqual({ x: 1.5, y: 1.25 });
      expect(root.visible()).toBe(true);
      expect(other.visible()).toBe(true);
      expect(overlay.visible()).toBe(true);
      expect(cache.mock.calls).toEqual([[{ pixelRatio: 2 }], [{ pixelRatio: 2.5 }]]);
      expect(isStageCaptureActive(stage)).toBe(false);
    },
  );
});

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
