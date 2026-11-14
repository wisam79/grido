import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { CollagePresetsTab } from '../src/components/editor/panels/collage/collage-presets-tab';

describe('CollagePresetsTab Component Suite', () => {
  const defaultProps = {
    activeTemplateId: undefined,
    onSelect: vi.fn(),
    savedTemplates: [],
    savedTemplatesStatus: 'loaded' as const,
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

  it('places paper previews above two-line names in a two-column library with separate footer actions', () => {
    const savedTemplates = [
      {
        id: 'collage-user-visual-1',
        name: 'قالب الجواز الخاص بي',
        slots: 4,
        cells: [{ x: 0, y: 0, w: 0.5, h: 0.5 }],
      },
      {
        id: 'collage-user-visual-2',
        name: 'شبكة هوية وطنية',
        slots: 8,
        cells: [{ x: 0, y: 0, w: 0.25, h: 0.5 }],
      },
    ];
    render(
      <CollagePresetsTab
        {...defaultProps}
        savedTemplates={savedTemplates}
        activeTemplateId={savedTemplates[0].id}
      />,
    );

    const select = screen.getByRole('button', { name: 'قالب الجواز الخاص بي 4 صور' });
    const card = select.parentElement!;
    const preview = select.firstElementChild!;
    const label = screen.getByText(savedTemplates[0].name);
    expect(card.parentElement).toHaveClass('grid', 'grid-cols-2', 'gap-2');
    expect(card).toHaveClass('rounded-md', 'border-primary/60');
    expect(select).toHaveAttribute('aria-pressed', 'true');
    expect(preview).toHaveClass(
      'h-30',
      'w-full',
      'bg-preview-surface',
      'items-center',
      'justify-center',
    );
    expect(preview.firstElementChild).toHaveAttribute('viewBox', '0 0 100 142');
    expect(select.lastElementChild).toBe(label);
    expect(label).toHaveClass('text-control', 'line-clamp-2', 'min-h-9');
    expect(preview.querySelector('.absolute[aria-hidden="true"]')).not.toBeNull();
    expect(select.querySelector('button')).toBeNull();
    for (const name of [
      'إضافة إلى المفضلة: قالب الجواز الخاص بي',
      'حذف القالب قالب الجواز الخاص بي',
    ]) {
      const action = screen.getByRole('button', { name });
      expect(action).toHaveClass('size-7', 'coarse-touch-target');
      expect(action).not.toHaveClass('opacity-0');
      expect(card.lastElementChild).toContainElement(action);
      expect(select).not.toContainElement(action);
    }
    expect(card.lastElementChild).toHaveTextContent('4 صور');
    expect(screen.getByRole('searchbox')).toHaveClass('h-8', 'w-full');
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
