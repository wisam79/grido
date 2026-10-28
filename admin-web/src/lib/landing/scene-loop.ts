export function createStudioLoop(
  render: (time: number, delta: number, animated: boolean) => void,
) {
  let frame: number | null = null;
  let previous: number | null = null;
  let time = 0;
  let visible = true;
  let animated = true;
  let disposed = false;

  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
  };

  const invalidate = () => {
    if (!disposed && visible && frame === null)
      frame = requestAnimationFrame(tick);
  };

  const tick = (timestamp: number) => {
    frame = null;
    if (disposed || !visible) return;
    if (animated && previous !== null && timestamp - previous < 1000 / 30 - 1) {
      invalidate();
      return;
    }

    const delta =
      previous === null
        ? 0
        : Math.max(0, Math.min((timestamp - previous) / 1000, 0.05));
    previous = timestamp;
    if (animated) time += delta;
    render(time, delta, animated);
    if (animated) invalidate();
  };

  return {
    invalidate,
    setVisible(value: boolean) {
      if (visible === value) return;
      visible = value;
      cancel();
      invalidate();
    },
    setAnimated(value: boolean) {
      if (animated === value) return;
      animated = value;
      cancel();
      invalidate();
    },
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
