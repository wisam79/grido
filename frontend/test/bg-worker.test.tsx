import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock Go bindings
vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
  ApplyMaskToImage: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// محاكاة Web Worker الحقيقي (واجهة الجلسة السابقة: postMessage segment → نتيجة via onmessage)
// لا نحاكي MediaPipe بعد الآن لأن الاستدلال صار داخل Worker حقيقي bg-removal.worker.ts
class MockBgWorker {
  static instance: MockBgWorker | null = null;
  static autoRespond = true;

  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminated = false;

  postMessage = vi.fn((msg: { type: string; requestId?: number }) => {
    if (msg?.type !== 'segment' || msg.requestId == null) return;
    if (!MockBgWorker.autoRespond) return;
    // الاستجابة ية (مثل Worker الحقيقي): نتيجة بعد دورتي microtask
    const requestId = msg.requestId;
    Promise.resolve()
      .then(() => Promise.resolve())
      .then(() => {
        if (this.terminated) return;
        this.onmessage?.({
          data: {
            type: 'result',
            requestId,
            result: { maskBase64: 'bW9jaw==', targetW: 100, targetH: 100, inferredMs: 12 },
          },
        } as MessageEvent);
      });
  });

  terminate = vi.fn(() => {
    this.terminated = true;
    MockBgWorker.instance = null;
  });

  constructor() {
    MockBgWorker.instance = this;
  }
}

// Wrap renders in TooltipProvider since the element uses Radix Tooltips.
// This must be a module-level import so vitest transforms it as TSX.
import { TooltipProvider } from '../src/components/ui/tooltip';

const wrapWithTooltip = (ui: React.ReactElement) => (
  <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
);

describe('ElementProperties - Worker Background Removal', () => {
  let ElementProperties: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    MockBgWorker.instance = null;
    MockBgWorker.autoRespond = true;

    // توفير Worker في بيئة JSDOM (غير متوفر أصلاً فيها)
    (globalThis as any).Worker = MockBgWorker;

    // محاكاة تحميل الصور في jsdom — الصور لا تُحمَّل فعلياً هناك،
    // بينما الخطاف ينتظر fك ضغط الكاش قبل تطبيق النتيجة (preloadImageIntoCache).
    // jsdom لا يستدعي setter الميداني src عبر subclass، لذا نستبدل Image كلياً.
    (globalThis as any).Image = class {
      onload: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      complete = false;
      _src = '';
      crossOrigin: string | null = null;
      decode() { return Promise.resolve(); }
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => {
          this.complete = true;
          this.onload?.({ target: this });
        });
      }
      get src() { return this._src; }
    };

    // Dynamically load the component and set active license state to pick up the mocks
    const { useEditorStore } = await import('../src/lib/editor-store');
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any
    });

    const mod = await import('../src/components/editor/properties/element-properties');
    ElementProperties = mod.ElementProperties;
  });

  const dummyImageElement = {
    id: 'el-1',
    type: 'image' as const,
    x: 0.1,
    y: 0.1,
    width: 0.5,
    height: 0.5,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    imageSrc: '/local-image/dummy.png',
  };

  it('should run background removal in Worker and update element src on success', async () => {
    const onUpdateMock = vi.fn();
    render(wrapWithTooltip(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />));

    const removeBgBtn = screen.getByTitle(/عزل الخلفية/);

    await act(async () => {
      fireEvent.click(removeBgBtn);
      // انتظار دورات microtask حتى تصل نتيجة الـ Worker ويكتمل ApplyMaskToImage
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // الـ Worker استُدعي فعلاً بطلب segment
    expect(MockBgWorker.instance?.postMessage).toHaveBeenCalled();

    // Verify ApplyMaskToImage was called to generate the transparent image
    const { ApplyMaskToImage: mockApplyMask } = await import('../wailsjs/go/main/App');
    expect(mockApplyMask).toHaveBeenCalled();

    expect(onUpdateMock).toHaveBeenCalledWith('el-1', {
      imageSrc: '/local-image/saved-bg.png',
      originalImageSrc: '/local-image/dummy.png',
    });
  });

  it('should handle cancel button click and reset loading UI (hard terminate)', async () => {
    // وضع التعليق: الـ Worker لا يستجيب ليبقى العزل في حالة تشغيل
    MockBgWorker.autoRespond = false;

    const onUpdateMock = vi.fn();
    render(wrapWithTooltip(<ElementProperties element={dummyImageElement} onUpdate={onUpdateMock} />));

    const removeBgBtn = screen.getByTitle(/عزل الخلفية/);

    await act(async () => {
      fireEvent.click(removeBgBtn);
      await Promise.resolve();
    });

    // UI should show the cancel button now
    expect(screen.getByTitle('إلغاء العزل')).toBeDefined();

    // التقط المثيل قبل النقر — terminate يُصفّر المرجع الساكن (مطابقة سلوك الهوك)
    const workerBeforeCancel = MockBgWorker.instance;
    expect(workerBeforeCancel).not.toBeNull();

    // Click cancel — الإلغاء القسري ينهي الـ Worker فوراً
    const cancelBtn = screen.getByTitle('إلغاء العزل');
    await act(async () => {
      fireEvent.click(cancelBtn);
      await Promise.resolve();
    });

    // الإنهاء القسري استدعي على الـ Worker
    expect(workerBeforeCancel?.terminate).toHaveBeenCalled();

    // UI should reset back to normal
    expect(screen.queryByTitle('إلغاء العزل')).toBeNull();
    expect(screen.getByTitle(/عزل الخلفية/)).toBeDefined();
  });
});
