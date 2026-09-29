import React from 'react';
import { Layer, Group, Rect, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { KonvaCollageImage } from '../elements/collage-image';
import type { CanvasSlot as Slot, CollageTemplate } from '@/lib/store/types';
import { getCollageGeometry, getSlotRect } from '@/lib/canvas/collage-geometry';
import {
  collageCut,
  collageEndCut,
  slotPlaceholderBg,
  slotPlaceholderBorder,
  slotPlaceholderBorderHover,
  slotPlaceholderBadge,
  slotPlaceholderBadgeBorder,
  slotPlaceholderIcon,
  slotPlaceholderIconHover,
} from '@/lib/canvas/canvas-colors';

interface KonvaCollageLayerProps {
  slots: Slot[];
  canvasWidth: number;
  canvasHeight: number;
  collageMargin: number;
  collageGap: number;
  collageRadius: number;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  collageShowCutLines: boolean;
  collageShowEndCutLine?: boolean;
  collageTemplate?: CollageTemplate | null;
  selectedId: string | null;
  handleSlotClick?: (slotId: string) => void;
  handleSlotDblClick?: (slotId: string) => void;
  handleSlotWheel: (
    slot: { id: string; imageSrc?: string; zoom?: number },
    e: KonvaEventObject<WheelEvent>,
  ) => void;
  updateSlot: (id: string, patch: Partial<Slot>) => void;
  pushHistory: () => void;
}

export const KonvaCollageLayer = React.memo(function KonvaCollageLayer({
  slots,
  canvasWidth,
  canvasHeight,
  collageMargin,
  collageGap,
  collageRadius,
  collageStrokeWidth,
  collageStrokeColor,
  collageShowCutLines,
  collageShowEndCutLine = true,
  collageTemplate,
  selectedId,
  handleSlotClick,
  handleSlotDblClick,
  handleSlotWheel,
  updateSlot,
  pushHistory,
}: KonvaCollageLayerProps) {
  const [hoveredSlotId, setHoveredSlotId] = React.useState<string | null>(null);

  // 📐 هندسة الشبكة من مصدر واحد يشاركه الشريط السريع العائم (collage-geometry)
  const geo = getCollageGeometry(
    canvasWidth,
    canvasHeight,
    collageMargin,
    collageGap,
    Boolean(collageTemplate?.physicalLayout),
  );
  const { margin, gap, availW, availH } = geo;

  // ✂️ حساب خطوط الشبكة الممتدة المفردة لمنتصف الفجوة 50% (Single Midpoint Cut Lines)
  const cutLinesData = React.useMemo(() => {
    if (!collageShowCutLines || slots.length === 0) return null;

    const colLefts = new Set<number>();
    const colRights = new Set<number>();
    const rowTops = new Set<number>();
    const rowBottoms = new Set<number>();

    for (const slot of slots) {
      const left = Math.round(margin + slot.x * availW + gap / 2);
      const top = Math.round(margin + slot.y * availH + gap / 2);
      const right = Math.round(left + slot.w * availW - gap);
      const bottom = Math.round(top + slot.h * availH - gap);

      colLefts.add(left);
      colRights.add(right);
      rowTops.add(top);
      rowBottoms.add(bottom);
    }

    const sortedLefts = Array.from(colLefts).sort((a, b) => a - b);
    const sortedRights = Array.from(colRights).sort((a, b) => a - b);
    const sortedTops = Array.from(rowTops).sort((a, b) => a - b);
    const sortedBottoms = Array.from(rowBottoms).sort((a, b) => a - b);

    if (sortedLefts.length === 0 || sortedTops.length === 0) return null;

    // خطوط X المنفردة: اليسار الخارجي، منتصف الفجوة لكل عمودين متجاورين، اليمين الخارجي
    const xCutLines: number[] = [];
    xCutLines.push(Math.round(sortedLefts[0] - gap / 2));
    for (let i = 0; i < sortedRights.length - 1; i++) {
      const midX = Math.round((sortedRights[i] + sortedLefts[i + 1]) / 2);
      xCutLines.push(midX);
    }
    xCutLines.push(Math.round(sortedRights[sortedRights.length - 1] + gap / 2));

    // خطوط Y المنفردة: الأعلى الخارجي، منتصف الفجوة لكل صفين متجاورين، الأسفل الخارجي
    const yCutLines: number[] = [];
    yCutLines.push(Math.round(sortedTops[0] - gap / 2));
    for (let i = 0; i < sortedBottoms.length - 1; i++) {
      const midY = Math.round((sortedBottoms[i] + sortedTops[i + 1]) / 2);
      yCutLines.push(midY);
    }
    const gridBottomY = Math.round(sortedBottoms[sortedBottoms.length - 1] + gap / 2);
    yCutLines.push(gridBottomY);

    const minX = xCutLines[0];
    const maxX = xCutLines[xCutLines.length - 1];
    const minY = yCutLines[0];
    const maxY = yCutLines[yCutLines.length - 1];

    return { xCutLines, yCutLines, minX, maxX, minY, maxY };
  }, [collageShowCutLines, slots, margin, availW, availH, gap]);

  const renderCutLines = () => {
    if (!cutLinesData) return null;
    const { xCutLines, yCutLines, minX, maxX, minY, maxY } = cutLinesData;

    return (
      <Group listening={false}>
        {/* خطوط قص رأسية مفردة ممتدة عبر منتصف الفجوات بالضبط */}
        {xCutLines.map((x, idx) => (
          <Line
            key={`v-cut-${idx}-${x}`}
            points={[x, minY, x, maxY]}
            stroke={collageCut()}
            strokeWidth={1}
            dash={[6, 6]}
          />
        ))}

        {/* خطوط قص أفقية مفردة ممتدة + خط نهاية منطقة الطباعة الكامل بعرض الورقة */}
        {yCutLines.map((y, idx) => {
          const isBottomEnd = idx === yCutLines.length - 1;
          if (isBottomEnd && !collageShowEndCutLine) return null;
          const lineMinX = isBottomEnd ? 0 : minX;
          const lineMaxX = isBottomEnd ? canvasWidth : maxX;

          return (
            <Group key={`h-cut-group-${idx}-${y}`}>
              <Line
                key={`h-cut-${idx}-${y}`}
                points={[lineMinX, y, lineMaxX, y]}
                stroke={isBottomEnd ? collageEndCut() : collageCut()}
                strokeWidth={isBottomEnd ? 1.5 : 1}
                dash={isBottomEnd ? [8, 4] : [6, 6]}
              />
            </Group>
          );
        })}
      </Group>
    );
  };

  return (
    <Layer>
      {renderCutLines()}
      {slots.map((slot) => {
        const radius = collageRadius;
        const borderW = collageStrokeWidth;

        const { left, top, width, height } = getSlotRect(slot, geo);

        const isSelected = selectedId === slot.id;
        const isHovered = hoveredSlotId === slot.id;

        return (
          <Group key={slot.id} id={`slot-${slot.id}`}>
            {/* مجموعة قص الخلية: قص بالحدود الفعلية (مع الانحناءة) حتى لا يتجاوز
                المحتوى المدوّر/المقلوب إلى الخلايا المجاورة — مطابق لنافذة CSS.
                وهي المستوى الوحيد الحامل لمعالجات النقر/اللمس: أحداث Konva تصعد
                من الأبناء (الصورة وحاوية الإفلات) إليها، فتكرار المعالج في الابن
                كان ينفّذ التحديد مرتين لكل نقرة بلا أي فائدة. */}
            <Group
              id={slot.id}
              x={left}
              y={top}
              width={width}
              height={height}
              clipFunc={(ctx: Konva.Context) => {
                const r = Math.min(radius, width / 2, height / 2);
                ctx.beginPath();
                if (r > 0) {
                  ctx.moveTo(r, 0);
                  ctx.arcTo(width, 0, width, height, r);
                  ctx.arcTo(width, height, 0, height, r);
                  ctx.arcTo(0, height, 0, 0, r);
                  ctx.arcTo(0, 0, width, 0, r);
                } else {
                  ctx.rect(0, 0, width, height);
                }
                ctx.closePath();
              }}
              onClick={() => handleSlotClick?.(slot.id)}
              onTouchEnd={() => handleSlotClick?.(slot.id)}
              onDblClick={() => handleSlotDblClick?.(slot.id)}
              onWheel={(e) => handleSlotWheel(slot, e)}
            >
              {slot.bgColor && slot.bgColor !== 'transparent' && (
                <Rect
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  fill={slot.bgColor}
                  listening={false}
                />
              )}
              {slot.imageSrc ? (
                <KonvaCollageImage
                  id={slot.id}
                  imageSrc={slot.imageSrc}
                  width={width}
                  height={height}
                  canvasWidth={canvasWidth}
                  filter={slot.filter}
                  brightness={slot.brightness}
                  contrast={slot.contrast}
                  saturation={slot.saturation}
                  zoom={slot.zoom}
                  dragX={slot.dragX}
                  dragY={slot.dragY}
                  flipX={slot.flipX}
                  flipY={slot.flipY}
                  rotation={slot.rotation}
                  draggable={isSelected}
                  cornerRadius={radius}
                  onUpdateOffsets={(x, y) => {
                    updateSlot(slot.id, { dragX: x, dragY: y });
                  }}
                  onDragEnd={() => {
                    pushHistory();
                  }}
                />
              ) : (
                // حاوية إفلات قياسية (Fluent 2 Dropzone Container):
                // الاسم slot-placeholder يضمن الإخفاء التلقائي عند التصدير والطباعة (withHiddenOverlays)
                <Group
                  name="slot-placeholder"
                  onMouseEnter={(e) => {
                    setHoveredSlotId(slot.id);
                    const stage = e.target.getStage();
                    const cursor = stage?.container().style.cursor;
                    // لا ندهس مؤشر السحب النشط (مسافة/عجلة) بحالة المرور
                    if (stage && cursor !== 'grab' && cursor !== 'grabbing') {
                      stage.container().style.cursor = 'pointer';
                    }
                  }}
                  onMouseLeave={(e) => {
                    setHoveredSlotId((cur) => (cur === slot.id ? null : cur));
                    const stage = e.target.getStage();
                    // تفريغ بدل "default": إدارة المؤشر في use-canvas-viewport
                    // تستخدم "" لتترك الأنماط الأصلية — "default" كان يمسح
                    // مؤشر أداة اليد (grab) أثناء مسك المسافة.
                    if (stage) stage.container().style.cursor = '';
                  }}
                >
                  {/* 1. خلفية الخلية المتباينة بنعومة لتفصلها عن بياض الورقة،
                      وهي المنطقة المسؤولة عن استقبال النقر: بقية عناصر الخلية
                      الفارغة listening={false}، فلو صمتت هذه أيضاً لم يبقَ هدف
                      للفأرة وتتعطل ثلاث وظائف معاً: تحديد الخلية بالنقر، حفظ
                      المؤشر عند المرور، وفتح منتقي الصور بالنقر المزدوج. */}
                  <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill={
                      slot.bgColor && slot.bgColor !== 'transparent'
                        ? 'transparent'
                        : slotPlaceholderBg()
                    }
                    cornerRadius={radius}
                    listening
                  />

                  {/* 2. إطار متقطع واضح المعالم (Dashed Dropzone Border) */}
                  <Rect
                    x={0.75}
                    y={0.75}
                    width={Math.max(0, width - 1.5)}
                    height={Math.max(0, height - 1.5)}
                    stroke={
                      isHovered || isSelected
                        ? slotPlaceholderBorderHover()
                        : slotPlaceholderBorder()
                    }
                    strokeWidth={1.5}
                    dash={[6, 4]}
                    cornerRadius={Math.max(0, radius - 0.75)}
                    listening={false}
                  />

                  {/* 3. شارة مركزية عائمة بأيقونة الزائد عالية التباين */}
                  {(() => {
                    const minDim = Math.min(width, height);
                    if (minDim < 16) return null;

                    const cx = width / 2;
                    const cy = height / 2;
                    const isHoveredOrSelected = isHovered || isSelected;

                    // في الخلايا متناهية الصغر نكتفي بالزائد فقط
                    if (minDim < 36) {
                      const arm = Math.max(4, minDim * 0.2);
                      return (
                        <Group listening={false}>
                          <Line
                            points={[cx - arm, cy, cx + arm, cy]}
                            stroke={
                              isHoveredOrSelected
                                ? slotPlaceholderIconHover()
                                : slotPlaceholderIcon()
                            }
                            strokeWidth={1.5}
                            lineCap="round"
                          />
                          <Line
                            points={[cx, cy - arm, cx, cy + arm]}
                            stroke={
                              isHoveredOrSelected
                                ? slotPlaceholderIconHover()
                                : slotPlaceholderIcon()
                            }
                            strokeWidth={1.5}
                            lineCap="round"
                          />
                        </Group>
                      );
                    }

                    // في الخلايا القياسية: شارة دائرية خفيفة مع أيقونة الزائد
                    const badgeRadius = Math.max(14, Math.min(20, minDim * 0.16));
                    const arm = badgeRadius * 0.44;

                    return (
                      <Group listening={false}>
                        <Circle
                          x={cx}
                          y={cy}
                          radius={badgeRadius}
                          fill={slotPlaceholderBadge()}
                          stroke={
                            isHoveredOrSelected
                              ? slotPlaceholderBorderHover()
                              : slotPlaceholderBadgeBorder()
                          }
                          strokeWidth={1}
                          shadowColor="rgba(0, 0, 0, 0.12)"
                          shadowBlur={4}
                          shadowOffset={{ x: 0, y: 1 }}
                          shadowForStrokeEnabled={false}
                        />
                        <Line
                          points={[cx - arm, cy, cx + arm, cy]}
                          stroke={
                            isHoveredOrSelected ? slotPlaceholderIconHover() : slotPlaceholderIcon()
                          }
                          strokeWidth={2}
                          lineCap="round"
                        />
                        <Line
                          points={[cx, cy - arm, cx, cy + arm]}
                          stroke={
                            isHoveredOrSelected ? slotPlaceholderIconHover() : slotPlaceholderIcon()
                          }
                          strokeWidth={2}
                          lineCap="round"
                        />
                      </Group>
                    );
                  })()}
                </Group>
              )}
            </Group>

            {/* Stroke Border */}
            {borderW > 0 && (
              <Rect
                x={left}
                y={top}
                width={width}
                height={height}
                stroke={collageStrokeColor}
                strokeWidth={borderW}
                cornerRadius={radius}
                listening={false}
              />
            )}

            {/* Selection indicator Ring */}
            {isSelected && (
              <Group listening={false}>
                <Rect
                  x={left - 1.5}
                  y={top - 1.5}
                  width={width + 3}
                  height={height + 3}
                  stroke="#0078d4"
                  strokeWidth={2}
                  cornerRadius={radius + 1.5}
                  shadowColor="#0078d4"
                  shadowBlur={4}
                  shadowOpacity={0.4}
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Layer>
  );
});
