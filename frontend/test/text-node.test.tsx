import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KonvaTextElement } from '../src/components/editor/konva/elements/text-node';

import type { ElementProps } from '../src/components/editor/konva/elements/types';
import type { TextElement } from '../src/lib/store/types';
import type Konva from 'konva';

const state = vi.hoisted(() => ({ editingTextId: null as string | null }));
const rendered = vi.hoisted(() => ({
  text: {} as Record<string, unknown>,
  shape: {} as Record<string, unknown>,
}));

vi.mock('@/lib/editor-store', () => ({
  useEditorStore: (selector: (value: typeof state) => unknown) => selector(state),
}));
vi.mock('@/hooks/use-async-image', () => ({ useAsyncImage: () => [null] }));
vi.mock('@/hooks/use-konva-drag', () => ({
  useKonvaDrag: () => ({ onDragStart: vi.fn(), onDragEnd: vi.fn() }),
}));
vi.mock('@/lib/io/fonts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/io/fonts')>()),
  loadGoogleFont: vi.fn().mockResolvedValue(true),
}));
vi.mock('react-konva', () => ({
  Group: ({
    id,
    opacity,
    children,
  }: {
    id?: string;
    opacity?: number;
    children?: React.ReactNode;
  }) => (
    <div data-testid={id ? 'text-root' : 'text-inner'} data-opacity={opacity}>
      {children}
    </div>
  ),
  Rect: () => null,
  Text: (props: Record<string, unknown>) => {
    rendered.text = props;
    return <div data-testid="straight-text" />;
  },
  Shape: (props: Record<string, unknown>) => {
    rendered.shape = props;
    return <div data-testid="curved-text" />;
  },
}));

const base: TextElement = {
  id: 'text-1',
  type: 'text',
  text: 'Hello\nworld',
  x: 0.1,
  y: 0.2,
  width: 0.3,
  height: 0.1,
  fontFamily: 'Arial',
  fontSize: 20,
  fontWeight: 400,
  opacity: 0.5,
  rotation: 0,
  zIndex: 1,
};

async function renderText(element: TextElement) {
  const node = { opacity: vi.fn(), scale: vi.fn(), to: vi.fn() };
  const onChange = vi.fn();
  const props: ElementProps = {
    element,
    isSelected: true,
    onMouseDown: vi.fn(),
    onTouchStart: vi.fn(),
    onClick: vi.fn(),
    onTap: vi.fn(),
    onChange,
    canvasWidth: 1000,
    canvasHeight: 1000,
    allElements: [element],
    setActiveGuides: vi.fn(),
    elementRef: { current: node as unknown as Konva.Node },
    altPressedRef: { current: false },
    getKonvaNode: () => null,
  };
  const result = render(<KonvaTextElement {...props} />);
  await act(async () => {
    await Promise.resolve();
  });
  return { ...result, node, onChange, props };
}

beforeEach(() => {
  state.editingTextId = null;
  rendered.text = {};
  rendered.shape = {};
});

describe('KonvaTextElement editing preview', () => {
  it.each([45, -45])(
    'keeps a curved preview at 22% of element opacity while editing (%s)',
    async (curve) => {
      state.editingTextId = base.id;
      const { node, onChange } = await renderText({ ...base, curve });
      expect(Number(screen.getByTestId('text-root').dataset.opacity)).toBeCloseTo(0.11);
      expect(node.to).toHaveBeenCalledWith(expect.objectContaining({ opacity: 0.11 }));
      expect(screen.getByTestId('curved-text')).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it('hides straight text while editing and restores original opacity on exit', async () => {
    state.editingTextId = base.id;
    const { rerender, props } = await renderText(base);
    expect(Number(screen.getByTestId('text-root').dataset.opacity)).toBe(0);
    state.editingTextId = null;
    rerender(<KonvaTextElement {...props} element={{ ...base }} />);
    expect(Number(screen.getByTestId('text-root').dataset.opacity)).toBe(0.5);
    expect(rendered.text.text).toBe(base.text);
    expect(rendered.text.height).toBeUndefined();
  });

  it('renders curved newlines as spaces with the resolved face and Arabic spacing disabled', async () => {
    await renderText({
      ...base,
      text: 'بِـسم\nGrido',
      curve: 50,
      fontFamily: 'Cairo',
      fontWeight: 800,
      letterSpacing: -4,
    });
    const drawn: string[] = [];
    const ctx = {
      font: '',
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillText: (text: string) => drawn.push(text),
      measureText: () => ({ width: 10 }),
    };
    const scene = rendered.shape.sceneFunc as (context: { _context: typeof ctx }) => void;
    scene({ _context: ctx });
    expect(ctx.font).toContain('700 20px Cairo');
    expect(drawn).toContain(' ');
    expect(drawn).not.toContain('\n');
    expect(drawn.slice(0, 5)).toEqual(['\uFE91', '\u0650', '\u0640', '\uFEB4', '\uFEE2']);
  });

  it('uses the supported weight and zero Arabic letter spacing for straight text', async () => {
    await renderText({
      ...base,
      text: 'بسم\nGrido',
      fontFamily: 'Cairo',
      fontWeight: 800,
      letterSpacing: 7,
    });
    expect(rendered.text.fontStyle).toBe('700');
    expect(rendered.text.letterSpacing).toBe(0);
    expect(rendered.text.text).toBe('بسم\nGrido');
    expect(rendered.text.height).toBeUndefined();
  });
});
