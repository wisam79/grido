import { useEffect } from "react";

let lockCount = 0;

function applyBodyPointerEvents(): void {
  if (typeof document === "undefined" || !document.body) return;
  document.body.style.pointerEvents = lockCount > 0 ? "none" : "";
}

export function lockBodyPointerEvents(): () => void {
  lockCount += 1;
  applyBodyPointerEvents();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    applyBodyPointerEvents();
  };
}

export function releaseBodyPointerLock(): void {
  if (typeof document === "undefined" || !document.body) return;
  if (lockCount > 0) return;
  document.body.style.pointerEvents = "";
}

export function useBodyPointerLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return lockBodyPointerEvents();
  }, [active]);
}