let scrollLocks = 0;
let savedOverflow = "";
let savedOverflowPriority = "";
const listeners = new Set<() => void>();

export function areLandingDialogsOpen() {
  return scrollLocks > 0;
}

export function subscribeLandingDialogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// One refcount owns both the body lock and background animation suspension.
export function acquireLandingDialog() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.body.style.getPropertyValue("overflow");
    savedOverflowPriority =
      document.body.style.getPropertyPriority("overflow");
    document.body.style.setProperty("overflow", "hidden");
    listeners.forEach((listener) => listener());
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--scrollLocks === 0) {
      if (savedOverflow)
        document.body.style.setProperty(
          "overflow",
          savedOverflow,
          savedOverflowPriority,
        );
      else document.body.style.removeProperty("overflow");
      listeners.forEach((listener) => listener());
    }
  };
}
