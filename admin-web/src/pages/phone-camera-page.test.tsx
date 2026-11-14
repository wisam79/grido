// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

interface StorageResult { error: { message: string } | null }
const ok: StorageResult = { error: null };
const failed: StorageResult = { error: { message: 'offline (mock)' } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function cameraStream(torch = true) {
  const track = {
    stop: vi.fn(), getCapabilities: vi.fn(() => ({ torch })),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  return { stream, track };
}
function mockClient() {
  const channels: Array<{
    topic: string;
    send: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    subscribe: (status: string) => Promise<void>;
    desktopAck: (device: string) => void;
  }> = [];
  const photoUpload = vi.fn<(_path: string, _blob: Blob, _options: unknown) => Promise<StorageResult>>().mockResolvedValue(ok);
  const handshakeUpload = vi.fn().mockResolvedValue(ok);
  const upload = vi.fn((path: string, blob: Blob, options: unknown) =>
    path.endsWith('.handshake.json') ? handshakeUpload(path, blob, options) : photoUpload(path, blob, options));
  const from = vi.fn(() => ({ upload }));
  const channel = vi.fn((topic: string) => {
    let subscriber: (status: string) => Promise<void> = async () => {};
    let ack: (message: { payload: { device: string } }) => void = () => {};
    const entry = {
      topic, send: vi.fn().mockResolvedValue('ok'), unsubscribe: vi.fn().mockResolvedValue('ok'),
      subscribe: (status: string) => subscriber(status),
      desktopAck: (device: string) => ack({ payload: { device } }),
    };
    channels.push(entry);
    const result = {
      send: entry.send, unsubscribe: entry.unsubscribe,
      on: vi.fn((_kind: string, _filter: unknown, handler: typeof ack) => { ack = handler; return result; }),
      subscribe: vi.fn((handler: typeof subscriber) => { subscriber = handler; return result; }),
    };
    return result;
  });
  return { client: { storage: { from }, channel }, channels, photoUpload, handshakeUpload, from };
}

let root: Root | null;
let container: HTMLDivElement;
let client: ReturnType<typeof mockClient>;
let getUserMedia: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;
let createBitmap: ReturnType<typeof vi.fn>;
let objectUrl: ReturnType<typeof vi.fn<(_blob: Blob | MediaSource) => string>>;
let revokeUrl: ReturnType<typeof vi.fn<(_url: string) => void>>;
async function mount(session = 'studio/room-a') {
  window.history.replaceState(null, '', session ? `/#session=${session}` : '/');
  const { default: PhoneCameraPage } = await import('./PhoneCameraPage');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<PhoneCameraPage />); });
}
function button(label: string): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')].find((node) =>
    node.getAttribute('aria-label') === label || node.textContent === label);
  expect(result, `button ${label}`).toBeDefined();
  return result!;
}
function retryButton(): HTMLButtonElement {
  const result = [...container.querySelectorAll('button')].find((node) => /إعادة رفع|جارٍ إعادة رفع/.test(node.textContent || ''));
  expect(result).toBeDefined();
  return result!;
}
function input(label = 'ملفات الصور'): HTMLInputElement {
  return container.querySelector(`input[aria-label="${label}"]`)!;
}
async function click(node: HTMLElement) { await act(async () => { node.click(); }); }
async function select(files: File[], node = input()) {
  Object.defineProperty(node, 'files', { configurable: true, value: files });
  // Simulates the picker result, including a synthetic event on a disabled input.
  await act(async () => { node.dispatchEvent(new Event('change', { bubbles: true })); });
}
function changeSession(session: string) {
  window.history.replaceState(null, '', `/#session=${session}`);
  window.dispatchEvent(new Event('hashchange'));
}
async function settle<T>(pending: ReturnType<typeof deferred<T>>, value: T) {
  await act(async () => { pending.resolve(value); await pending.promise; });
}
const text = () => container.textContent || '';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://unused.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-publishable-key');
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  fetchMock = vi.fn(() => { throw new Error('Real network is forbidden in this test'); });
  vi.stubGlobal('fetch', fetchMock);
  createBitmap = vi.fn(() => { throw new Error('Original picker images must not be decoded/reencoded'); });
  vi.stubGlobal('createImageBitmap', createBitmap);
  objectUrl = vi.fn(() => `blob:mock-${objectUrl.mock.calls.length}`);
  revokeUrl = vi.fn();
  vi.spyOn(URL, 'createObjectURL').mockImplementation(objectUrl);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeUrl);
  getUserMedia = vi.fn().mockRejectedValue(new Error('permission denied (mock)'));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  client = mockClient();
  sdk.createClient.mockReturnValue(client.client);
  root = null;
});
afterEach(() => {
  if (root) act(() => { root!.unmount(); });
  container?.remove();
  expect(fetchMock).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('actual PhoneCameraPage utility and async ownership (no network)', () => {
  it('keeps the missing-build-config gate without initializing camera or storage', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await mount();
    expect(text()).toContain('إعداد ناقص لصفحة الكاميرا');
    expect(sdk.createClient).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('shows denied-camera retry and file choice using the real handlers; attaches the resolved stream', async () => {
    await mount();
    expect(text()).toContain('المعاينة غير متاحة');
    const pending = deferred<MediaStream>();
    const camera = cameraStream();
    getUserMedia.mockReturnValueOnce(pending.promise);
    const pickerClick = vi.spyOn(input(), 'click');
    await click(button('اختيار ملف صورة'));
    expect(pickerClick).toHaveBeenCalledOnce();
    await click(button('إعادة محاولة الكاميرا'));
    expect(button('إعادة محاولة الكاميرا').disabled).toBe(true);
    expect(text()).toContain('جارٍ طلب إذن الكاميرا');
    await settle(pending, camera.stream);
    expect(container.querySelector('video')?.srcObject).toBe(camera.stream);
    expect(container.querySelector('video')?.playsInline).toBe(true);
    expect(getUserMedia).toHaveBeenLastCalledWith({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } }, audio: false,
    });
    await click(button('تكبير 2x'));
    expect(button('تكبير 2x').getAttribute('aria-pressed')).toBe('true');
    await click(button('الفلاش'));
    expect(button('الفلاش').getAttribute('aria-pressed')).toBe('true');
    await click(button('صوت الغالق'));
    expect(button('صوت الغالق').getAttribute('aria-pressed')).toBe('false');
    for (const node of container.querySelectorAll('button')) {
      expect(node.classList.contains('coarse-touch-target')).toBe(true);
      expect(node.title).toBe('');
      expect(node.getAttribute('aria-label') || node.textContent?.trim()).toBeTruthy();
      expect(node.className).not.toMatch(/scale-/);
    }
    const shell = container.firstElementChild as HTMLElement;
    expect(shell.style.paddingTop).toBe('max(8px, env(safe-area-inset-top, 0px))');
    expect(shell.style.paddingBottom).toBe('max(12px, env(safe-area-inset-bottom, 0px))');
    expect(shell.classList.contains('overflow-y-auto')).toBe(true);
    expect(container.querySelector('footer')?.classList.contains('max-w-md')).toBe(true);
    act(() => { root!.unmount(); }); root = null;
    expect(camera.track.stop).toHaveBeenCalledOnce();
  });

  it('supports file input and native-camera fallback when getUserMedia is unsupported', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    await mount();
    expect(text()).toContain('المعاينة غير متاحة');
    expect(button('إعادة محاولة الكاميرا').disabled).toBe(false);
    await click(button('إعادة محاولة الكاميرا'));
    const native = input('صور كاميرا النظام');
    const nativeClick = vi.spyOn(native, 'click');
    await click(button('كاميرا النظام'));
    await click(button('التقاط صورة'));
    expect(nativeClick).toHaveBeenCalledTimes(2);
    const original = new File(['original png bytes'], 'portrait.png', { type: 'image/png' });
    await select([original]);
    expect(client.photoUpload.mock.calls[0][1]).toBe(original);
    expect(createBitmap).not.toHaveBeenCalled();
    expect(text()).toContain('تم رفع الصورة إلى التخزين');
    expect(text()).not.toContain('ورد تأكيد سطح المكتب');
  });

  it('rejects simulated picker events without a session but does not block for missing desktop ack', async () => {
    await mount('');
    expect(text()).toContain('الجلسة مفقودة');
    for (const label of ['اختيار ملف صورة', 'كاميرا النظام', 'اختيار من الصور', 'التقاط صورة']) {
      expect(button(label).disabled).toBe(true);
    }
    expect(input().disabled).toBe(true);
    await select([new File(['ignored'], 'ignored.jpg', { type: 'image/jpeg' })]);
    expect(client.photoUpload).not.toHaveBeenCalled();
    await act(async () => { changeSession('studio/room-a'); });
    expect(button('التقاط صورة').disabled).toBe(false);
    expect(input().disabled).toBe(false);
    await select([new File(['allowed'], 'allowed.jpg', { type: 'image/jpeg' })]);
    expect(client.photoUpload).toHaveBeenCalledOnce();
  });

  it('server ack and handshake are not desktop liveness; optional desktop ack stays qualified', async () => {
    await mount();
    expect(client.handshakeUpload).toHaveBeenCalledOnce();
    expect(text()).not.toContain('ورد تأكيد سطح المكتب');
    await act(async () => { await client.channels[0].subscribe('SUBSCRIBED'); });
    expect(text()).toContain('قناة الإرسال جاهزة');
    expect(text()).not.toContain('ورد تأكيد سطح المكتب');
    expect(button('التقاط صورة').disabled).toBe(false);
    act(() => { client.channels[0].desktopAck('Legacy Desktop'); });
    expect(text()).toContain('ورد تأكيد سطح المكتب');
    expect(text()).toContain('لا يثبت استمرار اتصال سطح المكتب');
    act(() => { void client.channels[0].subscribe('CLOSED'); });
    expect(text()).toContain('القناة منقطعة');
    expect(text()).not.toContain('ورد تأكيد سطح المكتب');
    await select([new File(['still allowed'], 'offline.jpg', { type: 'image/jpeg' })]);
    expect(client.photoUpload).toHaveBeenCalledOnce();
    expect(sdk.createClient).toHaveBeenCalledWith('https://unused.example.test', 'test-publishable-key', {
      auth: { persistSession: false },
    });
  });

  it('keeps original images and paths for retry; retries only failures once despite repeated clicks', async () => {
    await mount();
    const a = deferred<StorageResult>();
    const b = deferred<StorageResult>();
    client.photoUpload.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const originalA = new File(['original jpeg'], 'good.jpg', { type: 'image/jpeg' });
    const originalB = new File(['original png'], 'retry.png', { type: 'image/png' });
    await select([originalA, originalB]);
    expect(text()).toContain('جارٍ رفع 2 إلى التخزين');
    expect(button('التقاط صورة').disabled).toBe(false);
    await settle(a, ok);
    expect(text()).toContain('جارٍ رفع 1 إلى التخزين');
    await settle(b, failed);
    expect(text()).not.toContain('جارٍ رفع');
    expect(text()).toContain('احتُفظ بها لإعادة المحاولة');
    const retry = deferred<StorageResult>();
    client.photoUpload.mockReturnValueOnce(retry.promise);
    await act(async () => { retryButton().click(); retryButton().click(); });
    expect(client.photoUpload).toHaveBeenCalledTimes(3);
    expect(retryButton().disabled).toBe(true);
    expect(client.photoUpload.mock.calls[2][0]).toBe(client.photoUpload.mock.calls[1][0]);
    expect(client.photoUpload.mock.calls[2][1]).toBe(originalB);
    expect(client.photoUpload.mock.calls[2][2]).toEqual({ contentType: 'image/png', cacheControl: 'no-cache', upsert: false });
    expect(createBitmap).not.toHaveBeenCalled();
    await settle(retry, ok);
    expect(text()).not.toContain('إعادة رفع');
    expect(container.querySelector('[aria-label="رُفعت 2 صور إلى التخزين"]')).not.toBeNull();
    const ready = client.channels[0].send.mock.calls.filter(([event]) => event.event === 'photo-ready');
    expect(ready).toHaveLength(2);
    expect(ready[0][0].payload.path).not.toBe(ready[1][0].payload.path);
    expect(revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('repeated failed retries retain one original and never report success', async () => {
    await mount();
    client.photoUpload.mockResolvedValue(failed);
    const original = new File(['keep original'], 'retry.jpg', { type: 'image/jpeg' });
    await select([original]);
    await click(retryButton());
    await click(retryButton());
    expect(client.photoUpload).toHaveBeenCalledTimes(3);
    expect(retryButton().textContent).toBe('إعادة رفع الصور المتعذرة (1)');
    expect(retryButton().disabled).toBe(false);
    expect(text()).not.toContain('تم رفع الصورة');
    expect(client.channels[0].send).not.toHaveBeenCalled();
    for (const call of client.photoUpload.mock.calls) {
      expect(call[1]).toBe(original);
      expect(call[0]).toBe(client.photoUpload.mock.calls[0][0]);
    }
  });

  it('does not requeue confirmed storage success if photo-ready notification fails', async () => {
    await mount();
    client.channels[0].send.mockRejectedValueOnce(new Error('broadcast offline (mock)'));
    await select([new File(['confirmed'], 'confirmed.jpg', { type: 'image/jpeg' })]);
    expect(text()).toContain('تم رفع الصورة إلى التخزين');
    expect(text()).not.toContain('إعادة رفع');
    expect(container.querySelector('[aria-label="رُفعت 1 صور إلى التخزين"]')).not.toBeNull();
  });

  it('optional haptic failure does not requeue confirmed storage success', async () => {
    const vibrate = vi.fn(() => { throw new Error('haptics unsupported (mock)'); });
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    try {
      await mount();
      await select([new File(['confirmed'], 'confirmed.jpg', { type: 'image/jpeg' })]);
      expect(vibrate).toHaveBeenCalledOnce();
      expect(text()).toContain('تم رفع الصورة إلى التخزين');
      expect(text()).not.toContain('إعادة رفع');
      expect(container.querySelector('[aria-label="رُفعت 1 صور إلى التخزين"]')).not.toBeNull();
    } finally {
      Reflect.deleteProperty(navigator, 'vibrate');
    }
  });

  it.each(['resolve', 'reject'] as const)('old upload %s cannot commit or clear a new session upload', async (outcome) => {
    await mount();
    const old = deferred<StorageResult>();
    const current = deferred<StorageResult>();
    client.photoUpload.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await select([new File(['old'], 'old.jpg', { type: 'image/jpeg' })]);
    await act(async () => { changeSession('studio/room-b'); });
    await select([new File(['new'], 'new.jpg', { type: 'image/jpeg' })]);
    await act(async () => {
      if (outcome === 'resolve') old.resolve(ok); else old.reject(new Error('old error (mock)'));
      await old.promise.catch(() => {});
    });
    expect(text()).toContain('جارٍ رفع 1 إلى التخزين');
    expect(text()).not.toContain('تم رفع الصورة');
    expect(text()).not.toContain('تعذر رفع الصورة');
    expect(text()).not.toContain('إعادة رفع');
    expect(client.channels[0].send).not.toHaveBeenCalled();
    expect(client.channels[1].send).not.toHaveBeenCalled();
    await settle(current, ok);
    expect(text()).not.toContain('جارٍ رفع');
    expect(container.querySelector('[aria-label="رُفعت 1 صور إلى التخزين"]')).not.toBeNull();
    expect(client.channels[1].send).toHaveBeenCalledOnce();
  });

  it('revokes an old retry loop synchronously, including A → B → A; never sends its remaining files', async () => {
    await mount();
    client.photoUpload.mockResolvedValue(failed);
    await select([
      new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'second.jpg', { type: 'image/jpeg' }),
    ]);
    const retry = deferred<StorageResult>();
    client.photoUpload.mockReturnValueOnce(retry.promise);
    await click(retryButton());
    expect(client.photoUpload).toHaveBeenCalledTimes(3);
    await act(async () => {
      changeSession('studio/room-b');
      changeSession('studio/room-a');
      retry.resolve(ok);
      await retry.promise;
    });
    expect(client.photoUpload).toHaveBeenCalledTimes(3);
    expect(client.channels).toHaveLength(2);
    expect(client.channels[0].unsubscribe).toHaveBeenCalledOnce();
    expect(text()).not.toContain('تم رفع الصورة');
    expect(text()).not.toContain('إعادة رفع');
    expect(text()).not.toContain('جارٍ رفع');
    expect(client.channels[0].send).not.toHaveBeenCalled();
  });

  it('late storage, handshake, channel ack, and camera permission cannot act after unmount', async () => {
    const permission = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(permission.promise);
    const handshake = deferred<StorageResult>();
    client.handshakeUpload.mockReturnValueOnce(handshake.promise);
    await mount();
    const send = deferred<string>();
    client.channels[0].send.mockReturnValueOnce(send.promise);
    let subscribed!: Promise<void>;
    await act(async () => { subscribed = client.channels[0].subscribe('SUBSCRIBED'); });
    const upload = deferred<StorageResult>();
    client.photoUpload.mockReturnValueOnce(upload.promise);
    await select([new File(['old'], 'old.jpg', { type: 'image/jpeg' })]);
    act(() => { root!.unmount(); }); root = null;
    const stream = cameraStream();
    await act(async () => {
      upload.resolve(ok); handshake.resolve(failed); send.resolve('ok'); permission.resolve(stream.stream);
      await subscribed; await permission.promise; await upload.promise; await handshake.promise;
    });
    expect(stream.track.stop).toHaveBeenCalledOnce();
    expect(client.channels[0].send).toHaveBeenCalledOnce();
    expect(client.channels[0].unsubscribe).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledOnce();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('a newer camera request owns preview; a superseded permission stream is stopped', async () => {
    const first = deferred<MediaStream>();
    const second = deferred<MediaStream>();
    getUserMedia.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await mount();
    expect(button('إعادة محاولة الكاميرا').disabled).toBe(true);
    await click(button('تبديل الكاميرا'));
    const newCamera = cameraStream();
    await settle(second, newCamera.stream);
    const oldCamera = cameraStream();
    await settle(first, oldCamera.stream);
    expect(oldCamera.track.stop).toHaveBeenCalledOnce();
    expect(newCamera.track.stop).not.toHaveBeenCalled();
    expect(container.querySelector('video')?.srcObject).toBe(newCamera.stream);
    expect(getUserMedia.mock.calls[1][0].video.facingMode).toEqual({ ideal: 'user' });
  });

  it('a delayed shutter encoding callback cannot upload into a replacement session', async () => {
    const camera = cameraStream();
    getUserMedia.mockResolvedValueOnce(camera.stream);
    await mount();
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1920 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 1080 });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    let encoded!: BlobCallback;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => { encoded = callback; });
    await click(button('صوت الغالق'));
    await click(button('التقاط صورة'));
    expect(drawImage).toHaveBeenCalledOnce();
    await act(async () => {
      changeSession('studio/room-b');
      encoded(new Blob(['old shutter'], { type: 'image/jpeg' }));
    });
    expect(client.photoUpload).not.toHaveBeenCalled();
    expect(objectUrl).not.toHaveBeenCalled();
  });
});
