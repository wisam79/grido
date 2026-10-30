import React from 'react';
import { Layer, Group, Rect, Line, Circle } from 'react-konva';

import {
  useCanvasColors,
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
import {
  getAvailableAdjacentSlotDirections,
  getCollageGeometry,
  getSlotRect,
  isBakedCollageLayout,
  type AdjacentSlotDirection,
} from '@/lib/canvas/collage-geometry';
import { buildMidpointCutLines, type AxisInterval } from '@/lib/print/cut-lines-utils';

import { KonvaCollageImage } from '../elements/collage-image';

import type { CanvasSlot as Slot, CollageTemplate } from '@/lib/store/types';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';

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
  selectedIds?: string[];
  /** مقياس العرض للسمك الثابت على الشاشة (اختياري — 1 افتراضياً بلا تغيير) */
  stageScale?: number;
  handleSlotClick?: (slotId: string, additive: boolean) => void;
  handleSlotDblClick?: (slotId: string) => void;
  handleSlotWheel: (
    slot: { id: string; imageSrc?: string; zoom?: number },
    e: KonvaEventObject<WheelEvent>,
  ) => void;
  updateSlot: (id: string, patch: Partial<Slot>) => void;
  pushHistory: () => void;
  onAddAdjacentSlot?: (slotId: string, direction: AdjacentSlotDirection) => void;
}

interface CollageEmptySlotPlaceholderProps {
  width: number;
  height: number;
  radius: number;
  bgColor?: string;
  isSelected: boolean;
}

// 📦 مكوّن حاوية الإفلات القياسية المعزول (Fluent 2 Dropzone Container):
// عزل حالة المرور (isHovered) داخلياً يمنع إعادة تصيير طبقة الكولاج وبقية الخلايا عند دخول/خروج الفأرة
const CollageEmptySlotPlaceholder = React.memo(function CollageEmptySlotPlaceholder({
  width,
  height,
  radius,
  bgColor,
  isSelected,
}: CollageEmptySlotPlaceholderProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Group
      name="slot-placeholder"
      onMouseEnter={(e) => {
        setIsHovered(true);
        const stage = e.target.getStage();
        const cursor = stage?.container().style.cursor;
        // لا ندهس مؤشر السحب النشط (مسافة/عجلة) بحالة المرور
        if (stage && cursor !== 'grab' && cursor !== 'grabbing') {
          stage.container().style.cursor = 'pointer';
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        const stage = e.target.getStage();
        // تفريغ بدل "default": إدارة المؤشر في use-canvas-viewport
        // تستخدم "" لتترك الأنماط الأصلية — "default" كان يمسح
        // مؤشر أداة اليد (grab) أثناء مسك المسافة.
        if (stage) stage.container().style.cursor = '';
      }}
    >
      {/* 1. خلفية الخلية المتباينة بنعومة لتفصلها عن بياض الورقة */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={bgColor && bgColor !== 'transparent' ? 'transparent' : slotPlaceholderBg()}
        cornerRadius={radius}
        listening
      />

      {/* 2. إطار متقطع واضح المعالم (Dashed Dropzone Border) */}
      <Rect
        x={0.75}
        y={0.75}
        width={Math.max(0, width - 1.5)}
        height={Math.max(0, height - 1.5)}
        stroke={isHovered || isSelected ? slotPlaceholderBorderHover() : slotPlaceholderBorder()}
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
                stroke={isHoveredOrSelected ? slotPlaceholderIconHover() : slotPlaceholderIcon()}
                strokeWidth={1.5}
                lineCap="round"
              />
              <Line
                points={[cx, cy - arm, cx, cy + arm]}
                stroke={isHoveredOrSelected ? slotPlaceholderIconHover() : slotPlaceholderIcon()}
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
                isHoveredOrSelected ? slotPlaceholderBorderHover() : slotPlaceholderBadgeBorder()
              }
              strokeWidth={1}
              shadowColor="rgba(0, 0, 0, 0.12)"
              shadowBlur={4}
              shadowOffset={{ x: 0, y: 1 }}
              shadowForStrokeEnabled={false}
            />
            <Line
              points={[cx - arm, cy, cx + arm, cy]}
              stroke={isHoveredOrSelected ? slotPlaceholderIconHover() : slotPlaceholderIcon()}
              strokeWidth={2}
              lineCap="round"
            />
            <Line
              points={[cx, cy - arm, cx, cy + arm]}
              stroke={isHoveredOrSelected ? slotPlaceholderIconHover() : slotPlaceholderIcon()}
              strokeWidth={2}
              lineCap="round"
            />
          </Group>
        );
      })()}
    </Group>
  );
});

interface CollageSlotAddHandleProps {
  x: number;
  y: number;
  uiScale: number;
  direction: AdjacentSlotDirection;
  onAdd: (direction: AdjacentSlotDirection) => void;
}

// ➕ زر إضافة خلية مجاورة على حافة الخلية المحددة (Fluent 2 Action Badge):
// معزول بحالة المرور داخلياً حتى لا يعيد تصيير الطبقة عند دخول/خروج المؤشر.
const CollageSlotAddHandle = React.memo(function CollageSlotAddHandle({
  x,
  y,
  uiScale,
  direction,
  onAdd,
}: CollageSlotAddHandleProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const radius = (isHovered ? 11.5 : 10.5) / uiScale;
  const hitRadius = 15 / uiScale;
  const arm = 4.25 / uiScale;
  const strokeW = 1.75 / uiScale;

  return (
    <Group
      name={`slot-add-handle slot-add-handle-${direction}`}
      x={x}
      y={y}
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onAdd(direction);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onAdd(direction);
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        const stage = e.target.getStage();
        const cursor = stage?.container().style.cursor;
        if (stage && cursor !== 'grab' && cursor !== 'grabbing') {
          stage.container().style.cursor = 'pointer';
        }
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = '';
      }}
    >
      {/* هدف نقر موسع غير مرئي لسهولة الالتقاط بالماوس واللمس */}
      <Circle x={0} y={0} radius={hitRadius} fill="rgba(0,0,0,0.001)" />
      <Circle
        x={0}
        y={0}
        radius={radius}
        fill={isHovered ? '#0078d4' : slotPlaceholderBadge()}
        stroke="#0078d4"
        strokeWidth={1.5 / uiScale}
        shadowColor="rgba(0, 0, 0, 0.18)"
        shadowBlur={5 / uiScale}
        shadowOffset={{ x: 0, y: 1 / uiScale }}
        shadowForStrokeEnabled={false}
        listening={false}
      />
      <Line
        points={[-arm, 0, arm, 0]}
        stroke={isHovered ? '#ffffff' : '#0078d4'}
        strokeWidth={strokeW}
        lineCap="round"
        listening={false}
      />
      <Line
        points={[0, -arm, 0, arm]}
        stroke={isHovered ? '#ffffff' : '#0078d4'}
        strokeWidth={strokeW}
        lineCap="round"
        listening={false}
      />
    </Group>
  );
});

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
  selectedIds = selectedId ? [selectedId] : [],
  stageScale = 1,
  handleSlotClick,
  handleSlotDblClick,
  handleSlotWheel,
  updateSlot,
  pushHistory,
  onAddAdjacentSlot,
}: KonvaCollageLayerProps) {
  // 🛡️ سمك شاشة ثابت لحلقة التحديد (يطابق marquee طبقة single) — القيمة
  // الافتراضية 1 تُبقي أي مستدعٍ قديم بلا تغيير سلوكي.
  const uiScale = stageScale > 0 ? stageScale : 1;
  // 🛡️ إعادة تصيير طبقة الكولاج بألوان الثيم الجديد (C5 — تدقيق 2026-10-08)
  useCanvasColors();

  // 📐 هندسة الشبكة من مصدر واحد يشاركه الشريط السريع العائم (collage-geometry)
  const geo = getCollageGeometry(
    canvasWidth,
    canvasHeight,
    collageMargin,
    collageGap,
    isBakedCollageLayout(collageTemplate),
  );
  const { margin, gap, availW, availH } = geo;

  // ✂️ حساب خطوط الشبكة الممتدة المفردة لمنتصف الفجوة 50% (Single Midpoint Cut Lines)
  // 📐 الرياضيات من المصدر المشترك الوحيد (buildMidpointCutLines) — نفس الذي
  // تستخدمه معاينة الطباعة ومسار Go، بانحياز البكسل بدل المليمتر هنا. أي
  // تعديد سابق للتقاصد كان يقصّ الخانات في التخطيطات المتراكبة (P1).
  const cutLinesData = React.useMemo(() => {
    if (!collageShowCutLines || slots.length === 0) return null;

    // 🛡️ كائن هندسة محلي داخل الـ memo: geo يُبنى جديداً في كل render، ومروره
    // كـ dependency يُبطل الذاكرة المؤقتة كل إطار (الثوابت الأربعة كافية ومستقرة).
    const rectGeo = { margin, gap, availW, availH };
    const xIntervals: AxisInterval[] = [];
    const yIntervals: AxisInterval[] = [];

    for (const slot of slots) {
      // الأبعاد غير الصالحة (0 أو NaN) تُستبعد — والمستطيل من getSlotRect
      // وهو مصدر هندسة الخلية الوحيد (رسم + التقاط موضع + خطوط القص).
      if (!(slot.w > 0 && slot.h > 0)) continue;
      const rect = getSlotRect(slot, rectGeo);
      xIntervals.push({ start: rect.left, end: rect.left + rect.width });
      yIntervals.push({ start: rect.top, end: rect.top + rect.height });
    }

    return buildMidpointCutLines({
      xIntervals,
      yIntervals,
      gapX: gap,
      gapY: gap,
      paperWidth: canvasWidth,
      paperHeight: canvasHeight,
    });
  }, [collageShowCutLines, slots, margin, availW, availH, gap, canvasWidth, canvasHeight]);

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
    <Layer
      name="collage-layer"
      clipX={0}
      clipY={0}
      clipWidth={canvasWidth}
      clipHeight={canvasHeight}
    >
      {renderCutLines()}
      {slots.map((slot) => {
        const radius = collageRadius;
        const borderW = collageStrokeWidth;

        const { left, top, width, height } = getSlotRect(slot, geo);

        const isSelected = selectedIds.includes(slot.id);
        const isPrimary = selectedId === slot.id;

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
              onClick={(event) =>
                handleSlotClick?.(
                  slot.id,
                  event.evt.ctrlKey || event.evt.metaKey || event.evt.shiftKey,
                )
              }
              onTouchEnd={() => handleSlotClick?.(slot.id, false)}
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
                  draggable={isPrimary}
                  cornerRadius={radius}
                  onUpdateOffsets={(x, y) => {
                    updateSlot(slot.id, { dragX: x, dragY: y });
                  }}
                  onDragEnd={() => {
                    pushHistory();
                  }}
                />
              ) : (
                <CollageEmptySlotPlaceholder
                  width={width}
                  height={height}
                  radius={radius}
                  bgColor={slot.bgColor}
                  isSelected={isSelected}
                />
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
                  stroke={isPrimary ? '#0078d4' : '#60a5fa'}
                  strokeWidth={(isPrimary ? 2 : 1.25) / uiScale}
                  dash={isPrimary ? undefined : [4 / uiScale, 3 / uiScale]}
                  cornerRadius={radius + 1.5}
                  shadowColor="#0078d4"
                  shadowBlur={4 / uiScale}
                  shadowOpacity={0.4}
                />
              </Group>
            )}
          </Group>
        );
      })}
      {onAddAdjacentSlot &&
        selectedId &&
        selectedIds.length <= 1 &&
        (() => {
          const primarySlot = slots.find((s) => s.id === selectedId);
          if (!primarySlot) return null;
          const hasPhysicalLayout = isBakedCollageLayout(collageTemplate);
          const availableDirs = getAvailableAdjacentSlotDirections(
            primarySlot,
            slots,
            geo,
            collageGap,
            hasPhysicalLayout,
          );
          if (availableDirs.length === 0) return null;

          const { left, top, width, height } = getSlotRect(primarySlot, geo);
          const offset = 14 / uiScale;
          const safePad = 13 / uiScale;
          const clampX = (val: number) =>
            Math.max(safePad, Math.min(Math.max(safePad, canvasWidth - safePad), val));
          const clampY = (val: number) =>
            Math.max(safePad, Math.min(Math.max(safePad, canvasHeight - safePad), val));

          return (
            <Group name="slot-add-handles">
              {availableDirs.map((dir) => {
                let hx = left + width / 2;
                let hy = top + height / 2;
                if (dir === 'top') hy = top - offset;
                else if (dir === 'bottom') hy = top + height + offset;
                else if (dir === 'left') hx = left - offset;
                else if (dir === 'right') hx = left + width + offset;

                return (
                  <CollageSlotAddHandle
                    key={dir}
                    x={clampX(hx)}
                    y={clampY(hy)}
                    uiScale={uiScale}
                    direction={dir}
                    onAdd={(direction) => onAddAdjacentSlot(primarySlot.id, direction)}
                  />
                );
              })}
            </Group>
          );
        })()}
    </Layer>
  );
});
