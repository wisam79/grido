import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { LayersPanel } from '../src/components/editor/panels/layers-panel';
import { useEditorStore } from '../src/lib/editor-store';
import { TooltipProvider } from '../src/components/ui/tooltip';

describe('LayersPanel Component Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
  };

  it('renders empty state when canvas has no elements', () => {
    useEditorStore.setState({ elements: [] });
    renderWithProviders(<LayersPanel />);

    expect(screen.getByText('لا توجد عناصر بعد')).toBeInTheDocument();
    expect(screen.getByText('أضف صوراً أو نصوصاً أو أشكالاً من شريط الأدوات')).toBeInTheDocument();
  });

  it('renders element list with correct labels and icons', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-1',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
        {
          id: 'el-2',
          type: 'text',
          x: 10,
          y: 10,
          width: 50,
          height: 20,
          rotation: 0,
          opacity: 1,
          fontSize: 16,
          text: 'عنوان التصميم',
          visible: true,
          locked: false,
          zIndex: 2,
        },
        {
          id: 'el-3',
          type: 'shape',
          shape: 'rect',
          x: 20,
          y: 20,
          width: 80,
          height: 80,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          zIndex: 3,
        } as any,
      ],
    });

    renderWithProviders(<LayersPanel />);

    expect(screen.getByText('عنوان التصميم')).toBeInTheDocument();
    expect(screen.getByText('مستطيل')).toBeInTheDocument();
    expect(screen.getByText('صورة')).toBeInTheDocument();
  });

  it('selects an element on click', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
      selectedId: null,
    });

    renderWithProviders(<LayersPanel />);

    const item = screen.getByText('صورة');
    fireEvent.click(item);

    expect(useEditorStore.getState().selectedId).toBe('el-img');
  });

  it('toggles layer visibility', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    const { container } = renderWithProviders(<LayersPanel />);
    const buttons = container.querySelectorAll('button');
    // Button order in row: 0=Copy, 1=Visibility, 2=Lock, 3=Delete
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    const visibilityBtn = buttons[1];

    fireEvent.click(visibilityBtn);
    expect(useEditorStore.getState().elements[0].visible).toBe(false);
  });

  it('toggles layer lock', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    const { container } = renderWithProviders(<LayersPanel />);
    const buttons = container.querySelectorAll('button');
    // Button order in row: 0=Copy, 1=Visibility, 2=Lock, 3=Delete
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    const lockBtn = buttons[2];

    fireEvent.click(lockBtn);
    expect(useEditorStore.getState().elements[0].locked).toBe(true);
  });

  it('duplicates an element', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    const { container } = renderWithProviders(<LayersPanel />);
    const buttons = container.querySelectorAll('button');
    // Button order in row: 0=Copy, 1=Visibility, 2=Lock, 3=Delete
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    const copyBtn = buttons[0];

    fireEvent.click(copyBtn);
    expect(useEditorStore.getState().elements.length).toBe(2);
  });

  it('deletes an element', () => {
    useEditorStore.setState({
      elements: [
        {
          id: 'el-img',
          type: 'image',
          x: 10,
          y: 10,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          imageSrc: 'test.jpg',
          visible: true,
          locked: false,
          zIndex: 1,
        },
      ],
    });

    const { container } = renderWithProviders(<LayersPanel />);
    const buttons = container.querySelectorAll('button');
    // Button order in row: 0=Copy, 1=Visibility, 2=Lock, 3=Delete
    expect(buttons.length).toBeGreaterThanOrEqual(4);
    const deleteBtn = buttons[3];

    fireEvent.click(deleteBtn);
    expect(useEditorStore.getState().elements.length).toBe(0);
  });
});
