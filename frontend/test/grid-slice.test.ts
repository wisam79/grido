import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

describe('GridSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('toggles grid visibility', () => {
    useEditorStore.getState().setShowGrid(true);
    expect(useEditorStore.getState().showGrid).toBe(true);

    useEditorStore.getState().setShowGrid(false);
    expect(useEditorStore.getState().showGrid).toBe(false);
  });

  it('sets grid size and color', () => {
    useEditorStore.getState().setGridSize(40);
    expect(useEditorStore.getState().gridSize).toBe(40);

    useEditorStore.getState().setGridColor('#00FF00');
    expect(useEditorStore.getState().gridColor).toBe('#00FF00');
  });

  it('sets grid type and subdivisions', () => {
    useEditorStore.getState().setGridType('dots');
    expect(useEditorStore.getState().gridType).toBe('dots');

    useEditorStore.getState().setGridSubdivisions(4);
    expect(useEditorStore.getState().gridSubdivisions).toBe(4);
  });

  it('toggles snap to grid', () => {
    useEditorStore.getState().setSnapToGrid(true);
    expect(useEditorStore.getState().snapToGrid).toBe(true);
  });

  it('configures grid columns', () => {
    useEditorStore.getState().setShowColumns(true);
    expect(useEditorStore.getState().showColumns).toBe(true);

    useEditorStore.getState().setColumnsCount(6);
    expect(useEditorStore.getState().columnsCount).toBe(6);

    useEditorStore.getState().setColumnsColor('#FF00FF');
    expect(useEditorStore.getState().columnsColor).toBe('#FF00FF');

    useEditorStore.getState().setColumnsMargin(20);
    expect(useEditorStore.getState().columnsMargin).toBe(20);

    useEditorStore.getState().setColumnsGutter(10);
    expect(useEditorStore.getState().columnsGutter).toBe(10);
  });
});
