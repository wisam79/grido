import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('Freeform Editor Unit & Component Tests', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

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

      expect(onSlotsChange).toHaveBeenLastCalledWith([expect.objectContaining({ x: 0.8, y: 0.8 })]);
    });
  });

  describe('FreeformCollageModal keyboard nudge clamping', () => {
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
