import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TooltipProvider } from '../src/components/ui/tooltip';
import { FreeformCanvasEditor } from '../src/features/freeform-collage/components/freeform-canvas-editor';
import { FreeformCollageModal } from '../src/features/freeform-collage/components/freeform-collage-modal';
import { FreeformLeftToolsPanel } from '../src/features/freeform-collage/components/freeform-left-tools-panel';
import {
  FreeformPaperSelector,
  PaperDimInput,
} from '../src/features/freeform-collage/components/freeform-paper-selector';
import { FreeformRightInspectorPanel } from '../src/features/freeform-collage/components/freeform-right-inspector-panel';
import { FreeformTopActionBar } from '../src/features/freeform-collage/components/freeform-top-action-bar';
import { convertToGridoTemplate } from '../src/features/freeform-collage/lib/freeform-math';
import { useEditorStore } from '../src/lib/editor-store';

import type { FreeformSlot } from '../src/features/freeform-collage/types';

const editableSlots: FreeformSlot[] = [
  { id: 'first', x: 0.1, y: 0.1, w: 0.2, h: 0.2, label: 'First' },
  { id: 'second', x: 0.5, y: 0.4, w: 0.2, h: 0.2, label: 'Second' },
  { id: 'third', x: 0.05, y: 0.75, w: 0.1, h: 0.1, label: 'Third' },
];

function seedEditableLayout() {
  useEditorStore.setState({
    collageTemplate: convertToGridoTemplate({
      id: 'editor-regression',
      name: 'Editable layout',
      paperWidthMM: 100,
      paperHeightMM: 100,
      slots: editableSlots,
      showCutLines: false,
      enableSnapping: false,
      packGapMM: 2,
      packMarginMM: 2,
    }),
  });
}

function slotCards() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot-id]'));
}

function slotPosition(card: HTMLElement) {
  return { x: parseFloat(card.style.left) / 100, y: parseFloat(card.style.top) / 100 };
}

function FreeformSession() {
  const [open, setOpen] = React.useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reopen editor</button>
      <FreeformCollageModal open={open} onOpenChange={setOpen} />
    </>
  );
}

describe('Freeform Editor Unit & Component Tests', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('PaperDimInput', () => {
    it('renders numerical input with initial value', () => {
      renderWithProviders(
        <PaperDimInput value={150} onCommit={vi.fn()} ariaLabel="العرض بالمليمتر" />,
      );

      const input = screen.getByRole('textbox', { name: 'العرض بالمليمتر' });
      expect(input).toHaveValue('150');
    });

    it('clamps dimensions and calls onCommit on blur', () => {
      const handleCommit = vi.fn();
      renderWithProviders(
        <PaperDimInput value={100} onCommit={handleCommit} ariaLabel="العرض بالمليمتر" />,
      );

      const input = screen.getByRole('textbox', { name: 'العرض بالمليمتر' });
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '200' } });
      fireEvent.blur(input);

      expect(handleCommit).toHaveBeenCalledWith(200);
    });
  });

  describe('FreeformPaperSelector', () => {
    it('renders width and height dimension inputs and presets trigger', () => {
      const handleDimensionsChange = vi.fn();
      renderWithProviders(
        <FreeformPaperSelector
          paperWidthMM={148}
          paperHeightMM={210}
          onPaperDimensionsChange={handleDimensionsChange}
        />,
      );

      expect(screen.getByRole('textbox', { name: 'عرض الورقة' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'ارتفاع الورقة' })).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('FreeformTopActionBar', () => {
    it('disables selection-scoped actions without a selected slot and fires undo', () => {
      const handleUndo = vi.fn();
      const handleDuplicateSlot = vi.fn();

      renderWithProviders(
        <FreeformTopActionBar
          selectedSlotId={null}
          multiSelectedCount={0}
          canUndo={true}
          canRedo={false}
          showCutLines={true}
          enableSnapping={true}
          onUndo={handleUndo}
          onRedo={vi.fn()}
          onSplitHorizontal={vi.fn()}
          onSplitVertical={vi.fn()}
          onRemoveSlot={vi.fn()}
          onRotateSlot={vi.fn()}
          onDuplicateSlot={handleDuplicateSlot}
          onAlignSlot={vi.fn()}
          onAlignSelectionToEachOther={vi.fn()}
          onScaleSelection={vi.fn()}
          onResolveOverlaps={vi.fn()}
          onDistributeSlots={vi.fn()}
          onToggleCutLines={vi.fn()}
          onToggleSnapping={vi.fn()}
        />,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // الزر الأول هو التراجع (مفعّل) والثاني الإعادة (م معطّل)
      expect(buttons[0]).not.toBeDisabled();
      fireEvent.click(buttons[0]);
      expect(handleUndo).toHaveBeenCalled();
      expect(buttons[1]).toBeDisabled();

      // بلا خلية محددة: تكرار/حذف/تدوير معطلة
      expect(buttons[2]).toBeDisabled();
      expect(buttons[6]).toBeDisabled();
    });

    it('enables selection-scoped actions with a selected slot', () => {
      const handleRemoveSlot = vi.fn();

      renderWithProviders(
        <FreeformTopActionBar
          selectedSlotId="s1"
          multiSelectedCount={1}
          canUndo={false}
          canRedo={false}
          showCutLines={false}
          enableSnapping={false}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          onSplitHorizontal={vi.fn()}
          onSplitVertical={vi.fn()}
          onRemoveSlot={handleRemoveSlot}
          onRotateSlot={vi.fn()}
          onDuplicateSlot={vi.fn()}
          onAlignSlot={vi.fn()}
          onAlignSelectionToEachOther={vi.fn()}
          onScaleSelection={vi.fn()}
          onResolveOverlaps={vi.fn()}
          onDistributeSlots={vi.fn()}
          onToggleCutLines={vi.fn()}
          onToggleSnapping={vi.fn()}
        />,
      );

      // زر الحذف (أيقونة سلة) مفعّل ويعمل
      const deleteBtn = screen.getByRole('button', { name: 'حذف (Del)' });
      expect(deleteBtn).not.toBeDisabled();
      fireEvent.click(deleteBtn);
      expect(handleRemoveSlot).toHaveBeenCalled();
    });
  });

  describe('FreeformLeftToolsPanel', () => {
    it('fires add-slot and auto-pack from the quick tools column', () => {
      const handleAddSlot = vi.fn();
      const handleAutoPack = vi.fn();

      const props = {
        packGapMM: 2,
        packMarginMM: 3,
        onAddSlot: handleAddSlot,
        onAddPresetSlot: vi.fn(),
        onAutoPack: handleAutoPack,
        onPackGapChange: vi.fn(),
        onPackMarginChange: vi.fn(),
      };
      const { rerender } = renderWithProviders(<FreeformLeftToolsPanel {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /إضافة خلية فارغة/ }));
      expect(handleAddSlot).toHaveBeenCalled();

      rerender(<FreeformLeftToolsPanel {...props} mode="pack" />);
      fireEvent.click(screen.getByRole('radio', { name: 'جوازات سفر' }));
      expect(handleAutoPack).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'تعبئة الورقة' }));
      expect(handleAutoPack).toHaveBeenCalledWith('passport-max');
    });

    it('inserts a preset slot from the single preset source', () => {
      const handleAddPresetSlot = vi.fn();

      renderWithProviders(
        <FreeformLeftToolsPanel
          packGapMM={2}
          packMarginMM={3}
          onAddSlot={vi.fn()}
          onAddPresetSlot={handleAddPresetSlot}
          onAutoPack={vi.fn()}
          onPackGapChange={vi.fn()}
          onPackMarginChange={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /بطاقة موحدة \(3\.5×4\.5\)/ }));
      expect(handleAddPresetSlot).toHaveBeenCalledWith('iq-national-id');
    });
  });

  describe('FreeformRightInspectorPanel', () => {
    it('reapplies the selected preset after resizing without changing its key', () => {
      const onUpdateSlot = vi.fn();
      renderWithProviders(
        <FreeformRightInspectorPanel
          slot={{ id: 's1', x: 0, y: 0, w: 0.2, h: 0.3, presetType: 'iq-national-id' }}
          multiSelectedCount={1}
          paperWidthMM={100}
          paperHeightMM={100}
          onUpdateSlot={onUpdateSlot}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'استعادة المقاس' }));
      expect(onUpdateSlot).toHaveBeenCalledWith(
        expect.objectContaining({ presetType: 'iq-national-id', w: 0.35, h: 0.45 }),
      );
    });
  });

  describe('FreeformCanvasEditor free drag clamping', () => {
    const originalPointerEvent = window.PointerEvent;
    let rectSpy: { mockRestore(): void };

    beforeEach(() => {
      useEditorStore.getState().reset();
      // jsdom لا يوفر PointerEvent — نشتق بديلاً من MouseEvent ليحمل clientX/Y
      class PointerEventPolyfill extends MouseEvent {
        pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 1;
        }
      }
      Object.defineProperty(window, 'PointerEvent', {
        value: PointerEventPolyfill,
        writable: true,
        configurable: true,
      });
      rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 400,
        bottom: 400,
        width: 400,
        height: 400,
        toJSON: () => ({}),
      } as DOMRect);
    });

    afterEach(() => {
      cleanup();
      useEditorStore.getState().reset();
      rectSpy.mockRestore();
      if (originalPointerEvent) {
        Object.defineProperty(window, 'PointerEvent', {
          value: originalPointerEvent,
          writable: true,
          configurable: true,
        });
      } else {
        delete (window as unknown as Record<string, unknown>).PointerEvent;
      }
    });

    it('keeps a dragged slot inside the paper when snapping is disabled', () => {
      const onSlotsChange = vi.fn();
      renderWithProviders(
        <FreeformCanvasEditor
          paperWidthMM={100}
          paperHeightMM={100}
          slots={[{ id: 's1', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }]}
          selectedSlotId={null}
          enableSnapping={false}
          onSelectSlot={vi.fn()}
          onSlotsChange={onSlotsChange}
        />,
      );

      const cell = screen.getByRole('button', { name: /خلية 1/ });
      fireEvent.pointerDown(cell, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(cell, { clientX: 600, clientY: 600, pointerId: 1 });
      fireEvent.pointerUp(cell, { clientX: 600, clientY: 600, pointerId: 1 });

      const moved = onSlotsChange.mock.lastCall![0] as FreeformSlot[];
      expect(moved[0].x).toBeCloseTo(0.8);
      expect(moved[0].y).toBeCloseTo(0.8);
    });

    it.each([false, true])(
      'moves primary and secondary together with snapping=%s from either selected member',
      (enableSnapping) => {
        for (const leader of ['first', 'second']) {
          const onSlotsChange = vi.fn();
          const { unmount } = renderWithProviders(
            <FreeformCanvasEditor
              paperWidthMM={100}
              paperHeightMM={100}
              slots={editableSlots}
              selectedSlotId="first"
              multiSelectedIds={['second']}
              enableSnapping={enableSnapping}
              onSelectSlot={vi.fn()}
              onSlotsChange={onSlotsChange}
            />,
          );
          const card = slotCards().find((item) => item.dataset.slotId === leader)!;
          fireEvent.pointerDown(card, { clientX: 100, clientY: 100, pointerId: 1 });
          fireEvent.pointerMove(card, { clientX: 132, clientY: 120, pointerId: 1 });
          fireEvent.pointerUp(card, { clientX: 132, clientY: 120, pointerId: 1 });

          const moved = onSlotsChange.mock.lastCall![0] as FreeformSlot[];
          expect(moved[0].x).toBeCloseTo(0.18);
          expect(moved[0].y).toBeCloseTo(0.15);
          expect(moved[1].x - moved[0].x).toBeCloseTo(0.4);
          expect(moved[1].y - moved[0].y).toBeCloseTo(0.3);
          expect(moved[2]).toBe(editableSlots[2]);
          unmount();
        }
      },
    );

    it.each([
      { clientX: 900, clientY: 900, firstX: 0.4, firstY: 0.5, secondX: 0.8, secondY: 0.8 },
      { clientX: -900, clientY: -900, firstX: 0, firstY: 0, secondX: 0.4, secondY: 0.3 },
    ])('clamps the entire unsnapped group without compressing it at $clientX', (edge) => {
      const onSlotsChange = vi.fn();
      renderWithProviders(
        <FreeformCanvasEditor
          paperWidthMM={100}
          paperHeightMM={100}
          slots={editableSlots}
          selectedSlotId="first"
          multiSelectedIds={['second']}
          enableSnapping={false}
          onSelectSlot={vi.fn()}
          onSlotsChange={onSlotsChange}
        />,
      );
      const card = slotCards()[1];
      fireEvent.pointerDown(card, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(card, { ...edge, pointerId: 1 });
      fireEvent.pointerUp(card, { ...edge, pointerId: 1 });

      const moved = onSlotsChange.mock.lastCall![0] as FreeformSlot[];
      expect(moved[0].x).toBeCloseTo(edge.firstX);
      expect(moved[0].y).toBeCloseTo(edge.firstY);
      expect(moved[1].x).toBeCloseTo(edge.secondX);
      expect(moved[1].y).toBeCloseTo(edge.secondY);
      expect(moved[1].x - moved[0].x).toBeCloseTo(0.4);
      expect(moved[1].y - moved[0].y).toBeCloseTo(0.3);
      expect(moved[2]).toBe(editableSlots[2]);
    });

    it('retains highlighted members and promotes the grabbed secondary to the primary inspector', () => {
      seedEditableLayout();
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      const [first, second, third] = slotCards();
      fireEvent.pointerDown(second, { shiftKey: true, pointerId: 1 });
      expect(first).toHaveAttribute('aria-pressed', 'true');
      expect(second).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('2 محدد')).toBeInTheDocument();

      fireEvent.pointerDown(second, { clientX: 100, clientY: 100, pointerId: 1 });
      expect(first).toHaveAttribute('aria-pressed', 'true');
      expect(second).toHaveAttribute('aria-pressed', 'true');
      expect(third).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('2 محدد')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'الموقع X' })).toHaveValue(50);

      fireEvent.pointerMove(second, { clientX: 132, clientY: 120, pointerId: 1 });
      fireEvent.pointerUp(second, { clientX: 132, clientY: 120, pointerId: 1 });
      expect(slotPosition(first).x).toBeCloseTo(0.18);
      expect(slotPosition(second).x).toBeCloseTo(0.58);
      expect(slotPosition(third)).toEqual({ x: 0.05, y: 0.75 });

      const firstWidth = first.style.width;
      fireEvent.change(screen.getByRole('spinbutton', { name: 'العرض' }), {
        target: { value: '25' },
      });
      expect(second.style.width).toBe('25%');
      expect(first.style.width).toBe(firstWidth);
      expect(screen.getByText('2 محدد')).toBeInTheDocument();

      fireEvent.pointerDown(third, { clientX: 40, clientY: 320, pointerId: 1 });
      fireEvent.pointerUp(third, { clientX: 40, clientY: 320, pointerId: 1 });
      expect(first).toHaveAttribute('aria-pressed', 'false');
      expect(second).toHaveAttribute('aria-pressed', 'false');
      expect(third).toHaveAttribute('aria-pressed', 'true');
      fireEvent.pointerDown(screen.getByTestId('freeform-paper'), { pointerId: 1 });
      expect(slotCards().every((card) => card.getAttribute('aria-pressed') === 'false')).toBe(true);
      expect(screen.queryByText(/^\d+ محدد$/)).not.toBeInTheDocument();
    });

    it('toggles the primary out of a group without duplicate counts or orphaned secondaries', () => {
      seedEditableLayout();
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      const [first, second] = slotCards();
      fireEvent.pointerDown(second, { shiftKey: true, pointerId: 1 });
      fireEvent.pointerDown(first, { shiftKey: true, pointerId: 1 });
      expect(first).toHaveAttribute('aria-pressed', 'false');
      expect(second).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('1 محدد')).toBeInTheDocument();
      fireEvent.keyDown(second, { key: 'Enter' });
      expect(screen.getByRole('spinbutton', { name: 'الموقع X' })).toHaveValue(50);
      fireEvent.pointerDown(second, { shiftKey: true, pointerId: 1 });
      expect(slotCards().every((card) => card.getAttribute('aria-pressed') === 'false')).toBe(true);
      expect(screen.queryByText(/^\d+ محدد$/)).not.toBeInTheDocument();
      fireEvent.pointerDown(first, { shiftKey: true, pointerId: 1 });
      expect(first).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('1 محدد')).toBeInTheDocument();
    });

    it('ends a keyboard burst before dragging and records each gesture separately', () => {
      seedEditableLayout();
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      const first = slotCards()[0];
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(slotPosition(first).x).toBeCloseTo(0.105);
      fireEvent.pointerDown(first, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(first, { clientX: 140, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(first, { clientX: 140, clientY: 100, pointerId: 1 });
      expect(slotPosition(first).x).toBeCloseTo(0.205);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(first).x).toBeCloseTo(0.105);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(first).x).toBeCloseTo(0.1);
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });
  });

  describe('FreeformCollageModal session dismissal', () => {
    beforeEach(() => useEditorStore.getState().reset());
    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
      useEditorStore.getState().reset();
    });

    it('closes an untouched draft without a discard prompt', () => {
      renderWithProviders(<FreeformSession />);
      fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'الكولاج الحر' })).not.toBeInTheDocument();
    });

    it.each(['إلغاء', 'إغلاق'])(
      'confirms %s and keeps the draft when discard is rejected',
      async (label) => {
        const commit = vi.spyOn(useEditorStore.getState(), 'commitCollageLayout');
        renderWithProviders(<FreeformSession />);
        fireEvent.click(screen.getByRole('button', { name: /إضافة خلية فارغة/ }));
        fireEvent.change(screen.getByRole('textbox', { name: 'اسم التخطيط' }), {
          target: { value: 'مسودة غير مطبقة' },
        });
        fireEvent.click(screen.getByRole('button', { name: label }));
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
        expect(commit).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
        expect(screen.getByRole('textbox', { name: 'اسم التخطيط' })).toHaveValue('مسودة غير مطبقة');
        expect(document.querySelectorAll('[data-slot-id]')).toHaveLength(9);
        fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
        fireEvent.click(screen.getByRole('button', { name: 'تجاهل التعديلات' }));
        await waitFor(() =>
          expect(screen.queryByRole('dialog', { name: 'الكولاج الحر' })).not.toBeInTheDocument(),
        );
        expect(commit).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Reopen editor' }));
        expect(document.querySelectorAll('[data-slot-id]')).toHaveLength(8);
        expect(screen.getByRole('textbox', { name: 'اسم التخطيط' })).toHaveValue('كولاج حر مخصص');
      },
    );

    it('guards Escape on a modified draft', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FreeformSession />);
      await user.click(screen.getByRole('button', { name: /إضافة خلية فارغة/ }));
      await user.keyboard('{Escape}');
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
      expect(document.querySelectorAll('[data-slot-id]')).toHaveLength(9);
    });

    it.each([true, false])(
      'applies and reopens explicit cutLines=%s with all document options and unchanged spacing',
      async (appliedCutLines) => {
        seedEditableLayout();
        useEditorStore.setState({
          collageGap: 17,
          collageMargin: 29,
          collageShowCutLines: !appliedCutLines,
        });
        const commit = vi.spyOn(useEditorStore.getState(), 'commitCollageLayout');
        const committedCutLines: boolean[] = [];
        const unsubscribe = useEditorStore.subscribe((state, previous) => {
          if (state.collageTemplate !== previous.collageTemplate) {
            committedCutLines.push(state.collageShowCutLines);
          }
        });
        try {
          renderWithProviders(<FreeformSession />);
          const cards = slotCards();
          fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
          expect(cards.every((card) => card.getAttribute('aria-pressed') === 'true')).toBe(true);
          fireEvent.keyDown(cards[1], { key: 'Enter' });
          expect(screen.getByText('3 محدد')).toBeInTheDocument();
          fireEvent.click(screen.getByRole('button', { name: 'قفل النسبة' }));

          if (appliedCutLines) {
            fireEvent.click(screen.getByRole('button', { name: 'إظهار خطوط القص للطباعة' }));
          }
          fireEvent.change(screen.getByRole('textbox', { name: 'اسم التخطيط' }), {
            target: { value: 'Applied options' },
          });
          fireEvent.change(screen.getByRole('textbox', { name: 'عرض الورقة' }), {
            target: { value: '120' },
          });
          fireEvent.blur(screen.getByRole('textbox', { name: 'عرض الورقة' }));
          fireEvent.mouseDown(screen.getByRole('tab', { name: 'تعبئة' }), { button: 0 });
          fireEvent.change(screen.getByRole('spinbutton', { name: 'الفجوة' }), {
            target: { value: '0' },
          });
          fireEvent.change(screen.getByRole('spinbutton', { name: 'الهامش' }), {
            target: { value: '7' },
          });
          fireEvent.click(screen.getByRole('button', { name: 'تطبيق الكولاج' }));

          expect(commit).toHaveBeenCalledTimes(1);
          const [template, options] = commit.mock.calls[0];
          expect(template.metadata).toMatchObject({
            kind: 'freeform',
            paperWidthMM: 120,
            paperHeightMM: 100,
            showCutLines: appliedCutLines,
            enableSnapping: false,
            packGapMM: 0,
            packMarginMM: 7,
          });
          expect(template.metadata?.slotOptions?.[1]).toMatchObject({ lockAspect: true });
          expect(options).not.toHaveProperty('gap');
          expect(options).not.toHaveProperty('margin');
          expect(useEditorStore.getState().collageGap).toBe(17);
          expect(useEditorStore.getState().collageMargin).toBe(29);
          expect(useEditorStore.getState().collageShowCutLines).toBe(appliedCutLines);
          expect(committedCutLines).toEqual([appliedCutLines]);

          await waitFor(() =>
            expect(screen.queryByRole('dialog', { name: 'الكولاج الحر' })).not.toBeInTheDocument(),
          );
          fireEvent.click(screen.getByRole('button', { name: 'Reopen editor' }));
          expect(screen.getByRole('textbox', { name: 'اسم التخطيط' })).toHaveValue(
            'Applied options',
          );
          expect(screen.getByRole('textbox', { name: 'عرض الورقة' })).toHaveValue('120');
          expect(screen.getByRole('textbox', { name: 'ارتفاع الورقة' })).toHaveValue('100');
          expect(screen.getByRole('button', { name: 'المغناطيس معطل' })).toHaveAttribute(
            'aria-pressed',
            'false',
          );
          expect(
            screen.getByRole('button', {
              name: appliedCutLines ? 'إخفاء خطوط القص' : 'إظهار خطوط القص للطباعة',
            }),
          ).toHaveAttribute('aria-pressed', String(appliedCutLines));
          expect(screen.getByRole('spinbutton', { name: 'الفجوة' })).toHaveValue(0);
          expect(screen.getByRole('spinbutton', { name: 'الهامش' })).toHaveValue(7);
          const reopenedCards = slotCards();
          expect(reopenedCards[0]).toHaveAttribute('aria-pressed', 'true');
          expect(reopenedCards[1]).toHaveAttribute('aria-pressed', 'false');
          expect(reopenedCards[2]).toHaveAttribute('aria-pressed', 'false');
          expect(screen.getByText('1 محدد')).toBeInTheDocument();
          expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
          fireEvent.keyDown(reopenedCards[1], { key: 'Enter' });
          expect(screen.getByRole('button', { name: 'قفل النسبة' })).toHaveAttribute(
            'aria-pressed',
            'true',
          );
        } finally {
          commit.mockRestore();
          unsubscribe();
        }
      },
    );

    it('applies once and closes without a second discard prompt', async () => {
      const commit = vi.spyOn(useEditorStore.getState(), 'commitCollageLayout');
      try {
        renderWithProviders(<FreeformSession />);
        fireEvent.click(screen.getByRole('button', { name: /إضافة خلية فارغة/ }));
        fireEvent.click(screen.getByRole('button', { name: 'تطبيق الكولاج' }));
        expect(commit).toHaveBeenCalledTimes(1);
        expect(commit.mock.calls[0][0].cells).toHaveLength(9);
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        await waitFor(() =>
          expect(screen.queryByRole('dialog', { name: 'الكولاج الحر' })).not.toBeInTheDocument(),
        );
      } finally {
        commit.mockRestore();
      }
    });
  });

  describe('FreeformCollageModal nudge history transactions', () => {
    beforeEach(() => {
      useEditorStore.getState().reset();
      seedEditableLayout();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
      cleanup();
      vi.clearAllTimers();
      vi.restoreAllMocks();
      vi.useRealTimers();
      useEditorStore.getState().reset();
    });

    it.each([0, 200])(
      'undoes a rapid burst after %sms and redoes the complete movement',
      (delay) => {
        renderWithProviders(
          <React.StrictMode>
            <FreeformCollageModal open onOpenChange={vi.fn()} />
          </React.StrictMode>,
        );
        const first = slotCards()[0];
        act(() => {
          for (let index = 0; index < 3; index++) fireEvent.keyDown(window, { key: 'ArrowRight' });
          for (let index = 0; index < 2; index++) fireEvent.keyDown(window, { key: 'ArrowDown' });
        });
        expect(slotPosition(first).x).toBeCloseTo(0.115);
        expect(slotPosition(first).y).toBeCloseTo(0.11);
        expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).not.toBeDisabled();
        act(() => vi.advanceTimersByTime(delay));
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(slotPosition(first)).toEqual({ x: 0.1, y: 0.1 });
        expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' })).not.toBeDisabled();
        fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
        expect(slotPosition(first).x).toBeCloseTo(0.115);
        expect(slotPosition(first).y).toBeCloseTo(0.11);
        act(() => vi.advanceTimersByTime(300));
        expect(slotPosition(first).x).toBeCloseTo(0.115);
        expect(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' })).toBeDisabled();
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(slotPosition(first)).toEqual({ x: 0.1, y: 0.1 });
        expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
      },
    );

    it('handles nudge, undo, and redo before React renders another frame', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      act(() => {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
      });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.11);
      act(() => vi.advanceTimersByTime(300));
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.1);
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });

    it('creates a separate undo step after an idle timeout', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      act(() => vi.advanceTimersByTime(150));
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.11);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.105);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.1);
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });

    it('clears redo on the first changed nudge, before its timeout', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' })).not.toBeDisabled();
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      expect(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' })).toBeDisabled();
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      act(() => vi.advanceTimersByTime(300));
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.1);
      expect(slotPosition(slotCards()[0]).y).toBeCloseTo(0.105);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0])).toEqual({ x: 0.1, y: 0.1 });
    });

    it('keeps redo and history unchanged for a blocked edge nudge', () => {
      const template = useEditorStore.getState().collageTemplate!;
      useEditorStore.setState({
        collageTemplate: {
          ...template,
          cells: template.cells.map((cell, index) => (index === 0 ? { ...cell, x: 0 } : cell)),
        },
      });
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(slotPosition(slotCards()[0]).x).toBe(0);
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' })).not.toBeDisabled();
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.005);
    });

    it('ends a burst before another action without replaying stale slots', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      act(() => {
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true });
      });
      expect(slotCards()).toHaveLength(4);
      act(() => vi.advanceTimersByTime(300));
      expect(slotCards()).toHaveLength(4);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotCards()).toHaveLength(3);
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.105);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.1);
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });

    it('ends a burst before changing the selection or document options', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(slotCards()[1], { key: 'Enter' });
      fireEvent.click(screen.getByRole('button', { name: 'إظهار خطوط القص للطباعة' }));
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(slotPosition(slotCards()[1]).x).toBeCloseTo(0.505);
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[1]).x).toBeCloseTo(0.5);
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.105);
      expect(screen.getByRole('button', { name: 'إخفاء خطوط القص' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.1);
    });

    it('nudges the complete highlighted group to the edges with one shared delta', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
      act(() => {
        for (let index = 0; index < 30; index++) {
          fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });
          fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
        }
      });
      const cards = slotCards();
      cards.forEach((card, index) => {
        expect(slotPosition(card).x - editableSlots[index].x).toBeCloseTo(0.3);
        expect(slotPosition(card).y - editableSlots[index].y).toBeCloseTo(0.15);
        expect(card).toHaveAttribute('aria-pressed', 'true');
      });
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      cards.forEach((card, index) => {
        expect(slotPosition(card)).toEqual({
          x: editableSlots[index].x,
          y: editableSlots[index].y,
        });
      });
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });

    it('cancels a pending burst when discarding and immediately reopening', () => {
      renderWithProviders(<FreeformSession />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
      fireEvent.click(screen.getByRole('button', { name: 'تجاهل التعديلات' }));
      expect(screen.queryByRole('dialog', { name: 'الكولاج الحر' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Reopen editor' }));
      const reopenedIds = slotCards().map((card) => card.dataset.slotId);
      act(() => vi.advanceTimersByTime(300));
      expect(slotCards().map((card) => card.dataset.slotId)).toEqual(reopenedIds);
      expect(slotPosition(slotCards()[0])).toEqual({ x: 0.1, y: 0.1 });
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'إعادة (Ctrl+Y)' })).toBeDisabled();
    });

    it('cancels the timer on a controlled close and reopen', () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderWithProviders(
        <FreeformCollageModal open onOpenChange={onOpenChange} />,
      );
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      rerender(
        <TooltipProvider>
          <FreeformCollageModal open={false} onOpenChange={onOpenChange} />
        </TooltipProvider>,
      );
      rerender(
        <TooltipProvider>
          <FreeformCollageModal open onOpenChange={onOpenChange} />
        </TooltipProvider>,
      );
      act(() => vi.advanceTimersByTime(300));
      expect(slotPosition(slotCards()[0])).toEqual({ x: 0.1, y: 0.1 });
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });

    it('ends a burst at a close request even when editing is continued', () => {
      renderWithProviders(<FreeformSession />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
      fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
      act(() => screen.getByRole('dialog', { name: 'الكولاج الحر' }).focus());
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.105);
      expect(slotPosition(slotCards()[0]).y).toBeCloseTo(0.1);
      act(() => vi.advanceTimersByTime(300));
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
      expect(slotPosition(slotCards()[0])).toEqual({ x: 0.1, y: 0.1 });
    });

    it('applies the latest nudge before timeout without leaking its local history into reopening', () => {
      renderWithProviders(<FreeformSession />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.click(screen.getByRole('button', { name: 'تطبيق الكولاج' }));
      expect(useEditorStore.getState().collageTemplate?.cells[0].x).toBeCloseTo(0.105);
      fireEvent.click(screen.getByRole('button', { name: 'Reopen editor' }));
      act(() => vi.advanceTimersByTime(300));
      expect(slotPosition(slotCards()[0]).x).toBeCloseTo(0.105);
      expect(screen.getByRole('button', { name: 'تراجع (Ctrl+Z)' })).toBeDisabled();
    });

    it('clears the nudge timer on unmount', () => {
      const schedule = vi.spyOn(globalThis, 'setTimeout');
      const cancel = vi.spyOn(globalThis, 'clearTimeout');
      const { unmount } = renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      const timerIndex = schedule.mock.calls.findIndex(([, delay]) => delay === 150);
      expect(timerIndex).toBeGreaterThanOrEqual(0);
      const timer = schedule.mock.results[timerIndex].value;
      unmount();
      expect(cancel).toHaveBeenCalledWith(timer);
      act(() => vi.advanceTimersByTime(300));
    });
  });

  describe('FreeformCollageModal keyboard nudge clamping', () => {
    beforeEach(() => useEditorStore.getState().reset());
    afterEach(() => {
      cleanup();
      useEditorStore.getState().reset();
    });

    it('navigates sidebar tabs with arrows without nudging slots', async () => {
      const user = userEvent.setup();
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      const slot = document.querySelector<HTMLElement>('[data-slot-id]')!;
      const position = { left: slot.style.left, top: slot.style.top };
      await user.click(screen.getByRole('tab', { name: 'إدراج' }));
      await user.keyboard('{ArrowLeft}');
      await waitFor(() =>
        expect(screen.getByRole('tab', { name: 'تعبئة' })).toHaveAttribute('aria-selected', 'true'),
      );
      expect({ left: slot.style.left, top: slot.style.top }).toEqual(position);
    });

    it('opens contextual properties and preserves the draft when collapsing the dock', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);
      expect(screen.getByRole('tab', { name: 'إدراج' })).toHaveAttribute('aria-selected', 'true');
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-slot-id]'));
      fireEvent.keyDown(cards[0], { key: 'Enter' });
      expect(screen.getByRole('tab', { name: 'خصائص' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('spinbutton', { name: 'العرض' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الأدوات' }));
      expect(screen.getByRole('button', { name: 'إظهار لوحة الأدوات' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(document.querySelectorAll('[data-slot-id]')).toHaveLength(cards.length);
      fireEvent.click(screen.getByRole('button', { name: 'إظهار لوحة الأدوات' }));
      expect(screen.getByRole('tab', { name: 'خصائص' })).toHaveAttribute('aria-selected', 'true');
    });

    it('keeps slots inside the paper with arrow-key nudges', () => {
      renderWithProviders(<FreeformCollageModal open onOpenChange={vi.fn()} />);

      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-slot-id]'));
      expect(cards).toHaveLength(8);

      // خلية أقصى اليمين (x=0.75, w=0.25) — الإزاحة لليمين تُثبَّت عند الحد
      fireEvent.keyDown(cards[3], { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(cards[3].style.left).toBe('75%');

      // خلية أقصى اليسار (x=0) — الإزاحة لليسار تُثبَّت عند الصفر
      fireEvent.keyDown(cards[0], { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(cards[0].style.left).toBe('0%');
    });
  });
});
