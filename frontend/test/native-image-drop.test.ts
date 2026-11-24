import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppBootstrap } from '../src/hooks/use-app-bootstrap';
import {
  dispatchNativeImageDrop,
  registerNativeImageDropHandler,
  type NativeImageDropPayload,
} from '../src/lib/canvas/native-image-drop';

const mocks = vi.hoisted(() => {
  const state = {
    mode: 'single',
    canvasWidth: 1000,
    canvasHeight: 800,
    selectedId: null as string | null,
    slots: [] as { id: string; imageSrc?: string }[],
    checkLicenseStatus: vi.fn(async () => ({ token: 'test-token' })),
    setAccountModalOpen: vi.fn(),
    hydrateAiUsageLogs: vi.fn(),
    addImageElement: vi.fn(),
    addImageElementsBatch: vi.fn(),
    setSlotImagesBatch: vi.fn(),
    appendPendingCollageImages: vi.fn(),
  };
  return {
    state,
    session: 0,
    subscribers: new Set<() => void>(),
    events: new Map<string, (payload: NativeImageDropPayload) => Promise<void>>(),
    loadImageAspect: vi.fn(async (_src: string) => 1.5),
    resolveBatchImageAspectRatios: vi.fn(async (_images: string[]) => new Map<string, number>()),
    buildCollageInsertPlan: vi.fn(),
    ensureSlotCompatibleSources: vi.fn(async (srcs: readonly string[]) => [...srcs]),
    loggerError: vi.fn(),
    toastError: vi.fn(),
  };
});

vi.mock('@/lib/editor-store', () => ({
  useEditorStore: Object.assign(
    (selector: (state: typeof mocks.state) => unknown) => selector(mocks.state),
    {
      getState: () => mocks.state,
      subscribe: (listener: () => void) => {
        mocks.subscribers.add(listener);
        return () => mocks.subscribers.delete(listener);
      },
    },
  ),
}));
vi.mock('@/lib/io/document-session', () => ({ getDocumentSession: () => mocks.session }));
vi.mock('@/hooks/use-autosave', () => ({ clearAutoSave: vi.fn() }));
vi.mock('@/lib/canvas/load-image', () => ({
  addImageFromSrc: vi.fn(),
  loadImageAspect: mocks.loadImageAspect,
}));
vi.mock('@/lib/canvas/image-dimensions', () => ({
  resolveBatchImageAspectRatios: mocks.resolveBatchImageAspectRatios,
}));
vi.mock('@/lib/canvas/collage-insert', () => ({
  buildCollageInsertPlan: mocks.buildCollageInsertPlan,
}));
vi.mock('@/lib/io/svg-slot-compat', () => ({
  ensureSlotCompatibleSources: mocks.ensureSlotCompatibleSources,
}));
vi.mock('@/lib/store/slices/license-slice', () => ({
  isLicenseCheckInvalidatedError: () => false,
  isSessionSupersededError: () => false,
  sessionSupersededMessage: () => 'session superseded',
}));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: mocks.loggerError, warn: vi.fn() }),
}));
vi.mock('sonner', () => ({
  toast: { error: mocks.toastError, success: vi.fn(), info: vi.fn() },
}));
vi.mock('@bindings/grido/app', () => ({
  GetStartupFile: vi.fn(async () => ''),
  ProcessLocalImageFile: vi.fn(),
  CheckPendingCrashReport: vi.fn(async () => null),
  DismissCrashReport: vi.fn(),
}));
vi.mock('../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn((name: string, listener: (payload: NativeImageDropPayload) => Promise<void>) => {
    mocks.events.set(name, listener);
    return () => {
      if (mocks.events.get(name) === listener) mocks.events.delete(name);
    };
  }),
}));

const cleanups: (() => void)[] = [];
function registerOwner(handler: (payload: NativeImageDropPayload) => boolean) {
  const cleanup = registerNativeImageDropHandler(handler);
  cleanups.push(cleanup);
  return cleanup;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

async function mountBootstrap() {
  const hook = renderHook(() => useAppBootstrap());
  await act(async () => {});
  const receive = mocks.events.get('native-file-drop');
  if (!receive) throw new Error('native-file-drop listener was not registered');
  return { ...hook, receive };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = 0;
  mocks.events.clear();
  mocks.subscribers.clear();
  Object.assign(mocks.state, {
    mode: 'single',
    canvasWidth: 1000,
    canvasHeight: 800,
    selectedId: null,
    slots: [],
  });
  mocks.loadImageAspect.mockReset().mockResolvedValue(1.5);
  mocks.resolveBatchImageAspectRatios.mockReset().mockResolvedValue(new Map());
  mocks.state.setSlotImagesBatch.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

describe('native image drop ownership bridge', () => {
  it('consumes start and complete without a canvas owner, including empty completion', () => {
    expect(dispatchNativeImageDrop({ phase: 'start', dropId: 'drop-1', x: 0, y: 40 })).toBe(true);
    expect(dispatchNativeImageDrop({ phase: 'complete', dropId: 'drop-1', images: [] })).toBe(true);
    expect(
      dispatchNativeImageDrop({ phase: 'complete', dropId: 'late-drop', images: ['photo'] }),
    ).toBe(true);
  });

  it('retains the legacy fallback only when no owner handles images', () => {
    const legacy = { images: ['photo'], x: 12, y: 34 };
    expect(dispatchNativeImageDrop(legacy)).toBe(false);
    registerOwner(() => true);
    expect(dispatchNativeImageDrop(legacy)).toBe(true);
    registerOwner(() => false);
    expect(dispatchNativeImageDrop(legacy)).toBe(false);
  });

  it('delegates both phases unchanged, but never falls back if the owner declines', () => {
    const handler = vi.fn(() => false);
    registerOwner(handler);
    const start = { phase: 'start', dropId: 'drop-2', x: 0, y: 0 } as const;
    const complete: NativeImageDropPayload = {
      phase: 'complete',
      dropId: 'drop-2',
      images: ['photo'],
    };
    expect(dispatchNativeImageDrop(start)).toBe(true);
    expect(dispatchNativeImageDrop(complete)).toBe(true);
    expect(handler.mock.calls).toEqual([[start], [complete]]);
  });

  it('keeps a newer owner when old cleanup runs, even for the same handler function', () => {
    const handler = vi.fn(() => true);
    const removeOld = registerOwner(handler);
    const removeNew = registerOwner(handler);
    removeOld();
    expect(dispatchNativeImageDrop({ images: ['photo'] })).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    removeNew();
    removeOld();
    expect(dispatchNativeImageDrop({ images: ['photo'] })).toBe(false);
  });

  it('uses only the latest owner and does not revive the previous one on cleanup', () => {
    const old = vi.fn(() => true);
    const current = vi.fn(() => true);
    registerOwner(old);
    const removeCurrent = registerOwner(current);
    dispatchNativeImageDrop({ images: ['photo'] });
    expect(old).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
    removeCurrent();
    expect(dispatchNativeImageDrop({ images: ['photo'] })).toBe(false);
  });

  it('propagates owner errors for the runtime listener to log instead of silently falling back', () => {
    const error = new Error('owner failed');
    registerOwner(() => {
      throw error;
    });
    expect(() => dispatchNativeImageDrop({ images: ['photo'] })).toThrow(error);
    expect(() => dispatchNativeImageDrop({ phase: 'start', dropId: 'drop-3' })).toThrow(error);
  });
});

describe('bootstrap native image drop routing and legacy freshness', () => {
  it('never imports phased messages without a canvas, or messages consumed by a canvas', async () => {
    const hook = await mountBootstrap();
    await act(async () => {
      await hook.receive({ phase: 'start', dropId: 'request' });
      await hook.receive({ phase: 'complete', dropId: 'request', images: ['photo'] });
      registerOwner(() => true);
      await hook.receive({ images: ['legacy-photo'] });
    });
    expect(mocks.loadImageAspect).not.toHaveBeenCalled();
    expect(mocks.resolveBatchImageAspectRatios).not.toHaveBeenCalled();
    expect(mocks.state.addImageElement).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('logs a handler error without attempting a legacy import', async () => {
    const error = new Error('canvas handler failed');
    registerOwner(() => {
      throw error;
    });
    const hook = await mountBootstrap();
    await act(async () => {
      await hook.receive({ images: ['photo'] });
    });
    expect(mocks.loggerError).toHaveBeenCalledWith('Failed to process native file drop:', error);
    expect(mocks.loadImageAspect).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('imports legacy single and batch images with their measured aspect ratios', async () => {
    const hook = await mountBootstrap();
    mocks.resolveBatchImageAspectRatios.mockResolvedValue(new Map([['wide', 2]]));
    await act(async () => {
      await hook.receive({ images: ['photo'] });
      await hook.receive({ images: ['wide', 'unknown'] });
    });
    expect(mocks.state.addImageElement).toHaveBeenCalledWith('photo', 1.5);
    expect(mocks.state.addImageElementsBatch).toHaveBeenCalledWith([
      { src: 'wide', aspectRatio: 2 },
      { src: 'unknown', aspectRatio: 1 },
    ]);
    expect(mocks.subscribers.size).toBe(0);
    hook.unmount();
  });

  it.each(['unmount', 'session', 'mode', 'width', 'height', 'mode-roundtrip'])(
    'does not commit a legacy single image after %s invalidation during measurement',
    async (change) => {
      const measurement = deferred<number>();
      mocks.loadImageAspect.mockReturnValueOnce(measurement.promise);
      const hook = await mountBootstrap();
      const pending = hook.receive({ images: ['photo'] });
      if (change === 'unmount') hook.unmount();
      else if (change === 'session') mocks.session += 1;
      else if (change === 'width') mocks.state.canvasWidth += 1;
      else if (change === 'height') mocks.state.canvasHeight += 1;
      else mocks.state.mode = 'collage';
      for (const notify of mocks.subscribers) notify();
      if (change === 'mode-roundtrip') mocks.state.mode = 'single';
      await act(async () => {
        measurement.resolve(2);
        await pending;
      });
      expect(mocks.state.addImageElement).not.toHaveBeenCalled();
      expect(mocks.subscribers.size).toBe(0);
      hook.unmount();
    },
  );

  it('does not commit a legacy batch after switching documents during measurement', async () => {
    const measurement = deferred<Map<string, number>>();
    mocks.resolveBatchImageAspectRatios.mockReturnValueOnce(measurement.promise);
    const hook = await mountBootstrap();
    const pending = hook.receive({ images: ['first', 'second'] });
    mocks.session += 1;
    await act(async () => {
      measurement.resolve(new Map());
      await pending;
    });
    expect(mocks.state.addImageElementsBatch).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('preserves selected-slot collage planning and passes overflow with the live transaction guard', async () => {
    mocks.state.mode = 'collage';
    mocks.state.selectedId = 'selected-slot';
    mocks.state.slots = [{ id: 'selected-slot', imageSrc: 'old-photo' }];
    const assignments = [{ slotId: 'selected-slot', src: 'new-photo' }];
    const remaining = ['overflow-photo'];
    mocks.buildCollageInsertPlan.mockReturnValue({ assignments, remaining });
    const transaction = deferred<void>();
    mocks.state.setSlotImagesBatch.mockReturnValueOnce(transaction.promise);
    const hook = await mountBootstrap();
    const images = ['new-photo', 'overflow-photo'];
    const pending = hook.receive({ images });
    // Let ensureSlotCompatibleSources resolve before asserting synchronous calls.
    await act(async () => {});
    expect(mocks.buildCollageInsertPlan).toHaveBeenCalledWith(mocks.state.slots, images, {
      targetSlotId: 'selected-slot',
      scope: 'target',
    });
    expect(mocks.state.setSlotImagesBatch).toHaveBeenCalledWith(
      assignments,
      'new-photo',
      remaining,
      expect.any(Function),
      true,
    );
    const guard = mocks.state.setSlotImagesBatch.mock.calls[0][3] as () => boolean;
    expect(guard()).toBe(true);
    mocks.state.canvasHeight += 1;
    expect(guard()).toBe(false);
    await act(async () => {
      transaction.resolve();
      await pending;
    });
    expect(mocks.state.appendPendingCollageImages).not.toHaveBeenCalled();
    expect(mocks.subscribers.size).toBe(0);
    hook.unmount();
  });
});
