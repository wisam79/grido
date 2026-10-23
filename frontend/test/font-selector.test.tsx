import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TextFontSelector } from '../src/components/editor/properties/panels/text/text-font-selector';
import { FontSelector } from '../src/components/ui/font-selector';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { StickerFontSelector } from '../src/features/stickers/components/sticker-font-selector';
import { useEditorStore } from '../src/lib/editor-store';
import { ARABIC_FONTS } from '../src/lib/io/fonts';

import type { TextElement } from '../src/lib/editor-store';
import type { ReactElement } from 'react';

vi.mock('../src/lib/io/fonts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/io/fonts')>()),
  loadGoogleFont: vi.fn().mockResolvedValue(true),
}));

const renderPicker = (ui: ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const scrollIntoView = vi.fn();
const baseText: TextElement = {
  id: 'font-preview',
  type: 'text',
  text: 'عنوان',
  fontFamily: 'Cairo, sans-serif',
  fontSize: 48,
  fontWeight: 800,
  x: 0.2,
  y: 0.3,
  width: 0.4,
  height: 0.1,
  rotation: 30,
  opacity: 1,
  zIndex: 1,
  color: '#000000',
  textSizing: 'auto',
  textResizeAnchor: 'bottom-right',
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = scrollIntoView;
  useEditorStore.setState({
    elements: [],
    selectedIds: [],
    selectedId: null,
    history: [],
    historyIndex: -1,
  });
});

describe('FontSelector', () => {
  it('renders one compact list without categories or repeated sample metadata', async () => {
    const user = userEvent.setup();
    renderPicker(<FontSelector value="Cairo" onChange={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));

    const dialog = screen.getByRole('dialog', { name: 'اختيار الخط' });
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(1);
    expect(within(dialog).getAllByRole('grid')).toHaveLength(1);
    expect(within(dialog).getAllByRole('row')).toHaveLength(ARABIC_FONTS.length);
    expect(within(dialog).queryByText('كوفي وهندسي')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'المفضلة' })).not.toBeInTheDocument();
    expect(within(dialog).queryByText('أوفلاين')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('أبجد هوز 123')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'كايرو (Cairo)' })).toHaveClass('h-8');
    expect(within(dialog).getByRole('button', { name: 'إزالة من المفضلة: كايرو' })).toHaveClass(
      'size-7',
    );
  });

  it('searches Arabic and Latin names, handles empty results and resets on reopening', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker(<FontSelector value="Cairo" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: 'الخط: كايرو' });
    await user.click(trigger);
    const search = screen.getByRole('combobox', { name: 'البحث في الخطوط' });
    await user.type(search, '  tajawal  ');
    expect(screen.getAllByRole('row')).toHaveLength(1);
    await user.clear(search);
    await user.type(search, 'خط غير موجود xyz');
    expect(screen.getByRole('status')).toHaveTextContent('لا خط مطابق');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'مسح البحث' }));
    expect(search).toHaveFocus();
    await user.type(search, 'تاجوال');
    await user.click(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    await user.click(trigger);
    expect(screen.getByRole('combobox', { name: 'البحث في الخطوط' })).toHaveValue('');
    expect(screen.getAllByRole('row')).toHaveLength(ARABIC_FONTS.length);
  });

  it('scrolls the active descendant with arrows and commits only once on Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onPreview = vi.fn();
    renderPicker(<FontSelector value="Cairo" onChange={onChange} onPreview={onPreview} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    const search = screen.getByRole('combobox', { name: 'البحث في الخطوط' });
    for (let i = 0; i < 12; i++) await user.keyboard('{ArrowDown}');
    const active = document.getElementById(search.getAttribute('aria-activedescendant')!);
    expect(active).toHaveTextContent(ARABIC_FONTS[11].arabicName);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(onPreview).toHaveBeenLastCalledWith(ARABIC_FONTS[11]);
    expect(screen.getAllByRole('row')[0]).toHaveAttribute('aria-selected', 'true');
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(ARABIC_FONTS[11]);
    expect(screen.queryByRole('dialog', { name: 'اختيار الخط' })).not.toBeInTheDocument();
  });

  it('cancels previews with Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onChange = vi.fn();
    renderPicker(<FontSelector value="Cairo" onChange={onChange} onCancel={onCancel} />);
    const trigger = screen.getByRole('button', { name: 'الخط: كايرو' });
    await user.click(trigger);
    await user.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it('keeps favorites independent from selection and persists them across picker instances', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = renderPicker(<FontSelector value="Cairo" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    await user.click(screen.getByRole('button', { name: 'إضافة للمفضلة: الإسكندرية' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'اختيار الخط' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('grido_favorite_fonts')!)).toContain('alexandria');
    view.unmount();
    renderPicker(<StickerFontSelector value="Cairo" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    expect(screen.getByRole('button', { name: 'إزالة من المفضلة: الإسكندرية' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('supports row navigation, RTL favorite navigation and Space without double commits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker(<FontSelector value="Cairo" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    await user.tab();
    expect(screen.getByRole('button', { name: 'كايرو (Cairo)' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Oswald' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'كايرو (Cairo)' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'إزالة من المفضلة: تاجوال' })).toHaveFocus();
    await user.keyboard(' ');
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard('{ArrowRight} ');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(ARABIC_FONTS[1]);
  });

  it('does not create a history entry when the already-selected font is activated', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      elements: [baseText],
      selectedId: baseText.id,
      selectedIds: [baseText.id],
    });
    renderPicker(<TextFontSelector element={baseText} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    await user.click(screen.getByRole('button', { name: 'كايرو (Cairo)' }));
    expect(useEditorStore.getState().historyIndex).toBe(-1);
    expect(useEditorStore.getState().elements[0]).toEqual(baseText);
  });

  it('passes a clean family name to sticker generators', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker(<StickerFontSelector value="Cairo" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    await user.click(screen.getByRole('button', { name: 'ريديكس برو (Readex Pro)' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('Readex Pro');
  });

  it('restores each selected text separately and leaves locked elements untouched', async () => {
    const user = userEvent.setup();
    const second = { ...baseText, id: 'second', fontFamily: 'Amiri, serif', x: 0.7, width: 0.2 };
    const locked = { ...baseText, id: 'locked', locked: true };
    useEditorStore.setState({
      elements: [baseText, second, locked],
      selectedId: baseText.id,
      selectedIds: [baseText.id, second.id, locked.id],
    });
    renderPicker(<TextFontSelector element={baseText} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
    const preview = useEditorStore.getState().elements;
    expect(preview[0]).toMatchObject({ fontFamily: 'Tajawal, sans-serif', width: 0.4, x: 0.2 });
    expect(preview[1]).toMatchObject({ fontFamily: 'Tajawal, sans-serif', width: 0.2, x: 0.7 });
    expect(preview[2]).toEqual(locked);
    await user.keyboard('{Escape}');
    expect(useEditorStore.getState().elements).toEqual([baseText, second, locked]);
    expect(useEditorStore.getState().historyIndex).toBe(-1);
  });

  it('cancels an uncommitted preview when the inspector unmounts', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      elements: [baseText],
      selectedId: baseText.id,
      selectedIds: [baseText.id],
    });
    const view = renderPicker(<TextFontSelector element={baseText} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'تاجوال (Tajawal)' }));
    view.unmount();
    expect(useEditorStore.getState().elements[0]).toEqual(baseText);
    expect(useEditorStore.getState().historyIndex).toBe(-1);
  });

  it('commits one font to differently styled selected texts even when it matches the primary text', async () => {
    const user = userEvent.setup();
    const second = { ...baseText, id: 'second', fontFamily: 'Amiri, serif', x: 0.7, width: 0.2 };
    useEditorStore.setState({
      elements: [baseText, second],
      selectedId: baseText.id,
      selectedIds: [baseText.id, second.id],
    });
    renderPicker(<TextFontSelector element={baseText} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    await user.click(screen.getByRole('button', { name: 'كايرو (Cairo)' }));
    expect(useEditorStore.getState().elements[1]).toMatchObject({
      fontFamily: baseText.fontFamily,
      width: 0.2,
      x: 0.7,
    });
    expect(useEditorStore.getState().historyIndex).toBe(0);
  });

  it('keeps favorites usable in memory if storage writes fail', async () => {
    const user = userEvent.setup();
    renderPicker(<FontSelector value="Cairo" onChange={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'الخط: كايرو' }));
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    try {
      await user.click(screen.getByRole('button', { name: 'إضافة للمفضلة: الإسكندرية' }));
      await user.click(screen.getByRole('button', { name: 'إزالة من المفضلة: الإسكندرية' }));
      expect(screen.getByRole('button', { name: 'إضافة للمفضلة: الإسكندرية' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    } finally {
      write.mockRestore();
    }
  });
});
