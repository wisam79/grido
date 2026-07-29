import { useState, useEffect } from "react";

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

export function invalidateImageCache(src?: string) {
  if (src) {
    for (const key of imageCache.keys()) {
      if (key.startsWith(src)) {
        imageCache.delete(key);
      }
    }
  } else {
    imageCache.clear();
  }
}

export function useAsyncImage(src: string, crossOrigin?: string) {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    if (!src) {
      queueMicrotask(() => {
        setImage(undefined);
        setStatus("failed");
      });
      return;
    }

    const cacheKey = `${src}__${crossOrigin || ""}`;
    const cached = imageCache.get(cacheKey);
    if (cached && cached.complete) {
      setImage(cached);
      setStatus("loaded");
      return;
    }

    let isCurrent = true;
    queueMicrotask(() => {
      if (isCurrent) setStatus("loading");
    });

    const pending = pendingLoads.get(cacheKey);
    if (pending) {
      pending
        .then((loadedImg) => {
          if (!isCurrent) return;
          setImage(loadedImg);
          setStatus("loaded");
        })
        .catch(() => {
          if (!isCurrent) return;
          setImage(undefined);
          setStatus("failed");
        });
      return () => {
        isCurrent = false;
      };
    }

    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        const finish = () => {
          // Implement LRU-like limit to prevent unbounded memory growth
          if (imageCache.size >= 200) {
            const firstKey = imageCache.keys().next().value;
            if (firstKey) imageCache.delete(firstKey);
          }
          
          imageCache.set(cacheKey, img);
          pendingLoads.delete(cacheKey);
          if (isCurrent) {
            setImage(img);
            setStatus("loaded");
          }
          resolve(img);
        };

        if (typeof img.decode === "function") {
          img.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };

      img.onerror = () => {
        pendingLoads.delete(cacheKey);
        if (isCurrent) {
          console.error("[useAsyncImage] Failed to load image:", src);
          setImage(undefined);
          setStatus("failed");
        }
        reject(new Error(`Failed to load image: ${src}`));
      };
    });

    pendingLoads.set(cacheKey, loadPromise);
    img.src = src;

    return () => {
      isCurrent = false;
      if (!imageCache.has(cacheKey)) {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }
    };
  }, [src, crossOrigin]);

  return [image, status] as const;
}
