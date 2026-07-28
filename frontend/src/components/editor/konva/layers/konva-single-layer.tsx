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
          key: el.id,
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
          return <URLImage {...elementProps} />;
        }
        if (el.type === "text") {
          return (
            <React.Fragment key={el.id}>
              <KonvaTextElement
                {...elementProps}
                onDblClick={() => handleDoubleClick(el)}
              />
            </React.Fragment>
          );
        }
        if (el.type === "shape") {
          return <KonvaShapeElement {...elementProps} />;
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
                const absScaleX = Math.abs(sx);
                const absScaleY = Math.abs(sy);

                const newW = node.width() * absScaleX;
                const newH = node.height() * absScaleY;

                node.width(newW);
                if (el.type === "text") {
                  node.fontSize?.(Math.max(6, Math.round((el.fontSize || 16) * absScaleY)));
                } else {
                  node.height(newH);
                }
                node.scaleX(isNowFlipped ? -1 : 1);
                node.scaleY(1);

                const newWidth = newW / canvasWidth;
                const rawX = node.x() / canvasWidth;

                const patch: Partial<CanvasElement> = {
                  x: isNowFlipped ? rawX - newWidth : rawX,
                  y: node.y() / canvasHeight,
                  width: newWidth,
                  rotation: node.rotation(),
                  flipX: isNowFlipped,
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
