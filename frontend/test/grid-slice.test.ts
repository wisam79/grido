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
    expect(useEditorStore.getState().snapToGrid).toBe(true);
    useEditorStore.getState().setSnapToGrid(false);
    expect(useEditorStore.getState().snapToGrid).toBe(false);
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

  it('updates rulerUnit across all 4 units (mm, cm, in, px)', () => {
    expect(useEditorStore.getState().rulerUnit).toBe('mm');

    useEditorStore.getState().setRulerUnit('cm');
    expect(useEditorStore.getState().rulerUnit).toBe('cm');

    useEditorStore.getState().setRulerUnit('in');
    expect(useEditorStore.getState().rulerUnit).toBe('in');

    useEditorStore.getState().setRulerUnit('px');
    expect(useEditorStore.getState().rulerUnit).toBe('px');
  });

  it('manages user guides (add, update, remove, clear, toggle visibility)', () => {
    expect(useEditorStore.getState().userGuides).toEqual([]);
    expect(useEditorStore.getState().showUserGuides).toBe(true);

    // 1. Add horizontal and vertical guides
    useEditorStore.getState().addUserGuide({ id: 'g-h-1', type: 'h', pos: 0.35 });
    useEditorStore.getState().addUserGuide({ id: 'g-v-1', type: 'v', pos: 0.6 });

    const guides = useEditorStore.getState().userGuides;
    expect(guides.length).toBe(2);
    expect(guides[0]).toEqual({ id: 'g-h-1', type: 'h', pos: 0.35 });
    expect(guides[1]).toEqual({ id: 'g-v-1', type: 'v', pos: 0.6 });

    // 2. Update position
    useEditorStore.getState().updateUserGuide('g-h-1', 0.42);
    expect(useEditorStore.getState().userGuides.find((g) => g.id === 'g-h-1')?.pos).toBe(0.42);

    // 3. Remove guide
    useEditorStore.getState().removeUserGuide('g-v-1');
    expect(useEditorStore.getState().userGuides.length).toBe(1);
    expect(useEditorStore.getState().userGuides[0].id).toBe('g-h-1');

    // 4. Toggle visibility
    useEditorStore.getState().setShowUserGuides(false);
    expect(useEditorStore.getState().showUserGuides).toBe(false);

    // 5. Clear all guides
    useEditorStore.getState().clearUserGuides();
    expect(useEditorStore.getState().userGuides.length).toBe(0);
  });
});
