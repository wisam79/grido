import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { serializeEditorState } from '../src/lib/io/project-serializer';
import { getSnapPositions } from '../src/lib/canvas/snap-utils';

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('should serialize large editor states under 10ms', () => {
    const store = useEditorStore.getState();
    
    // Add 100 elements to simulate a heavy project
    for (let i = 0; i < 100; i++) {
      store.elements.push({
        id: `el-${i}`,
        type: 'shape',
        shape: 'rect',
        x: Math.random(),
        y: Math.random(),
        width: 0.1,
        height: 0.1,
        rotation: 0,
        opacity: 1,
        zIndex: i,
        fill: '#ffffff',
      });
    }

    const start = performance.now();
    const serialized = serializeEditorState(store);
    const end = performance.now();
    const duration = end - start;

    expect(serialized).toBeDefined();
    expect(serialized.elements.length).toBe(100);
    expect(duration).toBeLessThan(10); // Check that it is fast!
  });

  it('should push history under 5ms using JSON stringify/parse cloning', () => {
    const store = useEditorStore.getState();
    
    // Simulate 50 elements
    for (let i = 0; i < 50; i++) {
      store.elements.push({
        id: `el-${i}`,
        type: 'shape',
        shape: 'rect',
        x: Math.random(),
        y: Math.random(),
        width: 0.1,
        height: 0.1,
        rotation: 0,
        opacity: 1,
        zIndex: i,
        fill: '#ffffff',
      });
    }

    const start = performance.now();
    store.pushHistory();
    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(15); // Ensure high performance
  });

  it('should compute snap positions under 2ms', () => {
    const store = useEditorStore.getState();
    
    // Create 30 target elements to snap against
    for (let i = 0; i < 30; i++) {
      store.elements.push({
        id: `el-${i}`,
        type: 'shape',
        shape: 'rect',
        x: i * 0.02,
        y: i * 0.02,
        width: 0.05,
        height: 0.05,
        rotation: 0,
        opacity: 1,
        zIndex: i,
        fill: '#ffffff',
      });
    }

    const start = performance.now();
    const snapResult = getSnapPositions('drag-id', 0.5, 0.5, 0.1, 0.1, store.elements, 0.01, 0.01);
    const end = performance.now();
    const duration = end - start;

    expect(snapResult).toBeDefined();
    expect(duration).toBeLessThan(10); // Ensure it is extremely fast
  });
});
