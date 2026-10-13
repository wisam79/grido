import React from 'react';
import { Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { CanvasElement, useEditorStore } from '@/lib/editor-store';
import { SnapGuide } from '@/lib/canvas/snap-utils';
import { scaleElementDecorations } from '@/lib/canvas/scale-decorations';
import { EditorTransformer } from '../elements/editor-transformer';

interface KonvaOverlayLayerProps {
  selectedIds: string[];
  sortedElements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  displayW: number;
  trRef: React.RefObject<Konva.Transformer | null>;
  elementsRefs: React.MutableRefObject<Record<string, Konva.Node>>;
  altPressedRef: React.MutableRefObject<boolean>;
  setActiveGuides: (guides: SnapGuide[]) => void;
  marqueeRectRef: React.RefObject<Konva.Rect | null>;
}

/**
 * 🛠️ طبقة الأدوات والتفاعل العلوية المستقلة (Dedicated Interaction & Tools Overlay Layer).
 *
 * المصدر: توثيق Konva الرسمي للأداء (konvajs.org/docs/performance/All_Performance_Tips.html)
 * فصل المحوّل (Transformer) ومستطيل التحديد بالسحب (Marquee Selection) في طبقة مستقلة
 * يمنع إعادة رسم عناصر التصميم الثقيلة (صور، نصوص، فلاتر) عند سحب التحديد أو التحجيم.
 */
export const KonvaOverlayLayer = React.memo(function KonvaOverlayLayer({
  selectedIds,
  sortedElements,
  canvasWidth,
  canvasHeight,
  displayW,
  trRef,
  elementsRefs,
  altPressedRef,
  setActiveGuides,
  marqueeRectRef,
}: KonvaOverlayLayerProps) {
  const elementsById = React.useMemo(
    () => new Map(sortedElements.map((el) => [el.id, el])),
    [sortedElements],
  );

  const isText =
    selectedIds.length > 0 && selectedIds.every((id) => elementsById.get(id)?.type === 'text');

  // قارئ ثابت الهوية يقرأ العقدة الحيّة من خريطة المراجع
  const getKonvaNodeById = React.useCallback(
    (id: string) => elementsRefs.current[id] ?? null,
    [elementsRefs],
  );

  // 🛡️ سمك شاشة ثابت: العرض داخل Stage مُكبَّر فيتفاوت 1px المنطقي
  // (0.3px شبح عند التصغير، 3px+ عند التكبير) — نفس نمط `/ stageScale`
  // المتبع في konva-canvas (shadowBlur).
  const uiScale = canvasWidth > 0 ? displayW / canvasWidth || 1 : 1;

  const handleTransformEnd = React.useCallback(() => {
    if (!trRef.current) return;
    const nodes = trRef.current.nodes();
    const patches = nodes
      .map((node: Konva.Node) => {
        const id = node.id();
        const el = elementsById.get(id);
        if (!el || el.locked) return null;

        const sx = node.scaleX();
        const sy = node.scaleY();
        const absScaleX = Math.abs(sx);
        const absScaleY = Math.abs(sy);

        const baseW = el.width * canvasWidth;
        const baseH = el.height * canvasHeight;

        const newW = Math.max(10, baseW * absScaleX);
        const newH = Math.max(10, baseH * absScaleY);

        // إعادة مقياس العقدة القياسي إلى 1 لتكون الأبعاد الفعلية هي المرجع،
        // ثم تثبيت الأبعاد على العقدة نفسها
        node.scaleX(1);
        node.scaleY(1);
        if (typeof node.width === 'function') node.width(newW);
        if (el.type !== 'text' && typeof node.height === 'function') node.height(newH);

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
          ...(el.type !== 'text' ? { height: newHeight } : {}),
          rotation: node.rotation(),
          flipX: nextFlipX,
          flipY: nextFlipY,
        };

        if (el.type === 'text') {
          (patch as Partial<Record<string, unknown>>).fontSize = Math.max(
            6,
            Math.round((el.fontSize || 16) * absScaleY),
          );
        }

        // الزخارف (حد/ظل/استدارة) تُقيَّس بنسبة التحجيم نفسها
        Object.assign(patch, scaleElementDecorations(el, absScaleX, absScaleY));

        return { id, patch };
      })
      .filter(Boolean) as { id: string; patch: Partial<CanvasElement> }[];

    useEditorStore.getState().updateElements(patches);
    useEditorStore.getState().pushHistory();

    trRef.current?.nodes(nodes);
    trRef.current?.forceUpdate();
    trRef.current?.getLayer()?.batchDraw();
  }, [canvasHeight, canvasWidth, elementsById, trRef]);

  return (
    <Layer name="overlay-tools-layer">
      {selectedIds.length > 0 && (
        <EditorTransformer
          trRef={trRef}
          selectedIds={selectedIds}
          sortedElements={sortedElements}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          stageScale={displayW / canvasWidth}
          isText={isText}
          getKonvaNode={getKonvaNodeById}
          setActiveGuides={setActiveGuides}
          altPressedRef={altPressedRef}
          onTransformEnd={handleTransformEnd}
        />
      )}
      <Rect
        ref={marqueeRectRef as unknown as React.Ref<Konva.Rect>}
        visible={false}
        listening={false}
        name="marquee-rect"
        fill="rgba(0, 120, 212, 0.12)"
        stroke="#0078d4"
        strokeWidth={1 / uiScale}
        dash={[4 / uiScale, 2 / uiScale]}
        perfectDrawEnabled={false}
      />
    </Layer>
  );
});
