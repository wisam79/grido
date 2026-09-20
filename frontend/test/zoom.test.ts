import { describe, it, expect } from "vitest";
import {
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  canZoomIn,
  canZoomOut,
  clampZoom,
  clampZoomRaw,
  isDefaultZoom,
  roundZoom,
  stepZoom,
} from "../src/lib/canvas/zoom";

describe("منطق الزوم الموحّد", () => {
  it("يثبّت الحدود والخطوة المعتمدة في مكان واحد", () => {
    expect(ZOOM_MIN).toBe(0.1);
    expect(ZOOM_MAX).toBe(5);
    expect(ZOOM_STEP).toBe(0.1);
    expect(ZOOM_DEFAULT).toBe(1);
  });

  it("يحصر الزوم المتصل داخل الحدود بلا تقريب، ويقرّب الخطوات الثابتة", () => {
    expect(clampZoomRaw(0.01)).toBe(ZOOM_MIN);
    expect(clampZoomRaw(9)).toBe(ZOOM_MAX);
    expect(clampZoomRaw(1.5)).toBe(1.5);
    expect(clampZoom(1.234)).toBe(1.23);
    expect(roundZoom(0.30000000000000004)).toBe(0.3);
  });

  it("يزيد وينقص بخطوة واحدة بلا انحراف عشري", () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(0.3, 1)).toBe(0.4);
    expect(stepZoom(2, 1, 3)).toBe(2.3);
  });

  it("يتوقف عند الحدين ولا يتجاوزهما", () => {
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX);
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
    // 4.99 + 0.1 = 5.09 ثم يُقصّ إلى الحد الأقصى
    expect(stepZoom(4.99, 1)).toBe(ZOOM_MAX);
  });

  it("يعطّل التكبير/التصغير عند الحدود فقط", () => {
    expect(canZoomIn(ZOOM_MAX)).toBe(false);
    expect(canZoomIn(4.9)).toBe(true);
    expect(canZoomOut(ZOOM_MIN)).toBe(false);
    expect(canZoomOut(0.2)).toBe(true);
  });

  it("يتعرف على الحجم الفعلي 100% بهامش أمان", () => {
    expect(isDefaultZoom(ZOOM_DEFAULT)).toBe(true);
    expect(isDefaultZoom(1.001)).toBe(true);
    expect(isDefaultZoom(1.01)).toBe(false);
    expect(isDefaultZoom(2)).toBe(false);
  });
});
