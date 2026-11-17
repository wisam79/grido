import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { CanvasDimensionsPanel } from '../src/components/editor/properties/general/canvas-dimensions-panel';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

describe('CanvasDimensionsPanel Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
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
});
