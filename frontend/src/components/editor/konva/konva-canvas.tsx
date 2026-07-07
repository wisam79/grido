import React, { useRef, useEffect } from "react";
import { Stage, Layer, Transformer, Line, Circle } from "react-konva";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { URLImage, KonvaTextElement, KonvaShapeElement } from "./konva-elements";

import { SnapGuide } from "@/lib/snap-utils";
import { useShallow } from "zustand/react/shallow";

interface KonvaCanvasProps {
  displayW: number;
  displayH: number;
  sortedElements: CanvasElement[];
  handleDoubleClick: (el: CanvasElement) => void;
  setActiveGuides: (guides: SnapGuide[]) => void;
}

export function KonvaCanvas({ displayW, displayH, sortedElements, handleDoubleClick, setActiveGuides }: KonvaCanvasProps) {
  const { selectedId, selectElement, updateElement, pushHistory, showGrid, gridSize, gridColor, gridType, snapToGrid } = useEditorStore(useShallow((state) => ({
    selectedId: state.selectedId,
    selectElement: state.selectElement,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    showGrid: state.showGrid,
    gridSize: state.gridSize,
    gridColor: state.gridColor,
    gridType: state.gridType,
    snapToGrid: state.snapToGrid,
  })));
  
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
      {/* طبقة رسم شبكة الإرشاد (خلف جميع العناصر وغير تفاعلية) */}
      {showGrid && gridSize > 0 && (
        <Layer listening={false}>
          {(() => {
            const lines = [];
            const numH = Math.ceil(displayH / gridSize);
            const numW = Math.ceil(displayW / gridSize);

            if (gridType === "lines") {
              // رسم الخطوط الأفقية
              for (let i = 0; i <= numH; i++) {
                lines.push(
                  <Line
                    key={`grid-h-${i}`}
                    points={[0, i * gridSize, displayW, i * gridSize]}
                    stroke={gridColor}
                    strokeWidth={0.5}
                  />
                );
              }
              // رسم الخطوط العمودية
              for (let j = 0; j <= numW; j++) {
                lines.push(
                  <Line
                    key={`grid-v-${j}`}
                    points={[j * gridSize, 0, j * gridSize, displayH]}
                    stroke={gridColor}
                    strokeWidth={0.5}
                  />
                );
              }
            } else {
              // رسم النقاط الإرشادية
              for (let i = 0; i <= numH; i++) {
                for (let j = 0; j <= numW; j++) {
                  lines.push(
                    <Circle
                      key={`grid-dot-${i}-${j}`}
                      x={j * gridSize}
                      y={i * gridSize}
                      radius={1}
                      fill={gridColor}
                    />
                  );
                }
              }
            }
            return lines;
          })()}
        </Layer>
      )}

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
            allElements: sortedElements,
            setActiveGuides,
            snapToGrid,
            gridSize,
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
