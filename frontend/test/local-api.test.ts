import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 🛡️ حارس توكن جلسة مسارات /api المحلية.
 *
 * الخلفية ترفض أي طلب `/api/*` بلا ترويسة `X-Grido-Session` المطابقة لتوكن
 * العملية (فشل مغلق). فحارس الواجهة هو إثبات أن كل طلب يخرج عبر `fetchLocalApi`
 * يحمل التوكن فعلاً — وإلا صارت الميزات المعتمدة على الجسر (عزل الخلفية،
 * استيراد الوسائط بالبث، رفع لقطة الطباعة، حفظ الملفات) تفشل بـ403 بصمت.
 */

const getLocalApiTokenMock = vi.fn<() => Promise<string>>();

vi.mock('@bindings/grido/app', () => ({
  GetLocalApiToken: () => getLocalApiTokenMock(),
}));

describe('local-api client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    getLocalApiTokenMock.mockResolvedValue('token-abc-123');
    fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200 } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches the session token header to /api requests', async () => {
    const { fetchLocalApi } = await import('../src/lib/local-api');

    await fetchLocalApi('/api/apply-mask?src=x&w=1&h=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: 'mask',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe('/api/apply-mask?src=x&w=1&h=1');
    expect(headers.get('X-Grido-Session')).toBe('token-abc-123');
    // الترويسات الأصلية لا تُفقد، والطريقة والجسم يمرّان كما هما
    expect(headers.get('Content-Type')).toBe('application/octet-stream');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('mask');
  });

  it('fetches the token once and reuses it across requests', async () => {
    const { fetchLocalApi } = await import('../src/lib/local-api');

    await fetchLocalApi('/api/upload-media', { method: 'POST', body: 'a' });
    await fetchLocalApi('/api/save-file?filename=x.png', { method: 'POST', body: 'b' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getLocalApiTokenMock).toHaveBeenCalledTimes(1);
    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit;
      expect(new Headers(init.headers).get('X-Grido-Session')).toBe('token-abc-123');
    }
  });

  it('sends an empty token instead of throwing when the binding fails (fail-closed)', async () => {
    getLocalApiTokenMock.mockRejectedValue(new Error('bridge unavailable'));
    const { fetchLocalApi } = await import('../src/lib/local-api');

    await fetchLocalApi('/api/upload-print-image', { method: 'POST', body: 'blob' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    // الترويسة تُرسل فارغة فترفضها الخلفية بـ403 — لا نمرّر طلباً بلا ترويسة
    // ولا نكسر تدفق المستدعي باستثناء غير متوقع.
    expect(new Headers(init.headers).get('X-Grido-Session')).toBe('');
  });

  it('resetLocalApiTokenCache forces a fresh token on the next request', async () => {
    const { fetchLocalApi, resetLocalApiTokenCache } = await import('../src/lib/local-api');

    await fetchLocalApi('/api/upload-media', { method: 'POST' });
    resetLocalApiTokenCache();
    await fetchLocalApi('/api/upload-media', { method: 'POST' });

    expect(getLocalApiTokenMock).toHaveBeenCalledTimes(2);
  });
});
