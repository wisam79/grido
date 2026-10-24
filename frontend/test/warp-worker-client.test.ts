import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { extractLocalImagePath } from '../src/components/editor/document-scanner/core/warp-client';
import {
  WarpCancelledError,
  WarpWorkerClient,
  supportsWorkerWarp,
} from '../src/components/editor/document-scanner/core/warp-worker-client';

import type { Point } from '../src/components/editor/document-scanner/core/types';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: any[] = [];
  terminated = false;

  constructor(
    public url: string | URL,
    public options?: WorkerOptions,
  ) {
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  respond(message: unknown) {
    this.onmessage?.({ data: message } as MessageEvent);
  }
}

const corners: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

function makeJob() {
  return {
    source: new Blob(['image-bytes'], { type: 'image/png' }),
    corners,
    targetW: 50,
    targetH: 50,
    filterMode: 'original' as const,
    rotation: 0,
  };
}

describe('warp-worker-client', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a warp request and resolves with the returned blob', async () => {
    const client = new WarpWorkerClient();
    const promise = client.warp(makeJob());

    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    expect(worker.posted[0].type).toBe('warp');
    expect(worker.posted[0].targetW).toBe(50);

    const blob = new Blob(['warped'], { type: 'image/png' });
    worker.respond({ type: 'success', requestId: worker.posted[0].requestId, blob });

    const result = await promise;
    expect(result).toBe(blob);
  });

  it('rejects with the worker error message', async () => {
    const client = new WarpWorkerClient();
    const promise = client.warp(makeJob());
    const worker = FakeWorker.instances[0];

    worker.respond({ type: 'error', requestId: worker.posted[0].requestId, error: 'boom' });

    await expect(promise).rejects.toThrow('boom');
  });

  it('cancels pending requests and terminates the worker', async () => {
    const client = new WarpWorkerClient();
    const promise = client.warp(makeJob());
    const worker = FakeWorker.instances[0];

    client.cancel();

    expect(worker.terminated).toBe(true);
    await expect(promise).rejects.toBeInstanceOf(WarpCancelledError);
  });

  it('rejects new requests after dispose', async () => {
    const client = new WarpWorkerClient();
    client.dispose();
    await expect(client.warp(makeJob())).rejects.toBeInstanceOf(WarpCancelledError);
  });

  it('detects worker support from the environment', () => {
    // jsdom لا يوفّر OffscreenCanvas ولا createImageBitmap.
    expect(supportsWorkerWarp()).toBe(false);
  });

  it('extracts clean /local-image/ path from relative and absolute DOM URLs', () => {
    expect(extractLocalImagePath('/local-image/abc.png')).toBe('/local-image/abc.png');
    expect(extractLocalImagePath('/local-image/abc.png?t=123')).toBe('/local-image/abc.png');
    expect(extractLocalImagePath('http://localhost:5173/local-image/abc.png')).toBe(
      '/local-image/abc.png',
    );
    expect(extractLocalImagePath('http://wails.localhost:9245/local-image/abc.png?v=1')).toBe(
      '/local-image/abc.png',
    );
    expect(extractLocalImagePath('blob:http://localhost:5173/1234')).toBeNull();
    expect(extractLocalImagePath('')).toBeNull();
  });
});
