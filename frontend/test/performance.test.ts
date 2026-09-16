import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import { serializeEditorState } from '../src/lib/io/project-serializer';
import { getSnapPositions } from '../src/lib/canvas/snap-utils';
import type { CanvasElement } from '../src/lib/store/types';

// مولد حتمي (seeded) — Math.random() السابق كان يجعل النتائج تتذبذب بين التشغيلات
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeShapes(count: number, seed: number): CanvasElement[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: `el-${i}`,
    type: 'shape',
    shape: 'rect',
    x: rand(),
    y: rand(),
    width: 0.1,
    height: 0.1,
    rotation: 0,
    opacity: 1,
    zIndex: i,
    fill: '#ffffff',
  })) as CanvasElement[];
}

// وسيط N تكرارات بعد إحماء — يقاوم اهتزاز CPU في CI المشترك بدل قياس خام واحد
function medianMs(fn: () => void, runs = 7): number {
  fn(); // warmup خارج القياس
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('should serialize large editor states under 10ms', () => {
    // بناء عبر set() الحقيقي بدل push المباشر الذي كان يتجاوز مسار الستور
    useEditorStore.setState({ elements: makeShapes(100, 42) });

    let count = 0;
    const duration = medianMs(() => {
      const store = useEditorStore.getState();
      const serialized = serializeEditorState(store);
      count = serialized.elements.length;
    });

    expect(count).toBe(100);
    expect(duration).toBeLessThan(10);
  });

  it('should push history under 15ms with shallow snapshot cloning', () => {
    useEditorStore.setState({ elements: makeShapes(50, 7) });

    const duration = medianMs(() => {
      useEditorStore.getState().pushHistory();
    });

    expect(duration).toBeLessThan(15);
  });

  it('should compute snap positions under 10ms', () => {
    const elements = makeShapes(30, 99).map((el, i) => ({
      ...el,
      x: i * 0.02,
      y: i * 0.02,
      width: 0.05,
      height: 0.05,
    }));
    useEditorStore.setState({ elements });

    let defined = false;
    const duration = medianMs(() => {
      const store = useEditorStore.getState();
      const snapResult = getSnapPositions('drag-id', 0.5, 0.5, 0.1, 0.1, store.elements, 0.01, 0.01);
      defined = snapResult !== undefined && snapResult !== null;
    });

    expect(defined).toBe(true);
    expect(duration).toBeLessThan(10);
  });
});
