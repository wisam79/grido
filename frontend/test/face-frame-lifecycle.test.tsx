import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 🎭 عامل وهمي — يسجّل الرسائل المرسلة والإنهاء، بنمط mock العامل المتبع في اختبارات الحزمة
class MockWorker {
  static instances: MockWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: { message?: string }) => void) | null = null;
  messages: any[] = [];
  postMessage = vi.fn((msg: any) => {
    this.messages.push(msg);
  });
  terminate = vi.fn(() => {});
  constructor(
    public url: any,
    public options?: any,
  ) {
    MockWorker.instances.push(this);
  }
  emit(msg: any) {
    this.onmessage?.({ data: msg } as MessageEvent);
  }
}

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@bindings/grido/app', () => ({
  SaveImageFromBase64: vi.fn().mockResolvedValue('/local-image/framed.png'),
}));

vi.mock('@/hooks/use-async-image', () => ({
  useAsyncImage: vi.fn(),
  invalidateImageCache: vi.fn(),
  preloadImageIntoCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/memory-trim', () => ({ triggerMemoryTrim: vi.fn() }));

const imageElement = {
  id: 'img-1',
  type: 'image' as const,
  imageSrc: '/local-image/test.png',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
};

type HookModule = typeof import('../src/hooks/use-face-frame');
type StoreModule = typeof import('../src/lib/ui/operation-status');
type FaceFrameApi = ReturnType<HookModule['useFaceFrame']>;

// نسخة خطاف تركّب مكوّناً بلا واجهة وتُعرّض واجهتها للاختبار
function makeConsumer(hook: HookModule, onUpdate: (id: string, patch: any) => void) {
  const api = { current: null as unknown as FaceFrameApi };
  function Consumer() {
    api.current = hook.useFaceFrame(onUpdate);
    return null;
  }
  return { api, Consumer };
}

function frameRequestOf(worker: MockWorker) {
  return worker.messages.find((m) => m.type === 'frame');
}

const resultMessage = (requestId: number) => ({
  type: 'result' as const,
  requestId,
  result: { pngBase64: 'QUJD', outW: 600, outH: 800, detectedMs: 10 },
});

describe('useFaceFrame — دورة حياة العامل المشترك بين نسختين (شريط سريع + لوحة خصائص)', () => {
  let hookModule: HookModule;
  let storeModule: StoreModule;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    MockWorker.instances = [];
    (globalThis as any).Worker = MockWorker;

    hookModule = await import('../src/hooks/use-face-frame');
    storeModule = await import('../src/lib/ui/operation-status');
    const { useEditorStore } = await import('../src/lib/editor-store');
    useEditorStore.setState({ canvasWidth: 1200, canvasHeight: 1600 });
  });

  it('سيناريو 1: فك نسخة غير مالكة أثناء عمل جارٍ لا يقتل الطلب المعلّق ولا يصفّر حالته', async () => {
    const onUpdateA = vi.fn();
    const onUpdateB = vi.fn();
    const A = makeConsumer(hookModule, onUpdateA);
    const B = makeConsumer(hookModule, onUpdateB);
    const viewA = render(<A.Consumer />);
    const viewB = render(<B.Consumer />);

    await act(async () => {
      await A.api.current.handleFrameFace(imageElement);
    });

    expect(MockWorker.instances).toHaveLength(1);
    const worker = MockWorker.instances[0];
    const reqA = frameRequestOf(worker);
    expect(reqA).toBeTruthy();
    expect(storeModule.useOperationStatusStore.getState().activeOperation?.type).toBe('face_frame');

    // فك النسخة الثانية (لوحة الخصائص) وهي لا تملك الطلب الجاري
    act(() => {
      viewB.unmount();
    });

    expect(worker.terminate).not.toHaveBeenCalled();
    expect(storeModule.useOperationStatusStore.getState().activeOperation?.type).toBe('face_frame');
    expect(hookModule.useFaceFrameState.getState().isFraming).toBe(true);

    // نتيجة الطلب المملوك للنسخة الأولى تصل وتُسوّى بنجاح رغم فك الثانية
    await act(async () => {
      worker.emit(resultMessage(reqA.requestId));
    });
    await waitFor(() => {
      expect(onUpdateA).toHaveBeenCalledWith('img-1', { imageSrc: '/local-image/framed.png' });
    });
    expect(storeModule.useOperationStatusStore.getState().activeOperation).toBeNull();
    expect(hookModule.useFaceFrameState.getState().isFraming).toBe(false);
    // آخر طلب معلّق اكتمل → يُطلق العامل (جلسة 0.68)
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalledWith('تم ضبط مقاس الوجه وموضعه وفق معايير الهوية.');

    act(() => {
      viewA.unmount();
    });
  });

  it('سيناريو 2: فك النسخة المالكة أثناء عمل جارٍ يُسوّي عمليتها فوراً بلا تعليق', async () => {
    const onUpdateB = vi.fn();
    const A = makeConsumer(hookModule, vi.fn());
    const B = makeConsumer(hookModule, onUpdateB);
    const viewA = render(<A.Consumer />);
    const viewB = render(<B.Consumer />);

    await act(async () => {
      await A.api.current.handleFrameFace(imageElement);
    });
    const worker = MockWorker.instances[0];
    expect(frameRequestOf(worker)).toBeTruthy();

    act(() => {
      viewA.unmount();
    });

    // العملية أُنهيت فوراً — لا شيء يعلق في خانة العمليات (جلسة 0.76)
    expect(storeModule.useOperationStatusStore.getState().activeOperation).toBeNull();
    expect(hookModule.useFaceFrameState.getState().isFraming).toBe(false);
    // لا عمل معلّق متبقٍ → العامل يُطلق فوراً (جلسة 0.68)
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    // النسخة الأخرى تبقى سليمة: تبدأ عملاً جديداً وتُكمله بنجاح (لم يُقتل عملها)
    await act(async () => {
      await B.api.current.handleFrameFace(imageElement);
    });
    expect(MockWorker.instances).toHaveLength(2);
    const worker2 = MockWorker.instances[1];
    const reqB = frameRequestOf(worker2);

    await act(async () => {
      worker2.emit(resultMessage(reqB.requestId));
    });
    await waitFor(() => {
      expect(onUpdateB).toHaveBeenCalledWith('img-1', { imageSrc: '/local-image/framed.png' });
    });
    expect(worker2.terminate).toHaveBeenCalledTimes(1);

    act(() => {
      viewB.unmount();
    });
  });

  it('سيناريو 3: تحرير العامل فور اكتمال آخر طلب — Terminate on Settle (حماية قرار 0.68)', async () => {
    const onUpdate = vi.fn();
    const A = makeConsumer(hookModule, onUpdate);
    const viewA = render(<A.Consumer />);

    await act(async () => {
      await A.api.current.handleFrameFace(imageElement);
    });
    const worker = MockWorker.instances[0];
    const reqA = frameRequestOf(worker);
    // أثناء المعالجة لا يُمسّ العامل
    expect(worker.terminate).not.toHaveBeenCalled();

    await act(async () => {
      worker.emit(resultMessage(reqA.requestId));
    });
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });

    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(storeModule.useOperationStatusStore.getState().activeOperation).toBeNull();
    const { triggerMemoryTrim } = await import('@/lib/memory-trim');
    expect(triggerMemoryTrim).toHaveBeenCalled();

    act(() => {
      viewA.unmount();
    });
  });

  it('الإلغاء الصريح من النسخة المالكة يُسوّي الطلب، يُنهي العامل، ويُشعر مرة واحدة', async () => {
    const A = makeConsumer(hookModule, vi.fn());
    const viewA = render(<A.Consumer />);

    await act(async () => {
      await A.api.current.handleFrameFace(imageElement);
    });
    const worker = MockWorker.instances[0];

    act(() => {
      A.api.current.handleCancelFrame();
    });

    expect(storeModule.useOperationStatusStore.getState().activeOperation).toBeNull();
    expect(hookModule.useFaceFrameState.getState().isFraming).toBe(false);
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    const { toast } = await import('sonner');
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith('تم إلغاء العملية.');
    expect(toast.error).not.toHaveBeenCalled();

    act(() => {
      viewA.unmount();
    });
  });

  it('الإلغاء عبر مخزن العمليات يمر بمسار واحد بلا استدعاء متبادل لانهائي', async () => {
    const A = makeConsumer(hookModule, vi.fn());
    const viewA = render(<A.Consumer />);

    await act(async () => {
      await A.api.current.handleFrameFace(imageElement);
    });
    const worker = MockWorker.instances[0];

    act(() => {
      storeModule.useOperationStatusStore.getState().cancelActiveOperation();
    });

    expect(storeModule.useOperationStatusStore.getState().activeOperation).toBeNull();
    expect(hookModule.useFaceFrameState.getState().isFraming).toBe(false);
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    const { toast } = await import('sonner');
    expect(toast.info).toHaveBeenCalledTimes(1);

    act(() => {
      viewA.unmount();
    });
  });

  it('سقوط العامل يُسوّي الطلبات المعلّقة كلها ويُنهيه (حماية قرار 0.67)', async () => {
    const A = makeConsumer(hookModule, vi.fn());
    const viewA = render(<A.Consumer />);

    await act(async () => {
      await A.api.current.handleFrameFace(imageElement);
    });
    const worker = MockWorker.instances[0];

    act(() => {
      worker.onerror?.({ message: 'WASM crash' });
    });

    expect(storeModule.useOperationStatusStore.getState().activeOperation).toBeNull();
    expect(hookModule.useFaceFrameState.getState().isFraming).toBe(false);
    expect(worker.terminate).toHaveBeenCalledTimes(1);

    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalledWith('WASM crash');

    act(() => {
      viewA.unmount();
    });
  });
});
