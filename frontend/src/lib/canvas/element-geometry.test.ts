import { describe, it, expect } from 'vitest';
import {
  getElementPixelVisualBox,
  getElementVisualBox,
  rotateElementAroundCenter,
} from './element-geometry';

describe('element-geometry', () => {
  describe('getElementPixelVisualBox', () => {
    it('computes unrotated box correctly', () => {
      const box = getElementPixelVisualBox(100, 200, 300, 400, 0);
      expect(box.minX).toBe(100);
      expect(box.maxX).toBe(400);
      expect(box.minY).toBe(200);
      expect(box.maxY).toBe(600);
      expect(box.width).toBe(300);
      expect(box.height).toBe(400);
      expect(box.centerX).toBe(250);
      expect(box.centerY).toBe(400);
      expect(box.offsetX).toBe(0);
      expect(box.offsetY).toBe(0);
    });

    it('computes 180° rotated box correctly', () => {
      // Unrotated: origin=(100, 200), w=300, h=400 -> center=(250, 400)
      // When rotated 180° around (0,0), if node is at (400, 600):
      // The box extends backwards to (400 - 300 = 100, 600 - 400 = 200)
      const box = getElementPixelVisualBox(400, 600, 300, 400, 180);
      expect(box.minX).toBeCloseTo(100, 4);
      expect(box.maxX).toBeCloseTo(400, 4);
      expect(box.minY).toBeCloseTo(200, 4);
      expect(box.maxY).toBeCloseTo(600, 4);
      expect(box.width).toBeCloseTo(300, 4);
      expect(box.height).toBeCloseTo(400, 4);
      expect(box.centerX).toBeCloseTo(250, 4);
      expect(box.centerY).toBeCloseTo(400, 4);
      expect(box.offsetX).toBeCloseTo(-300, 4);
      expect(box.offsetY).toBeCloseTo(-400, 4);
    });

    it('computes 90° rotated box correctly (width and height swap)', () => {
      // w=300, h=400. Rotated 90° clockwise around node origin.
      // Top-left is at (nodeX - h, nodeY), visual width is h, visual height is w
      const box = getElementPixelVisualBox(500, 200, 300, 400, 90);
      expect(box.minX).toBeCloseTo(100, 4);
      expect(box.maxX).toBeCloseTo(500, 4);
      expect(box.minY).toBeCloseTo(200, 4);
      expect(box.maxY).toBeCloseTo(500, 4);
      expect(box.width).toBeCloseTo(400, 4);
      expect(box.height).toBeCloseTo(300, 4);
      expect(box.centerX).toBeCloseTo(300, 4);
      expect(box.centerY).toBeCloseTo(350, 4);
      expect(box.offsetX).toBeCloseTo(-400, 4);
      expect(box.offsetY).toBeCloseTo(0, 4);
    });
  });

  describe('rotateElementAroundCenter', () => {
    it('keeps center fixed when rotating from 0° to 90°, 180°, and 270°', () => {
      const canvasWidth = 1000;
      const canvasHeight = 1000;
      const el = {
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.4,
        rotation: 0,
      };

      // Initial visual box at 0°: center should be at (0.1 + 0.15 = 0.25, 0.2 + 0.2 = 0.4)
      const initialBox = getElementVisualBox(el, canvasWidth, canvasHeight);
      expect(initialBox.centerX).toBeCloseTo(0.25, 4);
      expect(initialBox.centerY).toBeCloseTo(0.4, 4);

      // Rotate to 90°
      const pos90 = rotateElementAroundCenter(el, 90, canvasWidth, canvasHeight);
      const box90 = getElementVisualBox(
        { ...el, ...pos90, rotation: 90 },
        canvasWidth,
        canvasHeight,
      );
      expect(box90.centerX).toBeCloseTo(initialBox.centerX, 4);
      expect(box90.centerY).toBeCloseTo(initialBox.centerY, 4);

      // Rotate to 180°
      const pos180 = rotateElementAroundCenter(el, 180, canvasWidth, canvasHeight);
      const box180 = getElementVisualBox(
        { ...el, ...pos180, rotation: 180 },
        canvasWidth,
        canvasHeight,
      );
      expect(box180.centerX).toBeCloseTo(initialBox.centerX, 4);
      expect(box180.centerY).toBeCloseTo(initialBox.centerY, 4);

      // Rotate to 270°
      const pos270 = rotateElementAroundCenter(el, 270, canvasWidth, canvasHeight);
      const box270 = getElementVisualBox(
        { ...el, ...pos270, rotation: 270 },
        canvasWidth,
        canvasHeight,
      );
      expect(box270.centerX).toBeCloseTo(initialBox.centerX, 4);
      expect(box270.centerY).toBeCloseTo(initialBox.centerY, 4);
    });
  });

  describe('Marquee Selection (Rubberband) Intersection', () => {
    it('detects when marquee box contains or overlaps an element', () => {
      const vBox = getElementPixelVisualBox(100, 100, 200, 150, 0);
      const elBox = { x: vBox.minX, y: vBox.minY, width: vBox.width, height: vBox.height };

      // Case 1: Marquee completely contains element
      const containingMarquee = { x: 50, y: 50, width: 300, height: 250 };
      const int1 =
        containingMarquee.x <= elBox.x + elBox.width &&
        containingMarquee.x + containingMarquee.width >= elBox.x &&
        containingMarquee.y <= elBox.y + elBox.height &&
        containingMarquee.y + containingMarquee.height >= elBox.y;
      expect(int1).toBe(true);

      // Case 2: Marquee partially overlaps corner
      const overlappingMarquee = { x: 250, y: 200, width: 100, height: 100 };
      const int2 =
        overlappingMarquee.x <= elBox.x + elBox.width &&
        overlappingMarquee.x + overlappingMarquee.width >= elBox.x &&
        overlappingMarquee.y <= elBox.y + elBox.height &&
        overlappingMarquee.y + overlappingMarquee.height >= elBox.y;
      expect(int2).toBe(true);

      // Case 3: Marquee outside element
      const outsideMarquee = { x: 400, y: 400, width: 100, height: 100 };
      const int3 =
        outsideMarquee.x <= elBox.x + elBox.width &&
        outsideMarquee.x + outsideMarquee.width >= elBox.x &&
        outsideMarquee.y <= elBox.y + elBox.height &&
        outsideMarquee.y + outsideMarquee.height >= elBox.y;
      expect(int3).toBe(false);
    });

    it('detects intersection for rotated element with its visual bounding box', () => {
      // Element at (500, 200), w=300, h=400, rotated 90° clockwise
      // Visual box: minX=100, maxX=500, minY=200, maxY=500
      const vBox = getElementPixelVisualBox(500, 200, 300, 400, 90);
      const elBox = { x: vBox.minX, y: vBox.minY, width: vBox.width, height: vBox.height };

      // Marquee intersecting the left rotated area (150, 250)
      const marquee = { x: 120, y: 220, width: 100, height: 100 };
      const intersects =
        marquee.x <= elBox.x + elBox.width &&
        marquee.x + marquee.width >= elBox.x &&
        marquee.y <= elBox.y + elBox.height &&
        marquee.y + marquee.height >= elBox.y;
      expect(intersects).toBe(true);
    });

    it('accurately filters elements on a high-DPI canvas (2480x3508 A4)', () => {
      const canvasW = 2480;
      const canvasH = 3508;

      // Element centered on canvas (similar to user screenshot)
      const el = {
        id: 'img-1',
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
        rotation: 0,
      };

      const vBox = getElementPixelVisualBox(
        el.x * canvasW,
        el.y * canvasH,
        el.width * canvasW,
        el.height * canvasH,
        el.rotation,
      );
      const elBox = { x: vBox.minX, y: vBox.minY, width: vBox.width, height: vBox.height };

      // Marquee dragged from empty background across the element
      const marquee = { x: 400, y: 400, width: 600, height: 600 };
      const intersects =
        marquee.x <= elBox.x + elBox.width &&
        marquee.x + marquee.width >= elBox.x &&
        marquee.y <= elBox.y + elBox.height &&
        marquee.y + marquee.height >= elBox.y;
      expect(intersects).toBe(true);
    });
  });
});
