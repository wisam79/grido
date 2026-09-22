import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { CanvasQuickBar } from '../src/components/editor/canvas/canvas-quick-bar';
import { CanvasOverlayHost } from '../src/components/editor/canvas/canvas-overlay-host';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('CanvasQuickBar Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('renders nothing when no element or slot is selected', () => {
    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>
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
      </TooltipProvider>
    );

    expect(screen.getByText('خلية كولاج')).toBeInTheDocument();
    expect(screen.getByText('تغيير')).toBeInTheDocument();
    expect(screen.getByText('كل الورقة')).toBeInTheDocument();
    expect(screen.getByText('الصف')).toBeInTheDocument();
    expect(screen.getByText('العمود')).toBeInTheDocument();

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
      </TooltipProvider>
    );

    // أربع إجراءات موضع + زر إغلاق الشريط
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('does not repeat the toolbar actions (duplicate, delete, AI)', () => {
    selectSingleImage();

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>
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
      </TooltipProvider>
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
      </TooltipProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
