import React from "react";
import { Layer, Group, Rect, Text } from "react-konva";
import { KonvaCollageImage } from "../elements/collage-image";

interface Slot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageSrc?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  zoom?: number;
  dragX?: number;
  dragY?: number;
}

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
  collageTemplate?: any;
  selectedId: string | null;
  handleSlotClick?: (slotId: string) => void;
  handleSlotDblClick?: (slotId: string) => void;
  handleSlotWheel: (slot: { id: string; imageSrc?: string; zoom?: number }, e: any) => void;
  updateSlot: (id: string, patch: any) => void;
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
  collageTemplate,
  selectedId,
  handleSlotClick,
  handleSlotDblClick,
  handleSlotWheel,
  updateSlot,
  pushHistory,
}: KonvaCollageLayerProps) {
  return (
    <Layer>
      {slots.map((slot) => {
        const hasPhysical = collageTemplate?.physicalLayout;
        const margin = hasPhysical ? 0 : collageMargin;
        const gap = hasPhysical ? 0 : collageGap;
        const radius = collageRadius;
        const borderW = collageStrokeWidth;

        const availW = canvasWidth - 2 * margin;
        const availH = canvasHeight - 2 * margin;

        const left = margin + slot.x * availW + gap / 2;
        const top = margin + slot.y * availH + gap / 2;
        const width = slot.w * availW - gap;
        const height = slot.h * availH - gap;

        const isSelected = selectedId === slot.id;

        return (
          <Group key={slot.id} id={`slot-${slot.id}`}>
            {/* Cut Lines (dashed background guide) */}
            {collageShowCutLines && hasPhysical && (
              <Rect
                x={left}
                y={top}
                width={width}
                height={height}
                stroke="#ff0000"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            )}

            {/* Slot rendering group */}
            <Group
              id={slot.id}
              x={left}
              y={top}
              width={width}
              height={height}
              onClick={() => handleSlotClick?.(slot.id)}
              onTouchEnd={() => handleSlotClick?.(slot.id)}
              onDblClick={() => handleSlotDblClick?.(slot.id)}
              onWheel={(e) => handleSlotWheel(slot, e)}
            >
              {slot.imageSrc ? (
                <KonvaCollageImage
                  id={slot.id}
                  imageSrc={slot.imageSrc}
                  width={width}
                  height={height}
                  filter={slot.filter}
                  brightness={slot.brightness}
                  contrast={slot.contrast}
                  saturation={slot.saturation}
                  zoom={slot.zoom}
                  dragX={slot.dragX}
                  dragY={slot.dragY}
                  draggable={isSelected}
                  cornerRadius={radius}
                  onUpdateOffsets={(x, y) => {
                    updateSlot(slot.id, { dragX: x, dragY: y });
                  }}
                  onDragEnd={() => {
                    pushHistory();
                  }}
                  onClick={() => handleSlotClick?.(slot.id)}
                />
              ) : (
                // Placeholder background & text
                <Group>
                  <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill="#f3f4f6"
                    cornerRadius={radius}
                    onClick={() => handleSlotClick?.(slot.id)}
                  />
                  <Text
                    text="+"
                    fontSize={32}
                    fill="#9ca3af"
                    x={0}
                    y={height / 2 - 25}
                    width={width}
                    align="center"
                    listening={false}
                  />
                  <Text
                    text="انقر للإضافة"
                    fontSize={12}
                    fill="#9ca3af"
                    fontFamily="Cairo, sans-serif"
                    x={0}
                    y={height / 2 + 10}
                    width={width}
                    align="center"
                    listening={false}
                  />
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
              <Rect
                x={left - 1}
                y={top - 1}
                width={width + 2}
                height={height + 2}
                stroke="#3b82f6"
                strokeWidth={2}
                cornerRadius={radius + 1}
                listening={false}
              />
            )}
          </Group>
        );
      })}
    </Layer>
  );
});
