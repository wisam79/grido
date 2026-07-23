import React, { useEffect, useState } from "react";
import { Transformer as KonvaTransformer, Group, Rect, Text } from "react-konva";
import Konva from "konva";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";

interface EditorTransformerProps {
  trRef: React.RefObject<Konva.Transformer | null>;
  selectedIds: string[];
  sortedElements: CanvasElement[];
  displayW: number;
  displayH: number;
  canvasWidth: number;
  canvasHeight: number;
  isText: boolean;
  onTransformEnd: (e: any) => void;
}

export const EditorTransformer = React.memo(function EditorTransformer({
  trRef,
  selectedIds,
  sortedElements,
  displayW,
  displayH,
  canvasWidth,
  canvasHeight,
  isText,
  onTransformEnd,
}: EditorTransformerProps) {
  const [transformInfo, setTransformInfo] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    active: boolean;
  } | null>(null);

  const printSettings = useEditorStore((state) => state.printSettings);
  const dpi = printSettings?.dpi || 300;

  // فحص هل العنصر المحدد مقفل (Locked)
  const isLocked = selectedIds.length === 1 && sortedElements.find((e) => e.id === selectedIds[0])?.locked;

  useEffect(() => {
    const transformer = trRef.current;
    if (!transformer) return;

    const updateInfo = () => {
      const box = transformer.getClientRect();
      if (!box || box.width === 0) return;

      const node = transformer.nodes()[0];
      const rotation = node ? Math.round(node.rotation() % 360) : 0;
      const normalizedRot = rotation < 0 ? rotation + 360 : rotation;

      // حساب الأبعاد بالملم (mm) للطباعة الاحترافية
      const wMM = Math.round((box.width / displayW) * (canvasWidth / dpi) * 25.4);
      const hMM = Math.round((box.height / displayH) * (canvasHeight / dpi) * 25.4);

      setTransformInfo({
        x: box.x + box.width / 2,
        y: box.y - 28,
        w: wMM,
        h: hMM,
        rotation: normalizedRot,
        active: true,
      });
    };

    const handleTransformStart = () => {
      updateInfo();
    };

    const handleTransform = () => {
      updateInfo();
    };

    const handleTransformEndInternal = () => {
      setTransformInfo((prev) => (prev ? { ...prev, active: false } : null));
    };

    transformer.on("transformstart dragstart", handleTransformStart);
    transformer.on("transform dragmove", handleTransform);
    transformer.on("transformend dragend", handleTransformEndInternal);

    return () => {
      transformer.off("transformstart dragstart", handleTransformStart);
      transformer.off("transform dragmove", handleTransform);
      transformer.off("transformend dragend", handleTransformEndInternal);
    };
  }, [trRef, displayW, displayH, canvasWidth, canvasHeight, dpi]);

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

      {/* شريط الأبعاد والزاوية الحية (Figma-Style Dimension Badge) عند التحريك أو التكبير والتصغير */}
      {transformInfo && transformInfo.active && (
        <Group x={transformInfo.x} y={Math.max(10, transformInfo.y)} listening={false}>
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
            x={-60}
            y={5}
            width={120}
            text={`${transformInfo.w} × ${transformInfo.h} mm ${transformInfo.rotation > 0 ? `(${transformInfo.rotation}°)` : ""}`}
            fontSize={11}
            fontFamily="Cairo, sans-serif"
            fontStyle="bold"
            fill="#ffffff"
            align="center"
          />
        </Group>
      )}
    </React.Fragment>
  );
});
