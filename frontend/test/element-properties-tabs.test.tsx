import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ElementArrangeTab } from '../src/components/editor/properties/element/tabs/arrange-tab';
import { ElementProperties } from '../src/components/editor/properties/element-properties';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

import type { ShapeElement, TextElement, ImageElement } from '../src/lib/editor-store';

describe('ElementProperties Tab Structure and Deduplication Tests', () => {
  const mockOnUpdate = vi.fn();

  const shapeElement: ShapeElement = {
    id: 'shape-1',
    type: 'shape',
    shape: 'rect',
    x: 0.1,
    y: 0.1,
    width: 0.2,
    height: 0.2,
    fill: '#3b82f6',
    stroke: '#000000',
    strokeWidth: 2,
    radius: 12,
    opacity: 0.8,
    rotation: 0,
    zIndex: 1,
  };

  const textElement: TextElement = {
    id: 'text-1',
    type: 'text',
    text: 'نص تجريبي',
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    color: '#000000',
    fontSize: 24,
    fontFamily: 'Cairo',
    stroke: '#ff0000',
    strokeWidth: 2,
    opacity: 0.9,
    rotation: 0,
    zIndex: 2,
  };

  const imageElement: ImageElement = {
    id: 'img-1',
    type: 'image',
    imageSrc: 'test.png',
    x: 0.1,
    y: 0.1,
    width: 0.4,
    height: 0.4,
    cornerRadius: 16,
    opacity: 0.75,
    rotation: 0,
    zIndex: 3,
  };

  it('renders Shape element properties with corner radius in Style tab, not Effects', () => {
    render(
      <TooltipProvider>
        <ElementProperties element={shapeElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    // 1. Style tab (default): should contain "الزوايا" for rect shape
    expect(screen.getByText('الزوايا')).toBeInTheDocument();

    // 2. Switch to Colors (adjust) tab: should contain "شفافية الشكل"
    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    expect(screen.getByText('شفافية الشكل')).toBeInTheDocument();

    // 3. Switch to Effects tab: should contain "الظل والوهج" but NOT "استدارة الحواف"
    fireEvent.click(screen.getByRole('tab', { name: /التأثيرات/i }));
    expect(screen.getByText('الظل والوهج')).toBeInTheDocument();
    expect(screen.queryByText('استدارة الحواف')).not.toBeInTheDocument();

    // 4. Switch to Arrange tab: should contain "التدوير والقلب" and NOT "الشفافية"
    fireEvent.click(screen.getByRole('tab', { name: /الترتيب/i }));
    expect(screen.getByText('التدوير والقلب')).toBeInTheDocument();
    expect(screen.queryByText('الشفافية')).not.toBeInTheDocument();
  });

  it('does not render corner radius for ellipse shape elements in Style tab', () => {
    const ellipseElement: ShapeElement = {
      ...shapeElement,
      id: 'ellipse-1',
      shape: 'ellipse',
    };

    render(
      <TooltipProvider>
        <ElementProperties element={ellipseElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    expect(screen.queryByText('الزوايا')).not.toBeInTheDocument();
  });

  it('renders Text element properties with stroke in Colors tab and no duplicate in Effects', () => {
    render(
      <TooltipProvider>
        <ElementProperties element={textElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    // 1. Switch to Colors tab: should have "إطار وحدود النص" and "شفافية النص" without duplicate stroke color or HEX text
    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    expect(screen.getByText('إطار وحدود النص')).toBeInTheDocument();
    expect(screen.getByText('شفافية النص')).toBeInTheDocument();
    expect(screen.queryByText('#ff0000')).not.toBeInTheDocument();
    expect(screen.queryByText('ألوان الخلفية والشارة')).not.toBeInTheDocument();

    // 2. Switch to Effects tab: should have "الخلفية والشارة", "الظل والتوهج", but NOT "الإطار والحدود"
    fireEvent.click(screen.getByRole('tab', { name: /التأثيرات/i }));
    expect(screen.getByText('الخلفية والشارة')).toBeInTheDocument();
    expect(screen.getByText('الظل والتوهج')).toBeInTheDocument();
    expect(screen.queryByText('الإطار والحدود')).not.toBeInTheDocument();

    // 3. Switch to Arrange tab: should contain "التدوير والقلب" and NOT "الشفافية", and H should be disabled for text
    fireEvent.click(screen.getByRole('tab', { name: /الترتيب/i }));
    expect(screen.getByText('التدوير والقلب')).toBeInTheDocument();
    expect(screen.queryByText('الشفافية')).not.toBeInTheDocument();
    expect(screen.getByLabelText('H')).toBeDisabled();

    mockOnUpdate.mockClear();
    fireEvent.change(screen.getByLabelText('W'), { target: { value: '45' } });
    expect(mockOnUpdate).toHaveBeenCalledWith(textElement.id, {
      width: 0.45,
      textSizing: 'fixed',
      textResizeAnchor: undefined,
    });
  });

  it('clears textResizeAnchor when typography metrics change in Style tab', () => {
    mockOnUpdate.mockClear();
    const anchoredText: TextElement = {
      ...textElement,
      textResizeAnchor: 'bottom-right',
    };

    render(
      <TooltipProvider>
        <ElementProperties element={anchoredText} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'خط عريض' }));
    expect(mockOnUpdate).toHaveBeenCalledWith(textElement.id, {
      fontWeight: 700,
      textResizeAnchor: undefined,
    });
  });

  it('shows only bundled weights and resolves a legacy unsupported value in the selector', async () => {
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
    try {
      render(
        <TooltipProvider>
          <ElementProperties
            element={{ ...textElement, fontWeight: 800 }}
            onUpdate={mockOnUpdate}
          />
        </TooltipProvider>,
      );
      const weight = screen.getByRole('combobox', { name: 'وزن الخط' });
      expect(weight).toHaveTextContent('عريض 700');
      fireEvent.keyDown(weight, { key: 'ArrowDown' });
      expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
        'عادي 400',
        'عريض 700',
      ]);
    } finally {
      Element.prototype.scrollIntoView = scrollIntoView;
    }
  });

  it('disables the bold toggle for a single-weight font without recording a change', () => {
    mockOnUpdate.mockClear();
    render(
      <TooltipProvider>
        <ElementProperties
          element={{ ...textElement, fontFamily: 'Lalezar', fontWeight: 400 }}
          onUpdate={mockOnUpdate}
        />
      </TooltipProvider>,
    );
    const bold = screen.getByRole('button', { name: 'خط عريض' });
    expect(bold).toBeDisabled();
    fireEvent.click(bold);
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('renders Image element properties with opacity in Colors tab and corner radius in Style tab', () => {
    render(
      <TooltipProvider>
        <ElementProperties element={imageElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    // 1. Style tab: should contain "الزوايا"
    expect(screen.getByText('الزوايا')).toBeInTheDocument();

    // 2. Switch to Colors tab: should contain "تعديل الألوان" and "شفافية الصورة"
    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    expect(screen.getByText('تعديل الألوان')).toBeInTheDocument();
    expect(screen.getByText('شفافية الصورة')).toBeInTheDocument();

    // 3. Switch to Effects tab: should have "الظل والوهج" and NOT "استدارة الحواف"
    fireEvent.click(screen.getByRole('tab', { name: /التأثيرات/i }));
    expect(screen.getByText('الظل والوهج')).toBeInTheDocument();
    expect(screen.queryByText('استدارة الحواف')).not.toBeInTheDocument();

    // 4. Switch to Arrange tab: should have "التدوير والقلب" and NOT "الشفافية"
    fireEvent.click(screen.getByRole('tab', { name: /الترتيب/i }));
    expect(screen.getByText('التدوير والقلب')).toBeInTheDocument();
    expect(screen.queryByText('الشفافية')).not.toBeInTheDocument();
  });

  it('handles edge cases: zero opacity and toggle text stroke in Colors tab', () => {
    mockOnUpdate.mockClear();

    const zeroOpacityImage: ImageElement = {
      ...imageElement,
      id: 'img-zero',
      opacity: 0,
    };

    const { unmount } = render(
      <TooltipProvider>
        <ElementProperties element={zeroOpacityImage} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    // قيمة الشفافية صارت حقلاً رقمياً قابلاً للتحرير (وحدة القياس منفصلة)
    expect(screen.getByRole('textbox', { name: 'قيمة شفافية الصورة' })).toHaveValue('0');

    unmount();

    // Test text stroke button toggle in Colors tab
    render(
      <TooltipProvider>
        <ElementProperties element={textElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    const toggleBtn = screen.getByRole('button', { name: /مفعّل/i });
    fireEvent.click(toggleBtn);

    expect(mockOnUpdate).toHaveBeenCalledWith(textElement.id, { strokeWidth: 0 });
  });
});

describe('ElementArrangeTab — focused size drafts and history', () => {
  const actions = {
    updateElement: useEditorStore.getState().updateElement,
    pushHistory: useEditorStore.getState().pushHistory,
  };
  const shape: ShapeElement = {
    id: 'arrange-shape',
    type: 'shape',
    shape: 'rect',
    x: 0.1,
    y: 0.2,
    width: 0.3,
    height: 0.25,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    fill: '#123456',
    stroke: '#000000',
    strokeWidth: 2,
  };

  function Harness() {
    const element = useEditorStore((state) => state.elements[0]);
    const onUpdate = useEditorStore((state) => state.updateElement);
    return (
      <TooltipProvider>
        <ElementArrangeTab element={element} onUpdate={onUpdate} />
      </TooltipProvider>
    );
  }

  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({ ...actions, elements: [shape], history: [], historyIndex: -1 });
    useEditorStore.getState().pushHistory();
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(['W', 'H'] as const)(
    'Escape discards a below-minimum %s draft before native blur',
    (label) => {
      render(<Harness />);
      const input = screen.getByRole('spinbutton', { name: label });
      act(() => input.focus());
      expect(input).toHaveFocus();
      const onUpdate = vi.spyOn(useEditorStore.getState(), 'updateElement');
      const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');

      fireEvent.change(input, { target: { value: '1' } });
      expect(input).toHaveValue(1);
      expect(onUpdate).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input).not.toHaveFocus();
      expect(input).toHaveValue(label === 'W' ? 30 : 25);
      expect(useEditorStore.getState().elements[0]).toEqual(shape);
      expect(onUpdate).not.toHaveBeenCalled();
      expect(history).not.toHaveBeenCalled();
      expect(useEditorStore.getState().history).toHaveLength(1);
    },
  );

  it.each(['W', 'H'] as const)(
    'Escape keeps the last valid live %s update and records it once',
    (label) => {
      render(<Harness />);
      const input = screen.getByRole('spinbutton', { name: label });
      act(() => input.focus());
      const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
      const axis = label === 'W' ? 'width' : 'height';

      fireEvent.change(input, { target: { value: '45' } });
      expect(input).toHaveFocus();
      expect(useEditorStore.getState().elements[0][axis]).toBe(0.45);
      expect(history).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: '1' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(input).not.toHaveFocus();
      expect(input).toHaveValue(45);
      expect(useEditorStore.getState().elements[0][axis]).toBe(0.45);
      expect(history).toHaveBeenCalledTimes(1);
      expect(useEditorStore.getState().history).toHaveLength(2);

      // The cancellation guard must be consumed by blur, not leak into the next edit.
      act(() => input.focus());
      fireEvent.change(input, { target: { value: '2' } });
      act(() => input.blur());
      expect(input).toHaveValue(5);
      expect(useEditorStore.getState().elements[0][axis]).toBe(0.05);
      expect(history).toHaveBeenCalledTimes(2);
      expect(useEditorStore.getState().history).toHaveLength(3);
    },
  );

  it.each(['W', 'H'] as const)(
    'Enter then native blur commits a below-minimum %s draft only once',
    (label) => {
      render(<Harness />);
      const input = screen.getByRole('spinbutton', { name: label });
      act(() => input.focus());
      const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
      fireEvent.change(input, { target: { value: '2' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      act(() => input.blur());

      expect(input).toHaveValue(5);
      expect(useEditorStore.getState().elements[0][label === 'W' ? 'width' : 'height']).toBe(0.05);
      expect(history).toHaveBeenCalledTimes(1);
      expect(useEditorStore.getState().history).toHaveLength(2);
    },
  );

  it.each(['W', 'H'] as const)(
    'an empty %s draft restores the live value on blur without history',
    (label) => {
      render(<Harness />);
      const input = screen.getByRole('spinbutton', { name: label });
      act(() => input.focus());
      const history = vi.spyOn(useEditorStore.getState(), 'pushHistory');
      fireEvent.change(input, { target: { value: '' } });
      expect(input).toHaveValue(null);
      act(() => input.blur());

      expect(input).toHaveValue(label === 'W' ? 30 : 25);
      expect(useEditorStore.getState().elements[0]).toEqual(shape);
      expect(history).not.toHaveBeenCalled();
    },
  );
});
