import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ASSET_FAVORITES_KEY,
  assetFavoriteId,
  pruneAssetFavorites,
  readAssetFavorites,
  toggleAssetFavorite,
  useAssetFavorites,
} from '../src/lib/asset-favorites';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

const saved = 'collage:saved:collage-user-1';
const builtin = 'sticker:builtin:badge-1';

describe('asset favorites', () => {
  it('namespaces stable IDs, not names, and rejects ineligible input', () => {
    expect(assetFavoriteId('collage:saved', 'same-id')).not.toBe(
      assetFavoriteId('sticker:builtin', 'same-id'),
    );
    for (const id of ['', ' id ', 'bad\n', 'a'.repeat(257)]) {
      expect(assetFavoriteId('collage:saved', id)).toBeNull();
      expect(toggleAssetFavorite([builtin], 'collage:saved', id)).toEqual([builtin]);
    }
  });

  it.each(['{bad', '{}', 'null', '123', '"text"'])(
    'handles corrupt storage %s without throwing or rewriting it',
    (stored) => {
      localStorage.setItem(ASSET_FAVORITES_KEY, stored);
      expect(readAssetFavorites()).toEqual([]);
      expect(localStorage.getItem(ASSET_FAVORITES_KEY)).toBe(stored);
    },
  );

  it('drops malformed entries and duplicates but retains valid unseen IDs', () => {
    localStorage.setItem(
      ASSET_FAVORITES_KEY,
      JSON.stringify([
        saved,
        builtin,
        saved,
        4,
        null,
        'unknown:id',
        'collage:saved:',
        'sticker:builtin:unseen',
      ]),
    );
    expect(readAssetFavorites()).toEqual([saved, builtin, 'sticker:builtin:unseen']);
  });

  it('toggles exactly one target without changing another namespace', () => {
    expect(toggleAssetFavorite([builtin], 'collage:saved', 'collage-user-1')).toEqual([
      builtin,
      saved,
    ]);
    expect(toggleAssetFavorite([builtin, saved], 'collage:saved', 'collage-user-1')).toEqual([
      builtin,
    ]);
  });

  it('prunes deleted custom IDs only from a verified full list, preserving unseen builtins', () => {
    const favorites = [saved, 'collage:saved:collage-user-2', builtin, 'sticker:builtin:unseen'];
    expect(pruneAssetFavorites(favorites, 'collage:saved')).toEqual(favorites);
    expect(pruneAssetFavorites(favorites, 'collage:saved', ['collage-user-2'])).toEqual(
      favorites.slice(1),
    );
    expect(pruneAssetFavorites(favorites, 'collage:saved', [])).toEqual([
      builtin,
      'sticker:builtin:unseen',
    ]);
  });

  it('survives blocked reads and writes, keeping in-session favorites', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useAssetFavorites());
    act(() => {
      result.current.toggleFavorite('collage:saved', 'collage-user-1');
    });
    expect(result.current.favorites).toEqual([saved]);
    act(() => {
      result.current.toggleFavorite('sticker:builtin', 'badge-1');
    });
    expect(result.current.favorites).toEqual([saved, builtin]);
  });

  it('keeps in-session toggles when only writes fail against existing storage', () => {
    localStorage.setItem(ASSET_FAVORITES_KEY, JSON.stringify([builtin]));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useAssetFavorites());
    act(() => {
      result.current.toggleFavorite('collage:saved', 'collage-user-1');
    });
    act(() => {
      result.current.toggleFavorite('collage:saved', 'collage-user-2');
    });
    expect(result.current.favorites).toEqual([builtin, saved, 'collage:saved:collage-user-2']);
    act(() => {
      result.current.toggleFavorite('collage:saved', 'collage-user-1');
    });
    expect(result.current.favorites).toEqual([builtin, 'collage:saved:collage-user-2']);
  });

  it('persists one operation and merges another mounted library’s IDs', () => {
    const { result } = renderHook(() => useAssetFavorites());
    localStorage.setItem(ASSET_FAVORITES_KEY, JSON.stringify([builtin]));
    const write = vi.spyOn(Storage.prototype, 'setItem');
    act(() => {
      result.current.toggleFavorite('collage:saved', 'collage-user-1');
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(readAssetFavorites()).toEqual([builtin, saved]);
  });
});
