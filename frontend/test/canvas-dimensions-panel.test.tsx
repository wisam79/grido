import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { CanvasDimensionsPanel } from '../src/components/editor/properties/general/canvas-dimensions-panel';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('CanvasDimensionsPanel Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('renders canvas dimensions header correctly', () => {
    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>
    );

    expect(screen.getByText('أبعاد مساحة العمل')).toBeInTheDocument();
  });

  it('swaps canvas dimensions when orientation toggle button is clicked', () => {
    useEditorStore.setState({
      canvasWidth: 2480,
      canvasHeight: 3508,
    });

    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>
    );

    const swapBtn = screen.getByTitle('تبديل الاتجاه (أفقي/عمودي)');
    fireEvent.click(swapBtn);

    expect(useEditorStore.getState().canvasWidth).toBe(3508);
    expect(useEditorStore.getState().canvasHeight).toBe(2480);
  });
});
