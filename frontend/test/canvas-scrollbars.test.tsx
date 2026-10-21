import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import {
  CanvasHorizontalScrollbar,
  CanvasVerticalScrollbar,
  CanvasCornerResetButton,
  CanvasScrollbarsBottomBar,
} from '../src/components/editor/canvas/canvas-scrollbars';
import { getStageClampBounds } from '../src/components/editor/canvas/use-canvas-viewport';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('Canvas Scrollbars & Viewport Framing Tests', () => {
  it('calculates getStageClampBounds with symmetric bounds', () => {
    // عرض الحاوية 1000، وعرض الورقة المعروضة 800
    const bounds = getStageClampBounds(800, 600, 1000, 800);
    expect(bounds.minVisible).toBeGreaterThanOrEqual(40);
    expect(bounds.minVisible).toBeLessThanOrEqual(150);
    expect(bounds.minX).toBe(bounds.minVisible - 800);
    expect(bounds.maxX).toBe(1000 - bounds.minVisible);
    expect(bounds.minY).toBe(bounds.minVisible - 600);
    expect(bounds.maxY).toBe(800 - bounds.minVisible);
  });

  describe('CanvasHorizontalScrollbar', () => {
    it('renders horizontal scrollbar with accessible role and orientation', () => {
      const handleScroll = vi.fn();
      render(
        <CanvasHorizontalScrollbar
          viewportWidth={1000}
          displayW={800}
          stagePosX={100}
          onScrollX={handleScroll}
        />,
      );

      const scrollbar = screen.getByRole('scrollbar', { name: /شريط تمرير الكانفاس الأفقي/i });
      expect(scrollbar).toBeInTheDocument();
      expect(scrollbar).toHaveAttribute('aria-orientation', 'horizontal');
      expect(scrollbar).toHaveAttribute('aria-valuenow');
    });

    it('handles keyboard navigation with arrow keys and home', () => {
      const handleScroll = vi.fn();
      render(
        <CanvasHorizontalScrollbar
          viewportWidth={1000}
          displayW={800}
          stagePosX={100}
          onScrollX={handleScroll}
        />,
      );

      const scrollbar = screen.getByRole('scrollbar', { name: /شريط تمرير الكانفاس الأفقي/i });
      fireEvent.keyDown(scrollbar, { key: 'ArrowLeft' });
      expect(handleScroll).toHaveBeenCalledWith(140); // 100 + 40

      fireEvent.keyDown(scrollbar, { key: 'ArrowRight' });
      expect(handleScroll).toHaveBeenCalledWith(60); // 100 - 40

      fireEvent.keyDown(scrollbar, { key: 'Home' });
      expect(handleScroll).toHaveBeenCalledWith(100); // (1000 - 800) / 2
    });

    it('centers horizontal pan on thumb double click', () => {
      const handleScroll = vi.fn();
      const { container } = render(
        <CanvasHorizontalScrollbar
          viewportWidth={1000}
          displayW={800}
          stagePosX={0}
          onScrollX={handleScroll}
        />,
      );

      const thumb = container.querySelector('[data-thumb]');
      expect(thumb).toBeInTheDocument();

      if (thumb) {
        fireEvent.doubleClick(thumb);
        // (viewportWidth - displayW) / 2 = (1000 - 800) / 2 = 100
        expect(handleScroll).toHaveBeenCalledWith(100);
      }
    });
  });

  describe('CanvasVerticalScrollbar', () => {
    it('renders vertical scrollbar with accessible role and orientation', () => {
      const handleScroll = vi.fn();
      render(
        <CanvasVerticalScrollbar
          viewportHeight={800}
          displayH={600}
          stagePosY={100}
          onScrollY={handleScroll}
        />,
      );

      const scrollbar = screen.getByRole('scrollbar', { name: /شريط تمرير الكانفاس الرأسي/i });
      expect(scrollbar).toBeInTheDocument();
      expect(scrollbar).toHaveAttribute('aria-orientation', 'vertical');
      expect(scrollbar).toHaveAttribute('aria-valuenow');
    });

    it('handles keyboard navigation with arrow keys and home', () => {
      const handleScroll = vi.fn();
      render(
        <CanvasVerticalScrollbar
          viewportHeight={800}
          displayH={600}
          stagePosY={100}
          onScrollY={handleScroll}
        />,
      );

      const scrollbar = screen.getByRole('scrollbar', { name: /شريط تمرير الكانفاس الرأسي/i });
      fireEvent.keyDown(scrollbar, { key: 'ArrowUp' });
      expect(handleScroll).toHaveBeenCalledWith(140); // 100 + 40

      fireEvent.keyDown(scrollbar, { key: 'ArrowDown' });
      expect(handleScroll).toHaveBeenCalledWith(60); // 100 - 40

      fireEvent.keyDown(scrollbar, { key: 'Home' });
      expect(handleScroll).toHaveBeenCalledWith(100); // (800 - 600) / 2
    });

    it('centers vertical pan on thumb double click', () => {
      const handleScroll = vi.fn();
      const { container } = render(
        <CanvasVerticalScrollbar
          viewportHeight={800}
          displayH={600}
          stagePosY={0}
          onScrollY={handleScroll}
        />,
      );

      const thumb = container.querySelector('[data-thumb]');
      expect(thumb).toBeInTheDocument();

      if (thumb) {
        fireEvent.doubleClick(thumb);
        // (viewportHeight - displayH) / 2 = (800 - 600) / 2 = 100
        expect(handleScroll).toHaveBeenCalledWith(100);
      }
    });
  });

  describe('CanvasCornerResetButton & BottomBar', () => {
    it('renders corner reset button and triggers onResetPan', () => {
      const handleReset = vi.fn();
      render(
        <TooltipProvider>
          <CanvasCornerResetButton onResetPan={handleReset} />
        </TooltipProvider>,
      );

      const resetBtn = screen.getByRole('button', { name: /إعادة توسيط الكانفاس/i });
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it('renders CanvasScrollbarsBottomBar containing corners and horizontal scrollbar', () => {
      const handleScroll = vi.fn();
      const handleReset = vi.fn();

      render(
        <TooltipProvider>
          <CanvasScrollbarsBottomBar
            viewportWidth={1000}
            displayW={800}
            stagePosX={100}
            onScrollX={handleScroll}
            onResetPan={handleReset}
          />
        </TooltipProvider>,
      );

      expect(screen.getByRole('scrollbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /إعادة توسيط الكانفاس/i })).toBeInTheDocument();
    });
  });
});
