import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { FreeformPaperSelector, PaperDimInput } from '../src/features/freeform-collage/components/FreeformPaperSelector';
import { FreeformToolbar } from '../src/features/freeform-collage/components/FreeformToolbar';

describe('Freeform Editor Unit & Component Tests', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  describe('PaperDimInput', () => {
    it('renders numerical input with initial value', () => {
      renderWithProviders(
        <PaperDimInput
          value={150}
          onCommit={vi.fn()}
          ariaLabel="العرض بالمليمتر"
        />
      );

      const input = screen.getByRole('textbox', { name: 'العرض بالمليمتر' });
      expect(input).toHaveValue('150');
    });

    it('clamps dimensions and calls onCommit on blur', () => {
      const handleCommit = vi.fn();
      renderWithProviders(
        <PaperDimInput
          value={100}
          onCommit={handleCommit}
          ariaLabel="العرض بالمليمتر"
        />
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
        />
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
        />
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
});
