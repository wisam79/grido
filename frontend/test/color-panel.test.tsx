import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ColorField, ColorWheelPicker } from '../src/components/editor/properties/color-panel';
import { ColorWheel } from '../src/components/editor/properties/color-wheel';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useRenderQuality } from '../src/lib/canvas/render-quality';
import { advanceDocumentSession } from '../src/lib/io/document-session';
import type { ReactElement } from 'react';

const renderField = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('components/color-panel', () => {
  it('لا يعرض أي عجلة قبل فتح المنتقي', () => {
    renderField(<ColorField color="#FF0000" onChange={vi.fn()} ariaLabel="تعبئة" />);

    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /^لون / })).toHaveLength(4);
  });

  it('يفتح منتقياً واحداً يحوي عجلة واحدة عند النقر على الرقعة', async () => {
    const user = userEvent.setup();
    renderField(<ColorField color="#FF0000" onChange={vi.fn()} ariaLabel="تعبئة" />);

    await user.click(screen.getByRole('button', { name: 'تعبئة' }));

    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);
  });

  it('يبقي عجلة واحدة فقط مفتوحة عند التبديل بين حقول اللون', async () => {
    const user = userEvent.setup();
    renderField(
      <>
        <ColorField color="#FF0000" onChange={vi.fn()} ariaLabel="تعبئة" />
        <ColorField color="#00FF00" onChange={vi.fn()} ariaLabel="حد" />
      </>,
    );

    await user.click(screen.getByRole('button', { name: 'تعبئة' }));
    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'حد' }));

    expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);
  });

  it('يدعم قطارة الشاشة ويستدعي onChange باللون المحدد عند نجاح سحب اللون', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const openMock = vi.fn().mockResolvedValue({ sRGBHex: '#2563EB' });
    const originalEyeDropper = (window as unknown as { EyeDropper?: unknown }).EyeDropper;

    class MockEyeDropper {
      open = openMock;
    }
    (window as unknown as { EyeDropper: unknown }).EyeDropper = MockEyeDropper;

    try {
      renderField(<ColorField color="#FF0000" onChange={onChange} ariaLabel="تعبئة" />);

      await user.click(screen.getByRole('button', { name: 'تعبئة' }));

      const dropperBtn = screen.getByRole('button', { name: 'قطارة الشاشة' });
      expect(dropperBtn).toBeInTheDocument();

      await user.click(dropperBtn);

      expect(openMock).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('#2563EB');
    } finally {
      if (originalEyeDropper) {
        (window as unknown as { EyeDropper: unknown }).EyeDropper = originalEyeDropper;
      } else {
        delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
      }
    }
  });

  it('يتعامل بسلام مع إلغاء قطارة الشاشة (AbortError) دون إغلاق المنتقي أو إطلاق أخطاء', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const abortErr = new Error('User canceled');
    abortErr.name = 'AbortError';
    const openMock = vi.fn().mockRejectedValue(abortErr);
    const originalEyeDropper = (window as unknown as { EyeDropper?: unknown }).EyeDropper;

    class MockEyeDropper {
      open = openMock;
    }
    (window as unknown as { EyeDropper: unknown }).EyeDropper = MockEyeDropper;

    try {
      renderField(<ColorField color="#FF0000" onChange={onChange} ariaLabel="تعبئة" />);

      await user.click(screen.getByRole('button', { name: 'تعبئة' }));

      const dropperBtn = screen.getByRole('button', { name: 'قطارة الشاشة' });
      await user.click(dropperBtn);

      expect(openMock).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
      expect(document.querySelectorAll('[data-color-panel-wheel]')).toHaveLength(1);
    } finally {
      if (originalEyeDropper) {
        (window as unknown as { EyeDropper: unknown }).EyeDropper = originalEyeDropper;
      } else {
        delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
      }
    }
  });

  it('يتراجع تلقائياً إلى قطارة الكانفاس الداخلية ويسحب لون البكسل بدقة', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const originalEyeDropper = (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;

    // تجهيز عنصر canvas وهمي قابل للقراءة بواسطة elementsFromPoint
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 100,
      height: 100,
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
    });
    const mockCtx = {
      getImageData: vi.fn().mockReturnValue({ data: [37, 99, 235, 255] }),
    };
    canvas.getContext = vi.fn().mockReturnValue(mockCtx) as unknown as typeof canvas.getContext;
    document.body.appendChild(canvas);

    const originalElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = vi.fn().mockReturnValue([canvas]);

    try {
      renderField(<ColorField color="#FF0000" onChange={onChange} ariaLabel="تعبئة" />);

      await user.click(screen.getByRole('button', { name: 'تعبئة' }));

      const dropperBtn = screen.getByRole('button', { name: 'قطارة الشاشة' });
      await user.click(dropperBtn);

      // انتظار تسجيل مستمع النقر
      await new Promise((r) => setTimeout(r, 50));

      // محاكاة النقر على موضع الكانفاس
      const pointerEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 50,
      });
      window.dispatchEvent(pointerEvent);

      expect(onChange).toHaveBeenCalledWith('#2563EB');
    } finally {
      document.elementsFromPoint = originalElementsFromPoint;
      canvas.remove();
      if (originalEyeDropper) {
        (window as unknown as { EyeDropper: unknown }).EyeDropper = originalEyeDropper;
      }
    }
  });

  it('tears down the fallback sampler on unmount without intercepting later pointer events', () => {
    const original = (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    const onChange = vi.fn();
    const onActive = vi.fn();
    document.body.style.cursor = 'help';
    try {
      const view = render(
        <ColorWheelPicker color="#FF0000" onChange={onChange} onDropperActiveChange={onActive} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'قطارة الشاشة' }));
      expect(document.body.style.cursor).toBe('crosshair');
      expect(onActive).toHaveBeenLastCalledWith(true);
      view.unmount();
      expect(document.body.style.cursor).toBe('help');
      expect(onActive).toHaveBeenLastCalledWith(false);
      const pointer = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      window.dispatchEvent(pointer);
      expect(pointer.defaultPrevented).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      document.body.style.cursor = '';
      if (original) (window as unknown as { EyeDropper: unknown }).EyeDropper = original;
    }
  });

  it('aborts native eyedropper ownership on unmount and rejects its late result', async () => {
    const original = (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    let resolve!: (result: { sRGBHex: string }) => void;
    let signal: AbortSignal | undefined;
    class PendingEyeDropper {
      open(options?: { signal: AbortSignal }) {
        signal = options?.signal;
        return new Promise<{ sRGBHex: string }>((done) => {
          resolve = done;
        });
      }
    }
    (window as unknown as { EyeDropper: unknown }).EyeDropper = PendingEyeDropper;
    const onChange = vi.fn();
    const onCommit = vi.fn();
    try {
      const view = render(
        <ColorWheelPicker color="#FF0000" onChange={onChange} onCommit={onCommit} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'قطارة الشاشة' }));
      view.unmount();
      expect(signal?.aborted).toBe(true);
      await act(async () => resolve({ sRGBHex: '#123456' }));
      expect(onChange).not.toHaveBeenCalled();
      expect(onCommit).not.toHaveBeenCalled();
    } finally {
      if (original) (window as unknown as { EyeDropper: unknown }).EyeDropper = original;
      else delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    }
  });

  it('preserves a focused HEX draft but never commits a later external color as its own', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const view = render(
      <ColorWheelPicker color="#FF0000" onChange={onChange} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox', { name: 'قيمة HEX' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '123456' } });
    expect(onChange).toHaveBeenLastCalledWith('#123456');
    view.rerender(<ColorWheelPicker color="#00FF00" onChange={onChange} onCommit={onCommit} />);
    expect(input).toHaveValue('123456');
    act(() => input.blur());
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue('00FF00');
  });

  it('commits HEX once across Enter, blur and teardown and normalizes an invalid tail', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const view = render(
      <ColorWheelPicker color="#FF0000" onChange={onChange} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox', { name: 'قيمة HEX' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '123456' } });
    view.rerender(<ColorWheelPicker color="#123456" onChange={onChange} onCommit={onCommit} />);
    fireEvent.change(input, { target: { value: '12345x' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    act(() => input.blur());
    expect(input).toHaveValue('123456');
    view.unmount();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('#123456');
  });

  it('does not commit a dirty HEX preview onto a replacement document', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const view = render(
      <ColorWheelPicker color="#FF0000" onChange={onChange} onCommit={onCommit} />,
    );
    const input = screen.getByRole('textbox', { name: 'قيمة HEX' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '123456' } });
    advanceDocumentSession();
    view.rerender(<ColorWheelPicker color="#123456" onChange={onChange} onCommit={onCommit} />);
    view.unmount();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('يرسل onCommit مرة واحدة فقط عند إفلات سحب عجلة الألوان مع استمرار المعاينة الحية عبر onChange', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<ColorWheel color="#FF0000" onChange={onChange} onCommit={onCommit} />);

    const wheel = screen.getByRole('slider', { name: 'عجلة الألوان' });
    wheel.setPointerCapture = vi.fn();
    wheel.hasPointerCapture = vi.fn().mockReturnValue(true);
    wheel.releasePointerCapture = vi.fn();
    wheel.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 156,
      height: 156,
      left: 0,
      top: 0,
      right: 156,
      bottom: 156,
    });

    fireEvent.pointerDown(wheel, { button: 0, pointerId: 1, clientX: 30, clientY: 30 });
    fireEvent.pointerMove(wheel, { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerMove(wheel, { pointerId: 1, clientX: 90, clientY: 50 });

    expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.pointerUp(wheel, { pointerId: 1, clientX: 90, clientY: 50 });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('يحصر علم سحب الفلتر بالعنصر المعدّل (draggingFilterId) لمنع إبطال كاش الصور الأخرى', () => {
    useRenderQuality.getState().setIsDraggingFilter(true, 'img-active');
    expect(useRenderQuality.getState().isDraggingFilter).toBe(true);
    expect(useRenderQuality.getState().draggingFilterId).toBe('img-active');

    useRenderQuality.getState().setIsDraggingFilter(false);
    expect(useRenderQuality.getState().isDraggingFilter).toBe(false);
    expect(useRenderQuality.getState().draggingFilterId).toBeNull();
  });
});
