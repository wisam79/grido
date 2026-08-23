import React, { useEffect, useRef } from "react";
import { Group, Rect, Line, Circle } from "react-konva";
import Konva from "konva";
import {
  scannerBeam,
  scannerGlow,
  scannerParticleA,
  scannerParticleB,
  scannerParticleC,
} from "@/lib/canvas/canvas-colors";

interface MagicAiScannerProps {
  targetNodeRef?: React.RefObject<any>;
  x?: number;
  y?: number;
  width: number;
  height: number;
  rotation?: number;
  cornerRadius?: number;
}

export const MagicAiScanner = React.memo(function MagicAiScanner({
  targetNodeRef,
  x = 0,
  y = 0,
  width,
  height,
  rotation = 0,
  cornerRadius = 0,
}: MagicAiScannerProps) {
  const groupRef = useRef<Konva.Group>(null);
  const borderRef = useRef<Konva.Rect>(null);
  const lineRef = useRef<Konva.Line>(null);
  const lineGlowRef = useRef<Konva.Line>(null);
  const circle1Ref = useRef<Konva.Circle>(null);
  const circle2Ref = useRef<Konva.Circle>(null);
  const circle3Ref = useRef<Konva.Circle>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const layer = group.getLayer() || group.getStage()?.getLayers()[0];

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const elapsed = frame.time / 1000;
      
      const progress = (Math.sin(elapsed * 3.5) + 1) / 2;
      const currentScanPos = progress * height;
      const currentPulseOpacity = 0.5 + Math.sin(elapsed * 6) * 0.35;

      if (borderRef.current) borderRef.current.opacity(currentPulseOpacity);
      if (lineRef.current) lineRef.current.points([0, currentScanPos, width, currentScanPos]);
      if (lineGlowRef.current) lineGlowRef.current.points([0, currentScanPos, width, currentScanPos]);
      
      if (circle1Ref.current) circle1Ref.current.y((currentScanPos + 25) % height);
      if (circle2Ref.current) circle2Ref.current.y((currentScanPos - 20 + height) % height);
      if (circle3Ref.current) circle3Ref.current.y((currentScanPos * 1.3) % height);

      // Sync position instantly if target node is moving (dragging) and is a sibling, not the parent
      if (targetNodeRef?.current && group.getParent() !== targetNodeRef.current) {
        group.x(targetNodeRef.current.x());
        group.y(targetNodeRef.current.y());
        group.rotation(targetNodeRef.current.rotation());
      }

    }, layer || undefined);

    anim.start();

    return () => {
      anim.stop();
    };
  }, [height, width]);

  return (
    <Group ref={groupRef} x={x} y={y} rotation={rotation} listening={false}>
      {/* Glowing Pulsing Border Effect - Simplified for max performance */}
      <Rect
        ref={borderRef}
        x={0}
        y={0}
        width={width}
        height={height}
        cornerRadius={cornerRadius}
        stroke={scannerGlow()}
        strokeWidth={3}
        opacity={0.6}
        perfectDrawEnabled={false}
      />
      {/* Scanning Laser Beam */}
      <Line
        ref={lineRef}
        points={[0, 0, width, 0]}
        stroke={scannerBeam()}
        strokeWidth={3}
        perfectDrawEnabled={false}
      />
      {/* Laser glow simulated with a thicker semi-transparent line instead of shadow */}
      <Line
        ref={lineGlowRef}
        points={[0, 0, width, 0]}
        stroke={scannerGlow()}
        strokeWidth={8}
        opacity={0.3}
        perfectDrawEnabled={false}
      />
      {/* Sparkle Particles Floating around */}
      <Circle
        ref={circle1Ref}
        x={width * 0.25}
        y={25}
        radius={2.5}
        fill={scannerParticleA()}
        perfectDrawEnabled={false}
      />
      <Circle
        ref={circle2Ref}
        x={width * 0.75}
        y={height - 20}
        radius={2}
        fill={scannerParticleB()}
        perfectDrawEnabled={false}
      />
      <Circle
        ref={circle3Ref}
        x={width * 0.5}
        y={0}
        radius={2}
        fill={scannerParticleC()}
        perfectDrawEnabled={false}
      />
    </Group>
  );
});
