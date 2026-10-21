import { render, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Go bindings — هوية @bindings/grido/app الفعلية (نفس جسر wailsjs/go/main/App)
vi.mock('@bindings/grido/app', () => ({
  SaveImageFromBase64: vi.fn().mockResolvedValue('/local-image/enhanced.png'),
  EnhanceImageWithAI: vi
    .fn()
    .mockResolvedValue(JSON.stringify({ image: 'data:image/png;base64,AAA' })),
}));

// Mock sonner toast (نتحقق من عدم ظهور رسالة الإلغاء الخاطئة)
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useAiEnhance - Collage Slot Target', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    // jsdom لا يحمّل الصور فعلياً: نُحرّر onload في microtask حتى تُكمل
    // prepareImageForAiUpload (getContext يعود null في jsdom فيُعيد src كما هي).
    (globalThis as any).Image = class {
      onload: ((e: any) => void) | null = null;
      onerror: ((e: any) => void) | null = null;
      complete = false;
      _src = '';
      crossOrigin: string | null = null;
      decode() {
        return Promise.resolve();
      }
      set src(v: string) {
        this._src = v;
        queueMicrotask(() => {
          this.complete = true;
          this.onload?.({ target: this });
        });
      }
      get src() {
        return this._src;
      }
    };

    // 🧩 وضع الكولاج: الهدف خانة في `slots` وليس عنصراً في `elements`.
    // كان حارس الطزاثة يبحث في elements وحده فيُلغى الترميم دائماً بصمت.
    const { useEditorStore } = await import('../src/lib/editor-store');
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        email: 'tester@grido.app',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any,
      aiUsageLogs: [],
      elements: [],
      slots: [
        {
          id: 'slot-1',
          cellIndex: 0,
          x: 0,
          y: 0,
          w: 0.5,
          h: 0.5,
          imageSrc: '/local-image/slot.png',
        },
      ] as any,
    });
  }, 30000);

  it('applies face enhancement to a collage slot (stored in slots, not elements)', async () => {
    const onUpdateMock = vi.fn();
    const { useAiEnhance } = await import('../src/hooks/use-ai-enhance');

    function SlotHarness() {
      const { handleEnhance } = useAiEnhance(onUpdateMock);
      React.useEffect(() => {
        void handleEnhance({ id: 'slot-1', imageSrc: '/local-image/slot.png' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }

    render(<SlotHarness />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const { EnhanceImageWithAI, SaveImageFromBase64 } = await import('@bindings/grido/app');
    expect(EnhanceImageWithAI).toHaveBeenCalled();
    expect(SaveImageFromBase64).toHaveBeenCalled();

    // الرقعة يجب أن تصل للخانة، لا أن تُسقَط بحجة «العنصر لم يعد موجوداً»
    expect(onUpdateMock).toHaveBeenCalledWith('slot-1', {
      imageSrc: '/local-image/enhanced.png',
      originalImageSrc: '/local-image/slot.png',
    });

    const { toast } = await import('sonner');
    expect(toast.info).not.toHaveBeenCalledWith(expect.stringContaining('لم يعد موجوداً'));
  });

  it('still applies face enhancement to a freeform image element (control case)', async () => {
    const { useEditorStore } = await import('../src/lib/editor-store');
    useEditorStore.setState({
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 0.1,
          y: 0.1,
          width: 0.5,
          height: 0.5,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          imageSrc: '/local-image/free.png',
        },
      ] as any,
      slots: [],
    });

    const onUpdateMock = vi.fn();
    const { useAiEnhance } = await import('../src/hooks/use-ai-enhance');

    function ElementHarness() {
      const { handleEnhance } = useAiEnhance(onUpdateMock);
      React.useEffect(() => {
        void handleEnhance({ id: 'el-1', imageSrc: '/local-image/free.png' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }

    render(<ElementHarness />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onUpdateMock).toHaveBeenCalledWith('el-1', {
      imageSrc: '/local-image/enhanced.png',
      originalImageSrc: '/local-image/free.png',
    });
  });
});
