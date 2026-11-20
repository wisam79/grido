import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { StickerInlineEditor } from '../src/features/stickers/components/sticker-inline-editor';
import { StickerPreview } from '../src/features/stickers/components/sticker-preview';
import { StickerProperties } from '../src/features/stickers/components/sticker-properties';
import { buildDefaultStickerParams } from '../src/features/stickers/lib/sticker-design/build-svg';
import { ALL_STICKER_TEMPLATES } from '../src/features/stickers/templates';

vi.mock('../src/lib/io/fonts', async (original) => ({
  ...(await original<typeof import('../src/lib/io/fonts')>()),
  loadGoogleFont: vi.fn().mockResolvedValue(true),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
import type { StickerTemplate } from '../src/features/stickers/types';
const template: StickerTemplate = {
  ...ALL_STICKER_TEMPLATES[0],
  fields: [
    { id: 'first', label: 'First', type: 'text', defaultValue: 'First' },
    { id: 'second', label: 'Second', type: 'text', defaultValue: 'Second' },
  ],
};
const params = buildDefaultStickerParams(template);

describe('sticker inline field and color contracts', () => {
  it('does not trap Tab and navigates Enter to a wrapped SVG text field', () => {
    const view = render(
      <TooltipProvider>
        <StickerPreview
          template={template}
          params={params}
          svgString='<svg xmlns="http://www.w3.org/2000/svg"><text data-field-id="first">First</text><g data-field-id="second"><text>Second</text></g></svg>'
        />
      </TooltipProvider>,
    );
    fireEvent.click(view.container.querySelector('svg text')!);
    const input = screen.getByRole('textbox');
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    fireEvent(input, tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(input).toHaveValue('First');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('textbox')).toHaveValue('Second');
  });

  it('resets an invalid hex draft when a same-colored role replaces the active role', () => {
    const onChangeColor = vi.fn();
    const frame = (role: 'primary' | 'secondary') => (
      <StickerInlineEditor
        activeField={null}
        activeColor={{ role, label: role, currentColor: '#aabbcc', x: 0, y: 0 }}
        template={template}
        onClose={vi.fn()}
        onChangeFieldValue={vi.fn()}
        onChangeColor={onChangeColor}
      />
    );
    const view = render(frame('primary'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '#' } });
    expect(onChangeColor).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('#');
    view.rerender(frame('secondary'));
    expect(screen.getByRole('textbox')).toHaveValue('#aabbcc');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('keeps a preset name and reports failure instead of success when storage rejects saving', () => {
    localStorage.clear();
    render(
      <TooltipProvider>
        <StickerProperties
          template={template}
          params={params}
          onChangeParams={vi.fn()}
          gridConfig={{ rows: 3, cols: 3, spacingMm: 4 }}
          onChangeGridConfig={vi.fn()}
        />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'قوالبي' }));
    fireEvent.change(screen.getByPlaceholderText('اسم القالب'), {
      target: { value: 'Keep my work' },
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    fireEvent.click(screen.getByRole('button', { name: /حفظ/ }));
    expect(toast.error).toHaveBeenCalledWith('فشل حفظ القالب');
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('اسم القالب')).toHaveValue('Keep my work');
  });
});
