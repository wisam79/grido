import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollagePresetsTab } from '../src/components/editor/panels/collage/collage-presets-tab';

describe('CollagePresetsTab Component Suite', () => {
  const defaultProps = {
    presetCategory: 'all' as const,
    onPresetCategoryChange: vi.fn(),
    activeTemplateId: undefined,
    onSelect: vi.fn(),
    savedTemplates: [],
    onDeleteTemplate: vi.fn(),
    onImportClick: vi.fn(),
    onExportAllClick: vi.fn(),
  };

  it('renders search input and category selector', () => {
    render(<CollagePresetsTab {...defaultProps} />);

    expect(screen.getByPlaceholderText(/بحث في القوالب/)).toBeInTheDocument();
    expect(screen.getByText(/كافة قوالب الاستوديو/)).toBeInTheDocument();
  });

  it('filters templates when searching', () => {
    render(<CollagePresetsTab {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/بحث في القوالب/);
    fireEvent.change(searchInput, { target: { value: 'جواز' } });

    expect(screen.getByText(/نتائج البحث/)).toBeInTheDocument();
    // At least one template matching "جواز"
    expect(screen.getAllByText(/جواز/).length).toBeGreaterThan(0);
  });

  it('displays the selected category in select trigger', () => {
    render(<CollagePresetsTab {...defaultProps} presetCategory="combo" />);

    expect(screen.getByText(/أطقم تجارية \(كومبو\)/)).toBeInTheDocument();
  });

  it('renders empty state for saved templates when list is empty', () => {
    render(<CollagePresetsTab {...defaultProps} presetCategory="saved" savedTemplates={[]} />);

    expect(screen.getByText('لا توجد قوالب مخصصة محفوظة')).toBeInTheDocument();
    expect(screen.getByText('استيراد قالب JSON')).toBeInTheDocument();
  });

  it('renders saved templates list and handles export all', () => {
    const onExportAllClick = vi.fn();
    const savedTemplates = [
      {
        id: 'collage-user-1',
        name: 'قالب الجواز الخاص بي',
        slots: 4,
        cells: [{ x: 0, y: 0, w: 0.5, h: 0.5 }],
      },
    ];

    render(
      <CollagePresetsTab
        {...defaultProps}
        presetCategory="saved"
        savedTemplates={savedTemplates}
        onExportAllClick={onExportAllClick}
      />
    );

    expect(screen.getByText('قالب الجواز الخاص بي')).toBeInTheDocument();
    expect(screen.getByText('تصدير الكل')).toBeInTheDocument();

    fireEvent.click(screen.getByText('تصدير الكل'));
    expect(onExportAllClick).toHaveBeenCalled();
  });
});
