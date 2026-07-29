import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { CanvasQuickBar } from '../src/components/editor/canvas/canvas-quick-bar';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('CanvasQuickBar Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('renders nothing when no element or slot is selected', () => {
    const { container } = render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders quick bar for selected collage slot', () => {
    useEditorStore.setState({
      mode: 'collage',
      selectedId: 'slot-1',
      slots: [
        {
          id: 'slot-1',
          cellIndex: 0,
          x: 0,
          y: 0,
          w: 100,
          h: 100,
          imageSrc: 'test.jpg',
        },
      ],
    });

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>
    );

    expect(screen.getByText('خلية كولاج')).toBeInTheDocument();
    expect(screen.getByText('تغيير')).toBeInTheDocument();
    expect(screen.getByText('كل الورقة')).toBeInTheDocument();
  });

  it('renders quick bar for selected single mode element', () => {
    useEditorStore.setState({
      mode: 'single',
      selectedId: 'el-1',
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          zIndex: 1,
          imageSrc: 'test.jpg',
        },
      ],
    });

    render(
      <TooltipProvider>
        <CanvasQuickBar printMode={false} isContextMenuOpen={false} />
      </TooltipProvider>
    );

    expect(screen.getByText('عزل الخلفية')).toBeInTheDocument();
  });
});
