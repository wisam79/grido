import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CaretLeft, CaretRight } from '@/components/ui/icons';

/** Reveal the original controls rather than maintaining another command list. */
export function ToolbarOverflow({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportId = useId();
  const [edges, setEdges] = useState({ overflow: false, previous: false, next: false });

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    // RTL scrollLeft is negative in the supported Chromium/WebView2 runtime.
    // Clamp overscroll and tolerate subpixel rounding at either boundary.
    const position = Math.max(0, Math.min(maximum, -viewport.scrollLeft));
    const next = {
      // Do not let the chevrons themselves keep overflow alive after resizing.
      overflow:
        viewport.scrollWidth > (viewport.parentElement?.clientWidth || viewport.clientWidth) + 1,
      previous: position > 1,
      next: maximum - position > 1,
    };
    setEdges((current) =>
      current.overflow === next.overflow &&
      current.previous === next.previous &&
      current.next === next.next
        ? current
        : next,
    );
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const observer = new ResizeObserver(measure);
    // Observe both available space and contextual command changes.
    observer.observe(viewport);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  const scroll = (forward: boolean) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      left: (forward ? -1 : 1) * viewport.clientWidth * 0.8,
      behavior: 'instant',
    });
    measure();
  };

  const revealFocusedControl = (event: React.FocusEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || event.target === viewport || !viewport.contains(event.target)) return;
    const visible = viewport.getBoundingClientRect();
    const focused = event.target.getBoundingClientRect();
    // Scroll only this viewport, not the page or canvas ancestors. Leave room
    // for the shared button's focus ring without changing its command/handler.
    const delta =
      focused.left < visible.left + 4
        ? focused.left - visible.left - 4
        : focused.right > visible.right - 4
          ? focused.right - visible.right + 4
          : 0;
    if (delta) {
      viewport.scrollBy({ left: delta, behavior: 'instant' });
      measure();
    }
  };

  return (
    <div className="flex items-center h-full min-w-0 flex-1" dir="rtl">
      {edges.overflow && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="coarse-touch-target"
          aria-label="إظهار الأوامر السابقة"
          aria-controls={viewportId}
          disabled={!edges.previous}
          onClick={() => scroll(false)}
        >
          <CaretRight aria-hidden="true" />
        </Button>
      )}
      <div
        ref={viewportRef}
        id={viewportId}
        role="region"
        aria-label="أوامر التحرير"
        className="h-full min-w-0 flex-1 overflow-x-auto scrollbar-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        onScroll={measure}
        onFocusCapture={revealFocusedControl}
      >
        <div ref={contentRef} className="flex items-center h-full w-max min-w-full px-1">
          {children}
        </div>
      </div>
      {edges.overflow && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="coarse-touch-target"
          aria-label="إظهار المزيد من الأوامر"
          aria-controls={viewportId}
          disabled={!edges.next}
          onClick={() => scroll(true)}
        >
          <CaretLeft aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
