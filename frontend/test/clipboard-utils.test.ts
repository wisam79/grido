import { CancellablePromise } from '@wailsio/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveImageAspectRatio } from '../src/lib/canvas/image-dimensions';
import { useEditorStore } from '../src/lib/editor-store';
import { pasteFromClipboardOrStore } from '../src/lib/io/clipboard-utils';
import * as AppGo from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../wailsjs/go/main/App')>()),
  GetClipboardText: vi.fn().mockResolvedValue(''),
  SaveImageFromBase64: vi.fn().mockResolvedValue('pasted.png'),
}));
vi.mock('../src/lib/canvas/image-dimensions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/canvas/image-dimensions')>()),
  resolveImageAspectRatio: vi.fn().mockResolvedValue(1),
}));
vi.mock('../src/lib/local-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/local-api')>()),
  isLocalApiAvailable: () => false,
}));

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
function setClipboard(clipboard: object) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new CancellablePromise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  useEditorStore.getState().reset();
  useEditorStore.getState().setMode('single');
  vi.mocked(AppGo.GetClipboardText).mockResolvedValue('');
  vi.mocked(AppGo.SaveImageFromBase64).mockResolvedValue('pasted.png');
  vi.mocked(resolveImageAspectRatio).mockResolvedValue(1);
  vi.clearAllMocks();
});
afterEach(() => {
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

describe('clipboard paste commit ownership', () => {
  it('preserves existing caller behavior when no optional gate is supplied', async () => {
    setClipboard({ readText: vi.fn().mockResolvedValue('Pasted text') });
    expect(await pasteFromClipboardOrStore()).toBe(true);
    expect(useEditorStore.getState().elements[0]).toMatchObject({
      type: 'text',
      text: 'Pasted text',
    });
  });

  it.each(['session', 'readiness'] as const)(
    'rejects a late system text read after %s changes',
    async (change) => {
      const text = deferred<string>();
      let ready = true;
      setClipboard({ readText: () => text.promise });
      const pending = pasteFromClipboardOrStore({ canCommit: () => ready });
      if (change === 'session') useEditorStore.getState().reset();
      else ready = false;
      const before = useEditorStore.getState();
      text.resolve('Stale text');
      expect(await pending).toBe(false);
      expect(useEditorStore.getState().elements).toBe(before.elements);
      expect(useEditorStore.getState().history).toBe(before.history);
      expect(AppGo.GetClipboardText).not.toHaveBeenCalled();
    },
  );

  it('rejects a late Wails fallback before falling through to the internal clipboard', async () => {
    const text = deferred<string>();
    setClipboard({ readText: vi.fn().mockResolvedValue('') });
    vi.mocked(AppGo.GetClipboardText).mockReturnValue(text.promise);
    const pending = pasteFromClipboardOrStore();
    await vi.waitFor(() => expect(AppGo.GetClipboardText).toHaveBeenCalled(), { timeout: 4000 });
    useEditorStore.getState().reset();
    const before = useEditorStore.getState();
    text.resolve('Stale fallback');
    expect(await pending).toBe(false);
    expect(useEditorStore.getState().elements).toBe(before.elements);
    expect(useEditorStore.getState().history).toBe(before.history);
  });

  it('rejects a late image save after document replacement', async () => {
    const saved = deferred<string>();
    vi.mocked(AppGo.SaveImageFromBase64).mockReturnValue(saved.promise);
    setClipboard({
      readText: vi.fn().mockResolvedValue(''),
      read: vi
        .fn()
        .mockResolvedValue([
          { types: ['image/png'], getType: async () => new Blob(['image'], { type: 'image/png' }) },
        ]),
    });
    const pending = pasteFromClipboardOrStore();
    await vi.waitFor(() => expect(AppGo.SaveImageFromBase64).toHaveBeenCalled(), { timeout: 4000 });
    useEditorStore.getState().reset();
    const before = useEditorStore.getState();
    saved.resolve('stale-image.png');
    expect(await pending).toBe(false);
    expect(useEditorStore.getState().elements).toBe(before.elements);
    expect(useEditorStore.getState().history).toBe(before.history);
    expect(resolveImageAspectRatio).not.toHaveBeenCalled();
  });

  it('rechecks readiness after the final image dimension await', async () => {
    const aspect = deferred<number>();
    vi.mocked(resolveImageAspectRatio).mockReturnValue(aspect.promise);
    let ready = true;
    setClipboard({
      readText: vi.fn().mockResolvedValue(''),
      read: vi
        .fn()
        .mockResolvedValue([
          { types: ['image/png'], getType: async () => new Blob(['image'], { type: 'image/png' }) },
        ]),
    });
    const pending = pasteFromClipboardOrStore({ canCommit: () => ready });
    await vi.waitFor(() => expect(resolveImageAspectRatio).toHaveBeenCalled(), { timeout: 4000 });
    ready = false;
    const before = useEditorStore.getState();
    aspect.resolve(1.5);
    expect(await pending).toBe(false);
    expect(useEditorStore.getState().elements).toBe(before.elements);
    expect(useEditorStore.getState().history).toBe(before.history);
  });
});
