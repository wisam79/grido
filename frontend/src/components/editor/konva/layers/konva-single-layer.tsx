import React from "react";
import { Layer } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { SnapGuide } from "@/lib/canvas/snap-utils";
import { scaleElementDecorations } from "@/lib/canvas/scale-decorations";
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
  trRef: React.RefObject<Konva.Transformer | null>;
  elementsRefs: React.MutableRefObject<Record<string, Konva.Node>>;
  altPressedRef: React.MutableRefObject<boolean>;
  shiftPressedRef: React.MutableRefObject<boolean>;
  setActiveGuides: (guides: SnapGuide[]) => void;
  handleDoubleClick: (el: CanvasElement) => void;
  handleElementChange: (id: string, patch: Partial<CanvasElement>) => void;
  createElementMouseDown: (elId: string) => (e: KonvaEventObject<MouseEvent>) => void;
  createElementClick: (elId: string) => (e: KonvaEventObject<MouseEvent>) => void;
  createElementRef: (elId: string) => { current: Konva.Node | null };
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
  shiftPressedRef,
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

        // حذف خارج الكانفس مع مراعاة الدوران: Konva يدير حول نقطة الأصل (x,y)
        // — اختبار الصندوق غير المدار كان يخفي عناصر مدارة نصفها ظاهر (إصلاح Bug#11)
        const rad = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const w = el.width;
        const h = el.height;
        // زوايا الصندوق المدارة حول الأصل
        const cornersX = [0, w * cos, w * cos - h * sin, -h * sin];
        const cornersY = [0, w * sin, w * sin + h * cos, h * cos];
        const minX = el.x + Math.min(...cornersX);
        const maxX = el.x + Math.max(...cornersX);
        const minY = el.y + Math.min(...cornersY);
        const maxY = el.y + Math.max(...cornersY);

        if (
          minX > 1.1 ||
          minY > 1.1 ||
          maxX < -0.1 ||
          maxY < -0.1
        ) {
          return null;
        }

        const handleMouseDown = createElementMouseDown(el.id);
        const handleClick = createElementClick(el.id);

        const elementProps = {
          element: el,
          isSelected: selectedIds.includes(el.id),
          onMouseDown: handleMouseDown,
          onTouchStart: handleMouseDown as unknown as (e: KonvaEventObject<TouchEvent>) => void,
          onClick: handleClick,
          onTap: handleClick as unknown as (e: KonvaEventObject<TouchEvent>) => void,
          onChange: (patch: Partial<CanvasElement>) => handleElementChange(el.id, patch),
          canvasWidth,
          canvasHeight,
          allElements: sortedElements,
          setActiveGuides,
          snapToGrid,
          gridSize,
          altPressedRef,
          shiftPressedRef,
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
              .map((node: Konva.Node) => {
                const id = node.id();
                const el = sortedElements.find((x) => x.id === id);
                if (!el) return null;

                const sx = node.scaleX();
                const sy = node.scaleY();
                const absScaleX = Math.abs(sx);
                const absScaleY = Math.abs(sy);

                const baseW = el.width * canvasWidth;
                const baseH = el.height * canvasHeight;

                const newW = Math.max(10, baseW * absScaleX);
                const newH = Math.max(10, baseH * absScaleY);

                // إعادة مقياس العقدة القياسي إلى 1 لتكون الأبعاد الفعلية هي المرجع،
                // ثم تثبيت الأبعاد على العقدة نفسها: مجموعات Konva لا تستنتج
                // عرضها/ارتفاعها للمحوّل (ثابت «Group Resizing Fallback» في
                // .agents/AGENTS.md)، وشارة الأبعاد تقرأ node.width() * scaleX().
                // والنص يُستثنى من الارتفاع فيبقى ارتفاعه محسوباً من الالتفاف
                // (ثابت «التفاف نص Konva الافتراضي»).
                node.scaleX(1);
                node.scaleY(1);
                if (typeof node.width === "function") node.width(newW);
                if (el.type !== "text" && typeof node.height === "function") node.height(newH);

                const newWidth = newW / canvasWidth;
                const newHeight = newH / canvasHeight;
                const rawX = node.x() / canvasWidth;
                const rawY = node.y() / canvasHeight;

                // إذا قام المستخدم بسحب المقبض لما بعد الصفر يعكس حالة القلب
                const nextFlipX = sx < 0 ? !el.flipX : (el.flipX ?? false);
                const nextFlipY = sy < 0 ? !el.flipY : (el.flipY ?? false);

                const patch: Partial<CanvasElement> = {
                  x: rawX,
                  y: rawY,
                  width: newWidth,
                  height: newHeight,
                  rotation: node.rotation(),
                  flipX: nextFlipX,
                  flipY: nextFlipY,
                };

                if (el.type === "text") {
                  (patch as Partial<Record<string, unknown>>).fontSize = Math.max(
                    6,
                    Math.round((el.fontSize || 16) * absScaleY)
                  );
                }

                // 🛡️ الزخارف (حد/ظل/استدارة) تُقيَّس بنسبة التحجيم نفسها
                Object.assign(patch, scaleElementDecorations(el, absScaleX, absScaleY));

                return { id, patch };
              })
              .filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

            useEditorStore.getState().updateElements(patches);
            useEditorStore.getState().pushHistory();

            trRef.current?.nodes(nodes);
            trRef.current?.forceUpdate();
            trRef.current?.getLayer()?.batchDraw();
          }}
        />
      )}
    </Layer>
  );
});
