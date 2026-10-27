import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CollageCustomGridTab } from '../src/components/editor/panels/collage/collage-custom-grid-tab';
import { GeneralSettings } from '../src/components/editor/properties/general-settings';
import { TooltipProvider } from '../src/components/ui/tooltip';

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

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders all photo grid section cards and allows independent card collapse', async () => {
    render(<CollageCustomGridTab {...defaultProps} />);

    // Section 1: Dimensions (مفتوح افتراضياً)
    expect(screen.getByText('أبعاد الشبكة')).toBeInTheDocument();
    expect(screen.getByText('الصفوف')).toBeInTheDocument();
    expect(screen.getByText('الأعمدة')).toBeInTheDocument();
    expect(screen.getByText('ملء الورقة')).toBeInTheDocument();
    expect(screen.getByText('شريط علوي')).toBeInTheDocument();
    // عدد الصور الحالي مشتق من الصفوف×الأعمدة — لا شارة مكررة له
    expect(screen.queryByLabelText('عدد صور الشبكة الحالية')).not.toBeInTheDocument();

    // Section 2: Photo Size (مفتوح افتراضياً أيضاً)
    expect(screen.getByText('مقاس الصورة')).toBeInTheDocument();
    expect(screen.getByText('وطنية')).toBeInTheDocument();
    expect(screen.getByText('أحوال')).toBeInTheDocument();
    expect(screen.getByText('فيزا')).toBeInTheDocument();
    expect(screen.getByText('تمدد حر')).toBeInTheDocument();

    // Section 3: Alignment (مفتوح افتراضياً أيضاً)
    expect(screen.getByText('المحاذاة على الورقة')).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'نقطة ارتكاز الصور على الورقة' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'توسيط' })).toBeInTheDocument();

    // طي بطاقة مقاس الصورة بشكل مستقل
    fireEvent.click(screen.getByText('مقاس الصورة'));
    await waitFor(() => {
      expect(screen.queryByText('وطنية')).not.toBeInTheDocument();
    });
    // بقية البطاقات تظل مفتوحة ومستقلة ولا تُطوى تلقائياً
    expect(screen.getByText('الصفوف')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'توسيط' })).toBeInTheDocument();

    // إعادة فتح مقاس الصورة: تفتح وتبقى بقية البطاقات مفتوحة معاً في الوقت نفسه
    fireEvent.click(screen.getByText('مقاس الصورة'));
    await waitFor(() => {
      expect(screen.getByText('وطنية')).toBeInTheDocument();
    });
    expect(screen.getByText('الصفوف')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'توسيط' })).toBeInTheDocument();

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

    // قسم مقاس الصورة مفتوح افتراضياً
    const civilButton = screen.getByText('أحوال');
    fireEvent.click(civilButton);
    expect(onPhotoTypeChange).toHaveBeenCalledWith('iq-civil-id');
  });

  it('applies quick presets once with a final value (no intermediate states)', () => {
    const onRowsChange = vi.fn();
    const onColsChange = vi.fn();
    const onApply = vi.fn();

    render(
      <CollageCustomGridTab
        {...defaultProps}
        onRowsChange={onRowsChange}
        onColsChange={onColsChange}
        onApply={onApply}
      />,
    );

    // A4 300dpi بمقاس 35×45 = أقصى 6 صفوف × 5 أعمدة
    fireEvent.click(screen.getByText('ملء الورقة'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(6, 5, 'iq-national-id', 'top-left');
    // لا نداءات وسيطة تُلوّث سجل التراجع
    expect(onRowsChange).not.toHaveBeenCalled();
    expect(onColsChange).not.toHaveBeenCalled();

    onApply.mockClear();
    fireEvent.click(screen.getByText('شريط علوي'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(1, 4, 'iq-national-id', 'top-left');
  });

  it('keeps quick layouts available in stretch mode without an alignment matrix', () => {
    const onApply = vi.fn();
    render(<CollageCustomGridTab {...defaultProps} photoType="stretch" onApply={onApply} />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ملء الورقة فوراً' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('شريط علوي'));
    expect(onApply).toHaveBeenCalledWith(1, 4, 'stretch', 'top-left');
  });

  it('keeps the alignment matrix as the only position control (no shortcut buttons)', () => {
    const onGridAlignChange = vi.fn();
    render(<CollageCustomGridTab {...defaultProps} onGridAlignChange={onGridAlignChange} />);

    expect(screen.queryByText('ركن القص')).not.toBeInTheDocument();
    // «توسيط» اسم وصولي لنقطة المصفوفة فقط، لا زر مختصر مرئي
    expect(screen.queryByText('توسيط')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'أعلى اليمين' }));
    expect(onGridAlignChange).toHaveBeenCalledWith('top-right');
  });

  it('reflects the applied canvas grid on the apply button without a status card', () => {
    const { rerender } = render(<CollageCustomGridTab {...defaultProps} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTitle('تطبيق الشبكة على الكانفس')).toBeInTheDocument();

    rerender(
      <CollageCustomGridTab
        {...defaultProps}
        isCustomActive
        appliedGrid={{
          rows: 2,
          cols: 3,
          source: 'physical',
          photoType: 'iq-national-id',
          align: 'top-left',
        }}
      />,
    );
    // لا بطاقة حالة: زر التطبيق وحده يعكس أن الشبكة مطابقة للمطبّق
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('الشبكة مطبقة')).not.toBeInTheDocument();
    expect(screen.getByTitle('إعادة تطبيق الشبكة على الكانفس')).toBeInTheDocument();
    expect(screen.getByText('حفظ كقالب')).toBeInTheDocument();

    // زر التطبيق يبقى فعلاً حقيقياً: يعيد تطبيق نفس التركيب عبر onApply
    fireEvent.click(screen.getByText('تطبيق الشبكة'));
    expect(defaultProps.onApply).toHaveBeenCalledWith(2, 3, 'iq-national-id', 'top-left');
  });

  it('never renders a status card when the form diverges from the applied grid', () => {
    render(
      <CollageCustomGridTab
        {...defaultProps}
        isCustomActive
        appliedGrid={{ rows: 6, cols: 5, source: 'cells' }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('تغييرات غير مطبقة')).not.toBeInTheDocument();
    expect(screen.getByTitle('تطبيق الشبكة على الكانفس')).toBeInTheDocument();
  });

  it('marks the form as pending when the photo type diverges from the applied physical grid', () => {
    render(
      <CollageCustomGridTab
        {...defaultProps}
        isCustomActive
        appliedGrid={{
          rows: 2,
          cols: 3,
          source: 'physical',
          photoType: 'iq-civil-id',
          align: 'top-left',
        }}
      />,
    );
    // مقاس النموذج (وطنية) يخالف المطبق (أحوال) — الزر يعود لحالة «تطبيق» الأساسية
    expect(screen.getByTitle('تطبيق الشبكة على الكانفس')).toBeInTheDocument();
    expect(screen.queryByTitle('إعادة تطبيق الشبكة على الكانفس')).not.toBeInTheDocument();
  });

  it('keeps the apply button available when the applied grid is unknown', () => {
    render(<CollageCustomGridTab {...defaultProps} isCustomActive appliedGrid={null} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTitle('تطبيق الشبكة على الكانفس')).toBeInTheDocument();
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
  it('renders canvas dimensions and paper background without a redundant workspace header', () => {
    render(
      <TooltipProvider>
        <GeneralSettings />
      </TooltipProvider>,
    );

    expect(screen.queryByText('مساحة العمل')).not.toBeInTheDocument();
    expect(screen.getByLabelText('المقاس: A4')).toBeInTheDocument();
    expect(screen.getByLabelText('العرض')).toBeInTheDocument();
    expect(screen.getByLabelText('الارتفاع')).toBeInTheDocument();
    expect(screen.getByText('خلفية الورقة')).toBeInTheDocument();
  });
});
