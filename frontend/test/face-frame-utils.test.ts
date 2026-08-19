import { describe, it, expect } from "vitest";
import {
  computeIdCropRect,
  faceBoxFromLandmarks,
  ICAO_BASE_EYE_LEVEL,
  MAX_ZOOM,
} from "../src/lib/filters/face-frame-utils";

describe("computeIdCropRect - Human Expert Photography Engine", () => {
  const face = {
    eyeCenterX: 0.5,
    eyeCenterY: 0.35,
    rollAngle: 0,
    pitchAngle: 0,
    headHeight: 0.4,
    hairTopY: 0.14,
    skullTopY: 0.152,
    chinY: 0.552,
    headWidth: 0.3,
    faceAspectRatio: 0.75,
    hairVolumeRatio: 0.03,
  };

  it("should anchor eye level at ~38% with top headroom like an expert studio photographer", () => {
    const crop = computeIdCropRect(face, 0.7778);

    const eyeLevelInCrop = (face.eyeCenterY - crop.y) / crop.height;
    expect(eyeLevelInCrop).toBeCloseTo(ICAO_BASE_EYE_LEVEL, 2);

    const topMargin = face.hairTopY - crop.y;
    expect(topMargin).toBeGreaterThan(0);

    expect(crop.width / crop.height).toBeCloseTo(0.7778, 3);

    const faceCenterInCrop = (face.eyeCenterX - crop.x) / crop.width;
    expect(faceCenterInCrop).toBeCloseTo(0.5, 2);
  });

  it("should compensate for head pitch (looking slightly up/down)", () => {
    const lookingDownFace = { ...face, pitchAngle: -0.2 };
    const lookingUpFace = { ...face, pitchAngle: 0.2 };

    const downCrop = computeIdCropRect(lookingDownFace, 0.7778);
    const upCrop = computeIdCropRect(lookingUpFace, 0.7778);

    expect(downCrop.y).not.toEqual(upCrop.y);
  });

  it("should disambiguate high hair volume without shrinking the face excessively", () => {
    const highHairFace = {
      ...face,
      hairTopY: 0.08,
      hairVolumeRatio: 0.3,
    };
    const crop = computeIdCropRect(highHairFace, 0.7778);

    // وجه الإنسان لا يتقلص حتى النملة عند وجود شعر أفرو أو حجاب مرتفع
    expect(crop.height).toBeLessThanOrEqual(1.0);
    expect(crop.width / crop.height).toBeCloseTo(0.7778, 3);
  });

  it("should clamp crop within image bounds and enforce max zoom", () => {
    const offCenterFace = { ...face, eyeCenterX: 0.05 };
    const crop = computeIdCropRect(offCenterFace, 0.7778);

    expect(crop.x).toBe(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1);
    expect(crop.y + crop.height).toBeLessThanOrEqual(1);
  });

  it("should output exact pixel aspect ratio matching target slot for non-square source images (3:4, 16:9)", () => {
    const targetSlotAspect = 35 / 45; // 0.7778 (35x45mm)
    const sourceImageAspect = 3000 / 4000; // 0.75 (3:4 portrait photo)

    const crop = computeIdCropRect(face, targetSlotAspect, sourceImageAspect);

    const croppedPixelWidth = crop.width * 3000;
    const croppedPixelHeight = crop.height * 4000;
    const actualCroppedPixelAspect = croppedPixelWidth / croppedPixelHeight;

    // تطابق مطلق مع نسبة أبعاد الخلية الهدف بدون أي اقتطاع ثانوي بكسلي!
    expect(actualCroppedPixelAspect).toBeCloseTo(targetSlotAspect, 3);
  });

  it("should throw on invalid aspect ratio", () => {
    expect(() => computeIdCropRect(face, 0)).toThrow();
    expect(() => computeIdCropRect(face, -1)).toThrow();
  });
});

describe("faceBoxFromLandmarks", () => {
  function buildLandmarks(pointsMap: Partial<Record<number, { x: number; y: number; z?: number }>>) {
    const points: Array<{ x: number; y: number; z?: number }> = [];
    for (let i = 0; i < 478; i++) {
      points.push({ x: 0.5, y: 0.5, z: 0 });
    }
    for (const [idx, p] of Object.entries(pointsMap)) {
      points[Number(idx)] = p ?? { x: 0.5, y: 0.5, z: 0 };
    }
    return points;
  }

  it("should derive human expert 3D metrics including pitch, roll, and hair volume ratio", () => {
    const landmarks = buildLandmarks({
      33: { x: 0.4, y: 0.3, z: 0 },
      133: { x: 0.44, y: 0.3, z: 0 },
      159: { x: 0.42, y: 0.29, z: 0 },
      145: { x: 0.42, y: 0.31, z: 0 },
      263: { x: 0.56, y: 0.3, z: 0 },
      362: { x: 0.6, y: 0.3, z: 0 },
      386: { x: 0.58, y: 0.29, z: 0 },
      374: { x: 0.58, y: 0.31, z: 0 },
      10: { x: 0.5, y: 0.15, z: 0 },
      152: { x: 0.5, y: 0.55, z: 0 },
      234: { x: 0.35, y: 0.35, z: 0 },
      454: { x: 0.65, y: 0.35, z: 0 },
    });

    const detailedBox = faceBoxFromLandmarks(landmarks);

    expect(detailedBox.eyeCenterX).toBeCloseTo(0.5, 2);
    expect(detailedBox.eyeCenterY).toBeCloseTo(0.3, 2);
    expect(detailedBox.rollAngle).toBeCloseTo(0, 2);
    expect(detailedBox.headHeight).toBeGreaterThan(0.4);
    expect(detailedBox.hairTopY).toBeLessThan(0.15);
    expect(detailedBox.chinY).toBe(0.55);
    expect(detailedBox.faceAspectRatio).toBeGreaterThan(0);
    expect(typeof detailedBox.hairVolumeRatio).toBe("number");
  });

  it("should throw when landmarks are missing or incomplete", () => {
    const tiny: Array<{ x: number; y: number }> = [{ x: 0.5, y: 0.5 }];
    expect(() => faceBoxFromLandmarks(tiny)).toThrow();
  });
});


