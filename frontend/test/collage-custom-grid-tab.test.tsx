import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollageCustomGridTab } from '../src/components/editor/panels/collage/collage-custom-grid-tab';
import { GeneralSettings } from '../src/components/editor/properties/general-settings';

describe('CollageCustomGridTab Component Suite', () => {
  const defaultProps = {
    rows: 2,
    cols: 3,
    photoType: 'iq-national-id' as const,
    gridAlign: 'top-left' as const,
    isCustomActive: false,
    canvasWidth: 2480,
    canvasHeight: 3508,
    storedDpi: 300,
    onRowsChange: vi.fn(),
    onColsChange: vi.fn(),
    onApply: vi.fn(),
    onPhotoTypeChange: vi.fn(),
    onGridAlignChange: vi.fn(),
    onSaveCurrentAsTemplate: vi.fn(),
  };

  it('renders all photo grid section cards cleanly according to Fluent 2 layout', () => {
    render(<CollageCustomGridTab {...defaultProps} />);

    // Section 1: Dimensions
    expect(screen.getByText('أبعاد الشبكة')).toBeInTheDocument();
    expect(screen.getByText('الصفوف')).toBeInTheDocument();
    expect(screen.getByText('الأعمدة')).toBeInTheDocument();
    expect(screen.getByText('ملء الورقة')).toBeInTheDocument();
    expect(screen.getByText('شريط سريع')).toBeInTheDocument();

    // Section 2: Photo Size
    expect(screen.getByText('مقاس الصورة')).toBeInTheDocument();
    expect(screen.getByText('وطنية')).toBeInTheDocument();
    expect(screen.getByText('أحوال')).toBeInTheDocument();
    expect(screen.getByText('فيزا')).toBeInTheDocument();
    expect(screen.getByText('تمدد حر')).toBeInTheDocument();

    // Section 3: Alignment
    expect(screen.getByText('المحاذاة على الورقة')).toBeInTheDocument();
    expect(screen.getByText('توسيط')).toBeInTheDocument();

    // Section 4: Actions
    expect(screen.getByText('تطبيق الشبكة')).toBeInTheDocument();
    expect(screen.getByText('حفظ كقالب')).toBeInTheDocument();
  });

  it('calls onRowsChange when row stepper buttons are clicked', () => {
    const onRowsChange = vi.fn();
    render(<CollageCustomGridTab {...defaultProps} onRowsChange={onRowsChange} />);

    const decButton = screen.getByTitle('تقليل صف');
    fireEvent.click(decButton);
    expect(onRowsChange).toHaveBeenCalledWith(1);

    const incButton = screen.getByTitle(/إضافة صف/);
    fireEvent.click(incButton);
    expect(onRowsChange).toHaveBeenCalledWith(3);
  });

  it('calls onColsChange when col stepper buttons are clicked', () => {
    const onColsChange = vi.fn();
    render(<CollageCustomGridTab {...defaultProps} onColsChange={onColsChange} />);

    const decButton = screen.getByTitle('تقليل عمود');
    fireEvent.click(decButton);
    expect(onColsChange).toHaveBeenCalledWith(2);

    const incButton = screen.getByTitle(/إضافة عمود/);
    fireEvent.click(incButton);
    expect(onColsChange).toHaveBeenCalledWith(4);
  });

  it('switches photo type when preset is clicked', () => {
    const onPhotoTypeChange = vi.fn();
    render(<CollageCustomGridTab {...defaultProps} onPhotoTypeChange={onPhotoTypeChange} />);

    const civilButton = screen.getByText('أحوال');
    fireEvent.click(civilButton);
    expect(onPhotoTypeChange).toHaveBeenCalledWith('iq-civil-id');
  });

  it('handles quick presets like fill sheet and corner strip', () => {
    const onRowsChange = vi.fn();
    const onColsChange = vi.fn();
    const onApply = vi.fn();
    const onGridAlignChange = vi.fn();

    render(
      <CollageCustomGridTab
        {...defaultProps}
        onRowsChange={onRowsChange}
        onColsChange={onColsChange}
        onApply={onApply}
        onGridAlignChange={onGridAlignChange}
      />
    );

    const fillSheetBtn = screen.getByText('ملء الورقة');
    fireEvent.click(fillSheetBtn);
    expect(onRowsChange).toHaveBeenCalled();
    expect(onColsChange).toHaveBeenCalled();
    expect(onApply).toHaveBeenCalled();

    const cornerStripBtn = screen.getByText('شريط سريع');
    fireEvent.click(cornerStripBtn);
    expect(onRowsChange).toHaveBeenCalledWith(1);
    expect(onGridAlignChange).toHaveBeenCalledWith('top-left');
  });

  it('toggles template save form on clicking save button', () => {
    render(<CollageCustomGridTab {...defaultProps} />);

    const saveBtn = screen.getByText('حفظ كقالب');
    fireEvent.click(saveBtn);

    expect(screen.getByPlaceholderText(/اسم القالب/)).toBeInTheDocument();
    expect(screen.getByTitle('إلغاء')).toBeInTheDocument();
  });
});

describe('GeneralSettings (Paper Tab Properties)', () => {
  it('renders Canvas Dimensions, Paper Background, and Grid Columns sections', () => {
    render(<GeneralSettings />);

    expect(screen.getByText('مساحة العمل')).toBeInTheDocument();
    expect(screen.getByText('خلفية الورقة')).toBeInTheDocument();
  });
});
