import React, { useRef, useEffect } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "./konva-elements";

interface KonvaCanvasProps {
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
}

export function KonvaCanvas({ displayW, displayH, sortedElements, handleDoubleClick }: KonvaCanvasProps) {
  const { selectedId, selectElement, updateElement, pushHistory } = useEditorStore();
  
  const trRef = useRef<any>(null);
  const elementsRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (trRef.current) {
      if (selectedId) {
        const selectedNode = elementsRefs.current[selectedId];
        if (selectedNode) {
          trRef.current.nodes([selectedNode]);
          trRef.current.getLayer().batchDraw();
          return;
        }
      }
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, sortedElements]);

  const handleStageMouseDown = (e: any) => {
    // Deselect when clicking on empty stage area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectElement(null);
    }
  };

  const handleElementChange = (id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
  };

  return (
    <Stage
      width={displayW}
      height={displayH}
      onMouseDown={handleStageMouseDown}
      onTouchStart={handleStageMouseDown}
    >
      <Layer>
        {sortedElements.map((el) => {
          if (el.visible === false) return null;

          const elementProps = {
            key: el.id,
            element: el,
            isSelected: selectedId === el.id,
            onSelect: () => selectElement(el.id),
            onChange: (patch: Partial<CanvasElement>) => handleElementChange(el.id, patch),
            displayW,
            displayH,
            elementRef: {
              get current() {
                return elementsRefs.current[el.id];
              },
              set current(val) {
                if (val) {
                  elementsRefs.current[el.id] = val;
                } else {
                  delete elementsRefs.current[el.id];
                }
              }
            }
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

        {selectedId && (
          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size of elements during resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            onTransformEnd={() => {
              // Push change to undo/redo history once transform finishes
              pushHistory();
            }}
          />
        )}
      </Layer>
    </Stage>
  );
}
