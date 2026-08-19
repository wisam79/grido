import { describe, it, expect, vi } from "vitest";
import { drawCurvedText } from "../src/lib/canvas/curved-text-utils";

describe("Curved Text Drawing Tests", () => {
  it("does nothing when curve is 0 or text is empty", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 10 }),
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: "",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: "Arial",
      curve: 50,
    });
    expect(mockCtx.fillText).not.toHaveBeenCalled();

    drawCurvedText(mockCtx, {
      text: "Hello",
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      fontSize: 20,
      fontFamily: "Arial",
      curve: 0,
    });
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it("draws each character rotated along arc when curve is positive or negative", () => {
    const fillTextSpy = vi.fn();
    const rotateSpy = vi.fn();
    const translateSpy = vi.fn();

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: translateSpy,
      rotate: rotateSpy,
      fillText: fillTextSpy,
      strokeText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 15 }),
    } as unknown as CanvasRenderingContext2D;

    drawCurvedText(mockCtx, {
      text: "GRIDO",
      x: 0,
      y: 0,
      width: 300,
      height: 150,
      fontSize: 24,
      fontFamily: "Cairo",
      curve: 60,
      stroke: "#000000",
      strokeWidth: 2,
    });

    // 5 characters in "GRIDO"
    expect(fillTextSpy).toHaveBeenCalledTimes(5);
    expect(rotateSpy).toHaveBeenCalledTimes(5);
    expect(translateSpy).toHaveBeenCalledTimes(5);
  });
});
