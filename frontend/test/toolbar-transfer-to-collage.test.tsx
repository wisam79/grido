import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ToolbarSelectionTools } from '../src/components/editor/toolbar/toolbar-selection-tools';
import { ToolbarTransferToCollage } from '../src/components/editor/toolbar/toolbar-transfer-to-collage';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

import type { CanvasElement } from '../src/lib/store/types';

vi.mock('../src/lib/export', () => ({
  exportCanvas: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
}));

vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn(() => Promise.resolve('/tmp/grido-master.png')),
}));

// المرحلة لا تُلمس في هذا الاختبار: exportCanvas مُحاكاة، والمكوّن يتحقق فقط من وجودها
vi.mock('../src/lib/canvas/stage-context', () => ({
  useStageRef: () => ({ current: { width: () => 2480 } }),
}));

vi.mock('../src/components/editor/toolbar/toolbar-ai-tools', () => ({
  AiToolsToolbarGroup: () => null,
}));

vi.mock('../src/components/editor/toolbar/toolbar-image-filters', () => ({
  ImageFiltersPopover: () => null,
}));

describe('ToolbarTransferToCollage — نقل التصميم إلى الكولاج', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useEditorStore.getState().setMode('single');
    useEditorStore.setState({
      elements: [
        { id: 'el-1', type: 'text', x: 0.1, y: 0.1, width: 0.2, height: 0.1 } as CanvasElement,
      ],
    });
  });

  const renderButton = () =>
    render(
      <TooltipProvider>
        <ToolbarTransferToCollage />
      </TooltipProvider>,
    );

  /** النقل غير متزامن (FileReader + Wails) — نُفرغ الميكرو مهام والمهمة التالية */
  const clickTransfer = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('toolbar-transfer-to-collage'));
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  it('تُدرَج لقطة الكانفس في خانات الكولاج', async () => {
    renderButton();
    await clickTransfer();
    await waitFor(() => expect(useEditorStore.getState().mode).toBe('collage'));

    const state = useEditorStore.getState();
    expect(state.mode).toBe('collage');
    expect(state.slots.length).toBeGreaterThan(0);
    // قالب الطباعة الفيزيائي الإفتراضي (ورقة 8 صور): الصورة الواحدة تعبّئ كل الخانات
    expect(state.slots.every((s) => Boolean(s.imageSrc))).toBe(true);
  });

  it('لا تُغيّر مقاس كانفاس الكولاج ولا اتجاهه ولا قالبها', async () => {
    const before = useEditorStore.getState();
    const canvasBefore = { w: before.canvasWidth, h: before.canvasHeight };
    const printBefore = { ...before.printSettings };
    const templateIdBefore = before.collageTemplate?.id;
    const slotsBefore = before.slots.length;

    renderButton();
    await clickTransfer();
    await waitFor(() => expect(useEditorStore.getState().mode).toBe('collage'));

    const after = useEditorStore.getState();
    expect(after.canvasWidth).toBe(canvasBefore.w);
    expect(after.canvasHeight).toBe(canvasBefore.h);
    expect(after.printSettings).toEqual(printBefore);
    expect(after.collageTemplate?.id).toBe(templateIdBefore);
    expect(after.slots.length).toBe(slotsBefore);
  });

  it('تلتقط التصميم بدقة الطباعة بلا خيارات تصدير إضافية', async () => {
    renderButton();
    await clickTransfer();
    // ننتظر انتهاء سلسلة النقل كاملةً فلا تتسرّب وعديات إلى الاختبار التالي
    await waitFor(() => expect(useEditorStore.getState().mode).toBe('collage'));

    const { exportCanvas } = await import('../src/lib/export');
    expect(exportCanvas).toHaveBeenCalledWith('png', 1, expect.anything());
  });

  it('لا تُلمس الخانات ولا الوضع عند كانفس فارغ', async () => {
    useEditorStore.setState({ elements: [] });
    renderButton();

    await clickTransfer();

    const state = useEditorStore.getState();
    expect(state.mode).toBe('single');
    expect(state.slots.every((s) => !s.imageSrc)).toBe(true);
  });

  it('يظهر الزر في الوضع الحر فقط', () => {
    const { unmount } = renderButton();
    expect(screen.getByTestId('toolbar-transfer-to-collage')).toBeInTheDocument();
    unmount();

    useEditorStore.getState().setMode('collage');
    renderButton();
    expect(screen.queryByTestId('toolbar-transfer-to-collage')).toBeNull();
  });
});

describe('ToolbarSelectionTools — أوامر خانات الكولاج', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({
      mode: 'collage',
      selectedId: 'slot-1',
      selectedIds: ['slot-1', 'slot-2'],
      slots: [
        {
          id: 'slot-1',
          cellIndex: 0,
          x: 0,
          y: 0,
          w: 0.5,
          h: 1,
          imageSrc: 'one.jpg',
          originalImageSrc: 'original-one.jpg',
        },
        {
          id: 'slot-2',
          cellIndex: 1,
          x: 0.5,
          y: 0,
          w: 0.5,
          h: 1,
          imageSrc: 'two.jpg',
          originalImageSrc: 'original-two.jpg',
        },
      ],
    });
  });

  it('يخفي أوامر العناصر الحرة ويفرّغ الصور المحددة بخطوة تراجع واحدة', () => {
    render(
      <TooltipProvider>
        <ToolbarSelectionTools />
      </TooltipProvider>,
    );

    expect(screen.queryByLabelText('تكرار')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('تجميع')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('محاذاة')).not.toBeInTheDocument();

    const historyLength = useEditorStore.getState().history.length;
    fireEvent.click(screen.getByRole('button', { name: 'تفريغ الصورة' }));

    const state = useEditorStore.getState();
    expect(state.slots.every((slot) => !slot.imageSrc && !slot.originalImageSrc)).toBe(true);
    expect(state.history.length).toBe(historyLength + 1);
  });
});
