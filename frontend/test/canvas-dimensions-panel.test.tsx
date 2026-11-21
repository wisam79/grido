import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { CanvasDimensionsPanel } from '../src/components/editor/properties/general/canvas-dimensions-panel';
import { GridColumnsPanel } from '../src/components/editor/properties/general/grid-columns-panel';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

describe('CanvasDimensionsPanel Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it.each(['العرض', 'الارتفاع'])('Escape skips the following native blur for %s', (label) => {
    useEditorStore.setState({ rulerUnit: 'px' });
    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );
    const before = useEditorStore.getState();
    const input = screen.getByLabelText(label);
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useEditorStore.getState().canvasWidth).toBe(before.canvasWidth);
    expect(useEditorStore.getState().canvasHeight).toBe(before.canvasHeight);
    expect(useEditorStore.getState().history).toBe(before.history);
  });

  it.each(['blur', 'Escape', 'Enter'])(
    'untouched column drafts preserve an external update on %s',
    (finish) => {
      useEditorStore.setState({ mode: 'single', showColumns: true, columnsCount: 3 });
      render(
        <TooltipProvider>
          <GridColumnsPanel />
        </TooltipProvider>,
      );
      fireEvent.click(screen.getByRole('tab', { name: 'الأعمدة' }));
      const input = screen.getByRole('spinbutton', { name: 'عدد الأعمدة' });
      act(() => input.focus());
      act(() => useEditorStore.getState().setColumnsCount(8));
      if (finish === 'blur') act(() => input.blur());
      else fireEvent.keyDown(input, { key: finish });
      expect(useEditorStore.getState().columnsCount).toBe(8);
      expect(input).toHaveValue(8);
    },
  );

  it('live column drafts revert on Escape but never overwrite an external writer', () => {
    useEditorStore.setState({ mode: 'single', showColumns: true, columnsCount: 3 });
    render(
      <TooltipProvider>
        <GridColumnsPanel />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'الأعمدة' }));
    const input = screen.getByRole('spinbutton', { name: 'عدد الأعمدة' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '6' } });
    expect(useEditorStore.getState().columnsCount).toBe(6);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useEditorStore.getState().columnsCount).toBe(3);
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '6' } });
    act(() => useEditorStore.getState().setColumnsCount(9));
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useEditorStore.getState().columnsCount).toBe(9);
  });

  it('rejects recycled grid drafts across document sessions', () => {
    useEditorStore.setState({ mode: 'single', showColumns: true, columnsCount: 3 });
    render(
      <TooltipProvider>
        <GridColumnsPanel />
      </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'الأعمدة' }));
    const input = screen.getByRole('spinbutton', { name: 'عدد الأعمدة' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '6' } });
    act(() => {
      useEditorStore.getState().reset();
      useEditorStore.setState({ mode: 'single', showColumns: true, columnsCount: 6 });
    });
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useEditorStore.getState().columnsCount).toBe(6);
  });

  it('supports clearing and retyping the grid size without snapping to a default', () => {
    useEditorStore.setState({ mode: 'single', showGrid: true, gridSize: 20 });
    render(
      <TooltipProvider>
        <GridColumnsPanel />
      </TooltipProvider>,
    );
    const input = screen.getByRole('spinbutton', { name: 'حجم مربع الشبكة' });
    act(() => input.focus());
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    expect(useEditorStore.getState().gridSize).toBe(20);
    fireEvent.change(input, { target: { value: '1' } });
    expect(input).toHaveValue(1);
    expect(useEditorStore.getState().gridSize).toBe(20);
    fireEvent.change(input, { target: { value: '15' } });
    expect(useEditorStore.getState().gridSize).toBe(15);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useEditorStore.getState().gridSize).toBe(20);
  });

  it('renders the paper controls without a redundant workspace header', () => {
    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );

    expect(screen.queryByText('مساحة العمل')).not.toBeInTheDocument();
    expect(screen.getByLabelText('المقاس: A4')).toBeInTheDocument();
    expect(screen.getByLabelText('العرض')).toBeInTheDocument();
    expect(screen.getByLabelText('الارتفاع')).toBeInTheDocument();
  });

  it('swaps canvas dimensions when orientation toggle button is clicked', () => {
    useEditorStore.setState({
      canvasWidth: 2480,
      canvasHeight: 3508,
    });

    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );

    const landscapeBtn = screen.getByTitle('أفقي');
    fireEvent.click(landscapeBtn);

    expect(useEditorStore.getState().canvasWidth).toBe(3508);
    expect(useEditorStore.getState().canvasHeight).toBe(2480);
  });

  it('stays in collage mode and preserves manual cell ratio when toggling orientation with a stale single template', () => {
    useEditorStore.getState().setTemplate({
      id: 'passport-standard',
      name: 'Passport 35x45',
      category: 'passport',
      width: 413,
      height: 531,
      widthMM: 35,
      heightMM: 45,
      dpi: 300,
      background: '#FFFFFF',
      backgroundHint: 'White',
    });
    useEditorStore.getState().setMode('collage');
    const firstId = useEditorStore.getState().slots[0].id;
    useEditorStore.getState().addAdjacentCollageSlot(firstId, 'right');

    const historyBefore = useEditorStore.getState().historyIndex;

    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTitle('أفقي'));

    const state = useEditorStore.getState();
    expect(state.mode).toBe('collage');
    expect(state.canvasWidth).toBe(3508);
    expect(state.canvasHeight).toBe(2480);
    expect(state.historyIndex).toBe(historyBefore + 1);
    for (const sl of state.slots) {
      expect((sl.w * 3508) / (sl.h * 2480)).toBeCloseTo(32 / 40, 2);
    }
  });

  it('swaps single-mode template mm dimensions and preserves backgroundColor in one history step', () => {
    useEditorStore.getState().setTemplate({
      id: 'passport-standard',
      name: 'Passport 35x45',
      category: 'passport',
      width: 413,
      height: 531,
      widthMM: 35,
      heightMM: 45,
      dpi: 300,
      background: '#FFFFFF',
      backgroundHint: 'White',
    });
    useEditorStore.getState().setBackgroundColor('#dc2626');
    useEditorStore.getState().pushHistory();
    const historyBefore = useEditorStore.getState().historyIndex;

    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );

    fireEvent.click(screen.getByTitle('أفقي'));

    const state = useEditorStore.getState();
    expect(state.mode).toBe('single');
    expect(state.template?.width).toBe(531);
    expect(state.template?.height).toBe(413);
    expect(state.template?.widthMM).toBe(45);
    expect(state.template?.heightMM).toBe(35);
    expect(state.backgroundColor).toBe('#dc2626');
    expect(state.historyIndex).toBe(historyBefore + 1);
  });

  it('clears an active passport template when switching to a standard paper preset so print layout uses the new paper dimensions', () => {
    useEditorStore.getState().setTemplate({
      id: 'passport-standard',
      name: 'Passport 35x45',
      category: 'passport',
      width: 413,
      height: 531,
      widthMM: 35,
      heightMM: 45,
      dpi: 300,
      background: '#FFFFFF',
      backgroundHint: 'White',
    });

    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'المقاس: مقاس مخصص' });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);

    const a4Option = screen.getByText(/A4 \(/);
    fireEvent.click(a4Option);

    const after = useEditorStore.getState();
    expect(after.template).toBeNull();
    expect(after.canvasWidth).toBe(2480);
    expect(after.canvasHeight).toBe(3508);
  });
});
