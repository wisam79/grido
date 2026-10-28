import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { clamp } from '@/lib/clamp';
import {
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  normalizeHexColor,
  wheelPointToHsv,
  type HsvColor,
} from '@/lib/color-wheel';
import { cn } from '@/lib/utils';

const WHEEL_SIZE = 156;
const WHEEL_INSET = 8;
const VALUE_STEP = 1;
const WHEEL_STEP = 2;

export function ColorWheel({
  color,
  onChange,
  onCommit,
  className,
}: {
  color: string;
  onChange: (hex: string) => void;
  onCommit?: (hex: string) => void;
  className?: string;
}) {
  const hintId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const wheelDraggingRef = useRef(false);
  const valueDraggingRef = useRef(false);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(normalizeHexColor(color) ?? '#FFFFFF'));
  const hsvRef = useRef(hsv);

  useEffect(() => {
    const normalized = normalizeHexColor(color) ?? '#FFFFFF';
    const current = hsvRef.current;
    if (hsvToHex(current) === normalized) return;
    const synced = hexToHsv(normalized, current.h);
    hsvRef.current = synced;
    setHsv(synced);
  }, [color]);

  const commit = useCallback(
    (next: HsvColor) => {
      hsvRef.current = next;
      setHsv(next);
      const hex = hsvToHex(next);
      if (hex !== normalizeHexColor(color)) onChange(hex);
    },
    [color, onChange],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelSize = Math.round(WHEEL_SIZE * dpr);
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const image = context.createImageData(pixelSize, pixelSize);
    const center = pixelSize / 2;
    const radius = pixelSize / 2;
    const edge = Math.max(1, dpr);

    for (let y = 0; y < pixelSize; y += 1) {
      for (let x = 0; x < pixelSize; x += 1) {
        const dx = x + 0.5 - center;
        const dy = y + 0.5 - center;
        const distance = Math.hypot(dx, dy);
        if (distance > radius) continue;

        const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
        const s = Math.min(1, distance / radius);
        const [r, g, b] = hsvToRgb({ h, s, v: 1 });
        const index = (y * pixelSize + x) * 4;
        image.data[index] = r;
        image.data[index + 1] = g;
        image.data[index + 2] = b;
        image.data[index + 3] = Math.round(clamp((radius - distance) / edge, 0, 1) * 255);
      }
    }

    context.putImageData(image, 0, 0);
  }, []);

  const applyWheelPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = wheelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { h, s } = wheelPointToHsv(
        clientX - rect.left,
        clientY - rect.top,
        rect.width,
        hsvRef.current.v,
        WHEEL_INSET,
      );
      commit({ h, s, v: hsvRef.current.v });
    },
    [commit],
  );

  const applyValuePointer = useCallback(
    (clientX: number) => {
      const rect = valueRef.current?.getBoundingClientRect();
      if (!rect) return;
      commit({ ...hsvRef.current, v: clamp((clientX - rect.left) / rect.width, 0, 1) });
    },
    [commit],
  );

  const handleWheelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : WHEEL_STEP;
    let next = hsvRef.current;
    let handled = true;

    if (event.key === 'ArrowLeft') next = { ...next, h: next.h - step };
    else if (event.key === 'ArrowRight') next = { ...next, h: next.h + step };
    else if (event.key === 'ArrowDown') next = { ...next, s: next.s - step / 100 };
    else if (event.key === 'ArrowUp') next = { ...next, s: next.s + step / 100 };
    else handled = false;

    if (!handled) return;
    event.preventDefault();
    const updated = {
      h: ((next.h % 360) + 360) % 360,
      s: clamp(next.s, 0, 1),
      v: next.v,
    };
    commit(updated);
    onCommit?.(hsvToHex(updated));
  };

  const handleValueKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : VALUE_STEP;
    let value = hsvRef.current.v;
    let handled = true;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') value -= step / 100;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') value += step / 100;
    else if (event.key === 'Home') value = 0;
    else if (event.key === 'End') value = 1;
    else handled = false;

    if (!handled) return;
    event.preventDefault();
    const updated = { ...hsvRef.current, v: clamp(value, 0, 1) };
    commit(updated);
    onCommit?.(hsvToHex(updated));
  };

  const finishWheelDrag = () => {
    if (!wheelDraggingRef.current) return;
    wheelDraggingRef.current = false;
    onCommit?.(hsvToHex(hsvRef.current));
  };

  const finishValueDrag = () => {
    if (!valueDraggingRef.current) return;
    valueDraggingRef.current = false;
    onCommit?.(hsvToHex(hsvRef.current));
  };

  const markerAngle = (hsv.h * Math.PI) / 180;
  const markerRadius = (WHEEL_SIZE / 2 - WHEEL_INSET) * hsv.s;
  const markerLeft = WHEEL_SIZE / 2 + Math.sin(markerAngle) * markerRadius;
  const markerTop = WHEEL_SIZE / 2 - Math.cos(markerAngle) * markerRadius;
  const vividColor = hsvToHex({ h: hsv.h, s: hsv.s, v: 1 });
  const valuePercent = Math.round(hsv.v * 100);

  return (
    <div className={cn('flex flex-col items-center gap-3.5', className)} dir="ltr">
      <span id={hintId} className="sr-only">
        استخدم الأسهم لتغيير درجة اللون والتشبع، وShift للخطوات الكبيرة.
      </span>
      <div
        ref={wheelRef}
        role="slider"
        tabIndex={0}
        aria-label="عجلة الألوان"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuetext={`درجة ${Math.round(hsv.h)}، تشبع ${Math.round(hsv.s * 100)}%`}
        aria-describedby={hintId}
        onKeyDown={handleWheelKeyDown}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          wheelDraggingRef.current = true;
          applyWheelPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (wheelDraggingRef.current) applyWheelPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          finishWheelDrag();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={finishWheelDrag}
        onLostPointerCapture={finishWheelDrag}
        className="relative shrink-0 rounded-full touch-none cursor-crosshair focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      >
        <canvas ref={canvasRef} className="block h-full w-full rounded-full" />
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-black"
          style={{ opacity: 1 - hsv.v }}
        />
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
          style={{ left: markerLeft, top: markerTop }}
        />
      </div>

      <div
        ref={valueRef}
        role="slider"
        tabIndex={0}
        aria-label="سطوع اللون"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valuePercent}
        aria-valuetext={`${valuePercent}%`}
        onKeyDown={handleValueKeyDown}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          valueDraggingRef.current = true;
          applyValuePointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (valueDraggingRef.current) applyValuePointer(event.clientX);
        }}
        onPointerUp={(event) => {
          finishValueDrag();
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={finishValueDrag}
        onLostPointerCapture={finishValueDrag}
        className="relative h-3.5 w-full touch-none cursor-pointer rounded-full border border-border/70 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `linear-gradient(90deg, #000000 0%, ${vividColor} 100%)` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
          style={{ left: `${valuePercent}%` }}
        />
      </div>
    </div>
  );
}
