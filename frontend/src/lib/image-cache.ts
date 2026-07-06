import { uid } from "./utils";

interface CacheEntry {
  base64: string;
  lastAccessed: number;
}

const imagesCache: Record<string, CacheEntry> = {};
const MAX_CACHE_SIZE = 30;

export function cacheImage(base64: string | undefined): string | undefined {
  if (!base64 || !base64.startsWith("data:image")) return base64;
  
  for (const [key, val] of Object.entries(imagesCache)) {
    if (val.base64 === base64) {
      val.lastAccessed = Date.now();
      return key;
    }
  }
  
  const keys = Object.keys(imagesCache);
  if (keys.length >= MAX_CACHE_SIZE) {
    let lruKey: string | null = null;
    let oldest = Infinity;
    for (const [key, val] of Object.entries(imagesCache)) {
      if (val.lastAccessed < oldest) {
        oldest = val.lastAccessed;
        lruKey = key;
      }
    }
    if (lruKey) {
      delete imagesCache[lruKey];
    }
  }
  
  const id = "img_" + uid();
  imagesCache[id] = { base64, lastAccessed: Date.now() };
  return id;
}

export function restoreImage(idOrBase64: string | undefined): string | undefined {
  if (!idOrBase64) return undefined;
  const entry = imagesCache[idOrBase64];
  if (entry) {
    entry.lastAccessed = Date.now();
    return entry.base64;
  }
  return idOrBase64;
}

export function clearImageCache() {
  for (const key of Object.keys(imagesCache)) {
    delete imagesCache[key];
  }
}
