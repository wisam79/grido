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

  it('renders canvas dimensions header correctly', () => {
    render(
      <TooltipProvider>
        <CanvasDimensionsPanel />
      </TooltipProvider>,
    );

    expect(screen.getByText('مساحة العمل')).toBeInTheDocument();
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
});
