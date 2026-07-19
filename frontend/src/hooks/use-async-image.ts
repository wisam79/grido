import { useState, useEffect } from "react";

export function useAsyncImage(src: string, crossOrigin?: string) {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    if (!src) {
      const timer = setTimeout(() => {
        setImage(undefined);
        setStatus("failed");
      }, 0);
      return () => clearTimeout(timer);
    }

    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    
    let isCurrent = true;
    const timer2 = setTimeout(() => {
      setStatus("loading");
    }, 0);

    // Set src after setting onload to capture cached images correctly
    img.onload = () => {
      if (!isCurrent) return;
      
      // Use asynchronous decoding to prevent main thread blocking during Konva draw
      if (typeof img.decode === "function") {
        img.decode()
          .then(() => {
            if (!isCurrent) return;
            setImage(img);
            setStatus("loaded");
          })
          .catch((err) => {
            console.warn("Async image decode failed, falling back to sync draw:", err);
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
      clearTimeout(timer2);
    };
  }, [src, crossOrigin]);

  return [image, status] as const;
}
