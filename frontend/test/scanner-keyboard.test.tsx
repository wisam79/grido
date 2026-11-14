import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentScannerDialog } from '@/components/editor/document-scanner/document-scanner-dialog';

import type { DetectedDocument, Point } from '@/components/editor/document-scanner/core';

const controls = vi.hoisted(() => ({
  isDetecting: false,
  isPreviewing: false,
  isExporting: false,
  isPreviewMode: false,
  resetPreview: vi.fn(),
  resetProcessorState: vi.fn(),
  handleTogglePreview: vi.fn(),
  handleApplyActive: vi.fn(),
  selectDocument: vi.fn(),
}));

const initialCorners: Point[] = [
  { x: 20, y: 20 },
  { x: 180, y: 20 },
  { x: 180, y: 80 },
  { x: 20, y: 80 },
];
const makeDocs = (): DetectedDocument[] => [
  {
    id: 'first',
    corners: initialCorners.map((point) => ({ ...point })),
    confidence: 1,
    label: 'First',
    aspectType: 'a4_l',
  },
  {
    id: 'second',
    corners: [
      { x: 30, y: 30 },
      { x: 170, y: 30 },
      { x: 170, y: 70 },
      { x: 30, y: 70 },
    ],
    confidence: 1,
    label: 'Second',
    aspectType: 'square',
  },
];

vi.mock('@/lib/memory-trim', () => ({ triggerMemoryTrim: vi.fn() }));
vi.mock('@/components/editor/document-scanner/core', () => ({
  defaultInsetCorners: () => initialCorners.map((point) => ({ ...point })),
}));
vi.mock('@/components/editor/document-scanner/hooks/use-scanner-processor', () => ({
  useScannerProcessor: () => ({
    ...controls,
    previewSrc: '/preview.png',
    cancelExport: vi.fn(),
    handleApplySelected: vi.fn(),
  }),
}));
vi.mock('@/components/editor/document-scanner/hooks/use-scanner-detection', () => ({
  useScannerDetection: () => {
    const [detectedDocs, setDetectedDocs] = React.useState(makeDocs);
    const [activeDocIndex, setActiveDocIndex] = React.useState(0);
    const imgRef = React.useRef<HTMLImageElement | null>(null);
    if (!imgRef.current) {
      const image = new Image();
      Object.defineProperties(image, {
        naturalWidth: { value: 200 },
        naturalHeight: { value: 100 },
      });
      imgRef.current = image;
    }
    const initial = React.useRef(detectedDocs);
    const setDetectionCallbacks = React.useCallback(
      (callbacks: {
        onCorners: (corners: Point[]) => void;
        onAspect: (aspect: string) => void;
      }) => {
        callbacks.onCorners(initial.current[0].corners);
        callbacks.onAspect(initial.current[0].aspectType);
      },
      [],
    );
    return {
      detectedDocs,
      setDetectedDocs,
      activeDocIndex,
      imgRef,
      isDetecting: controls.isDetecting,
      imgSize: { w: 200, h: 100 },
      selectedDocIds: ['first', 'second'],
      detectionMode: 'multi',
      setDetectionMode: vi.fn(),
      setDetectionCallbacks,
      toggleDocSelection: vi.fn(),
      selectAllDocs: vi.fn(),
      handleAddManualDocument: vi.fn(),
      handleDeleteDocument: vi.fn(),
      handleSplitIdCards: vi.fn(),
      handleAutoDetect: vi.fn(),
      selectDocument: (
        index: number,
        onCorners: (corners: Point[]) => void,
        onAspect: (aspect: string) => void,
        onRotation: (rotation: number) => void,
        reset: () => void,
      ) => {
        controls.selectDocument(index);
        setActiveDocIndex(index);
        onCorners(detectedDocs[index].corners);
        onAspect(detectedDocs[index].aspectType);
        onRotation(0);
        reset();
      },
    };
  },
}));
vi.mock('@/components/editor/document-scanner/components/scanner-sidebar', () => ({
  ScannerSidebar: ({
    detectedDocs,
    activeDocIndex,
    onSelectDoc,
    onReset,
  }: {
    detectedDocs: DetectedDocument[];
    activeDocIndex: number;
    onSelectDoc: (index: number) => void;
    onReset: () => void;
  }) => (
    <aside>
      <output data-testid="docs">{JSON.stringify(detectedDocs)}</output>
      <output data-testid="active-doc">{activeDocIndex}</output>
      <button onClick={() => onSelectDoc(1)}>Second document</button>
      <button onClick={onReset}>Reset corners</button>
      <select aria-label="Native select">
        <option>1</option>
        <option>2</option>
      </select>
      <div role="tablist">
        <button role="tab" aria-selected="true">
          Tab
        </button>
      </div>
      <button role="slider" aria-valuemin={0} aria-valuemax={10} aria-valuenow={2}>
        Slider
      </button>
      <button role="combobox" aria-expanded="false" aria-controls="scanner-test-options">
        Select
      </button>
      <div id="scanner-test-options" role="listbox" hidden />
    </aside>
  ),
}));

const props = { open: true, imageSrc: '/source.png', onSave: vi.fn(), onOpenChange: vi.fn() };
function setup() {
  const view = render(<DocumentScannerDialog {...props} />);
  const canvas = screen.getByRole('img', { name: 'لوحة ضبط أركان المستند' }) as HTMLCanvasElement;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 100,
    height: 50,
    right: 100,
    bottom: 50,
    toJSON: () => ({}),
  });
  return { ...view, canvas };
}
function docs(): DetectedDocument[] {
  return JSON.parse(screen.getByTestId('docs').textContent || '[]');
}
function pick(label = 'الركن العلوي الأيسر') {
  const button = screen.getByRole('button', { name: label });
  act(() => button.focus());
  fireEvent.click(button);
  return button;
}
function loupe(view: ReturnType<typeof setup>) {
  return view.canvas.closest('[role="group"]')!.querySelectorAll('canvas')[1].parentElement!;
}

beforeEach(() => {
  vi.clearAllMocks();
  controls.isDetecting =
    controls.isPreviewing =
    controls.isExporting =
    controls.isPreviewMode =
      false;
  vi.useFakeTimers();
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  if (!window.PointerEvent) vi.stubGlobal('PointerEvent', MouseEvent);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('scanner local corner keyboard', () => {
  it('provides four labeled selectable buttons with contextual help and moves the selected corner without dragging', () => {
    setup();
    const group = screen.getByRole('group', { name: 'اختيار الركن' });
    expect(within(group).getAllByRole('button')).toHaveLength(4);
    const first = pick();
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(first).toHaveAccessibleDescription(/Shift/);
    expect(fireEvent.keyDown(first, { key: 'ArrowRight' })).toBe(false);
    fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
    expect(docs()[0].corners[0]).toEqual({ x: 24, y: 40 });
    expect(docs()[0].aspectType).toBe('free');
    expect(docs()[1].corners).toEqual(makeDocs()[1].corners);
    expect(controls.resetPreview).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'معاينة' }));
    expect(controls.handleTogglePreview).toHaveBeenCalledWith(docs()[0].corners, 'free');
    fireEvent.click(screen.getByRole('button', { name: 'إدراج النشط' }));
    expect(controls.handleApplyActive).toHaveBeenCalledWith(
      docs()[0].corners,
      'free',
      props.onSave,
      expect.any(Function),
    );
  });

  it('clamps all image borders, supports both step sizes, and accumulates repeated events', () => {
    setup();
    const first = pick();
    fireEvent.keyDown(first, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(first, { key: 'ArrowUp', shiftKey: true });
    expect(docs()[0].corners[0]).toEqual({ x: 0, y: 0 });
    const before = controls.resetPreview.mock.calls.length;
    fireEvent.keyDown(first, { key: 'ArrowLeft', shiftKey: true });
    expect(controls.resetPreview).toHaveBeenCalledTimes(before);
    const last = pick('الركن السفلي الأيمن');
    fireEvent.keyDown(last, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(last, { key: 'ArrowDown', shiftKey: true });
    expect(docs()[0].corners[2]).toEqual({ x: 200, y: 100 });
    act(() => {
      for (let i = 0; i < 3; i++) fireEvent.keyDown(last, { key: 'ArrowLeft' });
    });
    expect(docs()[0].corners[2]).toEqual({ x: 188, y: 100 });
  });

  it('does not reserve unselected arrows or steal sidebar Select/Slider/Tabs and external keys', () => {
    const { canvas } = setup();
    expect(fireEvent.keyDown(canvas, { key: 'ArrowRight' })).toBe(true);
    const first = pick();
    const original = docs();
    for (const target of [
      screen.getByRole('slider'),
      screen.getByRole('tab'),
      ...screen.getAllByRole('combobox'),
      document.body,
    ]) {
      fireEvent.keyDown(target, { key: 'ArrowRight' });
      fireEvent.keyDown(target, { key: '2' });
    }
    expect(docs()).toEqual(original);
    expect(controls.selectDocument).not.toHaveBeenCalled();
    for (const modifier of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { isComposing: true },
    ]) {
      expect(fireEvent.keyDown(first, { key: 'ArrowRight', ...modifier })).toBe(true);
    }
    const prevent = (event: Event) => event.preventDefault();
    first.addEventListener('keydown', prevent);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    first.removeEventListener('keydown', prevent);
    expect(docs()).toEqual(original);
    expect(controls.resetPreview).not.toHaveBeenCalled();
  });

  it('switches documents only in the focus zone and clears stale selection', () => {
    setup();
    const first = pick();
    expect(fireEvent.keyDown(first, { key: '2' })).toBe(false);
    expect(screen.getByTestId('active-doc')).toHaveTextContent('1');
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(fireEvent.keyDown(first, { key: 'ArrowRight' })).toBe(true);
    fireEvent.click(first);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(docs()[1].corners[0]).toEqual({ x: 34, y: 30 });
    expect(docs()[0].corners).toEqual(initialCorners);
    fireEvent.click(screen.getByRole('button', { name: 'Reset corners' }));
    expect(docs()[1].corners).toEqual(initialCorners);
  });

  it.each(['isDetecting', 'isPreviewing', 'isExporting'] as const)(
    'respects %s interaction locks',
    (lock) => {
      const { rerender, canvas } = setup();
      pick();
      controls[lock] = true;
      rerender(<DocumentScannerDialog {...props} />);
      expect(screen.getByRole('button', { name: 'الركن العلوي الأيسر' })).toBeDisabled();
      expect(fireEvent.keyDown(canvas, { key: 'ArrowRight' })).toBe(true);
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerMove(canvas, { clientX: 40, clientY: 20, pointerId: 1 });
      expect(docs()[0].corners).toEqual(initialCorners);
      expect(controls.resetPreview).not.toHaveBeenCalled();
    },
  );

  it('keeps pointer-selected corner after pointerup, focuses locally, and hides/cancels the drag-only loupe', () => {
    const view = setup();
    fireEvent.pointerDown(view.canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    expect(view.canvas).toHaveFocus();
    expect(screen.getByRole('button', { name: 'الركن العلوي الأيسر' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.pointerMove(view.canvas, { clientX: 15, clientY: 15, pointerId: 1 });
    expect(docs()[0].corners[0]).toEqual({ x: 30, y: 30 });
    act(() => vi.advanceTimersByTime(40));
    expect(loupe(view)).toHaveClass('opacity-100');
    fireEvent.pointerMove(view.canvas, { clientX: 15, clientY: 15, pointerId: 1 });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    fireEvent.pointerUp(view.canvas, { pointerId: 1 });
    expect(cancel).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(40));
    expect(loupe(view)).toHaveClass('opacity-0');
    expect(view.canvas).not.toHaveClass('cursor-grabbing');
    fireEvent.keyDown(view.canvas, { key: 'ArrowRight' });
    expect(docs()[0].corners[0]).toEqual({ x: 34, y: 30 });
    fireEvent.pointerMove(view.canvas, { clientX: 40, clientY: 40 });
    expect(docs()[0].corners[0]).toEqual({ x: 34, y: 30 });
  });

  it('cancels a pending drag loupe when unmounted without closing first', () => {
    const view = setup();
    fireEvent.pointerDown(view.canvas, { clientX: 10, clientY: 10, pointerId: 1 });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(40));
  });

  it('ends selection on preview and close and cancels pending loupe on unmount', () => {
    const view = setup();
    pick();
    controls.isPreviewMode = true;
    view.rerender(<DocumentScannerDialog {...props} />);
    expect(screen.queryByRole('group', { name: 'اختيار الركن' })).not.toBeInTheDocument();
    controls.isPreviewMode = false;
    view.rerender(<DocumentScannerDialog {...props} />);
    expect(screen.getByRole('button', { name: 'الركن العلوي الأيسر' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    fireEvent.pointerDown(screen.getByRole('img', { name: 'لوحة ضبط أركان المستند' }), {
      clientX: 10,
      clientY: 10,
    });
    view.rerender(<DocumentScannerDialog {...props} open={false} />);
    view.unmount();
    act(() => vi.advanceTimersByTime(40));
    expect(controls.resetProcessorState).toHaveBeenCalled();
  });
});
