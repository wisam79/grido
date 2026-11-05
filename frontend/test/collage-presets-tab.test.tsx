import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { CollagePresetsTab } from '../src/components/editor/panels/collage/collage-presets-tab';

describe('CollagePresetsTab Component Suite', () => {
  const defaultProps = {
    activeTemplateId: undefined,
    onSelect: vi.fn(),
    savedTemplates: [],
    onDeleteTemplate: vi.fn(),
    onImportClick: vi.fn(),
    onExportAllClick: vi.fn(),
  };

  it('renders search input for saved templates', () => {
    render(<CollagePresetsTab {...defaultProps} />);

    expect(screen.getByPlaceholderText(/بحث في قوالبي المحفوظة/)).toBeInTheDocument();
  });

  it('renders empty state when list is empty', () => {
    render(<CollagePresetsTab {...defaultProps} savedTemplates={[]} />);

    expect(screen.getByText('لا توجد قوالب محفوظة')).toBeInTheDocument();
    expect(screen.getByText('استيراد قالب JSON')).toBeInTheDocument();
  });

  it('filters saved templates when searching', () => {
    const savedTemplates = [
      {
        id: 'collage-user-1',
        name: 'قالب جواز مخصص',
        slots: 4,
        cells: [{ x: 0, y: 0, w: 0.5, h: 0.5 }],
      },
      {
        id: 'collage-user-2',
        name: 'شبكة هوية وطنية',
        slots: 8,
        cells: [{ x: 0, y: 0, w: 0.25, h: 0.5 }],
      },
    ];

    render(<CollagePresetsTab {...defaultProps} savedTemplates={savedTemplates} />);

    const searchInput = screen.getByPlaceholderText(/بحث في قوالبي المحفوظة/);
    fireEvent.change(searchInput, { target: { value: 'جواز' } });

    expect(screen.getByText('قالب جواز مخصص')).toBeInTheDocument();
    expect(screen.queryByText('شبكة هوية وطنية')).not.toBeInTheDocument();
  });

  it('renders saved templates list and handles select and export all', () => {
    const onSelect = vi.fn();
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
        onSelect={onSelect}
        savedTemplates={savedTemplates}
        onExportAllClick={onExportAllClick}
      />,
    );

    expect(screen.getByText('قالب الجواز الخاص بي')).toBeInTheDocument();
    expect(screen.getByText('تصدير الكل')).toBeInTheDocument();

    fireEvent.click(screen.getByText('قالب الجواز الخاص بي'));
    expect(onSelect).toHaveBeenCalledWith(savedTemplates[0]);

    fireEvent.click(screen.getByText('تصدير الكل'));
    expect(onExportAllClick).toHaveBeenCalled();
  });
});
