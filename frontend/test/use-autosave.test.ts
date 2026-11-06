import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { clearAutoSave, flushAutoSave, useAutoSave } from '../src/hooks/use-autosave';
import { useEditorStore } from '../src/lib/editor-store';
import { ClearAutoSave, LoadAutoSave, SaveAutoSave } from '../wailsjs/go/main/App';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// جسر Wails v3: الوحدة تحت الاختبار (use-autosave.ts) تستورد الربطات المولدة مباشرةً
// من @bindings/grido/app (نفس الملف الذي يعيد تصديره wailsjs/go/main/App)، فنحاكي
// هوية الوحدة الفعلية حتى يعترض المحاكاة الاستدعاء الحقيقي عبر @wailsio/runtime ($Call.ByID)
// ولا يقع أي fetch إلى خادم Wails (ECONNREFUSED في jsdom).
// ملاحظة: لا نستخدم importOriginal هنا — تحميل الربطات الحقيقي داخل الـfactory يفشل
// في jsdom («Cannot read properties of undefined (reading 'config')» من @wailsio/runtime).
vi.mock('@bindings/grido/app', () => ({
  LoadAutoSave: vi.fn(),
  SaveAutoSave: vi.fn(),
  ClearAutoSave: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

const previousDraft = JSON.stringify({
  version: 1,
  mode: 'single',
  canvasWidth: 800,
  canvasHeight: 600,
  backgroundColor: '#FFFFFF',
  elements: [],
  slots: [],
});

function memoryStorage(initial = '') {
  let disk = initial;
  let holdWrites = false;
  let activeWrites = 0;
  let maxActiveWrites = 0;
  const writes: { payload: string; finish: () => void }[] = [];

  vi.mocked(LoadAutoSave).mockImplementation(
    () => Promise.resolve(disk) as ReturnType<typeof LoadAutoSave>,
  );
  vi.mocked(SaveAutoSave).mockImplementation((payload) => {
    const write = deferred<void>();
    activeWrites += 1;
    maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
    writes.push({ payload, finish: () => write.resolve(undefined) });
    if (!holdWrites) write.resolve(undefined);
    return write.promise.then(() => {
      disk = payload;
      activeWrites -= 1;
    }) as ReturnType<typeof SaveAutoSave>;
  });
  vi.mocked(ClearAutoSave).mockImplementation(() => {
    disk = '';
    return Promise.resolve() as ReturnType<typeof ClearAutoSave>;
  });

  return {
    writes,
    get disk() {
      return disk;
    },
    get maxActiveWrites() {
      return maxActiveWrites;
    },
    holdWrites() {
      holdWrites = true;
    },
    releaseAll() {
      holdWrites = false;
      for (const write of writes) write.finish();
    },
  };
}

function clickDraftToast(kind: 'corrupt' | 'stale') {
  const calls = vi.mocked(kind === 'corrupt' ? toast.error : toast.info).mock.calls;
  const options = calls.at(-1)?.[1];
  const action = kind === 'corrupt' ? options?.action : options?.cancel;
  if (!action || typeof action !== 'object' || !('onClick' in action)) {
    throw new Error('Expected a recovery draft action');
  }
  action.onClick({} as Parameters<typeof action.onClick>[0]);
}

async function offerDraft(kind: 'corrupt' | 'stale') {
  const saved = kind === 'corrupt' ? '{invalid json' : previousDraft;
  const storage = memoryStorage(saved);
  const load = deferred<string>();
  vi.mocked(LoadAutoSave).mockReturnValueOnce(load.promise as ReturnType<typeof LoadAutoSave>);
  const view = renderHook(() => useAutoSave());
  // A stale draft arrives only after work has started; corrupt drafts leave an empty canvas.
  if (kind === 'stale') useEditorStore.getState().addTextElement('current work');
  await act(async () => load.resolve(saved));
  return { storage, view };
}

function savedText(payload: string) {
  return (JSON.parse(payload) as { elements: { text?: string }[] }).elements[0]?.text;
}

async function debounceSave() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2100);
  });
}

describe('useAutoSave - Auto Save Hook Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.resetAllMocks();
    vi.mocked(LoadAutoSave).mockResolvedValue('');
    vi.mocked(SaveAutoSave).mockResolvedValue(undefined);
    vi.mocked(ClearAutoSave).mockResolvedValue(undefined);
    // Exercise the deterministic post-debounce fallback, not jsdom/browser idle scheduling.
    vi.stubGlobal('requestIdleCallback', undefined);
    vi.stubGlobal('cancelIdleCallback', undefined);
  });

  afterEach(async () => {
    useEditorStore.getState().reset();
    cleanup();
    await flushAutoSave();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should load auto saved project on initialization', async () => {
    const savedDraft = JSON.stringify({
      version: 1,
      mode: 'single',
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: '#FFFFFF',
      elements: [],
      slots: [],
    });

    const mockLoadAutoSave = vi.mocked(LoadAutoSave);
    mockLoadAutoSave.mockResolvedValue(savedDraft);

    renderHook(() => useAutoSave());

    await waitFor(() => {
      expect(mockLoadAutoSave).toHaveBeenCalled();
      expect(useEditorStore.getState().canvasWidth).toBe(800);
      expect(toast.info).toHaveBeenCalledWith(
        'تم استعادة مسودة العمل السابقة تلقائياً',
        expect.any(Object),
      );
    });
  });

  it('should trigger SaveAutoSave after editing canvas elements', async () => {
    const mockSaveAutoSave = vi.mocked(SaveAutoSave);
    mockSaveAutoSave.mockResolvedValue(undefined);
    vi.mocked(LoadAutoSave).mockResolvedValue('');

    // مؤقتات وهمية بدل انتظار debounce الحقيقي (ثانيتان) — أسرع ودون اعتماد على توقيت حقيقي
    vi.useFakeTimers();
    try {
      renderHook(() => useAutoSave());
      await act(async () => {});

      // Add elements to trigger store change
      useEditorStore.getState().addTextElement('Initial Element');

      // Fast-forward past the 2000ms debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(mockSaveAutoSave).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels a pending autosave when the document session changes — reset never resurrects an old draft', async () => {
    const mockSaveAutoSave = vi.mocked(SaveAutoSave);
    mockSaveAutoSave.mockResolvedValue(undefined);
    vi.mocked(LoadAutoSave).mockResolvedValue('');

    vi.useFakeTimers();
    try {
      renderHook(() => useAutoSave());
      await act(async () => {});

      useEditorStore.getState().addTextElement('قبل المسح');

      // داخل نافذة debounce (أقل من ثانيتين) يمسح المستخدم المسودة — reset
      // يرفع جلسة المستند فيجب أن يُلغى المؤقت المعلق فوراً
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      useEditorStore.getState().reset();

      // تجاوز زمن debounce القديم بالكامل — الحفظ المتأخر بلا وقت حقيقي
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });

      expect(mockSaveAutoSave).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not rewrite equivalent content — the stable fingerprint (without savedAt) dedupes accepted writes', async () => {
    const mockSaveAutoSave = vi.mocked(SaveAutoSave);
    mockSaveAutoSave.mockResolvedValue(undefined);
    vi.mocked(LoadAutoSave).mockResolvedValue('');

    vi.useFakeTimers();
    try {
      renderHook(() => useAutoSave());
      await act(async () => {});

      const id = useEditorStore.getState().addTextElement('مستقر');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });
      expect(mockSaveAutoSave).toHaveBeenCalledTimes(1);

      // تعديل ثم العودة لنفس القيمة قبل انقضاء التأخير — كان savedAt الجديد في
      // كل تسلسل يجعل السلسلة «مختلفة» فيُكتب الملف المكافئ من جديد؛ الآن
      // بصمة المستند الثابتة (بدون savedAt) تطابق آخر كتابة مقبولة فيُتخطى
      useEditorStore.getState().updateElement(id, { text: 'مؤقت' });
      useEditorStore.getState().updateElement(id, { text: 'مستقر' });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });

      expect(mockSaveAutoSave).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['corrupt', 'stale'] as const)(
    'keeps a newer accepted draft when the old %s recovery notification is cleared',
    async (kind) => {
      vi.useFakeTimers();
      const { storage, view } = await offerDraft(kind);
      useEditorStore.getState().addTextElement(`newer than ${kind}`);
      await debounceSave();
      const accepted = storage.disk;

      await act(async () => clickDraftToast(kind));
      await flushAutoSave();
      view.unmount();
      await act(async () => {});

      expect(ClearAutoSave).not.toHaveBeenCalled();
      expect(storage.disk).toBe(accepted);
      expect(storage.disk).not.toBe('');
    },
  );

  it.each(['corrupt', 'stale'] as const)(
    'still clears an unchanged %s draft at the user request',
    async (kind) => {
      vi.useFakeTimers();
      const { storage } = await offerDraft(kind);
      await act(async () => clickDraftToast(kind));
      expect(ClearAutoSave).toHaveBeenCalledTimes(1);
      expect(storage.disk).toBe('');
    },
  );

  it('rechecks a recovery delete after an in-flight write settles', async () => {
    vi.useFakeTimers();
    const { storage } = await offerDraft('corrupt');
    storage.holdWrites();
    useEditorStore.getState().addTextElement('newer in flight');
    await debounceSave();

    try {
      await act(async () => clickDraftToast('corrupt'));
      const clearedBeforeSave = vi.mocked(ClearAutoSave).mock.calls.length;
      await act(async () => storage.writes[0].finish());
      await flushAutoSave();
      expect(clearedBeforeSave).toBe(0);
      expect(ClearAutoSave).not.toHaveBeenCalled();
      expect(savedText(storage.disk)).toBe('newer in flight');
    } finally {
      await act(async () => storage.releaseAll());
    }
  });

  it('serializes a queued autosave with concurrent flush callers and keeps the latest content', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.holdWrites();
    renderHook(() => useAutoSave());
    await act(async () => {});
    const id = useEditorStore.getState().addTextElement('A');
    await debounceSave();
    useEditorStore.getState().updateElement(id, { text: 'B' });
    await debounceSave();
    useEditorStore.getState().updateElement(id, { text: 'C' });

    let flushed = false;
    const flushes = Promise.all([flushAutoSave(), flushAutoSave()]).then((results) => {
      flushed = true;
      return results;
    });
    try {
      await act(async () => storage.writes[0].finish());
      const overlapped = storage.maxActiveWrites;
      const finishedEarly = flushed;
      await act(async () => storage.releaseAll());
      expect(await flushes).toEqual([true, true]);
      expect(overlapped).toBe(1);
      expect(finishedEarly).toBe(false);
      expect(savedText(storage.disk)).toBe('C');
    } finally {
      await act(async () => storage.releaseAll());
      await flushes;
    }
  });

  it('shares writer ownership across unmount/remount and does not dispatch stale pending content', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.holdWrites();
    const oldView = renderHook(() => useAutoSave());
    await act(async () => {});
    const id = useEditorStore.getState().addTextElement('A');
    await debounceSave();
    useEditorStore.getState().updateElement(id, { text: 'B' });
    oldView.unmount();
    renderHook(() => useAutoSave());
    await act(async () => {});
    useEditorStore.getState().updateElement(id, { text: 'C' });
    await debounceSave();

    try {
      const overlapped = storage.maxActiveWrites;
      await act(async () => storage.releaseAll());
      await flushAutoSave();
      expect(overlapped).toBe(1);
      expect(storage.maxActiveWrites).toBe(1);
      expect(savedText(storage.disk)).toBe('C');
      expect(storage.writes.map((write) => savedText(write.payload))).not.toContain('B');
    } finally {
      await act(async () => storage.releaseAll());
    }
  });

  it('does not let an old-session write claim the new session fingerprint', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.holdWrites();
    renderHook(() => useAutoSave());
    await act(async () => {});
    useEditorStore.getState().addTextElement('same contents, new session');
    await debounceSave();
    const snapshot = JSON.parse(storage.writes[0].payload);
    useEditorStore.getState().loadProject(snapshot);

    try {
      await act(async () => storage.writes[0].finish());
      storage.releaseAll();
      await flushAutoSave();
      expect(SaveAutoSave).toHaveBeenCalledTimes(2);
      expect(savedText(storage.disk)).toBe('same contents, new session');
    } finally {
      await act(async () => storage.releaseAll());
    }
  });

  it('orders reset clearing after the old write and before a fresh document save', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.holdWrites();
    renderHook(() => useAutoSave());
    await act(async () => {});
    useEditorStore.getState().addTextElement('old document');
    await debounceSave();
    useEditorStore.getState().reset();
    const cleared = clearAutoSave();
    useEditorStore.getState().addTextElement('fresh document');
    await debounceSave();
    const flushed = flushAutoSave();

    try {
      expect(ClearAutoSave).not.toHaveBeenCalled();
      await act(async () => storage.writes[0].finish());
      expect(await cleared).toBe(true);
      expect(storage.disk).toBe('');
      await act(async () => storage.releaseAll());
      expect(await flushed).toBe(true);
      expect(storage.maxActiveWrites).toBe(1);
      expect(savedText(storage.disk)).toBe('fresh document');
    } finally {
      await act(async () => storage.releaseAll());
      await Promise.all([cleared, flushed]);
    }
  });

  it('drops a queued clear superseded by a document switch', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    storage.holdWrites();
    renderHook(() => useAutoSave());
    await act(async () => {});
    useEditorStore.getState().addTextElement('old document');
    await debounceSave();
    useEditorStore.getState().reset();
    const cleared = clearAutoSave();
    useEditorStore.getState().loadProject(JSON.parse(previousDraft));
    useEditorStore.getState().addTextElement('opened document');
    const flushed = flushAutoSave();

    try {
      await act(async () => storage.releaseAll());
      expect(await cleared).toBe(false);
      expect(await flushed).toBe(true);
      expect(ClearAutoSave).not.toHaveBeenCalled();
      expect(savedText(storage.disk)).toBe('opened document');
    } finally {
      await act(async () => storage.releaseAll());
      await Promise.all([cleared, flushed]);
    }
  });

  it('invalidates the accepted fingerprint when a legitimate clear succeeds', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderHook(() => useAutoSave());
    await act(async () => {});
    useEditorStore.getState().addTextElement('restore after clear');
    await debounceSave();
    expect(await clearAutoSave()).toBe(true);
    expect(storage.disk).toBe('');
    expect(await flushAutoSave()).toBe(true);
    expect(SaveAutoSave).toHaveBeenCalledTimes(2);
    expect(savedText(storage.disk)).toBe('restore after clear');
  });

  it('keeps the writer usable after a rejected flush or clear', async () => {
    vi.useFakeTimers();
    const storage = memoryStorage();
    renderHook(() => useAutoSave());
    await act(async () => {});
    useEditorStore.getState().addTextElement('retry after failure');
    vi.mocked(SaveAutoSave).mockRejectedValueOnce(new Error('disk full'));
    expect(await flushAutoSave()).toBe(false);
    expect(await flushAutoSave()).toBe(true);
    vi.mocked(ClearAutoSave).mockRejectedValueOnce(new Error('access denied'));
    await expect(clearAutoSave()).rejects.toThrow('access denied');
    expect(await clearAutoSave()).toBe(true);
    expect(await flushAutoSave()).toBe(true);
    expect(savedText(storage.disk)).toBe('retry after failure');
  });

  it('ignores a recovery read completing after unmount', async () => {
    const load = deferred<string>();
    vi.mocked(LoadAutoSave).mockReturnValueOnce(load.promise as ReturnType<typeof LoadAutoSave>);
    const view = renderHook(() => useAutoSave());
    view.unmount();
    await act(async () => load.resolve(previousDraft));
    expect(useEditorStore.getState().canvasWidth).toBe(2480);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('does not restore a delayed startup draft over a reset pristine document', async () => {
    const load = deferred<string>();
    vi.mocked(LoadAutoSave).mockReturnValueOnce(load.promise as ReturnType<typeof LoadAutoSave>);
    renderHook(() => useAutoSave());
    useEditorStore.getState().reset();
    await act(async () => load.resolve(previousDraft));
    expect(useEditorStore.getState().canvasWidth).toBe(2480);
    expect(toast.info).toHaveBeenCalledWith(
      'تم تجاهل مسودة سابقة لأن العمل بدأ بالفعل',
      expect.any(Object),
    );
  });

  it('flushAutoSave skips an equivalent write after an accepted autosave', async () => {
    const mockSaveAutoSave = vi.mocked(SaveAutoSave);
    mockSaveAutoSave.mockResolvedValue(undefined);
    vi.mocked(LoadAutoSave).mockResolvedValue('');

    vi.useFakeTimers();
    try {
      renderHook(() => useAutoSave());
      await act(async () => {});

      useEditorStore.getState().addTextElement('مسودة التفريغ');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });
      expect(mockSaveAutoSave).toHaveBeenCalledTimes(1);

      // التفريغ الفوري على نفس المحتوى المقبول للتو = لا كتابة ثانية
      const wrote = await flushAutoSave();
      expect(wrote).toBe(true);
      expect(mockSaveAutoSave).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
