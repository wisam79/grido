import { useCallback, useRef, useState } from 'react';
import { readStoredList, writeStoredList } from '@/lib/local-prefs';

export const ASSET_FAVORITES_KEY = 'grido_asset_favorites_v1';
export type AssetFavoriteNamespace = 'collage:saved' | 'sticker:builtin';
const NAMESPACES: readonly AssetFavoriteNamespace[] = ['collage:saved', 'sticker:builtin'];

export function assetFavoriteId(namespace: AssetFavoriteNamespace, id: string): string | null {
  return NAMESPACES.includes(namespace) &&
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= 256 &&
    id.trim() === id &&
    Array.from(id).every(
      (character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127,
    )
    ? `${namespace}:${id}`
    : null;
}

function validFavorites(values: readonly string[]): string[] {
  return [...new Set(values)].filter((value) =>
    NAMESPACES.some((namespace) => {
      const prefix = `${namespace}:`;
      return (
        value.startsWith(prefix) && assetFavoriteId(namespace, value.slice(prefix.length)) === value
      );
    }),
  );
}

export function readAssetFavorites(fallback: string[] = []): string[] {
  return validFavorites(readStoredList(ASSET_FAVORITES_KEY, fallback));
}

export function toggleAssetFavorite(
  favorites: readonly string[],
  namespace: AssetFavoriteNamespace,
  id: string,
): string[] {
  const current = validFavorites(favorites);
  const key = assetFavoriteId(namespace, id);
  if (!key) return current;
  return current.includes(key) ? current.filter((value) => value !== key) : [...current, key];
}

/** Only a verified, complete loaded list may prune its own namespace, never search results. */
export function pruneAssetFavorites(
  favorites: readonly string[],
  namespace: AssetFavoriteNamespace,
  loadedIds?: readonly string[],
): string[] {
  const current = validFavorites(favorites);
  if (!loadedIds || !NAMESPACES.includes(namespace)) return current;
  const loaded = new Set(loadedIds.map((id) => assetFavoriteId(namespace, id)));
  return current.filter((value) => !value.startsWith(`${namespace}:`) || loaded.has(value));
}

export function useAssetFavorites() {
  const [favorites, setFavorites] = useState(readAssetFavorites);
  const currentRef = useRef(favorites);
  const pendingWriteRef = useRef(false);
  const commit = useCallback((next: string[]) => {
    currentRef.current = next;
    writeStoredList(ASSET_FAVORITES_KEY, next);
    pendingWriteRef.current = JSON.stringify(readAssetFavorites()) !== JSON.stringify(next);
    setFavorites(next);
  }, []);
  const latestFavorites = useCallback(
    () => (pendingWriteRef.current ? currentRef.current : readAssetFavorites(currentRef.current)),
    [],
  );

  const toggleFavorite = useCallback(
    (namespace: AssetFavoriteNamespace, id: string) => {
      const key = assetFavoriteId(namespace, id);
      if (!key) return undefined;
      const next = toggleAssetFavorite(latestFavorites(), namespace, id);
      commit(next);
      return next.includes(key);
    },
    [commit, latestFavorites],
  );

  const pruneFavorites = useCallback(
    (namespace: AssetFavoriteNamespace, loadedIds?: readonly string[]) => {
      if (!loadedIds) return;
      const current = latestFavorites();
      const next = pruneAssetFavorites(current, namespace, loadedIds);
      if (next.length !== current.length) commit(next);
    },
    [commit, latestFavorites],
  );

  return { favorites, toggleFavorite, pruneFavorites };
}
