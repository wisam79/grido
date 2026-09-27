import { describe, it, expect } from 'vitest';
import {
  createParamsBuffer,
  pushParams,
  undoParams,
  redoParams,
  useStickerParamsHistory,
  STICKER_HISTORY_LIMIT,
} from '@/features/stickers/lib/params-history';
import { act, renderHook } from '@testing-library/react';
import { ALL_STICKER_TEMPLATES } from '@/features/stickers/templates';
import type { StickerParams } from '@/features/stickers';

const baseParams = (): StickerParams => ({
  fields: { title: 'نص' },
  primaryColor: '#111111',
  secondaryColor: '#222222',
  backgroundColor: '#333333',
  isTransparent: false,
  fontFamily: 'Cairo',
  fontScale: 1,
  finish: 'standard',
  dieCutBorder: true,
});

const withPrimary =
  (color: string): ((p: StickerParams) => StickerParams) =>
  (p) => ({
    ...p,
    primaryColor: color,
  });

describe('params-history pure operations', () => {
  it('starts empty past and future', () => {
    const buffer = createParamsBuffer(baseParams());
    expect(buffer.past).toHaveLength(0);
    expect(buffer.future).toHaveLength(0);
  });

  it('push moves present into past and clears future', () => {
    const buffer = pushParams(createParamsBuffer(baseParams()), {
      ...baseParams(),
      primaryColor: '#111112',
    });
    expect(buffer.past).toHaveLength(1);
    expect(buffer.future).toHaveLength(0);
  });

  it('undo then redo restores both states', () => {
    const original = baseParams();
    const changed = { ...original, primaryColor: '#ff0000' };
    const buffer = pushParams(createParamsBuffer(original), changed);

    const undone = undoParams(buffer);
    expect(undone.undone).toEqual(original);
    expect(undone.buffer.present).toEqual(original);
    expect(undone.buffer.future).toEqual([changed]);

    const redone = redoParams(undone.buffer);
    expect(redone.redone).toEqual(changed);
    expect(redone.buffer.present).toEqual(changed);
  });

  it('returns null when nothing to undo/redo', () => {
    const buffer = createParamsBuffer(baseParams());
    expect(undoParams(buffer).undone).toBeNull();
    expect(redoParams(buffer).redone).toBeNull();
  });

  it('caps history at the limit', () => {
    let buffer = createParamsBuffer(baseParams());
    for (let i = 0; i < STICKER_HISTORY_LIMIT + 10; i++) {
      buffer = pushParams(buffer, {
        ...baseParams(),
        primaryColor: `#${String(i).padStart(6, '0')}`,
      });
    }
    expect(buffer.past).toHaveLength(STICKER_HISTORY_LIMIT);
  });
});

describe('useStickerParamsHistory hook', () => {
  it('starts at the initial params with nothing to undo', () => {
    const initial = ALL_STICKER_TEMPLATES[0];
    const { result } = renderHook(() =>
      useStickerParamsHistory(() => ({
        ...baseParams(),
        fields: Object.fromEntries(initial.fields.map((f) => [f.id, f.defaultValue])),
      })),
    );
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('live setParams coalesces rapid edits into a single undo step', () => {
    const { result } = renderHook(() => useStickerParamsHistory(baseParams));

    act(() => result.current.setParams(withPrimary('#a00000')));
    act(() => result.current.setParams(withPrimary('#a00001')));
    act(() => result.current.setParams(withPrimary('#a00002')));

    // التعديلات المتلاحقة تُدمج: خطوة تراجع واحدة فقط حتى الحالة الابتدائية
    expect(result.current.params.primaryColor).toBe('#a00002');
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.undo());
    expect(result.current.params.primaryColor).toBe('#111111');
    expect(result.current.canUndo).toBe(false);
  });

  it('commitParams after coalescing splits into separate undo steps', () => {
    const { result } = renderHook(() => useStickerParamsHistory(baseParams));

    act(() => result.current.setParams(withPrimary('#a00000')));
    act(() => result.current.commitParams(withPrimary('#b00000')));

    act(() => result.current.undo());
    expect(result.current.params.primaryColor).toBe('#a00000');
    act(() => result.current.undo());
    expect(result.current.params.primaryColor).toBe('#111111');
  });

  it('resetParams wipes history (new template context)', () => {
    const { result } = renderHook(() => useStickerParamsHistory(baseParams));

    act(() => result.current.setParams(withPrimary('#a00000')));
    act(() => result.current.resetParams({ ...baseParams(), secondaryColor: '#999999' }));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.params.secondaryColor).toBe('#999999');
  });

  it('redo is invalidated by a new edit', () => {
    const { result } = renderHook(() => useStickerParamsHistory(baseParams));

    act(() => result.current.setParams(withPrimary('#a00000')));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.setParams(withPrimary('#c00000')));
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.redo());
    expect(result.current.params.primaryColor).toBe('#c00000');
  });
});
