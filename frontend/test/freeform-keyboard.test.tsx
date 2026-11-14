import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useFreeformKeyboard } from '@/features/freeform-collage/lib/use-freeform-keyboard';

function setup(selected: string | null = 'a', open = true) {
  const params = {
    open,
    handleUndo: vi.fn(),
    handleRedo: vi.fn(),
    handleDuplicateSlot: vi.fn(),
    handleRemoveSlot: vi.fn(),
    handleCopySelection: vi.fn(),
    handlePasteClipboard: vi.fn(),
    handleNudge: vi.fn(),
    finishNudgeBurst: vi.fn(),
    setSlotSelection: vi.fn(),
    slotsRef: { current: [{ id: 'a', x: 0, y: 0, w: 0.2, h: 0.2 }] },
    selectedSlotIdRef: { current: selected },
  };
  const hook = renderHook(() => useFreeformKeyboard(params));
  return { params, ...hook };
}

function dispatch(target: HTMLElement, key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe('freeform keyboard reservation', () => {
  it.each([null, 'stale'])('does not reserve arrows without a confirmed slot (%s)', (selected) => {
    const { params } = setup(selected);
    render(<button>Canvas</button>);
    const bubbled = vi.fn();
    window.addEventListener('keydown', bubbled);
    try {
      const event = dispatch(screen.getByRole('button'), 'ArrowLeft');
      expect(event.defaultPrevented).toBe(false);
      expect(bubbled).toHaveBeenCalledOnce();
      expect(params.handleNudge).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', bubbled);
    }
  });

  it.each([
    ['ArrowLeft', -0.005, 0],
    ['ArrowRight', 0.005, 0],
    ['ArrowUp', 0, -0.005],
    ['ArrowDown', 0, 0.005],
  ])('reserves only a valid selected arrow and nudges %s', (key, dx, dy) => {
    const { params } = setup();
    render(<button>Canvas</button>);
    const bubbled = vi.fn();
    window.addEventListener('keydown', bubbled);
    try {
      expect(dispatch(screen.getByRole('button'), key as string).defaultPrevented).toBe(true);
      expect(params.handleNudge).toHaveBeenCalledWith(dx, dy);
      expect(bubbled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', bubbled);
    }
  });

  it('supports Shift steps, live selection refs and releases Escape', () => {
    const { params } = setup();
    render(<button>Canvas</button>);
    const button = screen.getByRole('button');
    dispatch(button, 'ArrowRight', { shiftKey: true });
    expect(params.handleNudge).toHaveBeenCalledWith(0.025, 0);
    params.selectedSlotIdRef.current = null;
    expect(dispatch(button, 'ArrowRight').defaultPrevented).toBe(false);
    expect(dispatch(button, 'Escape').defaultPrevented).toBe(false);
    expect(params.handleNudge).toHaveBeenCalledOnce();
    expect(params.finishNudgeBurst).toHaveBeenCalled();
  });

  it.each([
    'slider',
    'spinbutton',
    'tab',
    'tablist',
    'combobox',
    'listbox',
    'menu',
    'tree',
    'grid',
    'radiogroup',
  ])('leaves a composite %s and its child in charge', (role) => {
    const { params } = setup();
    render(
      <div role={role}>
        <button>Control</button>
      </div>,
    );
    const button = screen.getByRole('button');
    act(() => button.focus());
    expect(dispatch(button, 'ArrowRight').defaultPrevented).toBe(false);
    expect(params.handleNudge).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea', 'select', 'contenteditable'])(
    'leaves %s input scopes in charge even when target is not focused',
    (kind) => {
      const { params } = setup();
      render(
        <>
          {kind === 'input' ? (
            <input data-testid="input" />
          ) : kind === 'textarea' ? (
            <textarea data-testid="input" />
          ) : kind === 'select' ? (
            <select data-testid="input" />
          ) : (
            <div contentEditable suppressContentEditableWarning data-testid="input">
              <span>Text</span>
            </div>
          )}
        </>,
      );
      expect(dispatch(screen.getByTestId('input'), 'ArrowRight').defaultPrevented).toBe(false);
      expect(params.handleNudge).not.toHaveBeenCalled();
    },
  );

  it('respects local preventDefault, composition and modified arrows', () => {
    const { params } = setup();
    render(<button onKeyDown={(event) => event.preventDefault()}>Owner</button>);
    dispatch(screen.getByRole('button'), 'ArrowRight');
    expect(params.handleNudge).not.toHaveBeenCalled();
    render(<button>Canvas</button>);
    const canvas = screen.getByRole('button', { name: 'Canvas' });
    for (const options of [
      { isComposing: true },
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
    ]) {
      expect(dispatch(canvas, 'ArrowRight', options).defaultPrevented).toBe(false);
    }
    expect(params.handleNudge).not.toHaveBeenCalled();
  });

  it('preserves local undo and detaches on close or unmount', () => {
    const { params, unmount } = setup();
    render(<button>Canvas</button>);
    const canvas = screen.getByRole('button');
    fireEvent.keyDown(canvas, { key: 'z', ctrlKey: true });
    expect(params.handleUndo).toHaveBeenCalledOnce();
    unmount();
    expect(dispatch(canvas, 'ArrowRight').defaultPrevented).toBe(false);
    const closed = setup('a', false);
    expect(dispatch(canvas, 'ArrowRight').defaultPrevented).toBe(false);
    expect(closed.params.handleNudge).not.toHaveBeenCalled();
  });
});
