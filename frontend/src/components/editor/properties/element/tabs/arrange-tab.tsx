import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  AlignLeftIcon,
  AlignCenterHorizontalIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVerticalIcon,
  AlignBottomIcon,
} from '@/components/ui/alignment-icons';
import { FluentSection, FluentSliderField } from '@/components/ui/blocks';
import { Button } from '@/components/ui/button';
import { ArrowClockwise, FlipHorizontal, FlipVertical } from '@/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getQuarterTurnRotationPatch,
  rotateElementAroundCenter,
} from '@/lib/canvas/element-geometry';
import { scaleElementDecorations } from '@/lib/canvas/scale-decorations';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { cn } from '@/lib/utils';

import type { CanvasElement } from '@/lib/editor-store';

export interface ElementArrangeTabProps {
  element: CanvasElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
}

export const ElementArrangeTab = React.memo(function ElementArrangeTab({
  element,
  onUpdate,
}: ElementArrangeTabProps) {
  const alignSelectedElements = useEditorStore((state) => state.alignSelectedElements);
  // X/Y retain their existing commit behavior; size gestures are field-local.
  const coordDirtySessionRef = useRef<number | null>(null);
  const pushCoordHistory = useCallback(() => {
    const dirtySession = coordDirtySessionRef.current;
    coordDirtySessionRef.current = null;
    if (dirtySession === null || dirtySession !== getDocumentSession()) return;
    useEditorStore.getState().pushHistory();
  }, []);

  type Axis = 'width' | 'height';
  type SizeGesture = {
    elementId: string;
    documentSession: number;
    axis: Axis;
    type: CanvasElement['type'];
    source: Record<string, unknown>;
    owned: Record<string, unknown>;
    raw: string | null;
  };
  const sizeGestureRef = useRef<SizeGesture | null>(null);
  const [widthDraft, setWidthDraft] = useState<{
    elementId: string;
    documentSession: number;
    text: string;
  } | null>(null);
  const [heightDraft, setHeightDraft] = useState<typeof widthDraft>(null);
  const documentSession = getDocumentSession();
  const displayedWidth =
    widthDraft?.elementId === element.id && widthDraft.documentSession === documentSession
      ? widthDraft.text
      : String(Math.round(element.width * 100));
  const displayedHeight =
    heightDraft?.elementId === element.id && heightDraft.documentSession === documentSession
      ? heightDraft.text
      : String(Math.round(element.height * 100));

  const beginSizeGesture = useCallback(
    (axis: Axis) => {
      if (axis === 'height' && element.type === 'text') return null;
      const current = useEditorStore.getState().elements.find((item) => item.id === element.id);
      if (!current) return null;
      const values = current as unknown as Record<string, unknown>;
      // Only the edited dimension and the decorations this gesture can scale.
      const keys = [axis, 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'cornerRadius'];
      if (current.type === 'shape') keys.push('strokeWidth', 'radius');
      if (current.type === 'text') keys.push('textSizing', 'textResizeAnchor');
      const gesture: SizeGesture = {
        elementId: current.id,
        documentSession: getDocumentSession(),
        axis,
        type: current.type,
        source: Object.fromEntries(keys.map((key) => [key, values[key]])),
        owned: {},
        raw: null,
      };
      sizeGestureRef.current = gesture;
      (axis === 'width' ? setWidthDraft : setHeightDraft)(null);
      return gesture;
    },
    [element],
  );

  const applyDimension = useCallback(
    (gesture: SizeGesture, rawPercent: number) => {
      if (
        gesture.documentSession !== getDocumentSession() ||
        gesture.elementId !== element.id ||
        !Number.isFinite(rawPercent)
      )
        return;
      const current = useEditorStore
        .getState()
        .elements.find((item) => item.id === gesture.elementId);
      if (!current || current.type !== gesture.type || !Number.isFinite(current[gesture.axis]))
        return;
      const values = current as unknown as Record<string, unknown>;
      if (
        !Object.is(
          values[gesture.axis],
          Object.prototype.hasOwnProperty.call(gesture.owned, gesture.axis)
            ? gesture.owned[gesture.axis]
            : gesture.source[gesture.axis],
        )
      )
        return; // Another writer owns the dimension now.
      const clamped = Math.max(0.05, rawPercent / 100);
      if (Math.abs(current[gesture.axis] - clamped) <= 1e-6) return;
      const sourceDimension = Number(gesture.source[gesture.axis]);
      if (!Number.isFinite(sourceDimension)) return;
      const decorationSource = { ...current, ...gesture.source } as CanvasElement;
      const deco =
        current.type === 'text'
          ? Math.abs(clamped - sourceDimension) <= 1e-6
            ? {
                textSizing: gesture.source.textSizing,
                textResizeAnchor: gesture.source.textResizeAnchor,
              }
            : { textSizing: 'fixed' as const, textResizeAnchor: undefined }
          : scaleElementDecorations(
              decorationSource,
              gesture.axis === 'width' ? clamped / Math.max(1e-6, sourceDimension) : 1,
              gesture.axis === 'height' ? clamped / Math.max(1e-6, sourceDimension) : 1,
            );
      const patch: Record<string, unknown> = { [gesture.axis]: clamped };
      // Include prior keys even when scale=1, so returning to start is a true no-op.
      for (const key of new Set([...Object.keys(deco), ...Object.keys(gesture.owned)])) {
        if (key === gesture.axis) continue;
        const expected = Object.prototype.hasOwnProperty.call(gesture.owned, key)
          ? gesture.owned[key]
          : gesture.source[key];
        if (Object.is(values[key], expected)) {
          patch[key] = Object.prototype.hasOwnProperty.call(deco, key)
            ? (deco as Record<string, unknown>)[key]
            : gesture.source[key];
        }
      }
      const effectivePatch =
        current.type === 'text' && 'textSizing' in patch && !('textResizeAnchor' in patch)
          ? { ...patch, textResizeAnchor: current.textResizeAnchor }
          : patch;
      onUpdate(gesture.elementId, effectivePatch as Partial<CanvasElement>);
      Object.assign(gesture.owned, patch);
    },
    [element, onUpdate],
  );

  const handleSizeChange = useCallback(
    (axis: Axis, raw: string) => {
      if (axis === 'height' && element.type === 'text') return;
      const gesture = sizeGestureRef.current ?? beginSizeGesture(axis);
      if (
        !gesture ||
        gesture.axis !== axis ||
        gesture.elementId !== element.id ||
        gesture.documentSession !== getDocumentSession()
      )
        return;
      gesture.raw = raw;
      (axis === 'width' ? setWidthDraft : setHeightDraft)({
        elementId: element.id,
        documentSession: gesture.documentSession,
        text: raw,
      });
      const value = Number(raw);
      if (raw.trim() !== '' && Number.isFinite(value) && value >= 5) applyDimension(gesture, value);
    },
    [applyDimension, beginSizeGesture, element.id, element.type],
  );

  const finishSizeGesture = useCallback(
    (axis: Axis, cancel: boolean) => {
      const gesture = sizeGestureRef.current;
      sizeGestureRef.current = null; // Clear before blur/Enter can fire a second commit.
      (axis === 'width' ? setWidthDraft : setHeightDraft)(null);
      if (
        !gesture ||
        gesture.axis !== axis ||
        gesture.elementId !== element.id ||
        gesture.documentSession !== getDocumentSession()
      )
        return;
      const raw = gesture.raw?.trim();
      const value = raw ? Number(raw) : NaN;
      if (!cancel && Number.isFinite(value)) applyDimension(gesture, value);
      const current = useEditorStore
        .getState()
        .elements.find((item) => item.id === gesture.elementId);
      if (!current || current.type !== gesture.type) return;
      const values = current as unknown as Record<string, unknown>;
      if (cancel || !Number.isFinite(value)) {
        const restore = Object.fromEntries(
          Object.entries(gesture.owned)
            .filter(
              ([key, preview]) =>
                Object.is(values[key], preview) && !Object.is(values[key], gesture.source[key]),
            )
            .map(([key]) => [key, gesture.source[key]]),
        );
        if (Object.keys(restore).length) {
          // Restoring sizing must not let the store clear an externally changed anchor.
          if (
            current.type === 'text' &&
            'textSizing' in restore &&
            !('textResizeAnchor' in restore)
          ) {
            restore.textResizeAnchor = current.textResizeAnchor;
          }
          onUpdate(gesture.elementId, restore as Partial<CanvasElement>);
        }
      } else if (
        Object.is(values[axis], gesture.owned[axis]) &&
        Object.entries(gesture.owned).some(
          ([key, preview]) =>
            Object.is(values[key], preview) && !Object.is(preview, gesture.source[key]),
        )
      ) {
        useEditorStore.getState().pushHistory();
      }
    },
    [applyDimension, element.id, onUpdate],
  );

  // اعتماد تعديل الإحداثيات أو الأبعاد الحيّ في نفس الجلسة إذا أُزيل التبويب قبل Enter/blur، مع حماية المستند الجديد.
  useEffect(() => {
    return () => {
      const gesture = sizeGestureRef.current;
      sizeGestureRef.current = null;
      const dirtyCoordSession = coordDirtySessionRef.current;
      coordDirtySessionRef.current = null;
      const activeSession = getDocumentSession();

      if (gesture && gesture.documentSession === activeSession) {
        const current = useEditorStore
          .getState()
          .elements.find((item) => item.id === gesture.elementId);
        if (current && current.type === gesture.type) {
          const values = current as unknown as Record<string, unknown>;
          const ownedChanged =
            Object.is(values[gesture.axis], gesture.owned[gesture.axis]) &&
            Object.entries(gesture.owned).some(
              ([key, preview]) =>
                Object.is(values[key], preview) && !Object.is(preview, gesture.source[key]),
            );
          if (ownedChanged) {
            useEditorStore.getState().pushHistory();
            return;
          }
        }
      }

      if (dirtyCoordSession !== null && dirtyCoordSession === activeSession) {
        useEditorStore.getState().pushHistory();
      }
    };
  }, []);

  const handleSizeKeyDown = useCallback(
    (axis: Axis, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      finishSizeGesture(axis, e.key === 'Escape');
      e.currentTarget.blur();
    },
    [finishSizeGesture],
  );

  const handleRotate90 = useCallback(() => {
    const { canvasWidth, canvasHeight } = useEditorStore.getState();
    onUpdate(element.id, getQuarterTurnRotationPatch(element, canvasWidth, canvasHeight));
    useEditorStore.getState().pushHistory();
  }, [element, onUpdate]);

  const handleFlipX = useCallback(() => {
    onUpdate(element.id, { flipX: !element.flipX });
    useEditorStore.getState().pushHistory();
  }, [element.id, element.flipX, onUpdate]);

  const handleFlipY = useCallback(() => {
    onUpdate(element.id, { flipY: !element.flipY });
    useEditorStore.getState().pushHistory();
  }, [element.id, element.flipY, onUpdate]);

  return (
    <div className="space-y-2.5 font-cairo">
      {/* بطاقة 1: الموضع والمحاذاة السريعة */}
      <FluentSection title="الموضع والمحاذاة" collapsible defaultOpen={true}>
        {/* أزرار المحاذاة السريعة للكانفاس */}
        <div className="flex items-center justify-between bg-muted/40 p-1 rounded-lg border border-border/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="محاذاة لليمين"
                onClick={() => alignSelectedElements('right')}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignRightIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة لليمين
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="توسيط أفقي"
                onClick={() => alignSelectedElements('center')}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignCenterHorizontalIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              توسيط أفقي
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="محاذاة لليسار"
                onClick={() => alignSelectedElements('left')}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignLeftIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة لليسار
            </TooltipContent>
          </Tooltip>

          <div className="w-[1px] h-4 bg-border/50" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="محاذاة للأعلى"
                onClick={() => alignSelectedElements('top')}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignTopIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة للأعلى
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="توسيط عمودي"
                onClick={() => alignSelectedElements('middle')}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignCenterVerticalIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              توسيط عمودي
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="محاذاة للأسفل"
                onClick={() => alignSelectedElements('bottom')}
                className="h-8 w-8 p-0 rounded-md hover:bg-background hover:text-primary hover:shadow-xs cursor-pointer transition-colors"
              >
                <AlignBottomIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-cairo">
              محاذاة للأسفل
            </TooltipContent>
          </Tooltip>
        </div>

        {/* شبكة الإحداثيات والأبعاد */}
        <div className="grid grid-cols-2 gap-2 text-mini">
          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-colors">
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              X:
            </span>
            <input
              type="number"
              dir="ltr"
              aria-label="X"
              value={Math.round(element.x * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== '' && Number.isFinite(v)) {
                  coordDirtySessionRef.current = getDocumentSession();
                  onUpdate(element.id, { x: Math.max(-1, Math.min(2, v / 100)) });
                }
              }}
              onBlur={pushCoordHistory}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-start text-foreground font-semibold"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-colors">
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              Y:
            </span>
            <input
              type="number"
              dir="ltr"
              aria-label="Y"
              value={Math.round(element.y * 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (e.target.value !== '' && Number.isFinite(v)) {
                  coordDirtySessionRef.current = getDocumentSession();
                  onUpdate(element.id, { y: Math.max(-1, Math.min(2, v / 100)) });
                }
              }}
              onBlur={pushCoordHistory}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-start text-foreground font-semibold"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-colors">
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              W:
            </span>
            <input
              type="number"
              dir="ltr"
              aria-label="W"
              value={displayedWidth}
              onChange={(e) => handleSizeChange('width', e.target.value)}
              onKeyDown={(e) => handleSizeKeyDown('width', e)}
              onFocus={() => beginSizeGesture('width')}
              onBlur={() => finishSizeGesture('width', false)}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-start text-foreground font-semibold"
            />
          </div>

          <div
            title={element.type === 'text' ? 'ارتفاع النص مشتق تلقائياً من المحتوى' : undefined}
            className={cn(
              'flex items-center gap-1.5 bg-background border border-border/60 rounded-md px-2 h-8 shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary transition-colors',
              element.type === 'text' && 'opacity-60',
            )}
          >
            <span className="text-muted-foreground/60 font-mono font-bold select-none text-xs shrink-0">
              H:
            </span>
            <input
              type="number"
              dir="ltr"
              aria-label="H"
              disabled={element.type === 'text'}
              value={displayedHeight}
              onChange={(e) => handleSizeChange('height', e.target.value)}
              onKeyDown={(e) => handleSizeKeyDown('height', e)}
              onFocus={() => beginSizeGesture('height')}
              onBlur={() => finishSizeGesture('height', false)}
              className="w-full bg-transparent border-0 p-0 text-xs font-mono focus:ring-0 focus:outline-hidden text-start text-foreground font-semibold disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </FluentSection>

      {/* بطاقة 2: التدوير والقلب */}
      <FluentSection title="التدوير والقلب" collapsible defaultOpen={true}>
        <FluentSliderField
          label="الزاوية"
          value={(((element.rotation % 360) + 540) % 360) - 180}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onChange={(v) => {
            const { canvasWidth, canvasHeight } = useEditorStore.getState();
            const newPos = rotateElementAroundCenter(element, v, canvasWidth, canvasHeight);
            onUpdate(element.id, {
              rotation: v,
              x: newPos.x,
              y: newPos.y,
            });
          }}
          onCommit={() => useEditorStore.getState().pushHistory()}
        />

        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRotate90}
            aria-label="تدوير 90°"
            title="تدوير 90°"
            className="h-8 w-full rounded-md border-border/60 hover:border-primary/45 transition-colors cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <ArrowClockwise className="w-3.5 h-3.5 text-muted-foreground" weight="regular" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleFlipX}
            aria-label="قلب أفقي"
            title="قلب أفقي"
            className={cn(
              'h-8 w-full rounded-md border-border/60 hover:border-primary/45 transition-colors cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              element.flipX &&
                'bg-card text-foreground border border-border/80 shadow-xs font-bold ring-1 ring-primary/40',
            )}
          >
            <FlipHorizontal
              className={cn(
                'w-3.5 h-3.5',
                element.flipX ? 'text-primary' : 'text-muted-foreground',
              )}
              weight={element.flipX ? 'fill' : 'regular'}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleFlipY}
            aria-label="قلب عمودي"
            title="قلب عمودي"
            className={cn(
              'h-8 w-full rounded-md border-border/60 hover:border-primary/45 transition-colors cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              element.flipY &&
                'bg-card text-foreground border border-border/80 shadow-xs font-bold ring-1 ring-primary/40',
            )}
          >
            <FlipVertical
              className={cn(
                'w-3.5 h-3.5',
                element.flipY ? 'text-primary' : 'text-muted-foreground',
              )}
              weight={element.flipY ? 'fill' : 'regular'}
            />
          </Button>
        </div>
      </FluentSection>
    </div>
  );
});
