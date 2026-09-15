import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { ElementProperties } from '../src/components/editor/properties/element-properties';
import { TooltipProvider } from '../src/components/ui/tooltip';
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
      </TooltipProvider>
    );

    // 1. Style tab (default): should contain "استدارة الزوايا" for rect shape
    expect(screen.getByText('استدارة الزوايا')).toBeInTheDocument();

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
      </TooltipProvider>
    );

    expect(screen.queryByText('استدارة الزوايا')).not.toBeInTheDocument();
  });

  it('renders Text element properties with stroke in Colors tab and no duplicate in Effects', () => {
    render(
      <TooltipProvider>
        <ElementProperties element={textElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>
    );

    // 1. Switch to Colors tab: should have "حدود النص (إطار خارجي)" and "شفافية النص"
    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    expect(screen.getByText('حدود النص (إطار خارجي)')).toBeInTheDocument();
    expect(screen.getByText('شفافية النص')).toBeInTheDocument();

    // 2. Switch to Effects tab: should have "الخلفية والشارة", "الظل والتوهج", but NOT "الإطار والحدود"
    fireEvent.click(screen.getByRole('tab', { name: /التأثيرات/i }));
    expect(screen.getByText('الخلفية والشارة')).toBeInTheDocument();
    expect(screen.getByText('الظل والتوهج')).toBeInTheDocument();
    expect(screen.queryByText('الإطار والحدود')).not.toBeInTheDocument();

    // 3. Switch to Arrange tab: should contain "التدوير والقلب" and NOT "الشفافية"
    fireEvent.click(screen.getByRole('tab', { name: /الترتيب/i }));
    expect(screen.getByText('التدوير والقلب')).toBeInTheDocument();
    expect(screen.queryByText('الشفافية')).not.toBeInTheDocument();
  });

  it('renders Image element properties with opacity in Colors tab and corner radius in Style tab', () => {
    render(
      <TooltipProvider>
        <ElementProperties element={imageElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>
    );

    // 1. Style tab: should contain "استدارة الزوايا"
    expect(screen.getByText('استدارة الزوايا')).toBeInTheDocument();

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
      </TooltipProvider>
    );

    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    expect(screen.getByText('0 %')).toBeInTheDocument();

    unmount();

    // Test text stroke button toggle in Colors tab
    render(
      <TooltipProvider>
        <ElementProperties element={textElement} onUpdate={mockOnUpdate} />
      </TooltipProvider>
    );

    fireEvent.click(screen.getByRole('tab', { name: /الألوان/i }));
    const toggleBtn = screen.getByRole('button', { name: /مفعّل/i });
    fireEvent.click(toggleBtn);

    expect(mockOnUpdate).toHaveBeenCalledWith(textElement.id, { strokeWidth: 0 });
  });
});
