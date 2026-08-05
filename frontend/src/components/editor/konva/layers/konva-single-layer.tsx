import React from "react";
import { Layer } from "react-konva";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { SnapGuide } from "@/lib/snap-utils";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "../konva-elements";
import { EditorTransformer } from "../elements/editor-transformer";

interface KonvaSingleLayerProps {
  sortedElements: CanvasElement[];
  selectedIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  displayW: number;
  snapToGrid: boolean;
  gridSize: number;
  trRef: React.RefObject<any>;
  elementsRefs: React.MutableRefObject<Record<string, any>>;
  altPressedRef: React.MutableRefObject<boolean>;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleDoubleClick: (el: CanvasElement) => void;
  handleElementChange: (id: string, patch: Partial<CanvasElement>) => void;
  createElementMouseDown: (elId: string) => (e: any) => void;
  createElementClick: (elId: string) => (e: any) => void;
  createElementRef: (elId: string) => { current: any };
}

export const KonvaSingleLayer = React.memo(function KonvaSingleLayer({
  sortedElements,
  selectedIds,
  canvasWidth,
  canvasHeight,
  displayW,
  snapToGrid,
  gridSize,
  trRef,
  elementsRefs,
  altPressedRef,
  setActiveGuides,
  handleDoubleClick,
  handleElementChange,
  createElementMouseDown,
  createElementClick,
  createElementRef,
}: KonvaSingleLayerProps) {
  const isText = selectedIds.length > 0 && selectedIds.every((id) => {
    const el = sortedElements.find((e) => e.id === id);
    return el?.type === "text";
  });

  return (
    <Layer>
      {sortedElements.map((el) => {
        if (el.visible === false) return null;

        if (
          el.x > 1.1 ||
          el.y > 1.1 ||
          el.x + el.width < -0.1 ||
          el.y + el.height < -0.1
        ) {
          return null;
        }

        const handleMouseDown = createElementMouseDown(el.id);
        const handleClick = createElementClick(el.id);

        const elementProps = {
          element: el,
          isSelected: selectedIds.includes(el.id),
          onMouseDown: handleMouseDown,
          onTouchStart: handleMouseDown,
          onClick: handleClick,
          onTap: handleClick,
          onChange: (patch: Partial<CanvasElement>) => handleElementChange(el.id, patch),
          canvasWidth,
          canvasHeight,
          allElements: sortedElements,
          setActiveGuides,
          snapToGrid,
          gridSize,
          altPressedRef,
          getKonvaNode: (id: string) => elementsRefs.current[id],
          elementRef: createElementRef(el.id),
        };

        if (el.type === "image" && el.imageSrc) {
          return <URLImage key={el.id} {...elementProps} />;
        }
        if (el.type === "text") {
          return (
            <KonvaTextElement
              key={el.id}
              {...elementProps}
              onDblClick={() => handleDoubleClick(el)}
            />
          );
        }
        if (el.type === "shape") {
          return <KonvaShapeElement key={el.id} {...elementProps} />;
        }
        return null;
      })}

      {selectedIds.length > 0 && (
        <EditorTransformer
          trRef={trRef}
          selectedIds={selectedIds}
          sortedElements={sortedElements}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          stageScale={displayW / canvasWidth}
          isText={isText}
          setActiveGuides={setActiveGuides}
          altPressedRef={altPressedRef}
          onTransformEnd={() => {
            if (!trRef.current) return;
            const nodes = trRef.current.nodes();
            const patches = nodes
              .map((node: any) => {
                const id = node.id();
                const el = sortedElements.find((x) => x.id === id);
                if (!el) return null;

                const sx = node.scaleX();
                const sy = node.scaleY();
                const isNowFlipped = sx < 0;
                const isNowFlippedY = sy < 0;
                const absScaleX = Math.abs(sx);
                const absScaleY = Math.abs(sy);

                const baseW = (typeof node.width === "function" && node.width() > 0) ? node.width() : el.width * canvasWidth;
                const baseH = (typeof node.height === "function" && node.height() > 0) ? node.height() : el.height * canvasHeight;

                const newW = Math.max(10, baseW * absScaleX);
                const newH = Math.max(10, baseH * absScaleY);

                node.width(newW);
                if (el.type === "text") {
                  node.fontSize?.(Math.max(6, Math.round((el.fontSize || 16) * absScaleY)));
                } else {
                  node.height(newH);
                }
                node.scaleX(isNowFlipped ? -1 : 1);
                node.scaleY(isNowFlippedY ? -1 : 1);

                const newWidth = newW / canvasWidth;
                const newHeight = newH / canvasHeight;
                const rawX = node.x() / canvasWidth;
                const rawY = node.y() / canvasHeight;

                const patch: Partial<CanvasElement> = {
                  x: isNowFlipped ? rawX - newWidth : rawX,
                  y: isNowFlippedY ? rawY - newHeight : rawY,
                  width: newWidth,
                  rotation: node.rotation(),
                  flipX: isNowFlipped,
                  flipY: isNowFlippedY,
                };

                if (el.type === "text") {
                  patch.height = node.height() / canvasHeight;
                  (patch as any).fontSize = Math.max(6, Math.round((el.fontSize || 16) * absScaleY));
                } else {
                  patch.height = newH / canvasHeight;
                }

                return { id, patch };
              })
              .filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

            useEditorStore.getState().updateElements(patches);
            useEditorStore.getState().pushHistory();

            requestAnimationFrame(() => {
              if (trRef.current && selectedIds.length > 0) {
                const updatedNodes = selectedIds
                  .map((sid) => elementsRefs.current[sid])
                  .filter(Boolean);
                trRef.current.nodes(updatedNodes);
                trRef.current.forceUpdate();
                trRef.current.getLayer()?.batchDraw();
              }
            });
          }}
        />
      )}
    </Layer>
  );
});
