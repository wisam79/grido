import React, { useEffect } from "react";
import { Transformer as KonvaTransformer, Group, Rect, Text } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import { getSnapPositionsWithTargets, SnapGuide, SnapTarget } from "@/lib/canvas/snap-utils";
import {
  transformerPrimary, transformerStroke,
  transformerLocked, transformerLockedStroke,
  transformerAnchorFill, transformerBadgeBg, transformerBadgeText,
} from "@/lib/canvas/canvas-colors";

interface EditorTransformerProps {
  trRef: React.RefObject<Konva.Transformer | null>;
  selectedIds: string[];
  sortedElements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  stageScale: number;
  isText: boolean;
  onTransformEnd: (e: KonvaEventObject<Event>) => void;
  setActiveGuides?: (guides: SnapGuide[]) => void;
  altPressedRef?: React.MutableRefObject<boolean>;
}

// تحويل أسماء مقابض Konva إلى اتجاهات البوصلة المستخدمة في محرك المحاذاة
const anchorToCompass = (anchor: string): string => {
  switch (anchor) {
    case "top-left": return "nw";
    case "top-center": return "n";
    case "top-right": return "ne";
    case "middle-left": return "w";
    case "middle-right": return "e";
    case "bottom-left": return "sw";
    case "bottom-center": return "s";
    case "bottom-right": return "se";
    default: return "se";
  }
};

export const EditorTransformer = React.memo(function EditorTransformer({
  trRef,
  selectedIds,
  sortedElements,
  canvasWidth,
  canvasHeight,
  stageScale,
  isText,
  onTransformEnd,
  setActiveGuides,
  altPressedRef,
}: EditorTransformerProps) {
  const badgeRef = React.useRef<Konva.Group | null>(null);
  const textRef = React.useRef<Konva.Text | null>(null);

  const printSettings = useEditorStore((state) => state.printSettings);
  const dpi = printSettings?.dpi || 300;

  // فحص هل العنصر المحدد مقفل (Locked)
  const isLocked = selectedIds.length === 1 && sortedElements.find((e) => e.id === selectedIds[0])?.locked;

  // 🧲 حالة المحاذاة المغناطيسية أثناء التحجيم (Resize Snapping)
  // معايرة ذاتية: نربط فضاء صناديق Konva بالفضاء المنطقي من أول استدعاء boundBoxFunc
  const resizeSnapRef = React.useRef<{
    vTargets: SnapTarget[];
    hTargets: SnapTarget[];
    oldBox: { x: number; y: number; width: number; height: number };
    L0: number; T0: number; R0: number; B0: number;
    unitX: number; unitY: number;
  } | null>(null);
  const prevResizeGuidesRef = React.useRef<SnapGuide[]>([]);

  const resetResizeSnap = React.useCallback(() => {
    resizeSnapRef.current = null;
    if (prevResizeGuidesRef.current.length > 0) {
      prevResizeGuidesRef.current = [];
      setActiveGuides?.([]);
    }
  }, [setActiveGuides]);

  useEffect(() => {
    const transformer = trRef.current;
    if (!transformer) return;

    const updateInfo = () => {
      const node = transformer.nodes()[0];
      if (!node) return;

      // قراءة مباشرة من الـ node — هو أصلاً في الفضاء المنطقي للكانفس
      // القيم المطلقة: العناصر المعكوسة تحتفظ بمقياس سالب دائم (إصلاح Bug#13)
      const nodeW = Math.abs(node.width() * node.scaleX());
      const nodeH = Math.abs(node.height() * node.scaleY());
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
      resizeSnapRef.current = null; // يُعاد بناؤه عند أول boundBoxFunc (يحتاج oldBox للمعايرة)
      updateInfo();
    };

    const handleTransform = () => {
      if (transformer && altPressedRef) {
        transformer.centeredScaling(altPressedRef.current);
      }
      updateInfo();
    };

    const handleTransformEndInternal = () => {
      if (badgeRef.current) {
        badgeRef.current.visible(false);
        badgeRef.current.getLayer()?.batchDraw();
      }
      resetResizeSnap();
    };

    transformer.on("transformstart dragstart", handleTransformStart);
    transformer.on("transform dragmove", handleTransform);
    transformer.on("transformend dragend", handleTransformEndInternal);

    return () => {
      transformer.off("transformstart dragstart", handleTransformStart);
      transformer.off("transform dragmove", handleTransform);
      transformer.off("transformend dragend", handleTransformEndInternal);
    };
  }, [trRef, canvasWidth, canvasHeight, dpi, stageScale, resetResizeSnap, altPressedRef]);

  // تخصيص مظهر المحابث (Anchors) بنمط Figma المحترف
  const primaryColor = isLocked ? transformerLocked() : transformerPrimary();
  const strokeColor  = isLocked ? transformerLockedStroke() : transformerStroke();

  return (
    <React.Fragment>
      <KonvaTransformer
        ref={trRef as unknown as React.Ref<Konva.Transformer>}
        anchorSize={9}
        anchorCornerRadius={4.5}
        anchorStroke={primaryColor}
        anchorStrokeWidth={2}
        anchorFill={transformerAnchorFill()}
        borderStroke={primaryColor}
        borderStrokeWidth={1.5}
        borderDash={isLocked ? [5, 4] : undefined}
        padding={6}
        keepRatio={true}
        shiftBehavior="inverted"
        ignoreStroke={true}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        rotateAnchorOffset={28}
        enabledAnchors={
          isLocked
            ? []
            : isText && selectedIds.length === 1
            ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
            : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
        }
        anchorStyleFunc={(anchor: Konva.Rect) => {
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
          } else if (anchor.hasName("rotater") || (anchor.name && anchor.name().includes("rotater"))) {
            anchor.width(12);
            anchor.height(12);
            anchor.offsetX(6);
            anchor.offsetY(6);
            anchor.cornerRadius(6);
            anchor.fill(primaryColor);
            anchor.stroke(transformerAnchorFill());
            anchor.strokeWidth(2);
          }
        }}
        boundBoxFunc={(oldBox, newBox) => {
          if (Math.abs(newBox.width) < 2 && Math.abs(newBox.height) < 2) {
            return oldBox;
          }

          // 🧲 محاذاة مغناطيسية أثناء التحجيم (عنصر واحد، بلا دوران)
          const { snapToGrid, userGuides, showUserGuides, showGrid, gridSize } = useEditorStore.getState();
          if (snapToGrid === false) {
            if (setActiveGuides && prevResizeGuidesRef.current.length > 0) {
              prevResizeGuidesRef.current = [];
              setActiveGuides([]);
            }
            return newBox;
          }

          const transformer = trRef.current;
          const node = transformer?.nodes()?.[0];
          if (!transformer || !node || selectedIds.length !== 1) return newBox;
          const rotation = Math.abs(node.rotation() % 360);
          if (rotation > 0.5 && rotation < 359.5) return newBox;

          // معايرة كسولة من أول صندوق: ربط فضاء الصناديق بالفضاء المنطقي
          if (!resizeSnapRef.current) {
            const absSX = Math.abs(node.scaleX()) || 1;
            const absSY = Math.abs(node.scaleY()) || 1;
            const W0 = node.width() * absSX;
            const H0 = node.height() * absSY;
            if (W0 <= 0 || H0 <= 0 || oldBox.width === 0 || oldBox.height === 0) return newBox;
            const isFlipped = (node.scaleX() ?? 1) < 0;
            const isFlippedY = (node.scaleY() ?? 1) < 0;
            const L0 = isFlipped ? node.x() - W0 : node.x();
            const T0 = isFlippedY ? node.y() - H0 : node.y();

            const vTargets: SnapTarget[] = [
              { value: 0, origin: "canvas" },
              { value: 0.5, origin: "canvas" },
              { value: 1, origin: "canvas" },
            ];
            const hTargets: SnapTarget[] = [
              { value: 0, origin: "canvas" },
              { value: 0.5, origin: "canvas" },
              { value: 1, origin: "canvas" },
            ];
            for (const el of sortedElements) {
              if (selectedIds.includes(el.id)) continue;
              vTargets.push(
                { value: el.x, origin: "element" },
                { value: el.x + el.width / 2, origin: "element" },
                { value: el.x + el.width, origin: "element" }
              );
              hTargets.push(
                { value: el.y, origin: "element" },
                { value: el.y + el.height / 2, origin: "element" },
                { value: el.y + el.height, origin: "element" }
              );
            }
            if (showUserGuides && userGuides) {
              for (const g of userGuides) {
                if (g.type === "v") vTargets.push({ value: g.pos, origin: "user-guide" });
                if (g.type === "h") hTargets.push({ value: g.pos, origin: "user-guide" });
              }
            }
            if (showGrid && gridSize && gridSize > 0) {
              const numCols = Math.floor(canvasWidth / gridSize);
              for (let i = 1; i < numCols; i++) {
                vTargets.push({ value: (i * gridSize) / canvasWidth, origin: "grid" });
              }
              const numRows = Math.floor(canvasHeight / gridSize);
              for (let j = 1; j < numRows; j++) {
                hTargets.push({ value: (j * gridSize) / canvasHeight, origin: "grid" });
              }
            }

            resizeSnapRef.current = {
              vTargets,
              hTargets,
              oldBox: { ...oldBox },
              L0,
              T0,
              R0: L0 + W0,
              B0: T0 + H0,
              unitX: oldBox.width / W0,
              unitY: oldBox.height / H0,
            };
          }

          const snap = resizeSnapRef.current;
          const { oldBox: cBox, L0, T0, R0, B0, unitX, unitY } = snap;

          // تحويل حواف الصندوق الجديد إلى الفضاء المنطقي (0-1 نسبي)
          const relL = (L0 + (newBox.x - cBox.x) / unitX) / canvasWidth;
          const relT = (T0 + (newBox.y - cBox.y) / unitY) / canvasHeight;
          const relR = (R0 + (newBox.x + newBox.width - cBox.x - cBox.width) / unitX) / canvasWidth;
          const relB = (B0 + (newBox.y + newBox.height - cBox.y - cBox.height) / unitY) / canvasHeight;

          const anchor = transformer.getActiveAnchor();
          const handle = anchorToCompass(anchor || "");

          const thresholdX = 8 / (canvasWidth * stageScale);
          const thresholdY = 8 / (canvasHeight * stageScale);

          const result = getSnapPositionsWithTargets(
            relL, relT, relR - relL, relB - relT,
            snap.vTargets, snap.hTargets,
            thresholdX, thresholdY,
            handle
          );

          // إعادة الحواف المنحازة إلى فضاء الصندوق (كل حافة تُعاير على حدة)
          const snappedL = result.x;
          const snappedR = result.x + result.w;
          const snappedT = result.y;
          const snappedB = result.y + result.h;

          const boxL = cBox.x + (snappedL * canvasWidth - L0) * unitX;
          const boxR = cBox.x + cBox.width + (snappedR * canvasWidth - R0) * unitX;
          const boxT = cBox.y + (snappedT * canvasHeight - T0) * unitY;
          const boxB = cBox.y + cBox.height + (snappedB * canvasHeight - B0) * unitY;

          if (setActiveGuides) {
            const prev = prevResizeGuidesRef.current;
            const next = result.guides;
            const equal = prev.length === next.length &&
              prev.every((g, i) => g.type === next[i].type && Math.abs(g.coord - next[i].coord) < 0.0001);
            if (!equal) {
              prevResizeGuidesRef.current = next;
              setActiveGuides(next);
            }
          }

          return { ...newBox, x: boxL, y: boxT, width: boxR - boxL, height: boxB - boxT };
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
          fill={transformerBadgeBg()}
          cornerRadius={6}
          shadowColor="rgba(0,0,0,0.5)"
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
          fill={transformerBadgeText()}
          align="center"
        />
      </Group>
    </React.Fragment>
  );
});
