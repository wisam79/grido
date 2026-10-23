import React, { useEffect } from 'react';
import { Transformer as KonvaTransformer, Group, Rect, Text } from 'react-konva';

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
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { getElementPixelVisualBox } from '@/lib/canvas/element-geometry';
import { isCornerAnchor } from '@/lib/canvas/transform-anchors';
import { useEditorStore } from '@/lib/editor-store';

import type { SnapGuide } from '@/lib/canvas/snap-utils';
import type { CanvasElement } from '@/lib/editor-store';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';

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
  setActiveGuides: _setActiveGuides,
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
    selectedIds.length > 0 &&
    selectedIds.every((id) => sortedElements.find((e) => e.id === id)?.locked);

  useEffect(() => {
    const transformer = trRef.current;
    if (!transformer) return;

    const updateInfo = () => {
      const nodes = transformer.nodes();
      if (nodes.length === 0) return;

      let vBox: { minX: number; minY: number; maxX: number; maxY: number; centerX: number };
      let textContent: string;

      if (nodes.length === 1) {
        const node = nodes[0];
        // قراءة مباشرة من الـ node — هو أصلاً في الفضاء المنطقي للكانفس
        // القيم المطلقة: العناصر المعكوسة تحتفظ بمقياس سالب دائم (إصلاح Bug#13)
        const nodeW = Math.abs(node.width() * node.scaleX());
        const nodeH = Math.abs(node.height() * node.scaleY());
        const nodeX = node.x();
        const nodeY = node.y();

        const rotation = Math.round(node.rotation() % 360);
        const normalizedRot = rotation < 0 ? rotation + 360 : rotation;

        vBox = getElementPixelVisualBox(nodeX, nodeY, nodeW, nodeH, rotation);

        // حساب الأبعاد بالملم (mm) للطباعة الاحترافية
        const wMM = Math.round((nodeW / dpi) * 25.4);
        const hMM = Math.round((nodeH / dpi) * 25.4);

        const rotStr = normalizedRot > 0 ? ` • ${normalizedRot}°` : '';
        textContent = `${wMM} × ${hMM} mm${rotStr}`;
      } else {
        // تحديد متعدد: حساب الصندوق الإجمالي للمجموعة المحددة بالكامل
        const rect = transformer.getClientRect();
        vBox = {
          minX: rect.x,
          minY: rect.y,
          maxX: rect.x + rect.width,
          maxY: rect.y + rect.height,
          centerX: rect.x + rect.width / 2,
        };
        const wMM = Math.round((rect.width / dpi) * 25.4);
        const hMM = Math.round((rect.height / dpi) * 25.4);
        textContent = `${wMM} × ${hMM} mm (${nodes.length})`;
      }

      if (badgeRef.current && textRef.current && badgeBgRef.current) {
        // حساب العرض الرشيق للنص مع مسافة حشو 16px
        const badgeW = Math.max(76, textContent.length * 6.2 + 16);

        if (textRef.current.text() !== textContent) {
          textRef.current.text(textContent);
          textRef.current.width(badgeW);
          textRef.current.x(-badgeW / 2);
          badgeBgRef.current.width(badgeW);
          badgeBgRef.current.x(-badgeW / 2);
        }

        // تموضع ذكي متكيف: إذا كان العنصر في قمة الكانفس، تنقلب الشارة لأسفله
        const badgeOffset = 20 * safeBadgeScale;
        const targetY =
          vBox.minY - badgeOffset >= 0 ? vBox.minY - badgeOffset : vBox.maxY + 10 * safeBadgeScale;

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
      useCanvasInteraction.getState().setIsTransforming(true);
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
      // 🚀 إعادة رسم طبقة العقد المحولة أثناء التحجيم عبر الطبقات المنفصلة
      const nodes = transformer.nodes();
      for (const node of nodes) {
        node.getLayer()?.batchDraw();
      }
      scheduleBadgeUpdate();
    };

    const handleTransformEndInternal = () => {
      useCanvasInteraction.getState().setIsTransforming(false);
      if (badgeRafId !== 0) {
        cancelAnimationFrame(badgeRafId);
        badgeRafId = 0;
      }
      updateInfo();
      if (badgeRef.current) {
        badgeRef.current.visible(false);
        badgeRef.current.getLayer()?.batchDraw();
      }
      const nodes = transformer.nodes();
      for (const node of nodes) {
        node.getLayer()?.batchDraw();
      }
    };

    // 🎯 الشارة تظهر حصراً أثناء التحجيم والتدوير (transform) وليس أثناء التحريك/السحب (drag)
    transformer.on('transformstart', handleTransformStart);
    transformer.on('transform', handleTransform);
    transformer.on('transformend', handleTransformEndInternal);

    return () => {
      useCanvasInteraction.getState().setIsTransforming(false);
      if (badgeRafId !== 0) cancelAnimationFrame(badgeRafId);
      transformer.off('transformstart', handleTransformStart);
      transformer.off('transform', handleTransform);
      transformer.off('transformend', handleTransformEndInternal);
    };
  }, [trRef, canvasWidth, canvasHeight, dpi, stageScale, safeBadgeScale, altPressedRef]);

  // 🛡️ المصدر الموحد لإدارة عقد المحوّل في Konva
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
    // والعقدة غير الموصولة بمسرح (مقصية أو مفكوكة) لا تُربط كذلك
    const liveElementsMap = new Map(sortedElements.map((el) => [el.id, el]));

    // إذا كانت كل العناصر المحددة مقفلة، نربطها لعرض مربع القفل المنقط
    // أما في التحديد المختلط، تُستبعد العناصر المقفلة من المحوّل لمنع تحويلها
    const allLocked =
      selectedIds.length > 0 && selectedIds.every((id) => liveElementsMap.get(id)?.locked);

    const validIds = allLocked
      ? selectedIds
      : selectedIds.filter((id) => !liveElementsMap.get(id)?.locked);

    const nodes = validIds
      .map((id) => getKonvaNode(id))
      .filter((n): n is Konva.Node => !!n && !!n.getStage());

    const attached = attachedIdsRef.current;
    const sameBinding =
      attachedTrInstanceRef.current === tr &&
      attached.size === nodes.length &&
      nodes.every((n) => attached.has(n.id()));

    // عند ثبات الهوية: إذا تغيّرت هندسة العنصر من المتجر (لوحة الخصائص / الأسهم)،
    // حدّث الصندوق المحيط تحت حاجز الإيماءة
    if (sameBinding) {
      if (!tr.isTransforming() && !tr.isDragging()) {
        tr.forceUpdate();
        tr.getLayer()?.batchDraw();
      }
      return;
    }

    attachedIdsRef.current = new Set(nodes.map((n) => n.id()));
    attachedTrInstanceRef.current = tr;
    tr.nodes(nodes);
    if (!tr.isTransforming() && !tr.isDragging()) {
      tr.forceUpdate();
    }
    tr.getLayer()?.batchDraw();
  }, [selectedIds, sortedElements, getKonvaNode, trRef]);

  // تخصيص مظهر المحابث (Anchors) بنمط Fluent 2 المحترف مع ظلال ناعمة
  const primaryColor = isLocked ? transformerLocked() : transformerPrimary();
  const _strokeColor = isLocked ? transformerLockedStroke() : transformerStroke();

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
        // الأركان تُحجّم تناسبياً — وللنص تُترجم النسبة إلى fontSize في نهاية
        // التحويل. Konva يطبّق keepRatio على الزوايا وحدها؛ منتصفات الحواف
        // تبقى محوراً واحداً (العرض للنص) فلا تتأثر بهذا الخيار.
        keepRatio
        shiftBehavior="inverted"
        ignoreStroke={true}
        rotateLineVisible={true}
        rotateAnchorOffset={26}
        rotationSnapTolerance={5}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        enabledAnchors={
          isLocked
            ? []
            : // النص: الزوايا الأربعة تُحجّم الكتلة تناسبياً (حجم الخط + العرض)،
              // ومنتصفات الحواف تضبط العرض فقط — ارتفاع النص مشتق من المحتوى.
              [
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
          // حد أدنى للعرض في كل الحالات؛ ارتفاع النص مشتق من المحتوى فقد يكون
          // أصغر من 10px (سطر بحجم 8px) دون أن يكون ذلك تحجيماً غير صالح.
          if (Math.abs(newBox.width) < 10) return oldBox;
          if (isText) {
            // زاوية السحب: تحجيم متناسب لكل الكتلة. نسمح للارتفاع بالتغيّر أثناء
            // الإيماءة (العقدة تُعرض بمقياسها) ثم يُترجم المقياس إلى fontSize في
            // نهاية التحويل؛ رفض تغيّر الارتفاع هنا كان يجعل تحجيم الخط مستحيلاً.
            if (isCornerAnchor(trRef.current?.getActiveAnchor?.())) {
              if (Math.abs(newBox.height) < 10) return oldBox;
              return newBox;
            }
            // منتصفات الحواف: العرض فقط؛ الارتفاع يتبع المحتوى دائماً.
            // تثبيت الارتفاع وحده لا يكفي: مقابض top-* تحرّك الحافة العليا فيُترجم
            // الصندوق كاملاً رأسياً (انزياح واضح للنص) رغم ثبات الارتفاع.
            // الحل: إسقاط إزاحة أصل الصندوق على محور x المحلي — إزالة المكوّن
            // العمودي المحلي فقط — فتبقى الحافة العليا على خطها الأصلي. الإسقاط
            // يجري في فضاء الصندوق المحلي لذا يبقى صحيحاً مع تدوير العنصر.
            if (!Number.isFinite(oldBox.x) || !Number.isFinite(oldBox.y)) return newBox;
            const cos = Math.cos(newBox.rotation);
            const sin = Math.sin(newBox.rotation);
            const dx = newBox.x - oldBox.x;
            const dy = newBox.y - oldBox.y;
            const alongWidth = dx * cos + dy * sin;
            return {
              ...newBox,
              x: oldBox.x + alongWidth * cos,
              y: oldBox.y + alongWidth * sin,
              height: oldBox.height,
            };
          }
          if (Math.abs(newBox.height) < 10) return oldBox;
          return newBox;
        }}
        onTransformEnd={onTransformEnd}
      />

      {/* شريط الأبعاد والزاوية الحية الرشيق والخفيف بنمط Fluent Micro Acrylic */}
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
          x={-42}
          y={0}
          width={84}
          height={18}
          fill={transformerBadgeBg()}
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth={0.75}
          cornerRadius={5}
          shadowColor="rgba(0, 0, 0, 0.2)"
          shadowBlur={4}
          shadowOffset={{ x: 0, y: 1 }}
          shadowOpacity={0.35}
          perfectDrawEnabled={false}
        />
        <Text
          ref={textRef}
          x={-42}
          y={3.5}
          width={84}
          text=""
          fontSize={9.5}
          fontFamily="Inter, Cairo, system-ui, sans-serif"
          fontStyle="normal"
          fill={transformerBadgeText()}
          align="center"
          perfectDrawEnabled={false}
        />
      </Group>
    </React.Fragment>
  );
});
