import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { TextEditingOverlay } from '../src/components/editor/canvas/text-editing-overlay';
import * as textFit from '../src/lib/canvas/text-fit';

afterEach(() => vi.restoreAllMocks());

import type { TextElement } from '../src/lib/store/types';

const textElement: TextElement = {
  id: 'text-1',
  type: 'text',
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.1,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  text: 'Hello',
  fontSize: 20,
  fontFamily: 'Arial',
  fontWeight: 400,
  color: '#000000',
  textAlign: 'center',
  lineHeight: 1.2,
};

const baseProps = {
  printMode: false,
  editingTextId: 'text-1',
  elements: [textElement],
  displayW: 1000,
  displayH: 1000,
  canvasWidth: 1000,
  canvasHeight: 1000,
};

describe('TextEditingOverlay Component Tests', () => {
  it('renders a textarea pre-filled with the element text', () => {
    render(
      <TextEditingOverlay
        {...baseProps}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('Hello');
  });

  it.each(['Enter', 'Escape'])('commits typed text and exits on %s', (key) => {
    const updateElement = vi.fn();
    const pushHistory = vi.fn();
    const setEditingTextId = vi.fn();

    render(
      <TextEditingOverlay
        {...baseProps}
        updateElement={updateElement}
        pushHistory={pushHistory}
        setEditingTextId={setEditingTextId}
      />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Edited text' } });
    fireEvent.keyDown(textarea, { key });

    expect(updateElement).toHaveBeenCalledWith('text-1', { text: 'Edited text' });
    expect(pushHistory).toHaveBeenCalled();
    expect(setEditingTextId).toHaveBeenCalledWith(null);
  });

  it('renders nothing in print mode', () => {
    const { container } = render(
      <TextEditingOverlay
        {...baseProps}
        printMode={true}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows Arabic-Indic digits while editing and stores ASCII digits back', () => {
    const updateElement = vi.fn();
    render(
      <TextEditingOverlay
        {...baseProps}
        elements={[{ ...textElement, text: 'طلب 2026', arabicNumerals: true }]}
        updateElement={updateElement}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('طلب ٢٠٢٦');

    fireEvent.change(textarea, { target: { value: 'طلب ٢٠٢٧' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(updateElement).toHaveBeenCalledWith('text-1', { text: 'طلب 2027' });
  });

  it.each([
    ['Grido تصميم', 'ltr'],
    ['تصميم Grido', 'rtl'],
    ['2026', 'ltr'],
  ])('uses first-strong direction for mixed text %s → %s', (text, expected) => {
    render(
      <TextEditingOverlay
        {...baseProps}
        elements={[{ ...textElement, text }]}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('dir', expected);
  });

  it('does not commit while an IME composition is active', () => {
    const updateElement = vi.fn();
    render(
      <TextEditingOverlay
        {...baseProps}
        elements={[{ ...textElement, text: 'مرحبا' }]}
        updateElement={updateElement}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'مرحبا بالعالم' } });
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });

    expect(updateElement).not.toHaveBeenCalled();
  });

  it('does not resurrect a committed draft after undo + reopen', () => {
    const { rerender } = render(
      <TextEditingOverlay
        {...baseProps}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Edited text' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

    // إغلاق الجلسة (الستور يعيد null) ثم تراجع خارجي يعيد النص السابق
    rerender(
      <TextEditingOverlay
        {...baseProps}
        editingTextId={null}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    // إعادة تحرير العنصر نفسه تعرض النص الحالي لا مسودة الجلسة المغلقة
    rerender(
      <TextEditingOverlay
        {...baseProps}
        elements={[{ ...textElement, text: 'Restored' }]}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('Restored');
  });

  it.each([50, -50])(
    'labels and vertically centres curved content without changing fitted geometry (%s)',
    (curve) => {
      vi.spyOn(textFit, 'measureTextContentHeightPx').mockImplementation((source) =>
        source.curve ? 100 : source.text.split('\n').length * 24,
      );
      const updateElement = vi.fn();
      const pushHistory = vi.fn();
      render(
        <TextEditingOverlay
          {...baseProps}
          elements={[{ ...textElement, curve, textAlign: 'left', textBgColor: '#ffffff' }]}
          updateElement={updateElement}
          pushHistory={pushHistory}
          setEditingTextId={vi.fn()}
        />,
      );
      const textarea = screen.getByRole('textbox');
      const box = textarea.parentElement as HTMLElement;
      expect(screen.getByText('نص منحني')).toBeInTheDocument();
      expect(textarea).toHaveAccessibleDescription('نص منحني');
      expect(textarea.style.paddingTop).toBe('38px');
      expect(textarea.style.paddingBottom).toBe('38px');
      expect(textarea.style.textAlign).toBe('center');
      expect(box.style.top).toBe('200px');
      expect(box.style.minHeight).toBe('100px');
      // الخلفية المعتمة للمحرر لا تحجب القوس الخافت في Konva.
      expect(box.style.backgroundColor).toBe('transparent');

      fireEvent.change(textarea, { target: { value: 'First\nSecond' } });
      expect(textarea).toHaveValue('First\nSecond');
      expect(textarea.style.paddingTop).toBe('26px');
      expect(textarea.style.paddingBottom).toBe('26px');
      expect(updateElement).not.toHaveBeenCalled();
      expect(pushHistory).not.toHaveBeenCalled();
    },
  );

  it('keeps straight text at the top without a curve badge', () => {
    render(
      <TextEditingOverlay
        {...baseProps}
        elements={[{ ...textElement, text: 'First\nSecond', textAlign: 'left' }]}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );
    const textarea = screen.getByRole('textbox');
    expect(screen.queryByText('نص منحني')).not.toBeInTheDocument();
    expect(textarea.style.paddingTop).toBe('0px');
    expect(textarea.style.textAlign).toBe('left');
    expect(textarea).toHaveValue('First\nSecond');
  });

  it('keeps curved raw newlines through one commit, blur and undo/reopen', () => {
    const updateElement = vi.fn();
    const pushHistory = vi.fn();
    const props = {
      ...baseProps,
      elements: [{ ...textElement, text: 'First\nSecond', curve: 50 }],
      updateElement,
      pushHistory,
      setEditingTextId: vi.fn(),
    };
    const { rerender } = render(<TextEditingOverlay {...props} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('First\nSecond');
    fireEvent.change(textarea, { target: { value: 'Edited\nSecond' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(updateElement).not.toHaveBeenCalled();
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.blur(textarea);
    expect(updateElement).toHaveBeenCalledTimes(1);
    expect(updateElement).toHaveBeenCalledWith(
      'text-1',
      expect.objectContaining({ text: 'Edited\nSecond' }),
    );
    expect(pushHistory).toHaveBeenCalledTimes(1);
    rerender(<TextEditingOverlay {...props} editingTextId={null} />);
    rerender(<TextEditingOverlay {...props} />);
    expect(screen.getByRole('textbox')).toHaveValue('First\nSecond');
  });

  it('uses the supported display weight without overwriting the stored weight', () => {
    const updateElement = vi.fn();
    const source = { ...textElement, fontFamily: 'Cairo', fontWeight: 800 };
    render(
      <TextEditingOverlay
        {...baseProps}
        elements={[source]}
        updateElement={updateElement}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );
    expect(screen.getByRole('textbox').style.fontWeight).toBe('700');
    expect(source.fontWeight).toBe(800);
    expect(updateElement).not.toHaveBeenCalled();
  });

  it('expands the badge around the text box and keeps content width equal to Konva', () => {
    render(
      <TextEditingOverlay
        {...baseProps}
        elements={[
          {
            ...textElement,
            textBgColor: '#ffffff',
            textBgPaddingX: 20,
            textBgPaddingY: 10,
            textBgRadius: 8,
          },
        ]}
        updateElement={vi.fn()}
        pushHistory={vi.fn()}
        setEditingTextId={vi.fn()}
      />,
    );

    const textarea = screen.getByRole('textbox');
    const container = textarea.parentElement as HTMLElement;

    // w = 0.3 × 1000 = 300، الحشوة 20/10 → الشارة 340×120 عند (80,190)
    expect(container.style.left).toBe('80px');
    expect(container.style.top).toBe('190px');
    expect(container.style.width).toBe('340px');
    expect(container.style.minHeight).toBe('120px');
    // padding داخل الحدود = نفس حشوة الشارة، فيبقى عرض محتوى النص 300px
    expect(textarea.style.paddingTop).toBe('10px');
    expect(textarea.style.paddingRight).toBe('20px');
    expect(textarea.style.paddingBottom).toBe('10px');
    expect(textarea.style.paddingLeft).toBe('20px');
    // ارتفاع المحتوى الكامل = صندوق النص + حشوة عمودية (border-box)
    expect(textarea.style.minHeight).toBe('120px');
  });
});
