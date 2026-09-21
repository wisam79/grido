import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { CollageLayersTab } from '../src/components/editor/panels/collage/collage-layers-tab';
import { useEditorStore } from '../src/lib/editor-store';

const slotA = {
  id: 'slot-a',
  cellIndex: 0,
  x: 0, y: 0, w: 0.5, h: 1,
  imageSrc: '/local-image/img_a.png',
};
const slotB = {
  id: 'slot-b',
  cellIndex: 1,
  x: 0.5, y: 0, w: 0.5, h: 1,
  imageSrc: undefined,
};

describe('CollageLayersTab', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({ slots: [], selectedId: null });
  });

  it('shows an empty state when there is no grid', () => {
    render(<CollageLayersTab />);
    expect(screen.getByText('طبقات الخانات')).toBeInTheDocument();
    expect(screen.getByText('لا توجد شبكة بعد')).toBeInTheDocument();
  });

  it('lists slots with fill state and selects on click', () => {
    useEditorStore.setState({ slots: [slotA, slotB] as never });
    render(<CollageLayersTab />);

    expect(screen.getByText('1 ممتلئة · 1 فارغة')).toBeInTheDocument();
    expect(screen.getByLabelText('الخانة 1 (ممتلئة)')).toBeInTheDocument();
    expect(screen.getByLabelText('الخانة 2 (فارغة)')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('الخانة 2 (فارغة)'));
    expect(useEditorStore.getState().selectedId).toBe('slot-b');
  });

  it('clears a filled slot and records history', () => {
    useEditorStore.setState({ slots: [slotA] as never });
    const historyLen = useEditorStore.getState().history.length;
    render(<CollageLayersTab />);

    fireEvent.click(screen.getByLabelText('إفراغ الخانة 1'));
    const state = useEditorStore.getState();
    expect(state.slots[0].imageSrc).toBeUndefined();
    expect(state.history.length).toBeGreaterThan(historyLen);
  });
});
