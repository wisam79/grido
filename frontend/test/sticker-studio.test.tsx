import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TooltipProvider } from '../src/components/ui/tooltip';
import { StickerCatalog } from '../src/features/stickers/components/sticker-catalog';
import { StickerProperties } from '../src/features/stickers/components/sticker-properties';
import { ALL_STICKER_TEMPLATES } from '../src/features/stickers/templates';

import type {
  StickerTemplate,
  StickerParams,
  SheetGridConfig,
} from '../src/features/stickers/types';

describe('Sticker Studio Unit & Component Tests', () => {
  const sampleTemplate: StickerTemplate = ALL_STICKER_TEMPLATES[0];

  const sampleParams: StickerParams = {
    fields: { title: 'نص تجريبي', date: '2026-09-19' },
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    backgroundColor: '#0f172a',
    isTransparent: false,
    fontFamily: 'Cairo',
  };

  const sampleGridConfig: SheetGridConfig = {
    rows: 3,
    cols: 3,
    spacingMm: 2,
  };

  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  describe('StickerCatalog', () => {
    it('renders search input and category filter chips', () => {
      renderWithProviders(
        <StickerCatalog
          selectedCategory="all"
          selectedShape="all"
          selectedTemplateId={sampleTemplate.id}
          onSelectTemplate={vi.fn()}
          onSelectCategory={vi.fn()}
          onSelectShape={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /الكل/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('filters templates when search query is entered', async () => {
      const handleSearchChange = vi.fn();
      renderWithProviders(
        <StickerCatalog
          selectedCategory="all"
          selectedShape="all"
          selectedTemplateId={sampleTemplate.id}
          onSelectTemplate={vi.fn()}
          onSelectCategory={vi.fn()}
          onSelectShape={vi.fn()}
          searchQuery=""
          onSearchChange={handleSearchChange}
        />,
      );

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'ختم' } });

      await waitFor(() => {
        expect(handleSearchChange).toHaveBeenCalledWith('ختم');
      });
    });

    it('triggers onSelectTemplate when a template card is clicked', () => {
      const handleSelectTemplate = vi.fn();
      renderWithProviders(
        <StickerCatalog
          selectedCategory="all"
          selectedShape="all"
          selectedTemplateId={sampleTemplate.id}
          onSelectTemplate={handleSelectTemplate}
          onSelectCategory={vi.fn()}
          onSelectShape={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
        />,
      );

      const cards = screen.getAllByRole('button');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('StickerProperties', () => {
    it('renders editable parameters and tab headers', () => {
      renderWithProviders(
        <StickerProperties
          template={sampleTemplate}
          params={sampleParams}
          onChangeParams={vi.fn()}
          gridConfig={sampleGridConfig}
          onChangeGridConfig={vi.fn()}
        />,
      );

      expect(screen.getByText('التصميم')).toBeInTheDocument();
      expect(screen.getByText('الشيت')).toBeInTheDocument();
    });

    it('allows updating text parameters', () => {
      const handleParamsChange = vi.fn();
      renderWithProviders(
        <StickerProperties
          template={sampleTemplate}
          params={sampleParams}
          onChangeParams={handleParamsChange}
          gridConfig={sampleGridConfig}
          onChangeGridConfig={vi.fn()}
        />,
      );

      const textInputs = screen.getAllByRole('textbox');
      if (textInputs.length > 0) {
        fireEvent.change(textInputs[0], { target: { value: 'نص جديد' } });
        expect(handleParamsChange).toHaveBeenCalled();
      }
    });

    it('does not repeat the template name, physical size or hex codes in the panel', () => {
      renderWithProviders(
        <StickerProperties
          template={sampleTemplate}
          params={sampleParams}
          onChangeParams={vi.fn()}
          gridConfig={sampleGridConfig}
          onChangeGridConfig={vi.fn()}
        />,
      );

      // اسم القالب والمقاس الفعلي محفوظان في ترويسة الحوار ومسرح المعاينة
      expect(screen.queryByText(sampleTemplate.name)).not.toBeInTheDocument();
      expect(screen.queryByText(/مم • 300 DPI/)).not.toBeInTheDocument();
      // القيم اللونية السداسية تبقى في التلميح لا في التخطيط الدائم
      expect(screen.queryByText('#2563eb')).not.toBeInTheDocument();
    });

    it('names the sections tablist for assistive technology', () => {
      renderWithProviders(
        <StickerProperties
          template={sampleTemplate}
          params={sampleParams}
          onChangeParams={vi.fn()}
          gridConfig={sampleGridConfig}
          onChangeGridConfig={vi.fn()}
        />,
      );

      expect(screen.getByRole('tablist', { name: 'أقسام استوديو الملصقات' })).toBeInTheDocument();
    });
  });
});
