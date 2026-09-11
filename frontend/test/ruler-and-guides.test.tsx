import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  HorizontalRuler,
  VerticalRuler,
} from '../src/components/editor/canvas/ruler';
import {
  getRulerSteps,
  formatRulerNumber,
  formatRulerCoordinate,
  getUnitSpan,
} from '../src/components/editor/canvas/ruler-utils';
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

  it('renders VerticalRuler with clean cursor indicator', () => {
    const { container } = render(
      <VerticalRuler
        viewportHeight={600}
        originY={50}
        displayH={500}
        mmHeight={100}
        unit="mm"
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(container.querySelector('#v-ruler-cursor')).toBeInTheDocument();
  });

  it('confines ruler labels strictly to canvas boundaries without negative numbers', () => {
    // Canvas occupies x: 200..700 in an 800px wide viewport (width = 100mm)
    const { container: hContainer } = render(
      <HorizontalRuler
        viewportWidth={800}
        originX={200}
        displayW={500}
        mmWidth={100}
        unit="mm"
      />
    );

    const hTexts = Array.from(hContainer.querySelectorAll('text')).map((t) => t.textContent?.trim());
    expect(hTexts.length).toBeGreaterThan(0);
    // Ensure no negative numbers
    expect(hTexts.some((txt) => txt && txt.startsWith('-'))).toBe(false);
    // Ensure all numeric values are within 0..100
    for (const txt of hTexts) {
      if (txt && !isNaN(Number(txt))) {
        const num = Number(txt);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(100);
      }
    }

    // Vertical ruler: y: 150..550 in a 600px tall viewport (height = 80mm)
    const { container: vContainer } = render(
      <VerticalRuler
        viewportHeight={600}
        originY={150}
        displayH={400}
        mmHeight={80}
        unit="mm"
      />
    );

    const vTexts = Array.from(vContainer.querySelectorAll('text')).map((t) => t.textContent?.trim());
    expect(vTexts.length).toBeGreaterThan(0);
    expect(vTexts.some((txt) => txt && txt.startsWith('-'))).toBe(false);
    for (const txt of vTexts) {
      if (txt && !isNaN(Number(txt))) {
        const num = Number(txt);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThanOrEqual(80);
      }
    }
  });

  it('calculates adaptive ruler steps accurately for all units', () => {
    // mm
    const stepsMM = getRulerSteps(5, 'mm');
    expect(stepsMM.labelStep).toBeGreaterThan(0);
    expect(stepsMM.subStep).toBeGreaterThan(0);
    expect(stepsMM.midStep).toBe(stepsMM.labelStep / 2);

    // cm
    const stepsCM = getRulerSteps(50, 'cm');
    expect(stepsCM.labelStep).toBeGreaterThan(0);

    // in
    const stepsIN = getRulerSteps(100, 'in');
    expect(stepsIN.labelStep).toBeGreaterThan(0);

    // px
    const stepsPX = getRulerSteps(1, 'px');
    expect(stepsPX.labelStep).toBeGreaterThanOrEqual(10);
  });

  it('formats ruler numbers and coordinates properly', () => {
    expect(formatRulerNumber(0, 'mm')).toBe('0');
    expect(formatRulerNumber(35, 'mm')).toBe('35');
    expect(formatRulerNumber(0.5, 'in')).toBe('½');
    expect(formatRulerNumber(0.25, 'in')).toBe('¼');
    expect(formatRulerNumber(100, 'px')).toBe('100');

    expect(formatRulerCoordinate(0, 'mm')).toBe('0 mm');
    expect(formatRulerCoordinate(35.0, 'mm')).toBe('35 mm');
    expect(formatRulerCoordinate(2.5, 'in')).toBe('2.5 in');
    expect(formatRulerCoordinate(150, 'px')).toBe('150 px');
    expect(formatRulerCoordinate(12.34, 'cm')).toBe('12.34 cm');
  });

  it('calculates unit spans correctly', () => {
    expect(getUnitSpan(100, 1200, 'mm')).toBe(100);
    expect(getUnitSpan(100, 1200, 'cm')).toBe(10);
    expect(getUnitSpan(254, 1200, 'in')).toBe(10);
    expect(getUnitSpan(100, 1200, 'px')).toBe(1200);
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
          hasGuides={true}
          lockUserGuides={false}
          onToggleLockGuides={() => {}}
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
