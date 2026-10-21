import React from 'react';
import { Layer, Rect } from 'react-konva';

import { scaleElementDecorations } from '@/lib/canvas/scale-decorations';
import { useEditorStore } from '@/lib/editor-store';

import { EditorTransformer } from '../elements/editor-transformer';

import type { SnapGuide } from '@/lib/canvas/snap-utils';
import type { CanvasElement } from '@/lib/editor-store';
import type Konva from 'konva';

/**
 * 🎚️ تطبيع الدوران لنطاق ‎[-180, 180) — نفس اصطلاح Konva الداخلي
 * (`Util._getRotation`). ضروري عند تصحيح قلب المحوّل لأن الانعكاس يُخزَّن
 * عند Konva كدوران ±180° ويجب إرجاعه إلى زاويته الأصلية قبل الحفظ.
 */
function normalizeRotation180(deg: number): number {
  let r = deg % 360;
  if (r >= 180) r -= 360;
  if (r < -180) r += 360;
  return r;
}

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
        const originX = node.x();
        const originY = node.y();

        // 🪞 كشف الانعكاس: `Transform.decompose()` (Util.js) يُخرج **دائماً**
        // `scaleX >= 0` ويصبّ أي معامل سالب في `scaleY` مع إزاحة الدوران 180°،
        // لذلك كان شرط `sx < 0` أعلاه كوداً ميتاً: كان قلب الأفق يُخزَّن قلباً
        // رأسياً مع دوران ≈180°. العلامة الحقيقية للانعكاس هي `sy < 0`.
        const reflected = sy < 0;

        let nextRotation = node.rotation();
        let rawX = originX / canvasWidth;
        let rawY = originY / canvasHeight;
        let nextFlipX = el.flipX ?? false;
        const nextFlipY = el.flipY ?? false;

        if (reflected) {
          // 🔧 توحيد الانعكاس قبل الحفظ: العارضون (صورة/نص/شكل — image-node.tsx
          // 236-242, text-node.tsx 213-222, shape-node.tsx 305-315) يقلبون حول
          // **مركز** الصندوق (`offsetX/offsetY = w/2,h/2` مع `scale=-1`)، بينما
          // يعكس Konva حول نقطة أصل العقدة (والزاوية المخزَّنة مساوية للأصلية
          // +180°). نحوّله هنا إلى الصيغة
          // التي يفهمها العارضون: قلب أفقي (flipX) + تصغير الدوران 180° مع
          // تعويض موضع الأصل حتى يبقى الصندوق المرسوم مطابقاً للإيماءة.
          //
          // الفحص الرقمي (كانفاس 1000px، عنصر (100,200) مقاس 60×40، دوران 0):
          //   قلب أفقي بحت على Konva → scaleX=1, scaleY=-1, rotation=180°,
          //   x=220, y=200 فصندوق الإيماءة = [160,220]×[200,240] والمحتوى
          //   (u,v) → (220−u, 200+v) (مرآة أفقية حقيقية).
          //   المسار القديم: x=0.22, y=0.2, rot=180, flipY=true → العارض يقلب
          //   حول المركز فيرسم (220−u, 160+v): قفزة بمقدار 40 = الارتفاع.
          //   المسار الجديد: x=(220+60·cos180°)/1000=0.16, y=0.2, rot=180−180=0,
          //   flipX=true, flipY=false → (160+(60−u), 200+v) = (220−u, 200+v):
          //   نفس الصندوق ونفس القلب تماماً، بلا أي قفزة (والدوران يعود 0).
          const rad = (node.rotation() * Math.PI) / 180;
          rawX = (originX + newW * Math.cos(rad)) / canvasWidth;
          rawY = (originY + newW * Math.sin(rad)) / canvasHeight;
          nextRotation = normalizeRotation180(node.rotation() - 180);
          nextFlipX = !nextFlipX;
        }

        const patch: Partial<CanvasElement> = {
          x: rawX,
          y: rawY,
          width: newWidth,
          ...(el.type !== 'text' ? { height: newHeight } : {}),
          rotation: nextRotation,
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
