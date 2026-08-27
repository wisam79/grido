import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { HorizontalRuler, VerticalRuler } from '../src/components/editor/canvas/ruler';
import { ViewportFixedRulersHeader, ViewportFixedRulersSidebar } from '../src/components/editor/canvas/canvas-rulers';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('Ruler & User Guides Integration Tests', () => {
  it('renders HorizontalRuler with various units and origin offset', () => {
    // 1. mm
    const { container: containerMM } = render(
      <HorizontalRuler
        viewportWidth={800}
        originX={100}
        displayW={600}
        mmWidth={150}
        unit="mm"
      />
    );
    expect(containerMM.querySelector('svg')).toBeInTheDocument();
    expect(containerMM.querySelector('#h-ruler-cursor')).toBeInTheDocument();

    // 2. cm
    const { container: containerCM } = render(
      <HorizontalRuler
        viewportWidth={800}
        originX={100}
        displayW={600}
        mmWidth={150}
        unit="cm"
      />
    );
    expect(containerCM.querySelector('svg')).toBeInTheDocument();

    // 3. in
    const { container: containerIN } = render(
      <HorizontalRuler
        viewportWidth={800}
        originX={100}
        displayW={600}
        mmWidth={152.4}
        unit="in"
      />
    );
    expect(containerIN.querySelector('svg')).toBeInTheDocument();

    // 4. px
    const { container: containerPX } = render(
      <HorizontalRuler
        viewportWidth={800}
        originX={100}
        displayW={600}
        mmWidth={150}
        pxWidth={1800}
        unit="px"
      />
    );
    expect(containerPX.querySelector('svg')).toBeInTheDocument();
  });

  it('renders VerticalRuler with selection projection highlight', () => {
    const { container } = render(
      <VerticalRuler
        viewportHeight={600}
        originY={50}
        displayH={500}
        mmHeight={100}
        unit="mm"
        selectionBounds={{
          startPx: 150,
          lengthPx: 120,
        }}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(container.querySelector('#v-ruler-cursor')).toBeInTheDocument();

    // Check that selection projection rect is rendered
    const selectionRect = container.querySelector('rect[width="22"]');
    expect(selectionRect).toBeInTheDocument();
    expect(selectionRect?.getAttribute('y')).toBe('150');
    expect(selectionRect?.getAttribute('height')).toBe('120');
  });

  it('renders ViewportFixedRulersHeader and toggles unit selector dropdown', () => {
    let selectedUnit = 'mm';
    const handleChangeUnit = (u: any) => {
      selectedUnit = u;
    };

    render(
      <TooltipProvider>
        <ViewportFixedRulersHeader
          showRuler={true}
          printMode={false}
          viewportWidth={800}
          originX={100}
          displayW={600}
          widthMM={150}
          canvasPxW={1800}
          rulerUnit="mm"
          onChangeRulerUnit={handleChangeUnit}
        />
      </TooltipProvider>
    );

    // Check corner unit button
    const cornerBtn = screen.getByRole('button', { name: /خيارات وحدة قياس المسطرة/i });
    expect(cornerBtn).toBeInTheDocument();
    expect(cornerBtn).toHaveTextContent('mm');

    // Click / pointerDown on corner button to trigger dropdown
    fireEvent.pointerDown(cornerBtn, { pointerId: 1, button: 0 });
    fireEvent.keyDown(cornerBtn, { key: 'Enter', code: 'Enter' });
  });

  it('renders ViewportFixedRulersSidebar correctly when visible', () => {
    const { container } = render(
      <ViewportFixedRulersSidebar
        showRuler={true}
        printMode={false}
        viewportHeight={600}
        originY={50}
        displayH={500}
        heightMM={100}
        canvasPxH={1200}
        rulerUnit="mm"
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('hides rulers in printMode or when showRuler is false', () => {
    const { container: c1 } = render(
      <ViewportFixedRulersHeader
        showRuler={false}
        printMode={false}
        viewportWidth={800}
        originX={0}
        displayW={600}
        widthMM={150}
        canvasPxW={1800}
        rulerUnit="mm"
        onChangeRulerUnit={() => {}}
      />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <ViewportFixedRulersSidebar
        showRuler={true}
        printMode={true}
        viewportHeight={600}
        originY={0}
        displayH={500}
        heightMM={100}
        canvasPxH={1200}
        rulerUnit="mm"
      />
    );
    expect(c2.firstChild).toBeNull();
  });
});
