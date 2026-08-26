import { describe, it, expect, vi } from "vitest";
import { getExifOrientation, getTrueImageAspect } from "../src/lib/io/exif-utils";

// Mock exifr
vi.mock("exifr", () => ({
  default: {
    orientation: vi.fn(async (input: any) => {
      if (input === "vertical-shot.jpg") return 6; // 90 deg CW
      if (input === "upside-down.jpg") return 3; // 180 deg
      if (input === "rotate-270.jpg") return 8; // 270 deg
      if (input === "corrupted.jpg") throw new Error("EXIF parse error");
      return 1; // Normal
    }),
  },
}));

describe("EXIF Utilities", () => {
  it("parses normal orientation correctly", async () => {
    const res = await getExifOrientation("normal.jpg");
    expect(res.orientation).toBe(1);
    expect(res.rotationDeg).toBe(0);
    expect(res.isQuarterRotated).toBe(false);
  });

  it("detects 90-degree camera vertical shot (Orientation 6)", async () => {
    const res = await getExifOrientation("vertical-shot.jpg");
    expect(res.orientation).toBe(6);
    expect(res.rotationDeg).toBe(90);
    expect(res.isQuarterRotated).toBe(true);
  });

  it("detects 270-degree camera shot (Orientation 8)", async () => {
    const res = await getExifOrientation("rotate-270.jpg");
    expect(res.orientation).toBe(8);
    expect(res.rotationDeg).toBe(270);
    expect(res.isQuarterRotated).toBe(true);
  });

  it("handles errors gracefully and defaults to normal orientation", async () => {
    const res = await getExifOrientation("corrupted.jpg");
    expect(res.orientation).toBe(1);
    expect(res.rotationDeg).toBe(0);
    expect(res.isQuarterRotated).toBe(false);
  });

  it("corrects aspect ratio for quarter rotated shots", async () => {
    // Normal 4000x3000 -> Aspect 4/3 = 1.333
    const normalAspect = await getTrueImageAspect("normal.jpg", 4000, 3000);
    expect(normalAspect.width).toBe(4000);
    expect(normalAspect.height).toBe(3000);
    expect(normalAspect.aspectRatio).toBeCloseTo(4 / 3);

    // Vertical shot 4000x3000 with Orientation 6 -> Should swap to 3000x4000 (Aspect 3/4 = 0.75)
    const verticalAspect = await getTrueImageAspect("vertical-shot.jpg", 4000, 3000);
    expect(verticalAspect.width).toBe(3000);
    expect(verticalAspect.height).toBe(4000);
    expect(verticalAspect.aspectRatio).toBeCloseTo(3 / 4);
    expect(verticalAspect.rotationDeg).toBe(90);
  });
});
