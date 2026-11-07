import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PropertiesPanel } from '../src/components/editor/panels/properties-panel';
import {
  clampFontSize,
  nextFontSizeStep,
} from '../src/components/editor/properties/panels/text/font-size-utils';
import { TextEffectsTab } from '../src/components/editor/properties/panels/text/text-effects-tab';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useEditorStore, type TextElement } from '../src/lib/editor-store';
import {
  TEXT_PILL_RADIUS,
  TEXT_SHADOW_PRESETS,
  hasTextShadow,
  matchTextCurvePreset,
  matchTextShadowPreset,
  resolveTextBackgroundMode,
  textShadowPreviewCss,
} from '../src/lib/templates';

describe('text effects catalog', () => {
  it('matches the active shadow preset from element values', () => {
    expect(matchTextShadowPreset({})).toBe('none');
    expect(hasTextShadow({ shadowBlur: 0, shadowOpacity: 0 })).toBe(false);

    for (const preset of TEXT_SHADOW_PRESETS.filter((p) => p.id !== 'none')) {
      expect(
        matchTextShadowPreset({
          shadowBlur: preset.blur,
          shadowOffsetX: preset.ox,
          shadowOffsetY: preset.oy,
          shadowOpacity: preset.opacity,
        }),
      ).toBe(preset.id);
    }

    // قيم معدّلة يدوياً لا تطابق أي خلية
    expect(
      matchTextShadowPreset({
        shadowBlur: 7,
        shadowOffsetX: 1,
        shadowOffsetY: 9,
        shadowOpacity: 1,
      }),
    ).toBeNull();
  });

  it('resolves background mode from color and radius', () => {
    expect(resolveTextBackgroundMode({})).toBe('none');
    expect(resolveTextBackgroundMode({ textBgColor: 'transparent' })).toBe('none');
    expect(resolveTextBackgroundMode({ textBgColor: '#fff', textBgRadius: 8 })).toBe('box');
    expect(resolveTextBackgroundMode({ textBgColor: '#fff', textBgRadius: TEXT_PILL_RADIUS })).toBe(
      'pill',
    );
  });

  it('matches curve presets and derives CSS previews from the same values', () => {
    expect(matchTextCurvePreset(undefined)).toBe('straight');
    expect(matchTextCurvePreset(60)).toBe('arc');
    expect(matchTextCurvePreset(-60)).toBe('dip');
    expect(matchTextCurvePreset(35)).toBeNull();

    expect(textShadowPreviewCss(TEXT_SHADOW_PRESETS[0])).toBeUndefined();
    const neon = TEXT_SHADOW_PRESETS.find((p) => p.id === 'neon')!;
    expect(textShadowPreviewCss(neon)).toBe('0px 0px 8.8px #38bdf8e6');
  });
});

describe('text effect controls', () => {
  const element: TextElement = {
    id: 'effects-text',
    type: 'text',
    text: 'Studio',
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.1,
    fontFamily: 'Cairo',
    fontSize: 24,
    color: '#000000',
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    shadowColor: '#000000',
    shadowBlur: 14,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 0.6,
    textBgColor: '#ffffff',
    textBgRadius: 6,
  };

  function renderEffects(patch: Partial<TextElement> = {}) {
    const onUpdate = vi.fn();
    const view = render(
      React.createElement(TooltipProvider, {
        children: React.createElement(TextEffectsTab, {
          element: { ...element, ...patch },
          onUpdate,
        }),
      }),
    );
    return { ...view, onUpdate };
  }

  it('previews signed shadow offsets and records a keyboard gesture only once', () => {
    const pushHistory = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    const { onUpdate, unmount } = renderEffects();
    try {
      expect(screen.getByRole('slider', { name: 'إزاحة X' })).toHaveAttribute(
        'aria-valuemin',
        '-25',
      );
      expect(screen.getByRole('slider', { name: 'إزاحة Y' })).toHaveAttribute(
        'aria-valuemax',
        '25',
      );
      const x = screen.getByRole('textbox', { name: 'قيمة إزاحة X' });
      fireEvent.keyDown(x, { key: 'ArrowDown' });
      fireEvent.keyDown(x, { key: 'ArrowDown' });
      expect(onUpdate).toHaveBeenLastCalledWith(element.id, { shadowOffsetX: 2 });
      expect(pushHistory).not.toHaveBeenCalled();
      fireEvent.keyUp(x, { key: 'ArrowDown' });
      expect(pushHistory).toHaveBeenCalledTimes(1);
      fireEvent.blur(x);
      expect(pushHistory).toHaveBeenCalledTimes(1);

      const y = screen.getByRole('textbox', { name: 'قيمة إزاحة Y' });
      fireEvent.focus(y);
      fireEvent.change(y, { target: { value: '-25' } });
      fireEvent.keyDown(y, { key: 'Enter' });
      expect(onUpdate).toHaveBeenLastCalledWith(element.id, { shadowOffsetY: -25 });
      expect(pushHistory).toHaveBeenCalledTimes(2);
    } finally {
      unmount();
      pushHistory.mockRestore();
    }
  });

  it.each([6, TEXT_PILL_RADIUS])('edits badge width and color, not radius (%s)', (radius) => {
    const pushHistory = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    const { onUpdate, unmount } = renderEffects({ textBgRadius: radius });
    try {
      const width = screen.getByRole('textbox', { name: 'قيمة سمك الإطار' });
      fireEvent.keyDown(width, { key: 'ArrowUp' });
      expect(onUpdate).toHaveBeenLastCalledWith(element.id, {
        textBgBorderWidth: 0.5,
        textBgBorderColor: '#000000',
      });
      expect(pushHistory).not.toHaveBeenCalled();
      fireEvent.keyUp(width, { key: 'ArrowUp' });
      expect(pushHistory).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'لون إطار الشارة' }));
      const hex = screen.getByRole('textbox', { name: 'قيمة HEX' });
      fireEvent.change(hex, { target: { value: '123456' } });
      fireEvent.change(hex, { target: { value: '654321' } });
      expect(onUpdate).toHaveBeenLastCalledWith(element.id, { textBgBorderColor: '#654321' });
      expect(pushHistory).toHaveBeenCalledTimes(1);
      fireEvent.blur(hex);
      expect(pushHistory).toHaveBeenCalledTimes(2);
      expect(onUpdate.mock.calls.every(([, patch]) => !('textBgRadius' in patch))).toBe(true);
    } finally {
      unmount();
      pushHistory.mockRestore();
    }
  });

  it('hides inapplicable controls and exits inherited glow when choosing a shadow', () => {
    const { onUpdate, unmount } = renderEffects({ shadowGlow: true, textBgColor: 'transparent' });
    expect(screen.queryByRole('slider', { name: 'إزاحة X' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'إزاحة Y' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'سمك الإطار' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'لون إطار الشارة' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('text-shadow-drop'));
    expect(onUpdate).toHaveBeenLastCalledWith(
      element.id,
      expect.objectContaining({ shadowGlow: false, shadowOffsetX: 4, shadowOffsetY: 4 }),
    );
    unmount();

    const inactive = renderEffects({ shadowBlur: 0, shadowOpacity: 0 });
    expect(screen.queryByRole('slider', { name: 'إزاحة X' })).not.toBeInTheDocument();
    inactive.unmount();
  });

  it('broadcasts live badge and shadow changes to unlocked selection with one undo step each', () => {
    const original = useEditorStore.getState();
    const second = { ...element, id: 'effects-second', textBgRadius: TEXT_PILL_RADIUS };
    const locked = { ...element, id: 'effects-locked', locked: true };
    useEditorStore.setState({
      mode: 'single',
      elements: [element, second, locked],
      selectedId: element.id,
      selectedIds: [element.id, second.id, locked.id],
    });
    const pushHistory = vi.spyOn(useEditorStore.getState(), 'pushHistory');
    const { unmount } = render(
      React.createElement(TooltipProvider, { children: React.createElement(PropertiesPanel) }),
    );
    try {
      fireEvent.click(screen.getByRole('tab', { name: 'التأثيرات' }));
      const x = screen.getByRole('textbox', { name: 'قيمة إزاحة X' });
      fireEvent.keyDown(x, { key: 'ArrowUp' });
      expect(useEditorStore.getState().elements.map((item) => item.shadowOffsetX)).toEqual([
        5, 5, 4,
      ]);
      expect(pushHistory).not.toHaveBeenCalled();
      fireEvent.keyUp(x, { key: 'ArrowUp' });
      expect(pushHistory).toHaveBeenCalledTimes(1);

      const width = screen.getByRole('textbox', { name: 'قيمة سمك الإطار' });
      fireEvent.keyDown(width, { key: 'ArrowUp' });
      fireEvent.keyDown(width, { key: 'ArrowUp' });
      expect(
        useEditorStore.getState().elements.map((item) => (item as TextElement).textBgBorderWidth),
      ).toEqual([1, 1, undefined]);
      expect(pushHistory).toHaveBeenCalledTimes(1);
      fireEvent.keyUp(width, { key: 'ArrowUp' });
      expect(pushHistory).toHaveBeenCalledTimes(2);
    } finally {
      unmount();
      pushHistory.mockRestore();
      useEditorStore.setState(original);
    }
  });
});

describe('font size field steps', () => {
  it('jumps between typographic steps and clamps typed values', () => {
    expect(nextFontSizeStep(32, 1)).toBe(36);
    expect(nextFontSizeStep(33, 1)).toBe(36);
    expect(nextFontSizeStep(33, -1)).toBe(32);
    expect(nextFontSizeStep(8, -1)).toBe(7);
    expect(nextFontSizeStep(300, 1)).toBe(310);
    expect(clampFontSize(2)).toBe(6);
    expect(clampFontSize(9999)).toBe(500);
    expect(clampFontSize(17.6)).toBe(18);
  });
});
