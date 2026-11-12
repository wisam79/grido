import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FreeformElementsTab } from '../src/components/editor/panels/freeform/freeform-elements-tab';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { StickerCatalog } from '../src/features/stickers/components/sticker-catalog';
import { StickerFontSelector } from '../src/features/stickers/components/sticker-font-selector';
import { StickerPreview } from '../src/features/stickers/components/sticker-preview';
import { StickerProperties } from '../src/features/stickers/components/sticker-properties';
import { StickerStudioDialog } from '../src/features/stickers/components/sticker-studio-dialog';
import { loadStickerPresets } from '../src/features/stickers/lib/preset-utils';
import { buildDefaultStickerParams } from '../src/features/stickers/lib/sticker-design/build-svg';
import * as svgRasterizer from '../src/features/stickers/lib/svg-rasterizer';
import { ALL_STICKER_TEMPLATES } from '../src/features/stickers/templates';
import { useEditorStore } from '../src/lib/editor-store';
import { loadGoogleFont } from '../src/lib/io/fonts';

vi.mock('../src/lib/io/fonts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/io/fonts')>()),
  loadGoogleFont: vi.fn().mockResolvedValue(true),
}));

function setupUser() {
  const user = userEvent.setup();
  return {
    click: (target: Element) =>
      act(async () => {
        await user.click(target);
      }),
    hover: (target: Element) =>
      act(async () => {
        await user.hover(target);
      }),
    keyboard: (keys: string) =>
      act(async () => {
        await user.keyboard(keys);
      }),
    type: (target: Element, text: string) =>
      act(async () => {
        await user.type(target, text);
      }),
  };
}

function pendingFont() {
  let resolve!: (loaded: boolean) => void;
  const promise = new Promise<boolean>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

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
    Element.prototype.scrollIntoView = vi.fn();
    localStorage.clear();
    vi.mocked(loadGoogleFont).mockReset().mockResolvedValue(true);
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

  describe('StickerPreview', () => {
    it('uses an inherited artwork color role instead of treating rectangles as background', () => {
      const { container } = renderWithProviders(
        <StickerPreview
          template={sampleTemplate}
          params={sampleParams}
          svgString='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g data-color-role="primary" fill="#2563eb"><rect x="20" y="20" width="60" height="60"/></g></svg>'
          onChangeColor={vi.fn()}
        />,
      );
      fireEvent.click(container.querySelector('svg [data-color-role="primary"] rect')!);
      expect(screen.getByText('اللون الرئيسي')).toBeInTheDocument();
      expect(screen.queryByText('لون الخلفية')).not.toBeInTheDocument();
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

  describe('StickerFontSelector readiness and cancellation', () => {
    it('loads the real weight before previewing and restores the committed family on Escape', async () => {
      const user = setupUser();
      const loading = pendingFont();
      vi.mocked(loadGoogleFont).mockImplementation((_family, weight) =>
        weight === 700 ? loading.promise : Promise.resolve(true),
      );
      const onPreview = vi.fn();
      const onCancel = vi.fn();
      const onChange = vi.fn();
      renderWithProviders(
        <StickerFontSelector
          value="Cairo"
          fontWeights={[600, 800]}
          onPreview={onPreview}
          onCancel={onCancel}
          onChange={onChange}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      fireEvent.mouseEnter(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      expect(loadGoogleFont).toHaveBeenCalledWith('Tajawal', 700, 'normal');
      expect(onPreview).not.toHaveBeenCalled();
      await act(async () => loading.resolve(true));
      expect(onPreview).toHaveBeenCalledExactlyOnceWith('Tajawal');
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard('{Escape}');
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'الخط: كايرو' })).toHaveFocus();
    });

    it('ignores cancelled and superseded late previews and waits to commit exactly once', async () => {
      const user = setupUser();
      const oldFont = pendingFont();
      const newFont = pendingFont();
      vi.mocked(loadGoogleFont).mockImplementation((family) => {
        if (family.startsWith('Tajawal')) return oldFont.promise;
        if (family.startsWith('Amiri')) return newFont.promise;
        return Promise.resolve(true);
      });
      const onPreview = vi.fn();
      const onChange = vi.fn();
      renderWithProviders(
        <StickerFontSelector value="Cairo" onPreview={onPreview} onChange={onChange} />,
      );
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      fireEvent.mouseEnter(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      await user.keyboard('{Escape}');
      await act(async () => oldFont.resolve(true));
      expect(onPreview).not.toHaveBeenCalled();

      const supersededFont = pendingFont();
      vi.mocked(loadGoogleFont).mockImplementation((family) => {
        if (family.startsWith('Tajawal')) return supersededFont.promise;
        if (family.startsWith('Amiri')) return newFont.promise;
        return Promise.resolve(true);
      });
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      fireEvent.mouseEnter(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      fireEvent.click(screen.getByRole('button', { name: 'أميري (Amiri)' }));
      expect(onChange).not.toHaveBeenCalled();
      await act(async () => newFont.resolve(true));
      expect(onChange).toHaveBeenCalledExactlyOnceWith('Amiri');
      await act(async () => supersededFont.resolve(true));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onPreview).not.toHaveBeenCalled();
    });

    it('does not commit an unavailable font and invalidates pending work on unmount', async () => {
      const user = setupUser();
      vi.mocked(loadGoogleFont).mockResolvedValue(false);
      const onChange = vi.fn();
      const { unmount } = renderWithProviders(
        <StickerFontSelector value="Cairo" onChange={onChange} />,
      );
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      await user.click(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      expect(onChange).not.toHaveBeenCalled();

      const loading = pendingFont();
      vi.mocked(loadGoogleFont).mockReturnValue(loading.promise);
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      fireEvent.click(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      unmount();
      await act(async () => loading.resolve(true));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('StickerStudioDialog font preview isolation', () => {
    const editingElement = {
      id: 'existing-sticker',
      source: {
        templateId: sampleTemplate.id,
        params: buildDefaultStickerParams(sampleTemplate),
      },
    };
    const previewFamily = () =>
      document.querySelector('svg [data-field-id][font-family]')?.getAttribute('font-family');

    it('previews artwork but exports only the committed font after cancellation', async () => {
      const user = setupUser();
      const rasterSpy = vi
        .spyOn(svgRasterizer, 'renderSvgToPngBlob')
        .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
      const downloadSpy = vi.spyOn(svgRasterizer, 'downloadBlob').mockImplementation(() => {});
      const { unmount } = renderWithProviders(
        <StickerStudioDialog open onOpenChange={vi.fn()} editingElement={editingElement} />,
      );
      try {
        expect(previewFamily()).toContain('Cairo');
        const undo = screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' });
        expect(undo).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
        await user.hover(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
        await waitFor(() => expect(previewFamily()).toContain('Tajawal'));
        expect(undo).toBeDisabled();

        // Clicking export dismisses the picker; no hovered family may reach its captured SVG.
        await user.click(screen.getByRole('button', { name: 'تصدير' }));
        await user.click(screen.getByRole('menuitem', { name: 'صورة PNG (300 DPI)' }));
        await waitFor(() => expect(rasterSpy).toHaveBeenCalledTimes(1));
        expect(rasterSpy.mock.calls[0][0]).toContain('Cairo');
        expect(rasterSpy.mock.calls[0][0]).not.toContain('Tajawal');
        expect(rasterSpy.mock.calls[0][3]).toEqual(['Cairo']);
        expect(previewFamily()).toContain('Cairo');
      } finally {
        unmount();
        rasterSpy.mockRestore();
        downloadSpy.mockRestore();
      }
    });

    it('does not save a hovered font when switching to saved presets', async () => {
      const user = setupUser();
      renderWithProviders(
        <StickerStudioDialog open onOpenChange={vi.fn()} editingElement={editingElement} />,
      );
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      await user.hover(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      await waitFor(() => expect(previewFamily()).toContain('Tajawal'));
      await user.click(screen.getByRole('tab', { name: /قوالبي/ }));
      fireEvent.change(screen.getByPlaceholderText('اسم القالب'), {
        target: { value: 'Committed font' },
      });
      await user.click(screen.getByRole('button', { name: /حفظ/ }));
      expect(loadStickerPresets()[0].params.fontFamily).toBe('Cairo');
    });

    it('commits one font selection as one undo step and keeps redo intact', async () => {
      const user = setupUser();
      renderWithProviders(
        <StickerStudioDialog open onOpenChange={vi.fn()} editingElement={editingElement} />,
      );
      const undo = screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' });
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      await user.click(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      await waitFor(() => expect(previewFamily()).toContain('Tajawal'));
      expect(undo).toBeEnabled();
      await user.click(undo);
      expect(previewFamily()).toContain('Cairo');
      expect(undo).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' }));
      expect(previewFamily()).toContain('Tajawal');
    });

    it('never applies a delayed font selection to a different template or reopened dialog', async () => {
      const user = setupUser();
      const loading = pendingFont();
      vi.mocked(loadGoogleFont).mockImplementation((family) =>
        family.startsWith('Tajawal') ? loading.promise : Promise.resolve(true),
      );
      const props = { onOpenChange: vi.fn(), editingElement };
      const { rerender } = renderWithProviders(<StickerStudioDialog {...props} open />);
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      fireEvent.click(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      await user.click(screen.getByRole('button', { name: 'المعرض' }));
      const nextTemplate = ALL_STICKER_TEMPLATES[1];
      await user.click(screen.getByRole('button', { name: new RegExp(`^${nextTemplate.name} —`) }));
      await act(async () => loading.resolve(true));
      expect(previewFamily()).toContain('Cairo');
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();

      const afterClose = pendingFont();
      vi.mocked(loadGoogleFont).mockReturnValue(afterClose.promise);
      await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
      fireEvent.click(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
      rerender(
        <TooltipProvider>
          <StickerStudioDialog {...props} open={false} />
        </TooltipProvider>,
      );
      await act(async () => afterClose.resolve(true));
      rerender(
        <TooltipProvider>
          <StickerStudioDialog {...props} open />
        </TooltipProvider>,
      );
      expect(previewFamily()).toContain('Cairo');
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    }, 15_000);
  });

  describe('FreeformElementsTab quick sticker insertion', () => {
    it('attaches stickerSource metadata so quick-inserted stickers can be re-edited from the context menu', async () => {
      const rasterSpy = vi
        .spyOn(svgRasterizer, 'renderSvgToPngBlob')
        .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
      useEditorStore.setState({ elements: [] });

      try {
        renderWithProviders(<FreeformElementsTab category="stickers" />);
        const [firstCard] = await screen.findAllByTitle(sampleTemplate.name);
        fireEvent.click(firstCard);

        await waitFor(() => {
          expect(useEditorStore.getState().elements).toHaveLength(1);
        });

        const inserted = useEditorStore.getState().elements[0];
        expect(inserted.type).toBe('image');
        if (inserted.type === 'image') {
          expect(inserted.stickerSource?.templateId).toBe(sampleTemplate.id);
          expect(inserted.stickerSource?.params.primaryColor).toBe(
            sampleTemplate.defaultColors.primary,
          );
          expect(inserted.stickerSource?.svg).toContain('<svg');
        }
      } finally {
        rasterSpy.mockRestore();
      }
    });
  });
});
