import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnhanceImageWithAI, GetImageDimensions, SaveImageFromBase64 } from '@bindings/grido/app';

import { useAiEnhance, useAiEnhanceState } from '../src/hooks/use-ai-enhance';
import { useRenderQuality } from '../src/lib/canvas/render-quality';
import { useEditorStore } from '../src/lib/editor-store';
import { useOperationStatusStore } from '../src/lib/ui/operation-status';

import type { CanvasSlot } from '../src/lib/editor-store';

const { getImageDimensionsMock } = vi.hoisted(() => ({
  // These tests await measurements but never use Wails cancellation methods.
  getImageDimensionsMock:
    vi.fn<
      (
        src: string,
      ) => Promise<{ width: number; height: number; isRotated: boolean; orientation: number }>
    >(),
}));

vi.mock('@bindings/grido/app', () => ({
  SaveImageFromBase64: vi.fn(),
  EnhanceImageWithAI: vi.fn(),
  GetImageDimensions: getImageDimensionsMock,
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const sourcePath = '/local-image/slot.png';
const resultPath = '/local-image/enhanced.png';
const resultImage = 'data:image/png;base64,AAA';
const target = { id: 'slot-1', imageSrc: sourcePath };
const actualPushHistory = useEditorStore.getState().pushHistory;
const actualLogAiUsage = useEditorStore.getState().logAiUsage;
const pushHistory = vi.fn();
const logAiUsage = vi.fn();

function mockDimensions(width: number, height: number, isRotated = false) {
  return { width, height, isRotated, orientation: isRotated ? 6 : 1 };
}

function setSlot(patch: Partial<CanvasSlot> = {}) {
  useEditorStore.setState({
    elements: [],
    slots: [
      { id: 'slot-1', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 0.5, imageSrc: sourcePath, ...patch },
    ],
  });
}

async function enhanceSlot() {
  const onUpdate = vi.fn((id, patch) => useEditorStore.getState().updateSlot(id, patch));
  const hook = renderHook(() => useAiEnhance(onUpdate));
  await act(async () => {
    await hook.result.current.handleEnhance(target);
  });
  return onUpdate;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(SaveImageFromBase64).mockResolvedValue(resultPath);
  vi.mocked(EnhanceImageWithAI).mockResolvedValue(JSON.stringify({ image: resultImage }));
  getImageDimensionsMock
    .mockResolvedValueOnce(mockDimensions(1000, 750))
    .mockResolvedValueOnce(mockDimensions(2000, 1500));

  // Tiny deterministic image mocks: no canvas rasterization or real decoding/network.
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 1000;
      naturalHeight = 750;
      width = 1000;
      height = 750;
      crossOrigin: string | null = null;
      set src(_src: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  useAiEnhanceState.setState({ isEnhancing: false, serverQuota: null });
  useOperationStatusStore.setState({ activeOperation: null });
  useRenderQuality.setState({ enhancingElementId: null });
  useEditorStore.setState({
    user: {
      plan: 'pro',
      status: 'active',
      email: 'tester@grido.app',
      token: 'test-token',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } as never,
    aiUsageLogs: [],
    pushHistory,
    logAiUsage,
  });
  setSlot();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useEditorStore.setState({ pushHistory: actualPushHistory, logAiUsage: actualLogAiUsage });
});

describe('useAiEnhance — dimension-safe collage results', () => {
  it('applies a collage result using the actual source and saved-result dimensions', async () => {
    const onUpdate = await enhanceSlot();
    expect(GetImageDimensions).toHaveBeenNthCalledWith(1, sourcePath);
    expect(GetImageDimensions).toHaveBeenNthCalledWith(2, resultPath);
    expect(EnhanceImageWithAI).toHaveBeenCalledWith(sourcePath, 'test-token', 15);
    expect(SaveImageFromBase64).toHaveBeenCalledWith(resultImage);
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: resultPath,
      originalImageSrc: sourcePath,
    });
    expect(pushHistory).toHaveBeenCalledTimes(1);
  });

  it('preserves live user pans, zoom, rotation and flips while doubling source resolution', async () => {
    setSlot({ dragX: 20, dragY: -10 });
    getImageDimensionsMock
      .mockReset()
      .mockResolvedValueOnce(mockDimensions(1000, 750))
      .mockImplementationOnce(async () => {
        useEditorStore.getState().updateSlot('slot-1', {
          dragX: 120,
          dragY: -35,
          zoom: 1.8,
          rotation: 90,
          flipX: true,
        });
        return mockDimensions(2000, 1500);
      });
    const onUpdate = await enhanceSlot();
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: resultPath,
      originalImageSrc: sourcePath,
      dragX: 240,
      dragY: -70,
    });
    expect(useEditorStore.getState().slots[0]).toMatchObject({
      dragX: 240,
      dragY: -70,
      zoom: 1.8,
      rotation: 90,
      flipX: true,
    });
  });

  it('normalizes EXIF dimensions and does not assume a 2x ratio to the pre-upload source', async () => {
    setSlot({ dragX: 250, dragY: -500, originalImageSrc: '/local-image/older.png' });
    getImageDimensionsMock
      .mockReset()
      .mockResolvedValueOnce(mockDimensions(5000, 2500, true))
      .mockResolvedValueOnce(mockDimensions(2048, 4096));
    const onUpdate = await enhanceSlot();
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: resultPath,
      dragX: 204.8,
      dragY: -409.6,
    });
    expect(GetImageDimensions).not.toHaveBeenCalledWith('/local-image/older.png');
  });

  it('measures nonlocal sources without applying EXIF rotation twice', async () => {
    const src = 'data:image/jpeg;base64,AAA';
    setSlot({ imageSrc: src, dragX: 20, dragY: -10 });
    getImageDimensionsMock.mockReset().mockResolvedValue(mockDimensions(2000, 1500));
    const onUpdate = vi.fn();
    const hook = renderHook(() => useAiEnhance(onUpdate));
    await act(async () => {
      await hook.result.current.handleEnhance({ id: 'slot-1', imageSrc: src });
    });
    expect(GetImageDimensions).toHaveBeenCalledExactlyOnceWith(resultPath);
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('slot-1', {
      imageSrc: resultPath,
      originalImageSrc: src,
      dragX: 40,
      dragY: -20,
    });
  });

  it.each(['source', 'result'] as const)(
    'fails safely on %s dimension lookup errors',
    async (stage) => {
      getImageDimensionsMock.mockReset();
      if (stage === 'result') {
        getImageDimensionsMock.mockResolvedValueOnce(mockDimensions(1000, 750));
      }
      getImageDimensionsMock.mockRejectedValueOnce(new Error('Dimension lookup failed'));
      const onUpdate = await enhanceSlot();
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pushHistory).not.toHaveBeenCalled();
      expect(logAiUsage).not.toHaveBeenCalled();
      expect(useEditorStore.getState().slots[0].imageSrc).toBe(sourcePath);
      expect(useAiEnhanceState.getState().isEnhancing).toBe(false);
      if (stage === 'source') expect(EnhanceImageWithAI).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, NaN, Infinity])(
    'rejects an invalid measured result width (%s)',
    async (width) => {
      getImageDimensionsMock
        .mockReset()
        .mockResolvedValueOnce(mockDimensions(1000, 750))
        .mockResolvedValueOnce(mockDimensions(width, 1500));
      const onUpdate = await enhanceSlot();
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pushHistory).not.toHaveBeenCalled();
    },
  );

  it.each(['replace', 'delete'] as const)(
    'does not commit after target %s during result measurement',
    async (change) => {
      getImageDimensionsMock
        .mockReset()
        .mockResolvedValueOnce(mockDimensions(1000, 750))
        .mockImplementationOnce(async () => {
          if (change === 'delete') useEditorStore.setState({ slots: [] });
          else
            useEditorStore
              .getState()
              .updateSlot('slot-1', { imageSrc: '/local-image/replaced.png' });
          return mockDimensions(2000, 1500);
        });
      const onUpdate = await enhanceSlot();
      expect(onUpdate).not.toHaveBeenCalled();
      expect(pushHistory).not.toHaveBeenCalled();
      expect(logAiUsage).not.toHaveBeenCalled();
    },
  );

  it('keeps image and pan changes reversible with one undo/redo step', async () => {
    setSlot({ dragX: 80, dragY: -20 });
    useEditorStore.setState({ history: [], historyIndex: -1, pushHistory: actualPushHistory });
    useEditorStore.getState().pushHistory();
    await enhanceSlot();
    expect(useEditorStore.getState().history).toHaveLength(2);
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().slots[0]).toMatchObject({
      imageSrc: sourcePath,
      dragX: 80,
      dragY: -20,
    });
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().slots[0]).toMatchObject({
      imageSrc: resultPath,
      dragX: 160,
      dragY: -40,
    });
  });

  it('leaves freeform layout unchanged and skips collage dimension reads', async () => {
    useEditorStore.setState({
      slots: [],
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 0.1,
          y: 0.2,
          width: 0.5,
          height: 0.4,
          rotation: 90,
          opacity: 1,
          zIndex: 1,
          imageSrc: '/local-image/free.png',
        },
      ],
    });
    const onUpdate = vi.fn();
    const hook = renderHook(() => useAiEnhance(onUpdate));
    await act(async () => {
      await hook.result.current.handleEnhance({ id: 'el-1', imageSrc: '/local-image/free.png' });
    });
    expect(GetImageDimensions).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('el-1', {
      imageSrc: resultPath,
      originalImageSrc: '/local-image/free.png',
    });
  });
});

describe('useAiEnhance — reported cost compatibility', () => {
  it.each([
    { fields: { total_cost_usd: 0, cost_usd: 1 }, expected: 0 },
    { fields: { total_cost_usd: 0.25, cost_usd: 1 }, expected: 0.25 },
    { fields: { cost_usd: 0 }, expected: 0 },
    { fields: { total_cost_usd: null, cost_usd: 0.125 }, expected: 0.125 },
    { fields: {}, expected: 0 },
  ])('records $expected without fabricating a missing charge', async ({ fields, expected }) => {
    vi.mocked(EnhanceImageWithAI).mockResolvedValue(
      JSON.stringify({ image: resultImage, ...fields }),
    );
    await enhanceSlot();
    expect(logAiUsage).toHaveBeenCalledWith(expect.objectContaining({ costUsd: expected }));
  });
});
