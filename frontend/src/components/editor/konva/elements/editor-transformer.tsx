import React, { useEffect } from 'react';
import { Transformer as KonvaTransformer, Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { CanvasElement, useEditorStore } from '@/lib/editor-store';
import type { SnapGuide } from '@/lib/canvas/snap-utils';
import { getElementPixelVisualBox } from '@/lib/canvas/element-geometry';
import {
  useCanvasColors,
  transformerPrimary,
  transformerStroke,
  transformerLocked,
  transformerLockedStroke,
  transformerAnchorFill,
  transformerBadgeBg,
  transformerBadgeText,
} from '@/lib/canvas/canvas-colors';

interface EditorTransformerProps {
  trRef: React.RefObject<Konva.Transformer | null>;
  selectedIds: string[];
  sortedElements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  stageScale: number;
  isText: boolean;
  /** يقرأ عقدة العنصر الحيّة من خريطة مراجع الطبقة — يُستخدم في ربط المحوّل */
  getKonvaNode: (id: string) => Konva.Node | null;
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
  getKonvaNode,
  onTransformEnd,
  setActiveGuides,
  altPressedRef,
}: EditorTransformerProps) {
  // 🛡️ إعادة تصيير المحوّل بألوان الثيم الجديد (C5 — تدقيق 2026-10-08)
  useCanvasColors();
  const badgeRef = React.useRef<Konva.Group | null>(null);
  const badgeBgRef = React.useRef<Konva.Rect | null>(null);
  const textRef = React.useRef<Konva.Text | null>(null);

  const safeBadgeScale = Number.isFinite(stageScale) && stageScale > 0.0001 ? 1 / stageScale : 1;

  const printSettings = useEditorStore((state) => state.printSettings);
  const dpi = printSettings?.dpi || 300;

  // فحص هل العنصر المحدد مقفل (Locked)
  const isLocked =
    selectedIds.length === 1 && sortedElements.find((e) => e.id === selectedIds[0])?.locked;

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

      const rotStr = normalizedRot > 0 ? ` • ${normalizedRot}°` : '';
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
        const badgeOffset = 32 * safeBadgeScale;
        const targetY =
          vBox.minY - badgeOffset >= 0 ? vBox.minY - badgeOffset : vBox.maxY + 12 * safeBadgeScale;

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

    transformer.on('transformstart dragstart', handleTransformStart);
    transformer.on('transform dragmove', handleTransform);
    transformer.on('transformend dragend', handleTransformEndInternal);

    return () => {
      if (badgeRafId !== 0) cancelAnimationFrame(badgeRafId);
      transformer.off('transformstart dragstart', handleTransformStart);
      transformer.off('transform dragmove', handleTransform);
      transformer.off('transformend dragend', handleTransformEndInternal);
    };
  }, [trRef, canvasWidth, canvasHeight, dpi, stageScale, safeBadgeScale, altPressedRef]);

  // 🛡️ M19: ربط المحوّل يتتبّع مجموعة المعرفات المربوطة لا هوية/طول المصفوفة.
  // العنصر المحدد خارج الكانفا يعيد null من طبقة العرض (يُفكّ تركيب العقدة)،
  // فتصبح العقد المتاحة أصلاً [] أو — لو بقيت عقدة ميتة في خريطة المراجع —
  // عقدة بلا مسرح. مقارنة «الطول + الهوية» كانت تعتبر المصفوفتين الفارغتين
  // متطابقتين (والعقدة الميتة مطابقة لهويتها) فتتخطى الربط ويبقى المحوّل
  // متعلقاً بمجموعة سابقة: مقابض في موقع قديم وتحويلات تُكتب على عقدة ميتة.
  // لذا نُجبر tr.nodes() عند أي اختلاف في المعرفات أو عند تغيّر نسخة المحوّل.
  const attachedIdsRef = React.useRef<Set<string>>(new Set());
  const attachedTrInstanceRef = React.useRef<Konva.Transformer | null>(null);

  React.useEffect(() => {
    const tr = trRef.current;
    if (!tr) {
      attachedIdsRef.current = new Set();
      attachedTrInstanceRef.current = null;
      return;
    }

    // العقد الحيّة فقط: العنصر المحذوف لا يُربط لو بقيت عقدته في الكاش،
    // والعقدة غير الموصولة بمسرح (مقصية أو مفكوكة) لا تُربط كذلك —
    // نفس الحاجز الذي يفرضه Konva داخلياً في Transformer.
    const liveIds = new Set(sortedElements.map((el) => el.id));
    const nodes = selectedIds
      .map((id) => (liveIds.has(id) ? getKonvaNode(id) : null))
      .filter((n): n is Konva.Node => !!n && !!n.getStage());

    const attached = attachedIdsRef.current;
    const sameBinding =
      attachedTrInstanceRef.current === tr &&
      attached.size === nodes.length &&
      nodes.every((n) => attached.has(n.id()));
    // لا تغيير في المجموعة المربوطة — الربط القائم سليم ولا شيء يُلمس
    // (تحديث الصندوق المحيط على تغيّر الهندسة تلزمه Konva ذاتياً).
    if (sameBinding) return;

    attachedIdsRef.current = new Set(nodes.map((n) => n.id()));
    attachedTrInstanceRef.current = tr;
    tr.nodes(nodes);
    tr.forceUpdate();
    tr.getLayer()?.batchDraw();
  }, [selectedIds, sortedElements, getKonvaNode, trRef]);

  // تخصيص مظهر المحابث (Anchors) بنمط Fluent 2 المحترف مع ظلال ناعمة
  const primaryColor = isLocked ? transformerLocked() : transformerPrimary();
  const strokeColor = isLocked ? transformerLockedStroke() : transformerStroke();

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
              ? [
                  'top-left',
                  'top-right',
                  'bottom-left',
                  'bottom-right',
                  'middle-left',
                  'middle-right',
                ]
              : [
                  'top-left',
                  'top-right',
                  'bottom-left',
                  'bottom-right',
                  'middle-left',
                  'middle-right',
                  'top-center',
                  'bottom-center',
                ]
        }
        anchorStyleFunc={(anchor: Konva.Rect) => {
          // 🚀 بلا ظلال على المقابض — كل مقبض مظلل يعني تمريرة ضبابية
          // إضافية في كل إطار تحويل ×8 مقابض. العمق يبقى عبر التعبئة والحدود.
          if (
            anchor.hasName('top-left') ||
            anchor.hasName('top-right') ||
            anchor.hasName('bottom-left') ||
            anchor.hasName('bottom-right')
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
          } else if (anchor.hasName('middle-left') || anchor.hasName('middle-right')) {
            // مقابض الحواف العمودية: كبسولات نحيفة وأنيقة
            anchor.cornerRadius(2.5);
            anchor.width(5);
            anchor.height(16);
            anchor.offsetX(2.5);
            anchor.offsetY(8);
            anchor.fill(transformerAnchorFill());
            anchor.stroke(primaryColor);
            anchor.strokeWidth(1.5);
          } else if (anchor.hasName('top-center') || anchor.hasName('bottom-center')) {
            // مقابض الحواف الأفقية: كبسولات نحيفة وأنيقة
            anchor.cornerRadius(2.5);
            anchor.width(16);
            anchor.height(5);
            anchor.offsetX(8);
            anchor.offsetY(2.5);
            anchor.fill(transformerAnchorFill());
            anchor.stroke(primaryColor);
            anchor.strokeWidth(1.5);
          } else if (
            anchor.hasName('rotater') ||
            (anchor.name && anchor.name().includes('rotater'))
          ) {
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
        name="transformer-badge"
        visible={false}
        scaleX={safeBadgeScale}
        scaleY={safeBadgeScale}
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
