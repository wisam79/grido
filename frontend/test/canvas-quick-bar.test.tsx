import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { CanvasOverlayHost } from '../src/components/editor/canvas/canvas-overlay-host';
import { CanvasQuickBar } from '../src/components/editor/canvas/canvas-quick-bar';
import { TooltipProvider } from '../src/components/ui/tooltip';
import {
  useCanvasInteraction,
  resetCanvasInteraction,
} from '../src/lib/canvas/canvas-interaction-store';
import { useEditorStore } from '../src/lib/editor-store';

describe('CanvasQuickBar Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    resetCanvasInteraction();
  });

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
   * 🎯 نطاق هذا الشريط: موضع العنصر على الورقة (أمام/خلف، تدوير، قلب، مقارنة).
   * أما خصائص العنصر (تكرار، حذف، محاذاة، تجميع، مرشحات، أدوات AI) فموطنها
   * الشريط العلوي — وهذه الاختبارات تحرس الحدّ بين السطحين فلا يعود التكرار.
   */
  it('renders only placement actions for a single image element', () => {
    selectSingleImage();

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>,
    );

    // أربع إجراءات موضع + زر إغلاق الشريط
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  /**
   * 🧷 حارس «أيقونات فقط»: أُزيلت النصوص من الشريط (خلية كولاج/تغيير/الصف/
   * العمود) وصغر حجمه — فلا يعود نص عربي مرئي إليه وحجم الأزرار موحّد.
   */
  it('contains no visible text and uses compact 24px icon buttons', () => {
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
      expect(btn.className).toContain('h-6');
      expect(btn.className).toContain('w-6');
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
});
