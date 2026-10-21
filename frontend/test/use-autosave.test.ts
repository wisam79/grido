import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAutoSave } from '../src/hooks/use-autosave';
import { useEditorStore } from '../src/lib/editor-store';
import { LoadAutoSave, SaveAutoSave } from '../wailsjs/go/main/App';

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

describe('useAutoSave - Auto Save Hook Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
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
});
