import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollagePresetsTab } from '../src/components/editor/panels/collage/collage-presets-tab';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { StickerCatalog } from '../src/features/stickers/components/sticker-catalog';
import { buildStickerSvg } from '../src/features/stickers/lib/sticker-design/build-svg';
import { normalizeArabicQuery } from '../src/features/stickers/lib/sticker-text';
import {
  ALL_STICKER_TEMPLATES,
  searchStickerTemplates,
  getTemplateShape,
} from '../src/features/stickers/templates';
import {
  ASSET_FAVORITES_KEY,
  assetFavoriteId,
  readAssetFavorites,
} from '../src/lib/asset-favorites';
import type { StickerCatalogProps } from '../src/features/stickers/components/sticker-catalog';
import type { CollageTemplate } from '../src/lib/templates';

// Only the heavy thumbnail SVG builder is replaced. Catalog, search, cards and actions are real.
vi.mock('../src/features/stickers/lib/sticker-design/build-svg', () => ({
  buildDefaultStickerParams: () => ({}),
  buildStickerSvg: vi.fn(() => '<svg viewBox="0 0 10 10"><rect width="10" height="10" /></svg>'),
}));

const savedTemplates: CollageTemplate[] = [
  { id: 'collage-user-1', name: 'إطـار أُسرة', slots: 4, cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
  { id: 'collage-user-2', name: 'هوية وطنية', slots: 8, cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
];
const onSelect = vi.fn();

function StickerHarness({
  overrides = {},
  retainDiscovery = false,
}: {
  overrides?: Partial<StickerCatalogProps>;
  retainDiscovery?: boolean;
}) {
  const [query, setQuery] = useState(overrides.searchQuery ?? '');
  const [category, setCategory] = useState<StickerCatalogProps['selectedCategory']>(
    overrides.selectedCategory ?? 'all',
  );
  const [shape, setShape] = useState<StickerCatalogProps['selectedShape']>(
    overrides.selectedShape ?? 'all',
  );
  const [discovery, setDiscovery] = useState({ favoritesOnly: false, scrollTop: 0 });
  const [gallery, setGallery] = useState(true);
  return (
    <TooltipProvider>
      {!gallery && (
        <button type="button" onClick={() => setGallery(true)}>
          العودة للمعرض
        </button>
      )}
      {gallery && (
        <StickerCatalog
          selectedCategory={category}
          selectedShape={shape}
          selectedTemplateId=""
          onSelectTemplate={(template) => {
            onSelect(template);
            if (retainDiscovery) setGallery(false);
          }}
          onSelectCategory={setCategory}
          onSelectShape={setShape}
          searchQuery={query}
          onSearchChange={setQuery}
          {...overrides}
          discoveryState={retainDiscovery ? discovery : undefined}
          onDiscoveryStateChange={retainDiscovery ? setDiscovery : undefined}
        />
      )}
    </TooltipProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  onSelect.mockClear();
  // Exercise actual lazy preview rendering rather than leaving every preview unverified.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ isIntersecting: true, target } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      disconnect() {}
      unobserve() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderCollage(props: Partial<React.ComponentProps<typeof CollagePresetsTab>> = {}) {
  return render(
    <CollagePresetsTab
      activeTemplateId={undefined}
      onSelect={onSelect}
      savedTemplates={savedTemplates}
      savedTemplatesStatus="loaded"
      {...props}
    />,
  );
}

describe('real collage library discovery', () => {
  it('does not equate saved templates with favorites; star never applies a template', () => {
    renderCollage();
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    expect(screen.getByText('لا توجد مفضلة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    const star = screen.getByRole('button', { name: 'إضافة إلى المفضلة: إطـار أُسرة' });
    expect(star).toHaveClass('coarse-touch-target');
    fireEvent.click(star);
    expect(onSelect).not.toHaveBeenCalled();
    expect(readAssetFavorites()).toEqual(['collage:saved:collage-user-1']);
    expect(screen.getByRole('button', { name: 'إزالة من المفضلة: إطـار أُسرة' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByText('إطـار أُسرة'));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(savedTemplates[0]);
  });

  it('normalizes Arabic search, clears with focus, and keeps favorites-only filtering', () => {
    localStorage.setItem(ASSET_FAVORITES_KEY, JSON.stringify(['collage:saved:collage-user-1']));
    renderCollage();
    const search = screen.getByRole('searchbox', { name: 'بحث في قوالبي المحفوظة' });
    fireEvent.change(search, { target: { value: 'اطار اسره' } });
    expect(screen.getByText('إطـار أُسرة')).toBeInTheDocument();
    expect(screen.queryByText('هوية وطنية')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    fireEvent.change(search, { target: { value: 'لا يطابق' } });
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد مفضلة')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'مسح البحث' })[0]);
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.getByRole('button', { name: 'المفضلة' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('هوية وطنية')).not.toBeInTheDocument();
    expect(readAssetFavorites()).toEqual(['collage:saved:collage-user-1']);
  });

  it('prunes only actual deleted custom IDs after verified loading, never unseen builtins', () => {
    const unseen = 'sticker:builtin:unseen';
    localStorage.setItem(
      ASSET_FAVORITES_KEY,
      JSON.stringify(['collage:saved:collage-user-1', 'collage:saved:collage-user-2', unseen]),
    );
    const { rerender } = renderCollage({ savedTemplates: [], savedTemplatesStatus: undefined });
    expect(screen.queryByText('لا توجد قوالب محفوظة')).not.toBeInTheDocument();
    expect(readAssetFavorites()).toHaveLength(3);
    rerender(
      <CollagePresetsTab
        activeTemplateId={undefined}
        onSelect={onSelect}
        savedTemplates={savedTemplates.slice(1)}
        savedTemplatesStatus="loaded"
      />,
    );
    expect(readAssetFavorites()).toEqual(['collage:saved:collage-user-2', unseen]);
  });

  it('distinguishes loading, unverified, error and confirmed empty; callbacks fire once', () => {
    const retry = vi.fn();
    const customize = vi.fn();
    const { rerender } = renderCollage({ savedTemplates: [], savedTemplatesStatus: 'loading' });
    expect(screen.getByText('جارٍ تحميل القوالب المحفوظة…')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد قوالب محفوظة')).not.toBeInTheDocument();
    rerender(
      <CollagePresetsTab
        activeTemplateId={undefined}
        onSelect={onSelect}
        savedTemplatesStatus="error"
        onRetryLoad={retry}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('تعذر تحميل القوالب المحفوظة');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(
      <CollagePresetsTab
        activeTemplateId={undefined}
        onSelect={onSelect}
        savedTemplatesStatus="loaded"
        onCustomizeClick={customize}
      />,
    );
    expect(screen.getByText('لا توجد قوالب محفوظة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تخصيص الشبكة' }));
    expect(customize).toHaveBeenCalledTimes(1);
  });
});

describe('real sticker catalog discovery', () => {
  const template =
    ALL_STICKER_TEMPLATES.find((item) => item.name.includes('أ')) ?? ALL_STICKER_TEMPLATES[0];
  const cardName = new RegExp(`^${template.name} —`);

  it('describes deferred and failed sticker previews without hiding the selectable name', () => {
    const alreadyPreviewed = searchStickerTemplates(normalizeArabicQuery(template.name));
    const fallbackTemplate = ALL_STICKER_TEMPLATES.find(
      (item) =>
        !alreadyPreviewed.includes(item) &&
        searchStickerTemplates(normalizeArabicQuery(item.name)).length === 1,
    )!;
    expect(fallbackTemplate).toBeDefined();
    let revealPreview: (() => void) | undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          revealPreview = () =>
            this.callback(
              [{ isIntersecting: true, target } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
        }
        disconnect() {}
        unobserve() {}
      },
    );
    render(
      <StickerHarness overrides={{ searchQuery: normalizeArabicQuery(fallbackTemplate.name) }} />,
    );
    const card = screen.getByRole('button', { name: new RegExp(`^${fallbackTemplate.name} —`) });
    expect(card).toHaveAccessibleDescription('جارٍ تجهيز المعاينة…');
    expect(screen.getByText('جارٍ تجهيز المعاينة…')).toHaveClass('text-control');
    vi.mocked(buildStickerSvg).mockImplementationOnce(() => {
      throw new Error('Preview unavailable');
    });
    act(() => revealPreview?.());
    expect(card).toHaveAccessibleDescription('تعذرت المعاينة');
    expect(screen.getByText('تعذرت المعاينة').closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText(fallbackTemplate.name)).toBeInTheDocument();
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(fallbackTemplate);
  });

  it('keeps sticker previews before two-line titles and separate visible footer controls', () => {
    render(
      <StickerHarness
        overrides={{
          searchQuery: normalizeArabicQuery(template.name),
          selectedTemplateId: template.id,
        }}
      />,
    );
    const select = screen.getByRole('button', { name: cardName });
    const card = select.parentElement!;
    const preview = select.firstElementChild!;
    const label = screen.getByText(template.name);
    const star = screen.getByRole('button', { name: `إضافة إلى المفضلة: ${template.name}` });
    expect(card.parentElement).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4');
    expect(card).toHaveClass('rounded-md', 'border-primary/60');
    expect(card).not.toHaveClass('ring-1');
    expect(preview).toHaveClass('h-30', 'bg-preview-surface', 'items-center', 'justify-center');
    expect(preview.firstElementChild?.querySelector('svg')).toHaveAttribute('viewBox', '0 0 10 10');
    expect(select.lastElementChild).toBe(label);
    expect(label).toHaveClass('text-control', 'line-clamp-2', 'min-h-9');
    expect(select).toHaveAttribute('aria-pressed', 'true');
    expect(preview.querySelector('.absolute[aria-hidden="true"]')).not.toBeNull();
    expect(star).toHaveClass('size-7', 'coarse-touch-target');
    expect(star).not.toHaveClass('opacity-0');
    expect(card.lastElementChild).toContainElement(star);
    expect(select).not.toContainElement(star);
    expect(select.querySelector('button')).toBeNull();
    const search = screen.getByRole('searchbox', { name: 'بحث في الملصقات' });
    expect(search).toHaveClass('h-8', 'w-full');
    expect(search.parentElement).toHaveClass('w-full');
    expect(screen.getByRole('button', { name: 'المفضلة' })).toHaveTextContent('المفضلة');
  });

  it('uses the real normalized catalog, persists favorites, and does not select on star', async () => {
    const query = normalizeArabicQuery(template.name);
    render(<StickerHarness overrides={{ searchQuery: query }} />);
    expect(screen.getAllByRole('button', { name: / — .* مم$/ })).toHaveLength(
      searchStickerTemplates(query, 'all', 'all').length,
    );
    const star = screen.getByRole('button', { name: `إضافة إلى المفضلة: ${template.name}` });
    expect(star.closest('button')?.parentElement?.closest('button')).toBeNull();
    expect(star).toHaveClass('coarse-touch-target');
    fireEvent.click(star);
    expect(onSelect).not.toHaveBeenCalled();
    expect(readAssetFavorites()).toContain(assetFavoriteId('sticker:builtin', template.id));
    expect(screen.getByRole('status')).toHaveTextContent(`أضيف إلى المفضلة: ${template.name}`);
    const user = userEvent.setup();
    await act(async () => {
      screen.getByRole('button', { name: `إزالة من المفضلة: ${template.name}` }).focus();
      await user.keyboard(' ');
    });
    expect(readAssetFavorites()).not.toContain(assetFavoriteId('sticker:builtin', template.id));
    await act(async () => {
      screen.getByRole('button', { name: `إضافة إلى المفضلة: ${template.name}` }).focus();
      await user.keyboard('{Enter}');
    });
    expect(readAssetFavorites()).toContain(assetFavoriteId('sticker:builtin', template.id));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: cardName }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(template);
  });

  it('clear cancels pending debounce, retains mixed filters and does not remove favorites', () => {
    vi.useFakeTimers();
    const change = vi.fn();
    const category = template.category;
    const shape = getTemplateShape(template);
    const key = assetFavoriteId('sticker:builtin', template.id)!;
    localStorage.setItem(ASSET_FAVORITES_KEY, JSON.stringify([key]));
    render(
      <StickerHarness
        overrides={{ selectedCategory: category, selectedShape: shape, onSearchChange: change }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    const search = screen.getByRole('searchbox', { name: 'بحث في الملصقات' });
    fireEvent.change(search, { target: { value: 'pending-query' } });
    fireEvent.click(screen.getByRole('button', { name: 'مسح البحث' }));
    act(() => vi.advanceTimersByTime(200));
    expect(change).toHaveBeenCalledExactlyOnceWith('');
    expect(search).toHaveFocus();
    expect(screen.getByRole('button', { name: 'المفضلة' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: cardName })).toBeInTheDocument();
    expect(readAssetFavorites()).toEqual([key]);
  });

  it('mixed filter empty is not empty favorites and clear does not reset category or shape', () => {
    const key = assetFavoriteId('sticker:builtin', template.id)!;
    localStorage.setItem(ASSET_FAVORITES_KEY, JSON.stringify([key]));
    const categoryChange = vi.fn();
    const shapeChange = vi.fn();
    const searchChange = vi.fn();
    render(
      <StickerHarness
        overrides={{
          searchQuery: 'no-match-12345',
          selectedCategory: template.category,
          selectedShape: getTemplateShape(template),
          onSelectCategory: categoryChange,
          onSelectShape: shapeChange,
          onSearchChange: searchChange,
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    expect(screen.getByText('لا توجد نتائج')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد مفضلة')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'مسح البحث' })[0]);
    expect(searchChange).toHaveBeenCalledExactlyOnceWith('');
    expect(categoryChange).not.toHaveBeenCalled();
    expect(shapeChange).not.toHaveBeenCalled();
    expect(readAssetFavorites()).toEqual([key]);
  });

  it('retains controlled discovery and scroll through actual catalog unmount/remount', () => {
    localStorage.setItem(
      ASSET_FAVORITES_KEY,
      JSON.stringify([assetFavoriteId('sticker:builtin', template.id)]),
    );
    render(
      <StickerHarness
        retainDiscovery
        overrides={{ searchQuery: normalizeArabicQuery(template.name) }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    const gallery = screen.getByRole('group', { name: 'القوالب' });
    let domScrollTop = 0;
    const setScrollTopSpy = vi.fn((value: number) => {
      domScrollTop = value;
    });
    Object.defineProperty(gallery, 'scrollTop', {
      configurable: true,
      get: () => domScrollTop,
      set: setScrollTopSpy,
    });
    gallery.scrollTop = 180;
    setScrollTopSpy.mockClear();
    fireEvent.scroll(gallery);
    expect(setScrollTopSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: cardName }));
    expect(screen.queryByRole('group', { name: 'القوالب' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'العودة للمعرض' }));
    expect(screen.getByRole('button', { name: 'المفضلة' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'القوالب' }).scrollTop).toBe(180);
  });

  it('empty favorites do not clear stored custom or unseen builtin favorites', () => {
    const ids = ['collage:saved:collage-user-1', 'sticker:builtin:unseen'];
    localStorage.setItem(ASSET_FAVORITES_KEY, JSON.stringify(ids));
    render(<StickerHarness overrides={{ searchQuery: normalizeArabicQuery(template.name) }} />);
    fireEvent.click(screen.getByRole('button', { name: 'المفضلة' }));
    expect(screen.getByText('لا توجد مفضلة')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'عرض المكتبة' }));
    expect(screen.getByRole('button', { name: cardName })).toBeInTheDocument();
    expect(readAssetFavorites()).toEqual(ids);
  });

  it('global search shortcuts defend event targets and foreign dialogs', () => {
    render(<StickerHarness overrides={{ searchQuery: normalizeArabicQuery(template.name) }} />);
    const input = document.createElement('input');
    document.body.append(input);
    const inputEvent = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    input.dispatchEvent(inputEvent);
    expect(inputEvent.defaultPrevented).toBe(false);
    input.remove();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const foreignButton = document.createElement('button');
    dialog.append(foreignButton);
    document.body.append(dialog);
    const foreignEvent = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    foreignButton.dispatchEvent(foreignEvent);
    expect(foreignEvent.defaultPrevented).toBe(false);
    dialog.remove();
    fireEvent.keyDown(screen.getByRole('button', { name: 'المفضلة' }), { key: '/' });
    expect(screen.getByRole('searchbox', { name: 'بحث في الملصقات' })).toHaveFocus();
  });
});
