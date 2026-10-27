import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TooltipProvider } from '../src/components/ui/tooltip';
import { FreeformCanvasEditor } from '../src/features/freeform-collage/components/freeform-canvas-editor';
import { FreeformCollageModal } from '../src/features/freeform-collage/components/freeform-collage-modal';
import {
  FreeformPaperSelector,
  PaperDimInput,
} from '../src/features/freeform-collage/components/freeform-paper-selector';
import { FreeformToolbar } from '../src/features/freeform-collage/components/freeform-toolbar';

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

  describe('FreeformToolbar', () => {
    it('renders action buttons and triggers appropriate callbacks', () => {
      const handleAddSlot = vi.fn();
      const handleUndo = vi.fn();
      const handleRedo = vi.fn();

      renderWithProviders(
        <FreeformToolbar
          selectedSlotId={null}
          multiSelectedCount={0}
          canUndo={true}
          canRedo={false}
          showCutLines={true}
          enableSnapping={true}
          packGapMM={2}
          packMarginMM={3}
          onPackGapChange={vi.fn()}
          onPackMarginChange={vi.fn()}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSplitHorizontal={vi.fn()}
          onSplitVertical={vi.fn()}
          onAddSlot={handleAddSlot}
          onAddPresetSlot={vi.fn()}
          onAutoPack={vi.fn()}
          onAlignSlot={vi.fn()}
          onAlignSelectionToEachOther={vi.fn()}
          onScaleSelection={vi.fn()}
          onResolveOverlaps={vi.fn()}
          onDistributeSlots={vi.fn()}
          onToggleCutLines={vi.fn()}
          onToggleSnapping={vi.fn()}
          onRemoveSlot={vi.fn()}
          onRotateSlot={vi.fn()}
          onDuplicateSlot={vi.fn()}
        />,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // First button is Undo (enabled)
      const undoBtn = buttons[0];
      expect(undoBtn).not.toBeDisabled();
      fireEvent.click(undoBtn);
      expect(handleUndo).toHaveBeenCalled();

      // Third button is AddSlot
      const addSlotBtn = buttons[2];
      fireEvent.click(addSlotBtn);
      expect(handleAddSlot).toHaveBeenCalled();
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
      render(
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
