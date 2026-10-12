import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

const mockRemoveBackground = vi.fn().mockResolvedValue('/local-image/saved-bg.png');

// Mock Go bindings — هوية @bindings/grido/app الفعلية
vi.mock('@bindings/grido/app', () => ({
  SaveImageFromBase64: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
  ApplyMaskToImage: vi.fn().mockResolvedValue('/local-image/saved-bg.png'),
  RemoveBackground: (...args: any[]) => mockRemoveBackground(...args),
  WarmupBgRemoval: vi.fn().mockResolvedValue(undefined),
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

// Wrap renders in TooltipProvider since the element uses Radix Tooltips.
import { TooltipProvider } from '../src/components/ui/tooltip';

const wrapWithTooltip = (ui: React.ReactElement) => (
  <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
);

describe('ImageStyleProperties - Go Native Background Removal', () => {
  let ImageStyleProperties: any;

  const dummyImageElement = {
    id: 'img-1',
    type: 'image' as const,
    imageSrc: '/local-image/test.png',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    zIndex: 1,
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockRemoveBackground.mockReset();
    mockRemoveBackground.mockResolvedValue('/local-image/saved-bg.png');

    // محاكاة تحميل الصور في jsdom
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

    // إعداد حالة الستور الافتراضية مع ترخيص نشط
    const { useEditorStore } = await import('../src/lib/editor-store');
    useEditorStore.setState({
      user: {
        id: 'u-1',
        email: 'test@example.com',
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      } as any,
      elements: [dummyImageElement],
      selectedIds: ['img-1'],
    });

    const mod = await import('../src/components/editor/properties/panels/image-properties');
    ImageStyleProperties = mod.ImageStyleProperties;
  });

  it('should trigger native background removal and update element imageSrc', async () => {
    const onUpdateMock = vi.fn();
    render(
      wrapWithTooltip(<ImageStyleProperties element={dummyImageElement} onUpdate={onUpdateMock} />),
    );

    const removeBgBtn = screen.getByTitle(/عزل الخلفية/);
    expect(removeBgBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(removeBgBtn);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRemoveBackground).toHaveBeenCalledWith('/local-image/test.png');
    expect(onUpdateMock).toHaveBeenCalledWith('img-1', {
      imageSrc: '/local-image/saved-bg.png',
      originalImageSrc: '/local-image/test.png',
    });

    const { toast } = await import('sonner');
    expect(toast.success).toHaveBeenCalledWith('تم عزل خلفية الصورة بنجاح');
  });

  it('preserves and commits results when removing background on a collage slot', async () => {
    const { useEditorStore } = await import('../src/lib/editor-store');
    useEditorStore.setState({
      elements: [],
      selectedIds: ['slot-1'],
      slots: [
        {
          id: 'slot-1',
          x: 0,
          y: 0,
          w: 0.5,
          h: 0.5,
          imageSrc: '/local-image/slot.png',
        },
      ] as any,
    });

    const onUpdateMock = vi.fn();
    const { useBgRemoval } = await import('../src/hooks/use-bg-removal');

    let triggerBgRemoval: any;
    function SlotHarness() {
      const { handleRemoveBg } = useBgRemoval(onUpdateMock);
      triggerBgRemoval = handleRemoveBg;
      return null;
    }

    render(wrapWithTooltip(<SlotHarness />));

    await act(async () => {
      await triggerBgRemoval({ id: 'slot-1', imageSrc: '/local-image/slot.png' });
    });

    expect(mockRemoveBackground).toHaveBeenCalledWith('/local-image/slot.png');
    expect(onUpdateMock).toHaveBeenCalledWith('slot-1', {
      imageSrc: '/local-image/saved-bg.png',
      originalImageSrc: '/local-image/slot.png',
    });

    const { toast } = await import('sonner');
    expect(toast.info).not.toHaveBeenCalledWith(expect.stringContaining('لم يعد موجوداً'));
  });

  it('should handle cancel properly during background removal', async () => {
    let resolveInference: any;
    mockRemoveBackground.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInference = resolve;
        }),
    );

    const onUpdateMock = vi.fn();
    render(
      wrapWithTooltip(<ImageStyleProperties element={dummyImageElement} onUpdate={onUpdateMock} />),
    );

    const removeBgBtn = screen.getByTitle(/عزل الخلفية/);

    await act(async () => {
      fireEvent.click(removeBgBtn);
      await Promise.resolve();
    });

    // زر الإلغاء يظهر أثناء المعالجة
    const cancelBtn = screen.getByTitle('إلغاء العزل');
    expect(cancelBtn).toBeDefined();

    // نقر زر الإلغاء
    await act(async () => {
      fireEvent.click(cancelBtn);
      await Promise.resolve();
    });

    const { toast } = await import('sonner');
    expect(toast.info).toHaveBeenCalledWith('تم إلغاء العملية.');

    // يعود الزر للوضع الطبيعي
    expect(screen.queryByTitle('إلغاء العزل')).toBeNull();
    expect(screen.getByTitle(/عزل الخلفية/)).toBeDefined();

    if (resolveInference) {
      resolveInference('/local-image/late.png');
    }
  });

  it('handles backend error gracefully and resets UI without hanging', async () => {
    mockRemoveBackground.mockRejectedValue(new Error('AI model failure'));

    const onUpdateMock = vi.fn();
    render(
      wrapWithTooltip(<ImageStyleProperties element={dummyImageElement} onUpdate={onUpdateMock} />),
    );

    await act(async () => {
      fireEvent.click(screen.getByTitle(/عزل الخلفية/));
      await Promise.resolve();
      await Promise.resolve();
    });

    const { toast } = await import('sonner');
    expect(toast.error).toHaveBeenCalled();
    expect(screen.queryByTitle('إلغاء العزل')).toBeNull();
    expect(screen.getByTitle(/عزل الخلفية/)).toBeDefined();
  });
});
