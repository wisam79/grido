import React, { useEffect } from "react";
import { Transformer as KonvaTransformer, Group, Rect, Text } from "react-konva";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CanvasElement, useEditorStore } from "@/lib/editor-store";
import type { SnapGuide } from "@/lib/canvas/snap-utils";
import { getElementPixelVisualBox } from "@/lib/canvas/element-geometry";
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
  const badgeBgRef = React.useRef<Konva.Rect | null>(null);
  const textRef = React.useRef<Konva.Text | null>(null);

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

      // قراءة مباشرة من الـ node — هو أصلاً في الفضاء المنطقي للكانفس
      // القيم المطلقة: العناصر المعكوسة تحتفظ بمقياس سالب دائم (إصلاح Bug#13)
      const nodeW = Math.abs(node.width() * node.scaleX());
      const nodeH = Math.abs(node.height() * node.scaleY());
      const nodeX = node.x();
      const nodeY = node.y();

      const rotation = Math.round(node.rotation() % 360);
      const normalizedRot = rotation < 0 ? rotation + 360 : rotation;

      const vBox = getElementPixelVisualBox(nodeX, nodeY, nodeW, nodeH, rotation);

      // حساب الأبعاد بالملم (mm) للطباعة الاحترافية
      const wMM = Math.round((nodeW / canvasWidth) * (canvasWidth / dpi) * 25.4);
      const hMM = Math.round((nodeH / canvasHeight) * (canvasHeight / dpi) * 25.4);

      const rotStr = normalizedRot > 0 ? ` • ${normalizedRot}°` : "";
      const textContent = `${wMM} × ${hMM} mm${rotStr}`;

      if (badgeRef.current && textRef.current && badgeBgRef.current) {
        // حساب العرض الكافي للنص مع مسافة حشو 20px
        const badgeW = Math.max(124, textContent.length * 7.5 + 22);

        if (textRef.current.text() !== textContent) {
          textRef.current.text(textContent);
          textRef.current.width(badgeW);
          textRef.current.x(-badgeW / 2);
          badgeBgRef.current.width(badgeW);
          badgeBgRef.current.x(-badgeW / 2);
        }

        // تموضع ذكي متكيف: إذا كان العنصر في قمة الكانفس، تنقلب الشارة لأسفله
        const badgeOffset = 32 / stageScale;
        const targetY = vBox.minY - badgeOffset >= 0
          ? vBox.minY - badgeOffset
          : vBox.maxY + (12 / stageScale);

        badgeRef.current.position({
          x: vBox.centerX,
          y: targetY,
        });

        if (!badgeRef.current.visible()) {
          badgeRef.current.visible(true);
        }
        badgeRef.current.getLayer()?.batchDraw();
      }
    };

    const handleTransformStart = () => {
      updateInfo();
    };

    // 🚀 خنق تحديث الشارة لإطار واحد — updateInfo يقيس نصاً ويعيد رسم
    // الطبقة، واستدعاؤه كل tick تحويل يضاعف العمل لكل إطار.
    let badgeRafId = 0;
    const scheduleBadgeUpdate = () => {
      if (badgeRafId !== 0) return;
      badgeRafId = requestAnimationFrame(() => {
        badgeRafId = 0;
        updateInfo();
      });
    };

    const handleTransform = () => {
      if (transformer && altPressedRef) {
        transformer.centeredScaling(altPressedRef.current);
      }
      scheduleBadgeUpdate();
    };

    const handleTransformEndInternal = () => {
      if (badgeRafId !== 0) {
        cancelAnimationFrame(badgeRafId);
        badgeRafId = 0;
      }
      updateInfo();
      if (badgeRef.current) {
        badgeRef.current.visible(false);
        badgeRef.current.getLayer()?.batchDraw();
      }
    };

    transformer.on("transformstart dragstart", handleTransformStart);
    transformer.on("transform dragmove", handleTransform);
    transformer.on("transformend dragend", handleTransformEndInternal);

    return () => {
      if (badgeRafId !== 0) cancelAnimationFrame(badgeRafId);
      transformer.off("transformstart dragstart", handleTransformStart);
      transformer.off("transform dragmove", handleTransform);
      transformer.off("transformend dragend", handleTransformEndInternal);
    };
  }, [trRef, canvasWidth, canvasHeight, dpi, stageScale, altPressedRef]);

  // تخصيص مظهر المحابث (Anchors) بنمط Fluent 2 المحترف مع ظلال ناعمة
  const primaryColor = isLocked ? transformerLocked() : transformerPrimary();
  const strokeColor  = isLocked ? transformerLockedStroke() : transformerStroke();

  return (
    <React.Fragment>
      <KonvaTransformer
        ref={trRef as unknown as React.Ref<Konva.Transformer>}
        anchorSize={10}
        anchorCornerRadius={3.5}
        anchorStroke={primaryColor}
        anchorStrokeWidth={1.5}
        anchorFill={transformerAnchorFill()}
        borderStroke={primaryColor}
        borderStrokeWidth={1.5}
        borderDash={isLocked ? [6, 4] : undefined}
        padding={3}
        keepRatio={true}
        shiftBehavior="inverted"
        ignoreStroke={true}
        rotateLineVisible={true}
        rotateAnchorOffset={26}
        rotationSnapTolerance={5}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        enabledAnchors={
          isLocked
            ? []
            : isText && selectedIds.length === 1
            ? ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"]
            : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
        }
        anchorStyleFunc={(anchor: Konva.Rect) => {
          // 🚀 بلا ظلال على المقابض — كل مقبض مظلل يعني تمريرة ضبابية
          // إضافية في كل إطار تحويل ×8 مقابض. العمق يبقى عبر التعبئة والحدود.
          if (
            anchor.hasName("top-left") ||
            anchor.hasName("top-right") ||
            anchor.hasName("bottom-left") ||
            anchor.hasName("bottom-right")
          ) {
            // مقابض الزوايا الفاخرة: Squircle أنيق بمقاس 10px واستدارة 3.5px
            anchor.width(10);
            anchor.height(10);
            anchor.offsetX(5);
            anchor.offsetY(5);
            anchor.cornerRadius(3.5);
            anchor.fill(transformerAnchorFill());
            anchor.stroke(primaryColor);
            anchor.strokeWidth(1.5);
          } else if (anchor.hasName("middle-left") || anchor.hasName("middle-right")) {
            // مقابض الحواف العمودية: كبسولات نحيفة وأنيقة
            anchor.cornerRadius(2.5);
            anchor.width(5);
            anchor.height(16);
            anchor.offsetX(2.5);
            anchor.offsetY(8);
            anchor.fill(transformerAnchorFill());
            anchor.stroke(primaryColor);
            anchor.strokeWidth(1.5);
          } else if (anchor.hasName("top-center") || anchor.hasName("bottom-center")) {
            // مقابض الحواف الأفقية: كبسولات نحيفة وأنيقة
            anchor.cornerRadius(2.5);
            anchor.width(16);
            anchor.height(5);
            anchor.offsetX(8);
            anchor.offsetY(2.5);
            anchor.fill(transformerAnchorFill());
            anchor.stroke(primaryColor);
            anchor.strokeWidth(1.5);
          } else if (anchor.hasName("rotater") || (anchor.name && anchor.name().includes("rotater"))) {
            // مقبض التدوير الدائري الاحترافي
            anchor.width(14);
            anchor.height(14);
            anchor.offsetX(7);
            anchor.offsetY(7);
            anchor.cornerRadius(7);
            anchor.fill(primaryColor);
            anchor.stroke(transformerAnchorFill());
            anchor.strokeWidth(2);
          }
        }}
        boundBoxFunc={(oldBox, newBox) => {
          // النمط القياسي لـ Konva: حماية الحد الأدنى للمقاس دون تشويه الصندوق أو النسبة
          if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) {
            return oldBox;
          }
          return newBox;
        }}
        onTransformEnd={onTransformEnd}
      />

      {/* شريط الأبعاد والزاوية الحية الفاخر بنظام Fluent Acrylic */}
      <Group 
        ref={badgeRef}
        visible={false}
        scaleX={1 / stageScale}
        scaleY={1 / stageScale}
        listening={false}
      >
        <Rect
          ref={badgeBgRef}
          x={-62}
          y={0}
          width={124}
          height={24}
          fill={transformerBadgeBg()}
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth={1}
          cornerRadius={7}
        />
        <Text
          ref={textRef}
          x={-62}
          y={6}
          width={124}
          text=""
          fontSize={11}
          fontFamily="Inter, Cairo, system-ui, sans-serif"
          fontStyle="bold"
          fill={transformerBadgeText()}
          align="center"
        />
      </Group>
    </React.Fragment>
  );
});
