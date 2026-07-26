import React, { useEffect } from "react";
import { Transformer as KonvaTransformer, Group, Rect, Text } from "react-konva";
import Konva from "konva";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";

interface EditorTransformerProps {
  trRef: React.RefObject<Konva.Transformer | null>;
  selectedIds: string[];
  sortedElements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  stageScale: number;
  isText: boolean;
  onTransformEnd: (e: any) => void;
}

export const EditorTransformer = React.memo(function EditorTransformer({
  trRef,
  selectedIds,
  sortedElements,
  canvasWidth,
  canvasHeight,
  stageScale,
  isText,
  onTransformEnd,
}: EditorTransformerProps) {
  const badgeRef = React.useRef<any>(null);
  const textRef = React.useRef<any>(null);

  const printSettings = useEditorStore((state) => state.printSettings);
  const dpi = printSettings?.dpi || 300;

  // فحص هل العنصر المحدد مقفل (Locked)
  const isLocked = selectedIds.length === 1 && sortedElements.find((e) => e.id === selectedIds[0])?.locked;

  useEffect(() => {
    const transformer = trRef.current;
    if (!transformer) return;

    const updateInfo = () => {
      const node = transformer.nodes()[0];
      if (!node) return;

      // قراءة مباشرة من الـ node — هو أصلاً في الفضاء المنطقي للكانفاس
      const nodeW = node.width() * node.scaleX();
      const nodeH = node.height() * node.scaleY();
      const nodeX = node.x();
      const nodeY = node.y();

      const rotation = Math.round(node.rotation() % 360);
      const normalizedRot = rotation < 0 ? rotation + 360 : rotation;

      // حساب الأبعاد بالملم (mm) للطباعة الاحترافية
      const wMM = Math.round((nodeW / canvasWidth) * (canvasWidth / dpi) * 25.4);
      const hMM = Math.round((nodeH / canvasHeight) * (canvasHeight / dpi) * 25.4);

      if (badgeRef.current && textRef.current) {
        badgeRef.current.visible(true);
        badgeRef.current.position({
          x: nodeX + nodeW / 2,
          y: nodeY - (28 / stageScale)
        });
        textRef.current.text(`${wMM} × ${hMM} mm ${normalizedRot > 0 ? `(${normalizedRot}°)` : ""}`);
        badgeRef.current.getLayer()?.batchDraw();
      }
    };

    const handleTransformStart = () => {
      updateInfo();
    };

    const handleTransform = () => {
      updateInfo();
    };

    const handleTransformEndInternal = () => {
      if (badgeRef.current) {
        badgeRef.current.visible(false);
        badgeRef.current.getLayer()?.batchDraw();
      }
    };

    transformer.on("transformstart dragstart", handleTransformStart);
    transformer.on("transform dragmove", handleTransform);
    transformer.on("transformend dragend", handleTransformEndInternal);

    return () => {
      transformer.off("transformstart dragstart", handleTransformStart);
      transformer.off("transform dragmove", handleTransform);
      transformer.off("transformend dragend", handleTransformEndInternal);
    };
  }, [trRef, canvasWidth, canvasHeight, dpi, stageScale]);

  // تخصيص مظهر المحابث (Anchors) بنمط Figma المحترف
  const primaryColor = isLocked ? "#f59e0b" : "#2563eb";
  const strokeColor = isLocked ? "#d97706" : "#1d4ed8";

  return (
    <React.Fragment>
      <KonvaTransformer
        ref={trRef as any}
        anchorSize={9}
        anchorCornerRadius={4.5}
        anchorStroke={primaryColor}
        anchorStrokeWidth={2}
        anchorFill="#ffffff"
        borderStroke={primaryColor}
        borderStrokeWidth={1.5}
        borderDash={isLocked ? [5, 4] : undefined}
        padding={6}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        rotateAnchorOffset={28}
        enabledAnchors={
          isLocked
            ? []
            : isText && selectedIds.length === 1
            ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
            : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
        }
        anchorStyleFunc={(anchor: any) => {
          // مقابض الحواف الحانبية بنمط Figma (حبوب مستطيلة خفيفة)
          if (anchor.hasName("middle-left") || anchor.hasName("middle-right")) {
            anchor.cornerRadius(2);
            anchor.width(4);
            anchor.height(14);
            anchor.offsetY(7);
            anchor.offsetX(2);
          } else if (anchor.hasName("top-center") || anchor.hasName("bottom-center")) {
            anchor.cornerRadius(2);
            anchor.width(14);
            anchor.height(4);
            anchor.offsetX(7);
            anchor.offsetY(2);
          } else if (anchor.hasName("rotater")) {
            anchor.cornerRadius(6);
            anchor.size(10);
            anchor.fill(primaryColor);
            anchor.stroke("#ffffff");
            anchor.strokeWidth(2);
          }
        }}
        boundBoxFunc={(oldBox, newBox) => {
          if (newBox.width < 5 || newBox.height < 5) {
            return oldBox;
          }
          return newBox;
        }}
        onTransformEnd={onTransformEnd}
      />

      {/* شريط الأبعاد والزاوية الحية (Figma-Style Dimension Badge) - مخفي افتراضياً ويظهر عند التعديل فقط */}
      <Group 
        ref={badgeRef}
        visible={false}
        scaleX={1 / stageScale}
        scaleY={1 / stageScale}
        listening={false}
      >
        <Rect
          x={-60}
          y={0}
          width={120}
          height={22}
          fill="#1e293b"
          cornerRadius={6}
          shadowColor="#000000"
          shadowBlur={6}
          shadowOpacity={0.3}
          shadowOffsetY={2}
        />
        <Text
          ref={textRef}
          x={-60}
          y={5}
          width={120}
          text=""
          fontSize={11}
          fontFamily="Cairo, sans-serif"
          fontStyle="bold"
          fill="#ffffff"
          align="center"
        />
      </Group>
    </React.Fragment>
  );
});
