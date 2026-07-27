import { useState, useEffect } from "react";

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

    let isCurrent = true;
    queueMicrotask(() => {
      if (isCurrent) setStatus("loading");
    });

    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    img.onload = () => {
      if (!isCurrent) return;
      if (typeof img.decode === "function") {
        img.decode()
          .then(() => {
            if (!isCurrent) return;
            setImage(img);
            setStatus("loaded");
          })
          .catch(() => {
            if (!isCurrent) return;
            setImage(img);
            setStatus("loaded");
          });
      } else {
        setImage(img);
        setStatus("loaded");
      }
    };

    img.onerror = () => {
      if (!isCurrent) return;
      console.error("[useAsyncImage] Failed to load image:", src);
      setImage(undefined);
      setStatus("failed");
    };

    img.src = src;

    return () => {
      isCurrent = false;
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [src, crossOrigin]);

  return [image, status] as const;
}
