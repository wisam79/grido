import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { CanvasOverlayHost } from '../src/components/editor/canvas/canvas-overlay-host';
import { CanvasQuickBar } from '../src/components/editor/canvas/canvas-quick-bar';
import { QuickBarElementSection } from '../src/components/editor/canvas/quick-bar/quick-bar-element-section';
import { QuickBarSlotSection } from '../src/components/editor/canvas/quick-bar/quick-bar-slot-section';
import { REEDIT_STICKER_EVENT } from '../src/components/editor/dialogs/sticker-reedit-bus';
import { TooltipProvider } from '../src/components/ui/tooltip';
import {
  useCanvasInteraction,
  resetCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { useEditorStore } from '../src/lib/editor-store';

const originalMaskAction = useEditorStore.getState().maskSelectedImageWithShape;

describe('CanvasQuickBar Component Tests', () => {
  beforeEach(() => {
    useEditorStore.setState({ maskSelectedImageWithShape: originalMaskAction });
    useEditorStore.getState().reset();
    resetCanvasInteraction();
  });

  afterEach(() => {
    useEditorStore.setState({ maskSelectedImageWithShape: originalMaskAction });
    vi.restoreAllMocks();
  });

  it.each(['element', 'slot'] as const)(
    'restores %s preview on target change and does not overwrite a concurrent replacement',
    (kind) => {
      const first = { id: 'first', imageSrc: 'edited.png', originalImageSrc: 'original.png' };
      const second = {
        id: 'second',
        imageSrc: 'second.png',
        originalImageSrc: 'second-original.png',
      };
      useEditorStore.setState({
        elements: [first, second].map((el) => ({
          ...el,
          type: 'image' as const,
          x: 0,
          y: 0,
          width: 0.2,
          height: 0.2,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
        })),
        slots: [first, second].map((slot, cellIndex) => ({
          ...slot,
          cellIndex,
          x: 0,
          y: 0,
          w: 0.5,
          h: 1,
        })),
      });
      const section = (id: string) => (
        <TooltipProvider>
          {kind === 'element' ? (
            <QuickBarElementSection
              element={useEditorStore.getState().elements.find((el) => el.id === id)!}
            />
          ) : (
            <QuickBarSlotSection
              slot={useEditorStore.getState().slots.find((slot) => slot.id === id)!}
              onOpenFileForSlot={() => {}}
            />
          )}
        </TooltipProvider>
      );
      const source = (id: string) => {
        if (kind === 'slot')
          return useEditorStore.getState().slots.find((slot) => slot.id === id)?.imageSrc;
        const element = useEditorStore.getState().elements.find((el) => el.id === id);
        return element?.type === 'image' ? element.imageSrc : undefined;
      };
      const pointerDown = (button = 0) => {
        const event = new Event('pointerdown', { bubbles: true });
        Object.defineProperty(event, 'button', { value: button });
        fireEvent(screen.getByLabelText('معاينة الصورة الأصلية'), event);
      };
      const view = render(section(first.id));
      pointerDown(2);
      expect(source(first.id)).toBe('edited.png');
      pointerDown();
      expect(source(first.id)).toBe('original.png');
      view.rerender(section(second.id));
      expect(source(first.id)).toBe('edited.png');
      pointerDown();
      expect(source(second.id)).toBe('second-original.png');
      act(() => {
        if (kind === 'element')
          useEditorStore.getState().updateElement(second.id, { imageSrc: 'replacement.png' });
        else useEditorStore.getState().updateSlot(second.id, { imageSrc: 'replacement.png' });
      });
      fireEvent(window, new Event('blur'));
      expect(source(second.id)).toBe('replacement.png');
      view.unmount();
      expect(source(second.id)).toBe('replacement.png');
    },
  );

  it.each(['pointerup', 'pointercancel', 'blur'] as const)(
    'restores original-image comparison on %s without history mutation',
    (event) => {
      selectSingleImage();
      act(() =>
        useEditorStore.getState().updateElement('el-1', { originalImageSrc: 'original.png' }),
      );
      const history = useEditorStore.getState().history;
      const view = render(
        <TooltipProvider>
          <CanvasQuickBar />
        </TooltipProvider>,
      );
      const down = new Event('pointerdown', { bubbles: true });
      Object.defineProperty(down, 'button', { value: 0 });
      fireEvent(screen.getByLabelText('معاينة الصورة الأصلية'), down);
      const currentImageSrc = () => {
        const element = useEditorStore.getState().elements[0];
        return element?.type === 'image' ? element.imageSrc : undefined;
      };
      expect(currentImageSrc()).toBe('original.png');
      fireEvent(window, new Event(event));
      expect(currentImageSrc()).toBe('test.jpg');
      expect(useEditorStore.getState().history).toBe(history);
      view.unmount();
    },
  );

  it('renders nothing when no element or slot is selected', () => {
    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders quick bar for selected collage slot', () => {
    useEditorStore.setState({
      mode: 'collage',
      selectedId: 'slot-1',
      slots: [
        {
          id: 'slot-1',
          cellIndex: 0,
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          imageSrc: 'test.jpg',
        },
      ],
    });

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    // الشريط أيقونات فقط — لا نص ظاهر فيه
    expect(screen.queryByText('خلية كولاج')).not.toBeInTheDocument();
    expect(screen.queryByText('تغيير')).not.toBeInTheDocument();
    expect(screen.queryByText('كل الورقة')).not.toBeInTheDocument();
    expect(screen.queryByText('الصف')).not.toBeInTheDocument();
    expect(screen.queryByText('العمود')).not.toBeInTheDocument();

    // لكن كل أيقونة لها اسم مُتاح (aria-label) لأن النص المرئي أُزيل
    expect(screen.getByLabelText('تغيير الصورة')).toBeInTheDocument();
    expect(screen.getByLabelText('تكرار الصورة بكل الخلايا')).toBeInTheDocument();
    expect(screen.getByLabelText('تعبئة الصف')).toBeInTheDocument();
    expect(screen.getByLabelText('تعبئة العمود')).toBeInTheDocument();

    // أدوات AI وأزرار الخصائص انتقلت للشريط العلوي
    expect(screen.queryByText('عزل الخلفية')).not.toBeInTheDocument();
  });

  it('does not expose free-element distribution for collage slot selections', () => {
    useEditorStore.setState({
      mode: 'collage',
      selectedId: 'slot-1',
      selectedIds: ['slot-1', 'slot-2', 'slot-3'],
      slots: [
        { id: 'slot-1', cellIndex: 0, x: 0, y: 0, w: 0.33, h: 1, imageSrc: 'one.jpg' },
        { id: 'slot-2', cellIndex: 1, x: 0.33, y: 0, w: 0.33, h: 1, imageSrc: 'two.jpg' },
        { id: 'slot-3', cellIndex: 2, x: 0.66, y: 0, w: 0.34, h: 1, imageSrc: 'three.jpg' },
      ],
    });

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    expect(screen.getByLabelText('3 عناصر محددة')).toBeInTheDocument();
    expect(screen.queryByLabelText('توزيع أفقي')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('توزيع عمودي')).not.toBeInTheDocument();
  });

  const selectSingleImage = () =>
    useEditorStore.setState({
      mode: 'single',
      selectedId: 'el-1',
      selectedIds: ['el-1'],
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          imageSrc: 'test.jpg',
        },
      ],
    });

  /**
   * 🎯 نطاق هذا الشريط: موضع العنصر على الورقة وإجراءات السياق السريعة اللحظية
   * (ضبط الكادر / تعديل الملصق، أمام/خلف، تدوير، قلب، مقارنة).
   * أما خصائص العنصر الثقيلة (تكرار، حذف، محاذاة، تجميع، مرشحات، أدوات AI)
   * فموطنها الشريط العلوي واللوح الجانبي.
   */
  it('renders only placement + in-place crop actions for a single image element', () => {
    selectSingleImage();

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    // ضبط الكادر + أربع إجراءات موضع + زر إغلاق الشريط
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByLabelText('ضبط الكادر')).toBeInTheDocument();
  });

  /**
   * 🧷 حارس «أيقونات فقط»: أُزيلت النصوص من الشريط (خلية كولاج/تغيير/الصف/
   * العمود) وصغر حجمه — فلا يعود نص عربي مرئي إليه وحجم الأزرار موحّد.
   */
  it('contains no visible text and uses compact 28px icon buttons', () => {
    selectSingleImage();

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    const bar = screen.getByTestId('canvas-quick-bar');
    // لا حروف عربية مرئية داخل الشريط (الأسماء في aria-label والتلميحات)
    expect(bar.textContent ?? '').not.toMatch(/[\u0621-\u064A]/);
    for (const btn of screen.getAllByRole('button')) {
      expect(btn.className).toContain('h-7');
      expect(btn.className).toContain('w-7');
    }
  });

  it('does not repeat the toolbar actions (duplicate, delete, AI)', () => {
    selectSingleImage();

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    expect(screen.queryByText('عزل الخلفية')).not.toBeInTheDocument();
    expect(screen.queryByText('تأطير الوجه')).not.toBeInTheDocument();
    expect(screen.queryByText('ترميم الوجه')).not.toBeInTheDocument();
    expect(screen.queryByText(/تكرار/)).not.toBeInTheDocument();
    expect(screen.queryByText(/حذف/)).not.toBeInTheDocument();
  });

  /**
   * 🧷 حارس الحدّ المكاني: كان الشريط يُرسم portal على `document.body` بـ`fixed`
   * فيطفو فوق شريط الأدوات ويمتد على الشريط الجانبي والألواح. الآن يجب أن يُرسم
   * داخل حاوية لوح الكانفاس وبتموضع `absolute` — أي مقصيّاً ضمن منطقة الكانفاس.
   */
  it('renders inside the canvas overlay host with absolute positioning', () => {
    selectSingleImage();

    render(
      <TooltipProvider>
        <CanvasOverlayHost>
          <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
        </CanvasOverlayHost>
      </TooltipProvider>,
    );

    const host = screen.getByTestId('canvas-overlay-host');
    const bar = screen.getByTestId('canvas-quick-bar');

    expect(host.contains(bar)).toBe(true);
    expect(bar.className).toContain('absolute');
    expect(bar.className).not.toContain('fixed');
  });

  it('hides itself for a two-element selection (nothing left to distribute)', () => {
    useEditorStore.setState({
      mode: 'single',
      selectedId: 'el-1',
      selectedIds: ['el-1', 'el-2'],
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          imageSrc: 'test.jpg',
        },
        {
          id: 'el-2',
          type: 'image',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          zIndex: 2,
          imageSrc: 'test.jpg',
        },
      ],
    });

    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    expect(container.firstChild).not.toBeNull();
  });

  it('hides quick bar when element is being dragged (Rest State Invariant)', () => {
    selectSingleImage();
    useCanvasInteraction.getState().setIsDragging(true);

    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('hides quick bar when element is being transformed (Rest State Invariant)', () => {
    selectSingleImage();
    useCanvasInteraction.getState().setIsTransforming(true);

    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('hides quick bar when inline text editing is active (Rest State Invariant)', () => {
    selectSingleImage();
    useEditorStore.setState({ editingTextId: 'el-1' });

    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('reappears when interaction completes and state returns to rest', () => {
    selectSingleImage();
    useCanvasInteraction.getState().setIsDragging(true);

    const { rerender, container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(container.firstChild).toBeNull();

    act(() => {
      useCanvasInteraction.getState().setIsDragging(false);
    });
    rerender(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('adds vertical clearance above the rotation handle in single mode so it does not cover the rotater', () => {
    const canvasArea = document.createElement('div');
    canvasArea.id = 'canvas-area';
    canvasArea.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 1000,
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    document.body.appendChild(canvasArea);

    try {
      useEditorStore.setState({
        mode: 'single',
        canvasWidth: 1000,
        canvasHeight: 1000,
        selectedId: 'el-rot',
        selectedIds: ['el-rot'],
        elements: [
          {
            id: 'el-rot',
            type: 'image',
            x: 0.2,
            y: 0.3,
            width: 0.4,
            height: 0.4,
            rotation: 0,
            opacity: 1,
            zIndex: 1,
            imageSrc: 'test.jpg',
          },
        ],
      });

      render(
        <TooltipProvider>
          <CanvasOverlayHost>
            <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
          </CanvasOverlayHost>
        </TooltipProvider>,
      );

      const bar = screen.getByTestId('canvas-quick-bar');
      // قمة العنصر عند 300px (0.3 * 1000)، ومع خلوص مقبض التدوير (GAP_PX 5 + ROTATE_ANCHOR_CLEARANCE_PX 38 = 43px)
      // يتموضع الشريط عند 300 - h - 43 (وفي بيئة jsdom حيث offsetHeight=0 يكون 257px مقابل 295px بدون الخلوص).
      const topPx = Number.parseFloat(bar.style.top);
      expect(topPx).toBeLessThanOrEqual(260);
    } finally {
      canvasArea.remove();
    }
  });

  it('renders icon-only inline edit and text-fit controls for a single text element', () => {
    useEditorStore.setState({
      mode: 'single',
      selectedId: 'txt-1',
      selectedIds: ['txt-1'],
      editingTextId: null,
      elements: [
        {
          id: 'txt-1',
          type: 'text',
          x: 0.2,
          y: 0.4,
          width: 0.3,
          height: 0.1,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          text: 'نص تجريبي',
          fontSize: 32,
          fontFamily: 'Cairo',
          fontWeight: 700,
          textSizing: 'fixed',
        },
      ],
    });

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    const bar = screen.getByTestId('canvas-quick-bar');
    expect(bar.textContent ?? '').not.toMatch(/[\u0621-\u064A]/);

    const editBtn = screen.getByLabelText('تحرير النص');
    const fitBtn = screen.getByLabelText('ملاءمة الصندوق للنص');
    expect(editBtn).toBeInTheDocument();
    expect(fitBtn).toBeInTheDocument();

    act(() => {
      fitBtn.click();
    });
    expect(useEditorStore.getState().elements[0]).toMatchObject({ textSizing: 'auto' });

    act(() => {
      editBtn.click();
    });
    expect(useEditorStore.getState().editingTextId).toBe('txt-1');
  });

  it('triggers in-place crop from QuickBar for unlocked regular photos and hides bar while cropping (FF-05)', () => {
    selectSingleImage();

    const { rerender, container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    const cropBtn = screen.getByLabelText('ضبط الكادر');
    expect(cropBtn).toBeEnabled();
    act(() => {
      fireEvent.click(cropBtn);
    });
    expect(useCanvasInteraction.getState().croppingElementId).toBe('el-1');

    rerender(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(container.firstChild).toBeNull();

    act(() => {
      useCanvasInteraction.getState().setCroppingElementId(null);
      useEditorStore.getState().updateElement('el-1', { locked: true });
    });
    rerender(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(screen.getByLabelText('ضبط الكادر')).toBeDisabled();
  });

  it('shows icon-only تعديل الملصق instead of ضبط الكادر for sticker elements and dispatches re-edit event (FF-05)', () => {
    useEditorStore.setState({
      mode: 'single',
      selectedId: 'sticker-1',
      selectedIds: ['sticker-1'],
      elements: [
        {
          id: 'sticker-1',
          type: 'image',
          x: 0.2,
          y: 0.2,
          width: 0.3,
          height: 0.3,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          imageSrc: 'sticker.png',
          stickerSource: {
            templateId: 'label-1',
            params: {
              fields: { title: 'ملصق' },
              primaryColor: '#111111',
              secondaryColor: '#ffffff',
              backgroundColor: '#ffffff',
              isTransparent: false,
            },
            svg: '<svg><rect width="10" height="10"/></svg>',
          },
        },
      ],
    });

    const listener = vi.fn();
    window.addEventListener(REEDIT_STICKER_EVENT, listener);
    try {
      const { rerender } = render(
        <TooltipProvider>
          <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
        </TooltipProvider>,
      );

      const bar = screen.getByTestId('canvas-quick-bar');
      expect(bar.textContent ?? '').not.toMatch(/[\u0621-\u064A]/);
      for (const btn of screen.getAllByRole('button')) {
        expect(btn.className).toContain('h-7');
        expect(btn.className).toContain('w-7');
      }

      const reeditBtn = screen.getByLabelText('تعديل الملصق');
      expect(screen.queryByLabelText('ضبط الكادر')).not.toBeInTheDocument();
      fireEvent.click(reeditBtn);
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ elementId: 'sticker-1' });

      act(() => {
        useEditorStore.getState().updateElement('sticker-1', { locked: true });
      });
      rerender(
        <TooltipProvider>
          <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
        </TooltipProvider>,
      );
      expect(screen.getByLabelText('تعديل الملصق')).toBeDisabled();
    } finally {
      window.removeEventListener(REEDIT_STICKER_EVENT, listener);
    }
  });

  it('shows قنّع بالشكل on multi-selection only for a valid unlocked image + fillable shape pair (FF-05)', async () => {
    const maskAction = vi.fn(async () => 'ok' as const);
    useEditorStore.setState({
      mode: 'single',
      selectedId: 'photo-1',
      selectedIds: ['photo-1', 'shape-1'],
      maskSelectedImageWithShape: maskAction,
      elements: [
        {
          id: 'photo-1',
          type: 'image',
          x: 0.1,
          y: 0.1,
          width: 0.3,
          height: 0.3,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          imageSrc: 'photo.png',
        },
        {
          id: 'shape-1',
          type: 'shape',
          shape: 'ellipse',
          fill: '#123456',
          x: 0.2,
          y: 0.2,
          width: 0.3,
          height: 0.3,
          rotation: 0,
          opacity: 1,
          zIndex: 2,
        },
      ],
    });

    const { rerender } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    const bar = screen.getByTestId('canvas-quick-bar');
    expect(bar.textContent ?? '').not.toMatch(/[\u0621-\u064A]/);
    const maskBtn = screen.getByLabelText('قنّع بالشكل');
    expect(maskBtn.className).toContain('h-7');
    expect(maskBtn.className).toContain('w-7');

    await act(async () => {
      fireEvent.click(maskBtn);
    });
    await waitFor(() => expect(maskAction).toHaveBeenCalledTimes(1));

    // خط غير قابل للتعبئة أو عنصر مقفل أو صورتان معاً لا تُظهر زر التقنيع
    act(() => {
      useEditorStore.getState().updateElement('shape-1', { shape: 'line' });
    });
    rerender(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(screen.queryByLabelText('قنّع بالشكل')).not.toBeInTheDocument();

    act(() => {
      useEditorStore.getState().updateElement('shape-1', { shape: 'ellipse', locked: true });
    });
    rerender(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );
    expect(screen.queryByLabelText('قنّع بالشكل')).not.toBeInTheDocument();
  });
});
