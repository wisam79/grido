import { useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';

import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import {
  getCollageGeometry,
  getSlotRect,
  isBakedCollageLayout,
} from '@/lib/canvas/collage-geometry';
import { buildCollageInsertPlan } from '@/lib/canvas/collage-insert';
import { resolveBatchImageAspectRatios } from '@/lib/canvas/image-dimensions';
import { isDropFillableImageShape } from '@/lib/canvas/image-shape-fill';
import { registerNativeImageDropHandler } from '@/lib/canvas/native-image-drop';
import { useStageRef } from '@/lib/canvas/stage-context';
import { useEditorStore } from '@/lib/editor-store';
import { getDocumentSession } from '@/lib/io/document-session';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';

import type { NativeImageDropPayload } from '@/lib/canvas/native-image-drop';
import type { ShapeElement } from '@/lib/store/types';
import type Konva from 'konva';

const logger = createLogger('use-image-drop');
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 3;
const MAX_NATIVE_DROPS = 32;

type EditorState = ReturnType<typeof useEditorStore.getState>;
type DropContext = {
  session: number;
  epoch: number;
  projectId: EditorState['projectId'];
  mode: EditorState['mode'];
  canvasWidth: number;
  canvasHeight: number;
  slots: EditorState['slots'];
  collageTemplate: EditorState['collageTemplate'];
  collageMargin: number;
  collageGap: number;
  shape: ShapeElement | null;
  slotId: string | null;
  valid: boolean;
  release: () => void;
};

function sameCollageDropLayout(
  previous: EditorState['slots'],
  current: EditorState['slots'],
): boolean {
  if (previous === current) return true;
  if (previous.length !== current.length) return false;
  const byId = new Map(current.map((slot) => [slot.id, slot]));
  return previous.every((slot) => {
    const live = byId.get(slot.id);
    return (
      live &&
      live.cellIndex === slot.cellIndex &&
      live.x === slot.x &&
      live.y === slot.y &&
      live.w === slot.w &&
      live.h === slot.h
    );
  });
}

function matchesDropContext(context: DropContext, state: EditorState): boolean {
  if (
    getDocumentSession() !== context.session ||
    state.projectId !== context.projectId ||
    state.mode !== context.mode ||
    state.canvasWidth !== context.canvasWidth ||
    state.canvasHeight !== context.canvasHeight
  )
    return false;
  if (context.shape) {
    const current = state.elements.find((element) => element.id === context.shape!.id);
    if (current !== context.shape || !isDropFillableImageShape(state.elements, current))
      return false;
  }
  return (
    context.mode !== 'collage' ||
    (sameCollageDropLayout(context.slots, state.slots) &&
      state.collageTemplate === context.collageTemplate &&
      state.collageMargin === context.collageMargin &&
      state.collageGap === context.collageGap)
  );
}

function mayContainImageFiles(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer?.types?.includes('Files')) return false;
  const items = dataTransfer.items;
  if (!items || items.length === 0) return true;
  return Array.from(items).some(
    (item) => item.kind === 'file' && (!item.type || item.type.startsWith('image/')),
  );
}

/** One receipt-time target for browser and native drops; async work never retargets it. */
export function useImageDrop(innerRef: RefObject<HTMLDivElement | null>, enabled = true) {
  const [manualLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState({ enabled, count: 0 });
  if (busy.enabled !== enabled) setBusy({ enabled, count: 0 });
  const pending = useRef(0);
  const epoch = useRef(0);
  const active = useRef(true);
  const controllers = useRef(new Set<AbortController>());
  const nativeDrops = useRef(new Map<string, DropContext>());
  const contexts = useRef(new Set<DropContext>());
  const stageRef = useStageRef();

  const clearDropTargetHighlight = useCallback(() => {
    useCanvasInteraction.getState().setDropTargetShapeId(null);
  }, []);

  const begin = useCallback(() => {
    pending.current += 1;
    setBusy({ enabled: true, count: pending.current });
  }, []);
  const finish = useCallback((operationEpoch: number) => {
    if (!active.current || epoch.current !== operationEpoch) return;
    pending.current = Math.max(0, pending.current - 1);
    setBusy({ enabled: true, count: pending.current });
  }, []);

  useEffect(() => {
    const pendingControllers = controllers.current;
    const pendingNativeDrops = nativeDrops.current;
    const pendingContexts = contexts.current;
    active.current = enabled;
    if (enabled && typeof window !== 'undefined') {
      window.addEventListener('dragend', clearDropTargetHighlight);
      window.addEventListener('blur', clearDropTargetHighlight);
    }
    return () => {
      active.current = false;
      epoch.current += 1;
      pending.current = 0;
      if (typeof window !== 'undefined') {
        window.removeEventListener('dragend', clearDropTargetHighlight);
        window.removeEventListener('blur', clearDropTargetHighlight);
      }
      clearDropTargetHighlight();
      for (const controller of pendingControllers) controller.abort();
      pendingControllers.clear();
      pendingNativeDrops.clear();
      for (const context of pendingContexts) context.release();
    };
  }, [enabled, clearDropTargetHighlight]);

  const resolveDropTarget = useCallback(
    (
      state: EditorState,
      clientX?: number,
      clientY?: number,
      native = false,
    ): { shape: ShapeElement | null; slotId: string | null } => {
      let shape: ShapeElement | null = null;
      let slotId: string | null = null;
      const hasPoint = Number.isFinite(clientX) && Number.isFinite(clientY);
      const stage = stageRef.current;
      if (stage && hasPoint) {
        // Konva converts CSS/webview coordinates to its viewport, including CSS
        // scaling. getIntersection expects that viewport point, not its inverse.
        stage.setPointersPositions({ clientX, clientY });
        const pointer = stage.getPointerPosition();
        const hit = pointer ? stage.getIntersection(pointer) : null;
        if (state.mode === 'single') {
          if (hit) {
            const elementIds = new Set(state.elements.map((element) => element.id));
            const root = hit.findAncestor?.((node: Konva.Node) => elementIds.has(node.id()), true);
            const element = root ? state.elements.find((item) => item.id === root.id()) : undefined;
            if (isDropFillableImageShape(state.elements, element)) shape = element;
          }
        } else if (hit) {
          const root = hit.findAncestor?.(
            (node: Konva.Node) => node.id().startsWith('slot-'),
            true,
          );
          if (root) slotId = root.id().slice('slot-'.length);
        }
      }
      // Keep the existing headless collage fallback, never approximate shape hits
      // using a bounding rectangle (holes and rotated paths must remain holes).
      if (state.mode === 'collage' && !slotId && !stage && hasPoint && innerRef.current) {
        const rect = innerRef.current.getBoundingClientRect();
        const scale = rect.width / state.canvasWidth;
        if (scale > 0) {
          const x = (clientX! - rect.left) / scale;
          const y = (clientY! - rect.top) / scale;
          const geometry = getCollageGeometry(
            state.canvasWidth,
            state.canvasHeight,
            state.collageMargin,
            state.collageGap,
            isBakedCollageLayout(state.collageTemplate),
          );
          const slot = state.slots.find((candidate) => {
            const bounds = getSlotRect(candidate, geometry);
            return (
              x >= bounds.left &&
              x <= bounds.left + bounds.width &&
              y >= bounds.top &&
              y <= bounds.top + bounds.height
            );
          });
          slotId = slot?.id ?? null;
        }
      }
      if (native && !hasPoint && state.mode === 'collage') {
        slotId = state.slots.some((slot) => slot.id === state.selectedId) ? state.selectedId : null;
      }
      return { shape, slotId };
    },
    [innerRef, stageRef],
  );

  const captureDrop = useCallback(
    (clientX?: number, clientY?: number, native = false): DropContext => {
      const state = useEditorStore.getState();
      const { shape, slotId } = resolveDropTarget(state, clientX, clientY, native);
      const context: DropContext = {
        session: getDocumentSession(),
        epoch: epoch.current,
        projectId: state.projectId,
        mode: state.mode,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        slots: state.slots,
        collageTemplate: state.collageTemplate,
        collageMargin: state.collageMargin,
        collageGap: state.collageGap,
        shape,
        slotId,
        valid: true,
        release: () => {},
      };
      const unsubscribe = useEditorStore.subscribe((current) => {
        if (!matchesDropContext(context, current)) {
          context.valid = false;
          context.release();
        }
      });
      context.release = () => {
        unsubscribe();
        contexts.current.delete(context);
      };
      contexts.current.add(context);
      return context;
    },
    [resolveDropTarget],
  );

  const isCurrent = useCallback(
    (context: DropContext) =>
      active.current &&
      context.valid &&
      context.epoch === epoch.current &&
      matchesDropContext(context, useEditorStore.getState()),
    [],
  );

  const applySources = useCallback(
    async (context: DropContext, sources: string[]) => {
      if (!sources.length || !isCurrent(context)) return;
      // Resolve all dimensions before touching the target, so batch placement has
      // no later await between the shape fill and insertion of its overflow.
      const aspectMap = await resolveBatchImageAspectRatios(sources);
      if (!isCurrent(context)) return;
      const state = useEditorStore.getState();
      if (context.mode === 'collage') {
        if (context.slotId) {
          const previous = context.slots.find((slot) => slot.id === context.slotId);
          const current = state.slots.find((slot) => slot.id === context.slotId);
          if (current !== previous) {
            // Another request edited this exact target. Keep this import as
            // overflow, rather than overwriting it or discarding valid files.
            await state.setSlotImagesBatch([], null, sources, () => isCurrent(context));
            return;
          }
        }
        const plan = buildCollageInsertPlan(state.slots, sources, {
          targetSlotId: context.slotId,
          scope: context.slotId ? 'target' : 'empty',
          repeat:
            !context.slotId &&
            isBakedCollageLayout(context.collageTemplate) &&
            sources.length === 1,
        });
        await state.setSlotImagesBatch(
          plan.assignments,
          sources[0],
          plan.remaining,
          () => isCurrent(context),
          true,
        );
        return;
      }
      let remaining = sources;
      if (context.shape) {
        const hasOverflow = sources.length > 1;
        const result = state.fillShapeWithImage(
          context.shape.id,
          sources[0],
          context.shape,
          hasOverflow ? { skipHistory: true } : undefined,
        );
        if (result !== 'ok' && result !== 'unchanged') return;
        remaining = sources.slice(1);
      }
      if (remaining.length === 1) {
        state.addImageElement(remaining[0], aspectMap.get(remaining[0]) || 1);
      } else if (remaining.length > 1) {
        state.addImageElementsBatch(
          remaining.map((src) => ({ src, aspectRatio: aspectMap.get(src) || 1 })),
        );
      }
    },
    [isCurrent],
  );

  useEffect(() => {
    if (!enabled) return;
    const handleNativeDrop = (payload: NativeImageDropPayload): boolean => {
      if (payload.phase === 'start' || payload.phase === 'complete') {
        if (payload.phase === 'start') {
          clearDropTargetHighlight();
          if (
            !active.current ||
            nativeDrops.current.has(payload.dropId) ||
            nativeDrops.current.size >= MAX_NATIVE_DROPS
          )
            return true;
          nativeDrops.current.set(payload.dropId, captureDrop(payload.x, payload.y, true));
          begin();
          return true;
        }
        const context = nativeDrops.current.get(payload.dropId);
        if (!context) return true;
        nativeDrops.current.delete(payload.dropId);
        void applySources(context, payload.images)
          .catch((error: unknown) => {
            logger.error('Native drop failed:', error);
          })
          .finally(() => {
            context.release();
            finish(context.epoch);
          });
        return true;
      }
      clearDropTargetHighlight();
      if (!active.current || !payload.images.length) return true;
      const context = captureDrop(payload.x, payload.y, true);
      begin();
      void applySources(context, payload.images)
        .catch((error: unknown) => {
          logger.error('Native drop failed:', error);
        })
        .finally(() => {
          context.release();
          finish(context.epoch);
        });
      return true;
    };
    return registerNativeImageDropHandler(handleNativeDrop);
  }, [enabled, captureDrop, applySources, begin, finish, clearDropTargetHighlight]);

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.types?.includes('Files')) {
        event.stopPropagation?.();
        event.dataTransfer.dropEffect = enabled ? 'copy' : 'none';
      }
      const state = useEditorStore.getState();
      if (
        enabled &&
        active.current &&
        state.mode === 'single' &&
        mayContainImageFiles(event.dataTransfer) &&
        Number.isFinite(event.clientX) &&
        Number.isFinite(event.clientY)
      ) {
        const { shape } = resolveDropTarget(state, event.clientX, event.clientY);
        useCanvasInteraction.getState().setDropTargetShapeId(shape?.id ?? null);
      } else {
        clearDropTargetHighlight();
      }
    },
    [enabled, resolveDropTarget, clearDropTargetHighlight],
  );

  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      const related = event.relatedTarget as Node | null;
      if (!related || !event.currentTarget?.contains?.(related)) {
        clearDropTargetHighlight();
      }
    },
    [clearDropTargetHighlight],
  );

  const handleDrop = useCallback(
    async (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer?.files?.length) event.stopPropagation?.();
      clearDropTargetHighlight();
      if (!enabled || !active.current) return;
      const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (!files.length) return;
      const context = captureDrop(event.clientX, event.clientY);
      const controller = new AbortController();
      controllers.current.add(controller);
      begin();
      try {
        const sources: string[] = [];
        for (let i = 0; i < files.length; i += CHUNK_SIZE) {
          if (!isCurrent(context) || controller.signal.aborted) return;
          const results = await Promise.all(
            files.slice(i, i + CHUNK_SIZE).map(async (file) => {
              if (file.size > MAX_FILE_SIZE) {
                logger.warn(`Skipping oversized file: ${file.name}`);
                return null;
              }
              try {
                const uploaded = await uploadMediaBlob(file, file.name, controller.signal);
                if (uploaded.imageSrc) return uploaded.imageSrc;
              } catch (error) {
                if (controller.signal.aborted) throw error;
              }
              // Browser preview compatibility if the desktop media service is absent.
              try {
                return await blobToDataUrl(file);
              } catch (error) {
                if (controller.signal.aborted) throw error;
                logger.warn('Failed to read dropped image:', file.name, error);
                return null;
              }
            }),
          );
          for (const source of results) if (source) sources.push(source);
        }
        await applySources(context, sources);
      } catch (error) {
        if (!controller.signal.aborted) logger.error('Drop file error:', error);
      } finally {
        controllers.current.delete(controller);
        context.release();
        finish(context.epoch);
      }
    },
    [enabled, captureDrop, applySources, isCurrent, begin, finish, clearDropTargetHighlight],
  );

  return {
    isLoading: enabled && (manualLoading || (busy.enabled && busy.count > 0)),
    setIsLoading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
