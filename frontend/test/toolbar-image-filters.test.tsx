import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageFiltersPopover } from '../src/components/editor/toolbar/toolbar-image-filters';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore } from '../src/lib/editor-store';

import type { ImageElement } from '../src/lib/editor-store';

const initial = useEditorStore.getState();
const image: ImageElement = {
  id: 'image',
  type: 'image',
  x: 0,
  y: 0,
  width: 0.2,
  height: 0.2,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
  imageSrc: 'image.png',
  filter: 'none',
};

function popover() {
  return render(
    <TooltipProvider>
      <ImageFiltersPopover />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useEditorStore.setState({
    ...initial,
    mode: 'single',
    elements: [image],
    selectedId: image.id,
    selectedIds: [image.id],
    history: [],
    historyIndex: -1,
  });
  useEditorStore.getState().pushHistory();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useEditorStore.setState(initial);
});

describe('ImageFiltersPopover', () => {
  it('mounts with a real Zustand store and remains stable on unrelated updates', () => {
    expect(() => popover()).not.toThrow();
    expect(screen.getByRole('button', { name: 'المرشحات' })).toBeInTheDocument();
    act(() => useEditorStore.setState({ backgroundColor: '#123456' }));
    expect(screen.getByRole('button', { name: 'المرشحات' })).toBeInTheDocument();
  });

  it('does not render for an empty selection', () => {
    useEditorStore.setState({ selectedId: null, selectedIds: [] });
    expect(() => popover()).not.toThrow();
    expect(screen.queryByRole('button', { name: 'المرشحات' })).not.toBeInTheDocument();
  });

  it('updates selected images in one history step without modifying locked images', () => {
    useEditorStore.setState({
      elements: [image, { ...image, id: 'second' }, { ...image, id: 'locked', locked: true }],
      selectedIds: ['image', 'second', 'locked'],
      history: [],
      historyIndex: -1,
    });
    useEditorStore.getState().pushHistory();
    popover();
    fireEvent.click(screen.getByRole('button', { name: 'المرشحات' }));
    fireEvent.click(screen.getByTitle('تدرج رمادي'));
    const state = useEditorStore.getState();
    expect(state.elements.map((element) => (element as ImageElement).filter)).toEqual([
      'grayscale',
      'grayscale',
      'none',
    ]);
    expect(state.history).toHaveLength(2);
  });
});
